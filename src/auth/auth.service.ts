import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'crypto';
import { ValidationErrorException } from '../common/exception/service.exception';
import { MailService } from '../common/mail/mail.service';
import { RedisService } from '../common/redis/redis.service';
import {
  AccountLockedException,
  CodeExpiredException,
  CodeNotFoundException,
  EmailAlreadyExistsException,
  InvalidCodeException,
  InvalidCredentialsException,
  InvalidEmailFormatException,
  InvalidPasswordFormatException,
  InvalidRefreshTokenException,
  PasswordMismatchException,
  TooManyAttemptsException,
  TooManyRequestsException,
} from './auth.exception';
import { CheckEmailResponse } from './dto/check-email.dto';
import { LoginRequest, LoginResponse } from './dto/login.dto';
import { RefreshTokenResponse } from './dto/refresh-token.dto';
import { SendEmailCodeResponse } from './dto/send-email-code.dto';
import { SignupRequest, SignupResponse } from './dto/signup.dto';
import { VerifyEmailCodeResponse } from './dto/verify-email-code.dto';
import { TokenService } from './token.service';
import { UserService } from './user.service';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** 8~20자, 영문/숫자/특수문자 조합 */
const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d])\S{8,20}$/;

const SALT_ROUNDS = 10;

/** 명세의 send-code 응답 expiresIn 과 동일한 값이어야 한다. (DB 설계는 500 으로 적혀 있어 확인 필요) */
const CODE_TTL = 180;

/** DB 설계의 first_use TTL */
const FIRST_USE_TTL = 2592000;

const MAX_SEND = 5;
const SEND_WINDOW = 3600;
const MAX_ATTEMPT = 5;
const MAX_LOGIN_FAIL = 5;
const LOGIN_LOCK_DURATION = 1800;

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly tokenService: TokenService,
    private readonly redisService: RedisService,
    private readonly mailService: MailService,
  ) {}

  /** GET /api/auth/check-email */
  async checkEmail(email: string): Promise<CheckEmailResponse> {
    const normalizedEmail = this.assertEmailFormat(email);

    return {
      available: !(await this.userService.existsByEmail(normalizedEmail)),
    };
  }

  /** POST /api/auth/email/send-code */
  async sendEmailCode(email: string): Promise<SendEmailCodeResponse> {
    const normalizedEmail = this.assertEmailFormat(email);

    if (await this.userService.existsByEmail(normalizedEmail)) {
      throw EmailAlreadyExistsException();
    }

    if (
      (await this.incr(sendCountKey(normalizedEmail), SEND_WINDOW)) > MAX_SEND
    ) {
      throw TooManyRequestsException();
    }

    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');

    await this.redisService.set(codeKey(normalizedEmail), code, 'EX', CODE_TTL);
    await this.redisService.del(attemptKey(normalizedEmail));
    await this.mailService.sendVerificationCode(
      normalizedEmail,
      code,
      CODE_TTL,
    );

    return { email: normalizedEmail, expiresIn: CODE_TTL };
  }

  /** POST /api/auth/email/verify-code */
  async verifyEmailCode(
    email: string,
    code: string,
  ): Promise<VerifyEmailCodeResponse> {
    const normalizedEmail = this.assertEmailFormat(email);
    const savedCode = await this.redisService.get(codeKey(normalizedEmail));

    if (savedCode === null) {
      // 발송 이력이 남아 있으면 TTL 만료, 아니면 발송 자체가 없었던 경우
      const everSent = await this.redisService.exists(
        sendCountKey(normalizedEmail),
      );

      throw everSent === 1 ? CodeExpiredException() : CodeNotFoundException();
    }

    // 6자리 코드라 시도 횟수 제한이 없으면 전수 대입이 가능하다.
    if (
      (await this.incr(attemptKey(normalizedEmail), CODE_TTL)) > MAX_ATTEMPT
    ) {
      await this.redisService.del(codeKey(normalizedEmail));
      throw TooManyAttemptsException();
    }

    if (savedCode !== code) {
      throw InvalidCodeException();
    }

    await this.redisService.del(
      codeKey(normalizedEmail),
      attemptKey(normalizedEmail),
    );

    return {
      email: normalizedEmail,
      verified: true,
      verificationToken:
        this.tokenService.issueEmailVerificationToken(normalizedEmail),
    };
  }

  /** POST /api/auth/signup */
  async signup(request: SignupRequest): Promise<SignupResponse> {
    const normalizedEmail = this.assertEmailFormat(request.email);

    if (!PASSWORD_PATTERN.test(request.password)) {
      throw InvalidPasswordFormatException();
    }

    if (request.password !== request.passwordConfirm) {
      throw PasswordMismatchException();
    }

    // 명세의 signup 에는 별도 인증 실패 코드가 없어 VALIDATION_ERROR(422) 로 응답한다.
    const verifiedEmail = request.verificationToken
      ? this.tokenService.verifyEmailVerificationToken(
          request.verificationToken,
        )
      : null;

    if (verifiedEmail !== normalizedEmail) {
      throw ValidationErrorException('이메일 인증이 완료되지 않았습니다.');
    }

    if (await this.userService.existsByEmail(normalizedEmail)) {
      throw EmailAlreadyExistsException();
    }

    const user = await this.userService.createUser({
      email: normalizedEmail,
      password_hash: await bcrypt.hash(request.password, SALT_ROUNDS),
      profile: { create: { nickname: request.nickname } },
    });

    // DB 설계의 `first_use:{userId}` - 로그인 시 isFirstLogin 판별에 사용
    await this.redisService.set(firstUseKey(user.id), '', 'EX', FIRST_USE_TTL);

    return {
      userId: user.id,
      email: user.email,
      nickname: request.nickname,
      createdAt: user.created_at.toISOString(),
    };
  }

  /** POST /api/auth/login */
  async login(request: LoginRequest): Promise<LoginResponse> {
    const normalizedEmail = normalizeEmail(request.email);
    const failKey = loginFailKey(normalizedEmail);

    if (Number((await this.redisService.get(failKey)) ?? 0) >= MAX_LOGIN_FAIL) {
      throw AccountLockedException();
    }

    const user = await this.userService.getUserByEmail(normalizedEmail);

    if (
      !user?.password_hash ||
      !(await bcrypt.compare(request.password, user.password_hash))
    ) {
      if ((await this.incr(failKey, LOGIN_LOCK_DURATION)) >= MAX_LOGIN_FAIL) {
        throw AccountLockedException();
      }

      throw InvalidCredentialsException();
    }

    await this.redisService.del(failKey);

    return {
      accessToken: this.tokenService.issueAccessToken(user.id, user.email),
      refreshToken: await this.tokenService.issueRefreshToken(user.id),
      tokenType: 'Bearer',
      expiresIn: this.tokenService.accessExpiresIn,
      user: {
        userId: user.id,
        email: user.email,
        nickname: user.profile?.nickname ?? '',
      },
      isFirstLogin:
        (await this.redisService.exists(firstUseKey(user.id))) === 1,
    };
  }

  /** POST /api/auth/refresh */
  async refresh(refreshToken: string): Promise<RefreshTokenResponse> {
    const userId = await this.tokenService.verifyRefreshToken(refreshToken);
    const user = await this.userService.getUserById(userId);

    if (!user) {
      throw InvalidRefreshTokenException();
    }

    return {
      accessToken: this.tokenService.issueAccessToken(user.id, user.email),
      tokenType: 'Bearer',
      expiresIn: this.tokenService.accessExpiresIn,
    };
  }

  /** POST /api/auth/logout */
  async logout(userId: number): Promise<void> {
    await this.tokenService.revokeAllRefreshTokens(userId);
  }

  /** 명세상 이메일 형식 오류는 400 이므로 DTO 검증(422)과 분리한다. */
  private assertEmailFormat(email: string): string {
    const normalizedEmail = normalizeEmail(email);

    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      throw InvalidEmailFormatException();
    }

    return normalizedEmail;
  }

  /** 카운터를 1 증가시키고, 최초 생성 시에만 TTL 을 건다. */
  private async incr(key: string, ttl: number): Promise<number> {
    const count = await this.redisService.incr(key);

    if (count === 1) {
      await this.redisService.expire(key, ttl);
    }

    return count;
  }
}

/** DB 설계의 `{normalized_email}` 규칙 */
const normalizeEmail = (email: string): string => email.trim().toLowerCase();

const codeKey = (email: string): string => `verify:signup:${email}`;
const attemptKey = (email: string): string => `verify:signup:attempt:${email}`;
const sendCountKey = (email: string): string => `verify:signup:send:${email}`;
const firstUseKey = (userId: number): string => `first_use:${userId}`;
const loginFailKey = (email: string): string => `auth:login:fail:${email}`;
