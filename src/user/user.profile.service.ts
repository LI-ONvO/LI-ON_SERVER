import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import {
  MyProfileResponse,
  UpdateProfileResponse,
} from './dto/user-profile.dto';
import { UserNotFoundException } from './user.exception';

@Injectable()
export class UserProfileService {
  constructor(private readonly prismaService: PrismaService) {}

  async getMyProfile(userId: number): Promise<MyProfileResponse> {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        desired_fields: { include: { field: true }, orderBy: { id: 'asc' } },
      },
    });

    if (!user) {
      throw UserNotFoundException();
    }

    return {
      id: user.id,
      email: user.email,
      nickname: user.profile?.nickname ?? '',
      isOnboarded: user.is_onboarded,
      desiredFields: user.desired_fields.map((desired) => ({
        id: desired.field.id,
        name: desired.field.name,
      })),
    };
  }

  async updateMyProfile(
    userId: number,
    nickname: string,
  ): Promise<UpdateProfileResponse> {
    // 프로필 행은 가입 시 만들어지지만, 없더라도 수정 요청이 500 으로 새지 않게 upsert 한다.
    await this.prismaService.userProfile.upsert({
      where: { user_id: userId },
      update: { nickname },
      create: { user_id: userId, nickname },
    });

    return { id: userId, nickname };
  }
}
