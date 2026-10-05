import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';
import { UNAUTHORIZED } from '../common/exception/error.code';
import { ServiceException } from '../common/exception/service.exception';
import { JwtAuthGuard } from './jwt-auth.guard';

/**
 * 백엔드와 AI 서버만 아는 값을 X-Internal-Key로 받음
 */
@Injectable()
export class InternalKeyGuard implements CanActivate {
  private readonly key: Buffer;

  constructor(configService: ConfigService) {
    const key = configService.getOrThrow<string>('INTERNAL_API_KEY');

    // 빈 값이면 빈 헤더가 통과함
    if (!key) {
      throw new Error('INTERNAL_API_KEY 가 비어 있습니다.');
    }

    this.key = Buffer.from(key);
  }

  canActivate(context: ExecutionContext): boolean {
    if (!this.matches(context)) {
      throw new ServiceException(UNAUTHORIZED);
    }

    return true;
  }

  matches(context: ExecutionContext): boolean {
    const header = context.switchToHttp().getRequest<Request>().headers[
      'x-internal-key'
    ];

    if (typeof header !== 'string') {
      return false;
    }

    const given = Buffer.from(header);

    // 길이 검증
    return given.length === this.key.length && timingSafeEqual(given, this.key);
  }
}

@Injectable()
export class JwtOrInternalKeyGuard extends JwtAuthGuard {
  // DI -> Nest가 알아서 생성함
  constructor(private readonly internalKeyGuard: InternalKeyGuard) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // 상세 조회는 앱(JWT)과 AI 서버(내부 키)가 함께 사용
    // matches(context) -> X-Internal-Key 검증
    // super.canActivate(context) -> JWT 검증
    return this.internalKeyGuard.matches(context) || super.canActivate(context);
  }
}
