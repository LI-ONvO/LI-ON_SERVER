import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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

@Injectable()
export class AuthService {
  /** 명세의 send-code 응답 expiresIn 과 동일한 값이어야 한다. */
  private readonly codeTtl: number;
  private readonly maxSend: number;
  private readonly sendWindow: number;
  private readonly maxAttempt: number;
  private readonly maxLoginFail: number;
  private readonly loginLockDuration: number;
  /** DB 설계의 first_use TTL */
  private readonly firstUseTtl: number;
  /** 코드 검증 성공 후 signup 까지 유효한 시간 */
  private readonly verifiedTtl: number;

  constructor(
    private readonly userService: UserService,
    private readonly tokenService: TokenService,
    private readonly redisService: RedisService,
    private readonly mailService: MailService,
    configService: ConfigService,
  ) {
    const num = (key: string, fallback: number): number =>
      Number(configService.get<string>(key) ?? fallback);

    this.codeTtl = num('EMAIL_CODE_TTL', 180);
    this.maxSend = num('EMAIL_CODE_MAX_SEND', 5);
    this.sendWindow = num('EMAIL_CODE_SEND_WINDOW', 3600);
    this.maxAttempt = num('EMAIL_CODE_MAX_ATTEMPT', 5);
    this.maxLoginFail = num('LOGIN_MAX_FAIL_COUNT', 5);
    this.loginLockDuration = num('LOGIN_LOCK_DURATION', 1800);
    this.firstUseTtl = num('FIRST_USE_TTL', 2592000);
    this.verifiedTtl = num('EMAIL_VERIFIED_TTL', 1800);
  }

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
      (await this.incr(sendCountKey(normalizedEmail), this.sendWindow)) >
      this.maxSend
    ) {
      throw TooManyRequestsException();
    }

    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');

    await this.redisService.set(
      codeKey(normalizedEmail),
      code,
      'EX',
      this.codeTtl,
    );
    await this.redisService.del(attemptKey(normalizedEmail));
    await this.mailService.sendVerificationCode(
      normalizedEmail,
      code,
      this.codeTtl,
    );

    return { email: normalizedEmail, expiresIn: this.codeTtl };
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
      (await this.incr(attemptKey(normalizedEmail), this.codeTtl)) >
      this.maxAttempt
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

    // signup 이 소비할 인증 완료 마커
    await this.redisService.set(
      verifiedKey(normalizedEmail),
      '',
      'EX',
      this.verifiedTtl,
    );

    return {
      email: normalizedEmail,
      verified: true,
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
    // del 반환값으로 확인 + 소비를 한 번에 하여 마커 재사용을 막는다.
    if ((await this.redisService.del(verifiedKey(normalizedEmail))) !== 1) {
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
    await this.redisService.set(
      firstUseKey(user.id),
      '',
      'EX',
      this.firstUseTtl,
    );

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

    if (
      Number((await this.redisService.get(failKey)) ?? 0) >= this.maxLoginFail
    ) {
      throw AccountLockedException();
    }

    const user = await this.userService.getUserByEmail(normalizedEmail);

    if (
      !user?.password_hash ||
      !(await bcrypt.compare(request.password, user.password_hash))
    ) {
      if (
        (await this.incr(failKey, this.loginLockDuration)) >= this.maxLoginFail
      ) {
        throw AccountLockedException();
      }

      throw InvalidCredentialsException();
    }

    await this.redisService.del(failKey);

    const accessToken = this.tokenService.issueAccessToken(user.id, user.email);
    const refreshToken = await this.tokenService.issueRefreshToken(user.id);

    // 토큰 발급이 실패하면 first_use 키를 남겨 재시도 시 최초 로그인으로 남도록 발급 뒤에 삭제한다화
    const isFirstLogin =
      (await this.redisService.del(firstUseKey(user.id))) === 1;

    return {
      accessToken,
      refreshToken,
      expiresIn: this.tokenService.accessExpiresIn,
      user: {
        userId: user.id,
        email: user.email,
        nickname: user.profile?.nickname ?? '',
      },
      isFirstLogin,
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
      refreshToken: await this.tokenService.issueRefreshToken(user.id),
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
const verifiedKey = (email: string): string => `verify:signup:done:${email}`;
const firstUseKey = (userId: number): string => `first_use:${userId}`;
const loginFailKey = (email: string): string => `auth:login:fail:${email}`;
