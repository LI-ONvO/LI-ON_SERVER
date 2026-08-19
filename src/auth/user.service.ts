import { Prisma, User } from 'generated/prisma/client';
import { PrismaService } from 'src/common/prisma/prisma.service';

export class UserService {
  constructor(private readonly prismaService: PrismaService) {}

  async getUserById(userId: number): Promise<User | null> {
    return this.prismaService.user.findUnique({
      where: { id: userId },
    });
  }

  async createUser(data: Prisma.UserCreateInput): Promise<User> {
    return this.prismaService.user.create({
      data,
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