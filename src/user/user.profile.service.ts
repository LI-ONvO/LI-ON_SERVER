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
        desired_fields: { include: { field: true }, orderBy: { id: 'asc' } },
      },
    });

    if (!user) {
      throw UserNotFoundException();
    }

    return {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
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
    // update는 대상이 없으면 던지기 때문에, 없는 사용자를 500이 아니라 404로
    const { count } = await this.prismaService.user.updateMany({
      where: { id: userId },
      data: { nickname },
    });

    if (count === 0) {
      throw UserNotFoundException();
    }

    return { id: userId, nickname };
  }
}
