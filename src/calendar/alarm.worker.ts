import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { toIsoSeconds } from '../common/date';
import { PrismaService } from '../common/prisma/prisma.service';
import { RedisService } from '../common/redis/redis.service';

const DEFAULT_TIMEOUT_MS = 10000;
const DEFAULT_INTERVAL_MS = 10000;
const DEFAULT_BATCH_SIZE = 100;

const LOCK_KEY = 'alarm:worker:lock';

// 발송 응답 뒤 DB 반영까지의 여유
const LOCK_MARGIN_MS = 30000;

// 락이 만료된 뒤 다른 인스턴스가 잡은 락을 지우지 않도록 함
const RELEASE_LOCK =
  "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) end return 0";

// 환경 설정에 값이 비었을 때를 대비
const positive = (value: string | undefined, fallback: number): number =>
  Number(value) > 0 ? Number(value) : fallback;

@Injectable()
export class AlarmWorker implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(AlarmWorker.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;
  private readonly intervalMs: number;
  private readonly batchSize: number;
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly prismaService: PrismaService,
    private readonly redisService: RedisService,
    configService: ConfigService,
  ) {
    this.baseUrl = configService
      .getOrThrow<string>('APP_SERVER_URL')
      .replace(/\/+$/, '');
    this.apiKey = configService.getOrThrow<string>('APP_SERVER_API_KEY');
    this.timeoutMs = positive(
      configService.get<string>('APP_SERVER_TIMEOUT'),
      DEFAULT_TIMEOUT_MS,
    );
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
        this.timeoutMs + LOCK_MARGIN_MS,
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
        event: { select: { user_id: true, title: true, description: true } },
      },
      orderBy: [{ remind_at: 'asc' }, { id: 'asc' }],
      // 주기당 한 배치
      // 밀린 알림이 이보다 많아지면 한 주기에 여러 배치를 돌린다(락 TTL도 같이 늘림)
      take: this.batchSize,
    });

    if (alarms.length === 0) {
      return;
    }

    const ids = alarms.map((alarm) => alarm.id);
    let response: Response;

    try {
      response = await fetch(`${this.baseUrl}/notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': this.apiKey,
        },
        body: JSON.stringify({
          // 배치마다 새로 만든다
          requestId: randomUUID(),
          notifications: alarms.map((alarm) => ({
            alarmId: alarm.id,
            userId: alarm.event.user_id,
            title: alarm.event.title,
            description: alarm.event.description,
            remindAt: toIsoSeconds(alarm.remind_at),
          })),
        }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      // 어플 서버가 받았는지 알 수 없음
      // 중복 푸시 가능
      this.logger.warn(
        `알림 ${ids.length}건 발송 요청 실패, 다음 주기에 재시도: ${String(error)}`,
      );
      return;
    }

    if (response.status === 422) {
      // 배치 전체 거절
      await this.prismaService.alarm.updateMany({
        where: { id: { in: ids }, status: 'PENDING' },
        data: { status: 'FAILED' },
      });
      this.logger.error(
        `어플 서버가 알림 ${ids.length}건을 거절(422), FAILED 처리`,
      );
      return;
    }

    if (!response.ok) {
      // 500은 PENDING 으로 되돌려야한다는 뜻
      // 401은 키 설정 문제라 고칠 때까지 알림을 버리지 않음
      this.logger.error(
        `알림 발송 실패(${response.status}), ${ids.length}건 PENDING 유지`,
      );
      return;
    }

    const body: unknown = await response.json().catch(() => null);
    const results = (body as { results?: unknown } | null)?.results;

    if (!Array.isArray(results)) {
      this.logger.error(
        `어플 서버 응답에 results 가 없음, ${ids.length}건 PENDING 유지`,
      );
      return;
    }

    const requested = new Set(ids);
    const sent: number[] = [];
    const failed: number[] = [];

    for (const rawResult of results as unknown[]) {
      if (typeof rawResult !== 'object' || rawResult === null) {
        continue;
      }

      const { alarmId, status } = rawResult as {
        alarmId?: unknown;
        status?: unknown;
      };

      if (typeof alarmId !== 'number' || !requested.has(alarmId)) {
        continue;
      }

      if (status === 'SENT') {
        sent.push(alarmId);
      } else if (status === 'FAILED') {
        failed.push(alarmId);
      }
    }

    // 결과에 빠진 알림은 PENDING으로 남아 다음 주기에 다시 나감
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
    ]);

    this.logger.log(
      `알림 발송 결과: SENT ${sent.length} · FAILED ${failed.length} · 미응답 ${ids.length - sent.length - failed.length}`,
    );
  }
}
