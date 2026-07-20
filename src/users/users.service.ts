import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundError } from '../shared/errors/app-error';

/**
 * 用户服务：处理用户资料相关业务
 * 注意：select 时永远排除 passwordHash，避免敏感字段外泄
 */
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        createdAt: true,
        // passwordHash 刻意不 select
      },
    });
    if (!user) {
      throw new NotFoundError('用户', userId);
    }
    return user;
  }
}
