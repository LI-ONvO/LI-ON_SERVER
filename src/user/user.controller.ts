import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { User } from 'generated/prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DeviceTokenRequest } from './dto/device-token.dto';
import { OnboardingQuestionResponse } from './dto/onboarding-question.dto';
import {
  SubmitOnboardingRequest,
  SubmitOnboardingResponse,
} from './dto/submit-onboarding.dto';
import {
  MyProfileResponse,
  UpdateProfileRequest,
  UpdateProfileResponse,
} from './dto/user-profile.dto';
import { DeviceTokenService } from './device-token.service';
import { OnboardingService } from './onboarding.service';
import { UserProfileService } from './user.profile.service';

@Controller('api')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(
    private readonly userProfileService: UserProfileService,
    private readonly onboardingService: OnboardingService,
    private readonly deviceTokenService: DeviceTokenService,
  ) {}

  @Get('/onboarding/questions')
  @HttpCode(HttpStatus.OK)
  async getOnboardingQuestions(): Promise<OnboardingQuestionResponse[]> {
    return this.onboardingService.getQuestions();
  }

  @Post('/users/me/onboarding')
  @HttpCode(HttpStatus.OK)
  async submitOnboarding(
    @Req() req: Request & { user: User },
    @Body() request: SubmitOnboardingRequest,
  ): Promise<SubmitOnboardingResponse> {
    return this.onboardingService.submit(req.user.id, request);
  }

  @Get('/users/me')
  @HttpCode(HttpStatus.OK)
  async getMyProfile(
    @Req() req: Request & { user: User },
  ): Promise<MyProfileResponse> {
    return this.userProfileService.getMyProfile(req.user.id);
  }

  @Patch('/users/me')
  @HttpCode(HttpStatus.OK)
  async updateMyProfile(
    @Req() req: Request & { user: User },
    @Body() request: UpdateProfileRequest,
  ): Promise<UpdateProfileResponse> {
    return this.userProfileService.updateMyProfile(
      req.user.id,
      request.nickname,
    );
  }

  @Post('/users/me/device-tokens')
  @HttpCode(HttpStatus.NO_CONTENT)
  async registerDeviceToken(
    @Req() req: Request & { user: User },
    @Body() request: DeviceTokenRequest,
  ): Promise<void> {
    return this.deviceTokenService.register(req.user.id, request.token);
  }

  @Delete('/users/me/device-tokens')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unregisterDeviceToken(
    @Req() req: Request & { user: User },
    @Body() request: DeviceTokenRequest,
  ): Promise<void> {
    return this.deviceTokenService.unregister(req.user.id, request.token);
  }
}
