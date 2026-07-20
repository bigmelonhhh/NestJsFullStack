import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service';

/**
 * 全局 Redis 模块：整个应用注入 RedisService，无需每个模块单独 import
 * 与 PrismaModule 同模式（@Global），保持基础设施层一致
 */
@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
