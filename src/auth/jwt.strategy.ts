import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { User } from 'generated/prisma/client';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UNAUTHORIZED } from '../common/exception/error.code';
import { ServiceException } from '../common/exception/service.exception';
import { AccessTokenPayload } from './token.service';
import { UserService } from './user.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    private readonly userService: UserService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: AccessTokenPayload): Promise<User> {
    const user = await this.userService.getUserById(payload.sub);

    if (!user) {
      throw new ServiceException(UNAUTHORIZED);
    }

    return user;
  }
}
