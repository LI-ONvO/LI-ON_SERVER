import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { MailModule } from '../common/mail/mail.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { TokenService } from './token.service';
import { UserService } from './user.service';

@Module({
  imports: [
    MailModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({}),
  ],
  controllers: [AuthController],
  providers: [AuthService, TokenService, UserService, JwtStrategy],
  exports: [PassportModule, TokenService, UserService],
})
export class AuthModule {}
