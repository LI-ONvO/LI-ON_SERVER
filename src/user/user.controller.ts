import {
  Body,
  Controller,
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
import { OnboardingService } from './onboarding.service';
import { UserProfileService } from './user.profile.service';

@Controller('api')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(
    private readonly userProfileService: UserProfileService,
    private readonly onboardingService: OnboardingService,
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
}
