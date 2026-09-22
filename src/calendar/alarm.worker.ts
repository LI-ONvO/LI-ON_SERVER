import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { positive } from '../common/config';
import { PrismaService } from '../common/prisma/prisma.service';
import { RedisService } from '../common/redis/redis.service';
import { FcmService, PushResult } from './fcm.service';

const DEFAULT_INTERVAL_MS = 10000;
const DEFAULT_BATCH_SIZE = 100;

const LOCK_KEY = 'alarm:worker:lock';

// 발송 응답 뒤 DB 반영까지의 여유
const LOCK_MARGIN_MS = 30000;

// 락이 만료된 뒤 다른 인스턴스가 잡은 락을 지우지 않도록 함
const RELEASE_LOCK =
  "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) end return 0";

@Injectable()
export class AlarmWorker implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(AlarmWorker.name);
  private readonly intervalMs: number;
  private readonly batchSize: number;
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly prismaService: PrismaService,
    private readonly redisService: RedisService,
    private readonly fcmService: FcmService,
    configService: ConfigService,
  ) {
    this.intervalMs = positive(
      configService.get<string>('ALARM_WORKER_INTERVAL'),
      DEFAULT_INTERVAL_MS,
    );
    this.batchSize = positive(
      configService.get<string>('ALARM_WORKER_BATCH_SIZE'),
      DEFAULT_BATCH_SIZE,
    );
  }

  onApplicationBootstrap(): void {
    this.timer = setInterval(() => void this.tick(), this.intervalMs);
  }

  onModuleDestroy(): void {
    clearInterval(this.timer);
  }

  // 인스턴스가 여러 대이거나 주기가 겹쳐도 같은 알림을 동시에 보내지 않도록
  async tick(): Promise<void> {
    const token = randomUUID();

    try {
      const locked = await this.redisService.set(
        LOCK_KEY,
        token,
        'PX',
        // 액세스 토큰 발급 + 발송이 각각 타임아웃까지 걸릴 수 있다
        this.fcmService.timeoutMs * 2 + LOCK_MARGIN_MS,
        'NX',
      );

      if (locked !== 'OK') {
        return;
      }

      try {
        await this.sendDueAlarms();
      } finally {
        await this.redisService.eval(RELEASE_LOCK, 1, LOCK_KEY, token);
      }
    } catch (error) {
      // 한 주기가 실패해도 멈추지 않음
      this.logger.error(
        '알림 발송 주기 실패',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  async sendDueAlarms(): Promise<void> {
    const alarms = await this.prismaService.alarm.findMany({
      where: { status: 'PENDING', remind_at: { lte: new Date() } },
      include: {
        event: {
          select: { id: true, user_id: true },
        },
      },
      orderBy: [{ remind_at: 'asc' }, { id: 'asc' }],
      // 주기당 한 배치
      // 밀린 알림이 이보다 많아지면 한 주기에 여러 배치를 돌린다(락 TTL도 같이 늘림)
      take: this.batchSize,
    });

    if (alarms.length === 0) {
      return;
    }

    const devices = await this.prismaService.deviceToken.findMany({
      where: { user_id: { in: alarms.map((alarm) => alarm.event.user_id) } },
      select: { user_id: true, token: true },
    });

    const tokensByUser = new Map<number, string[]>();

    for (const device of devices) {
      tokensByUser.set(device.user_id, [
        ...(tokensByUser.get(device.user_id) ?? []),
        device.token,
      ]);
    }

    // 알림 하나가 사용자의 기기 수만큼 나간다
    const targets = alarms.flatMap((alarm) =>
      (tokensByUser.get(alarm.event.user_id) ?? []).map((token) => ({
        alarm,
        token,
      })),
    );

    // 액세스 토큰을 못 받으면 여기서 던짐
    // 상태를 안 바꿨으니 전부 PENDING 으로 남아 다음 주기에 다시 시도
    const results =
      targets.length === 0
        ? []
        : await this.fcmService.send(
            targets.map(({ alarm, token }) => ({
              token,

              // 기기 토큰은 로그아웃한 뒤에도 남을 수 있기 때문에 담지 않음
              title: '일정 알림',
              body: null,

              // 앱이 알림을 눌렀을 때 일정 화면으로 보낼 때 씀
              data: {
                alarmId: String(alarm.id),
                eventId: String(alarm.event.id),
              },
              collapseKey: `alarm-${alarm.id}`,
            })),
          );

    const resultsByAlarm = new Map<number, PushResult[]>();

    targets.forEach(({ alarm }, index) => {
      resultsByAlarm.set(alarm.id, [
        ...(resultsByAlarm.get(alarm.id) ?? []),
        results[index],
      ]);
    });

    const sent: number[] = [];
    const failed: number[] = [];

    for (const alarm of alarms) {
      const outcomes = resultsByAlarm.get(alarm.id) ?? [];

      // 기기 하나라도 받으면 SENT
      // 기기가 없거나 전부 영구 실패면 FAILED.
      // 그 의외의 PENDING 으로 두고 다음 주기에 다시 시도
      if (outcomes.includes('SENT')) {
        sent.push(alarm.id);
      } else if (!outcomes.includes('RETRY')) {
        failed.push(alarm.id);
      }
    }

    const unregistered = targets
      .filter((_, index) => results[index] === 'UNREGISTERED')
      .map(({ token }) => token);

    // status 조건은 그 사이 일정 수정으로 교체됐거나 이미 처리된 알림을 건드리지 않게 함
    await this.prismaService.$transaction([
      this.prismaService.alarm.updateMany({
        where: { id: { in: sent }, status: 'PENDING' },
        data: { status: 'SENT', sent_at: new Date() },
      }),
      this.prismaService.alarm.updateMany({
        where: { id: { in: failed }, status: 'PENDING' },
        data: { status: 'FAILED' },
      }),
      // 앱을 지웠거나 만료된 토큰
      this.prismaService.deviceToken.deleteMany({
        where: { token: { in: unregistered } },
      }),
    ]);

    this.logger.log(
      `알림 발송 결과: SENT ${sent.length} · FAILED ${failed.length} · 재시도 ${alarms.length - sent.length - failed.length} · 만료 토큰 ${unregistered.length}`,
    );
  }
}
