import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { User } from 'generated/prisma/client';
import { AuthService } from './auth.service';
import { CheckEmailRequest, CheckEmailResponse } from './dto/check-email.dto';
import { LoginRequest, LoginResponse } from './dto/login.dto';
import {
  RefreshTokenRequest,
  RefreshTokenResponse,
} from './dto/refresh-token.dto';
import {
  SendEmailCodeRequest,
  SendEmailCodeResponse,
} from './dto/send-email-code.dto';
import { SignupRequest, SignupResponse } from './dto/signup.dto';
import {
  VerifyEmailCodeRequest,
  VerifyEmailCodeResponse,
} from './dto/verify-email-code.dto';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('/check-email')
  @HttpCode(HttpStatus.OK)
  async checkEmail(
    @Query() request: CheckEmailRequest,
  ): Promise<CheckEmailResponse> {
    return this.authService.checkEmail(request.email);
  }

  @Post('/email/send-code')
  @HttpCode(HttpStatus.OK)
  async sendEmailCode(
    @Body() request: SendEmailCodeRequest,
  ): Promise<SendEmailCodeResponse> {
    return this.authService.sendEmailCode(request.email);
  }

  @Post('/email/verify-code')
  @HttpCode(HttpStatus.OK)
  async verifyEmailCode(
    @Body() request: VerifyEmailCodeRequest,
  ): Promise<VerifyEmailCodeResponse> {
    return this.authService.verifyEmailCode(request.email, request.code);
  }

  @Post('/signup')
  @HttpCode(HttpStatus.CREATED)
  async signup(@Body() request: SignupRequest): Promise<SignupResponse> {
    return this.authService.signup(request);
  }

  @Post('/login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() request: LoginRequest): Promise<LoginResponse> {
    return this.authService.login(request);
  }

  @Post('/refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body() request: RefreshTokenRequest,
  ): Promise<RefreshTokenResponse> {
    return this.authService.refresh(request.refreshToken);
  }

  @Post('/logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  async logout(@Req() req: Request & { user: User }): Promise<void> {
    await this.authService.logout(req.user.id);
  }
}
