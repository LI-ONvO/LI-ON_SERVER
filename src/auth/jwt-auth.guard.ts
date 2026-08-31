import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UNAUTHORIZED } from '../common/exception/error.code';
import { ServiceException } from '../common/exception/service.exception';

/**
 * 토큰이 없거나 서명이 깨진 경우 Passport 는 Nest 기본 UnauthorizedException 을 던진다.
 * 응답 포맷을 ServiceException 으로 통일하기 위해 재정의한다.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser>(err: unknown, user: TUser | false): TUser {
    if (err instanceof ServiceException) {
      throw err;
    }

    if (err || !user) {
      throw new ServiceException(UNAUTHORIZED);
    }

    return user;
  }
}
