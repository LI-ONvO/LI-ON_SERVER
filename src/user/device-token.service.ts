import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class DeviceTokenService {
  constructor(private readonly prismaService: PrismaService) {}

  // MySQL에서 Prisma upsert는 조회 후 INSERT라, 앱이 토큰 갱신 때 동시에 부르면 한쪽이 unique 위반(500)
  async register(userId: number, token: string): Promise<void> {
    const now = new Date();

    // 같은 기기에서 다른 계정으로 로그인하면 토큰 소유자를 옮가김
    await this.prismaService.$executeRaw`
      INSERT INTO device_token (user_id, token, created_at, updated_at)
      VALUES (${userId}, ${token}, ${now}, ${now})
      ON DUPLICATE KEY UPDATE user_id = ${userId}, updated_at = ${now}`;
  }

  // 로그아웃 흐름이 실패하지 않게 없어도 성공으로 끝냄
  async unregister(userId: number, token: string): Promise<void> {
    await this.prismaService.deviceToken.deleteMany({
      where: { token, user_id: userId },
    });
  }
}
