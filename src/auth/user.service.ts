import { Injectable } from '@nestjs/common';
import { Prisma, User } from 'generated/prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';

export type UserWithProfile = Prisma.UserGetPayload<{
  include: { profile: true };
}>;

@Injectable()
export class UserService {
  constructor(private readonly prismaService: PrismaService) {}

  async getUserById(userId: number): Promise<User | null> {
    return this.prismaService.user.findUnique({
      where: { id: userId },
    });
  }

  async getUserByEmail(email: string): Promise<UserWithProfile | null> {
    return this.prismaService.user.findUnique({
      where: { email },
      include: { profile: true },
    });
  }

  async existsByEmail(email: string): Promise<boolean> {
    const count = await this.prismaService.user.count({ where: { email } });
    return count > 0;
  }

  async createUser(data: Prisma.UserCreateInput): Promise<User> {
    return this.prismaService.user.create({
      data,
      include: { profile: true },
    });
  }

  async updateUser(
    userId: number,
    data: Prisma.UserUpdateInput,
  ): Promise<User> {
    return this.prismaService.user.update({
      where: { id: userId },
      data,
    });
  }

  async deleteUser(userId: number): Promise<User> {
    return this.prismaService.user.delete({
      where: { id: userId },
    });
  }
}