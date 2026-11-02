import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { positive } from '../common/config';
import { PrismaService } from '../common/prisma/prisma.service';

// 만료는 일 단위라 한 시간 간격이면 충분
const DEFAULT_INTERVAL_MS = 60 * 60 * 1000;

const MAX_TIMER_DELAY_MS = 2 ** 31 - 1;

// expires_at이 지난 자료를 지움
// 여러 인스턴스가 동시에 돌려도 결과가 같아서 락을 잡지 않음
@Injectable()
export class ResourceExpirationWorker
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(ResourceExpirationWorker.name);
  private readonly intervalMs: number;
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly prismaService: PrismaService,
    configService: ConfigService,
  ) {
    const configured = positive(
      configService.get<string>('RESOURCE_EXPIRATION_INTERVAL'),
      DEFAULT_INTERVAL_MS,
    );
    this.intervalMs = Math.min(configured, MAX_TIMER_DELAY_MS);
  }

  onApplicationBootstrap(): void {
    
    // 주기보다 자주 재시작돼도 삭제가 밀리지 않도록 시작할 때 한 번 돌림
    void this.tick();
    this.timer = setInterval(() => void this.tick(), this.intervalMs);
  }

  onModuleDestroy(): void {
    clearInterval(this.timer);
  }

  // 이전 삭제가 주기보다 오래 걸려도 같은 프로세스에서 DELETE가 겹치지 않도록
  async tick(): Promise<void> {
    if (this.running) {
      return;
    }

    this.running = true;

    try {
      const { count } = await this.prismaService.resource.deleteMany({
        where: { expires_at: { lte: new Date() } },
      });

      if (count > 0) {
        this.logger.log(`만료 자료 삭제: ${count}건`);
      }
    } catch (error) {
      // 한 주기가 실패해도 멈추지 않음
      this.logger.error(
        '만료 자료 삭제 실패',
        error instanceof Error ? error.stack : String(error),
      );
    } finally {
      this.running = false;
    }
  }
}
