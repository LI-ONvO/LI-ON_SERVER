import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OnboardingService } from './onboarding.service';
import { UserController } from './user.controller';
import { UserProfileService } from './user.profile.service';

@Module({
  imports: [AuthModule],
  controllers: [UserController],
  providers: [UserProfileService, OnboardingService],
})
export class UserModule {}
