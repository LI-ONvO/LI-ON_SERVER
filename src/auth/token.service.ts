import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash } from 'crypto';
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

interface EmailVerificationPayload {
  email: string;
  type: 'email_verification';
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
    const payload: RefreshTokenPayload = { sub: userId, type: 'refresh' };
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

  /** 서명 + Redis 보관 여부를 확인한 뒤 userId 를 반환한다. */
  async verifyRefreshToken(token: string): Promise<number> {
    let payload: RefreshTokenPayload;

    try {
      payload = this.jwtService.verify<RefreshTokenPayload>(token, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw InvalidRefreshTokenException();
    }

    const exists = await this.redisService.exists(
      this.refreshKey(payload.sub, this.hashToken(token)),
    );

    if (exists === 0) {
      throw InvalidRefreshTokenException();
    }

    return payload.sub;
  }

  /** 로그아웃 - 해당 사용자의 refreshToken 을 모두 폐기한다. */
  async revokeAllRefreshTokens(userId: number): Promise<void> {
    const indexKey = this.refreshIndexKey(userId);
    const tokenHashes = await this.redisService.smembers(indexKey);
    const keys = tokenHashes.map((hash) => this.refreshKey(userId, hash));

    await this.redisService.del(indexKey, ...keys);
  }

  issueEmailVerificationToken(email: string): string {
    const payload: EmailVerificationPayload = {
      email,
      type: 'email_verification',
    };

    return this.jwtService.sign(payload, {
      secret: this.configService.getOrThrow<string>(
        'JWT_EMAIL_VERIFICATION_SECRET',
      ),
      expiresIn: Number(
        this.configService.get<string>(
          'JWT_EMAIL_VERIFICATION_EXPIRES_IN',
          '1800',
        ),
      ),
    });
  }

  /** 검증에 성공하면 인증된 이메일을, 실패하면 null 을 반환한다. */
  verifyEmailVerificationToken(token: string): string | null {
    try {
      const payload = this.jwtService.verify<EmailVerificationPayload>(token, {
        secret: this.configService.getOrThrow<string>(
          'JWT_EMAIL_VERIFICATION_SECRET',
        ),
      });

      return payload.type === 'email_verification' ? payload.email : null;
    } catch {
      return null;
    }
  }
}
