import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService extends Redis implements OnModuleDestroy {
  constructor(configService: ConfigService) {
    super({
      host: configService.get<string>('REDIS_HOST'),
      port: Number(configService.get<string>('REDIS_PORT')),
      password: configService.get<string>('REDIS_PASSWORD'),
      lazyConnect: false,
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.quit();
  }
}
