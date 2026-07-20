import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Prisma 服务：全局唯一的数据库连接客户端
 * - 继承 PrismaClient，复用其连接池
 * - 实现 OnModuleInit/OnModuleDestroy，随应用生命周期连接/断开
 * - 这里不再封装额外查询方法，业务层直接用 prisma.user.findMany 等
 *   保持"Repository 由 Prisma 承担"的约定
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('数据库连接已建立');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log('数据库连接已断开');
  }
}
