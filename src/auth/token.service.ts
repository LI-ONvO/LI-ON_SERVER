import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomUUID } from 'crypto';
import { RedisService } from '../common/redis/redis.service';
import { InvalidRefreshTokenException } from './auth.exception';

export interface AccessTokenPayload {
  sub: number;
  email: string;
  type: 'access';
}

interface RefreshTokenPayload {
  sub: number;
  type: 'refresh';
}

/**
 * refreshToken 은 ERD 에 테이블이 없어 Redis 에 보관한다.
 * - `auth:refresh:{userId}:{tokenHash}` : 개별 토큰(만료 TTL)
 * - `auth:refresh:index:{userId}`       : 로그아웃 시 일괄 폐기를 위한 tokenHash 목록
 */
@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {}

  get accessExpiresIn(): number {
    return Number(
      this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', '3600'),
    );
  }

  private get refreshExpiresIn(): number {
    return Number(
      this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '1209600'),
    );
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private refreshKey(userId: number, tokenHash: string): string {
    return `auth:refresh:${userId}:${tokenHash}`;
  }

  private refreshIndexKey(userId: number): string {
    return `auth:refresh:index:${userId}`;
  }

  issueAccessToken(userId: number, email: string): string {
    const payload: AccessTokenPayload = { sub: userId, email, type: 'access' };

    return this.jwtService.sign(payload, {
      secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.accessExpiresIn,
    });
  }

  async issueRefreshToken(userId: number): Promise<string> {
    const payload: RefreshTokenPayload = {
      sub: userId,
      type: 'refresh',
      jti: randomUUID(),
    };
    const token = this.jwtService.sign(payload, {
      secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.refreshExpiresIn,
    });

    const tokenHash = this.hashToken(token);
    const indexKey = this.refreshIndexKey(userId);

    await this.redisService
      .multi()
      .set(this.refreshKey(userId, tokenHash), '', 'EX', this.refreshExpiresIn)
      .sadd(indexKey, tokenHash)
      .expire(indexKey, this.refreshExpiresIn)
      .exec();

    return token;
  }

  // EXISTS 로 확인과 폐기를 DEL 한 번으로 처리함
  async consumeRefreshToken(token: string): Promise<number> {
    let payload: RefreshTokenPayload;

    try {
      payload = this.jwtService.verify<RefreshTokenPayload>(token, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw InvalidRefreshTokenException();
    }

    const tokenHash = this.hashToken(token);
    const consumed = await this.redisService.del(
      this.refreshKey(payload.sub, tokenHash),
    );

    if (consumed !== 1) {
      throw InvalidRefreshTokenException();
    }

    // 소비에 성공한 요청만 인덱스를 정리한다. 실패해도 남은 해시는 이미 만료된
    // 키를 가리킬 뿐이라 revokeAllRefreshTokens 동작에 영향이 없다.
    await this.redisService.srem(this.refreshIndexKey(payload.sub), tokenHash);

    return payload.sub;
  }

  // 로그아웃 - 해당 사용자의 refreshToken 을 모두 폐기한다.
  async revokeAllRefreshTokens(userId: number): Promise<void> {
    const indexKey = this.refreshIndexKey(userId);
    const tokenHashes = await this.redisService.smembers(indexKey);
    const keys = tokenHashes.map((hash) => this.refreshKey(userId, hash));

    await this.redisService.del(indexKey, ...keys);
  }
}
