import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

/**
 * Redis 服务：封装 ioredis 客户端，全局可注入
 *
 * 在本项目里承担三类职责（对应三大最佳实践）：
 * 1. 读缓存 —— 商品列表/详情，减少 MySQL 压力（ProductsService）
 * 2. 原子计数 —— 登录限流（RateLimitGuard）
 * 3. 跨请求状态 —— JWT 黑名单（AuthService.logout / JwtStrategy.validate）
 *
 * 用 ioredis 而非 cache-manager，是因为限流/黑名单需要原生命令
 * （INCR/EXPIRE/SET NX EX），cache-manager 的抽象反而束手束脚。
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis;

  constructor(private readonly config: ConfigService) {
    this.client = new Redis({
      host: this.config.get<string>('REDIS_HOST'),
      port: this.config.get<number>('REDIS_PORT'),
      password: this.config.get<string>('REDIS_PASSWORD') || undefined,
      lazyConnect: false,
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      // 连接异常时不让进程崩溃，记录日志后自动重试
      retryStrategy: (times) => Math.min(times * 500, 3000),
    });

    this.client.on('error', (err) => {
      this.logger.error(`连接异常: ${err.message}`);
    });
    this.client.on('connect', () => {
      this.logger.log('Redis 已连接');
    });
  }

  /** 暴露原生客户端，需要高级命令时使用（如 Hash / ZSET） */
  get native(): Redis {
    return this.client;
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  /** 写入并设置过期时间（秒） */
  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    await this.client.set(key, value, 'EX', ttlSeconds);
  }

  async del(...keys: string[]): Promise<number> {
    return this.client.del(...keys);
  }

  /** 自增（原子操作，限流计数器核心） */
  async incr(key: string): Promise<number> {
    return this.client.incr(key);
  }

  /** 设置过期时间（配合 INCR 使用：首次计数时设窗口） */
  async expire(key: string, ttlSeconds: number): Promise<void> {
    await this.client.expire(key, ttlSeconds);
  }

  async exists(key: string): Promise<boolean> {
    return (await this.client.exists(key)) === 1;
  }

  /**
   * 按模式批量删除（如商品列表缓存失效：products:list:*）
   * 用 SCAN 而非 KEYS，避免阻塞 Redis（KEYS 会扫描全库）
   */
  async delByPattern(pattern: string): Promise<number> {
    let cursor = '0';
    let deleted = 0;
    do {
      const [next, keys] = await this.client.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        100,
      );
      cursor = next;
      if (keys.length > 0) {
        deleted += await this.client.del(...keys);
      }
    } while (cursor !== '0');
    return deleted;
  }

  onModuleDestroy(): Promise<string> {
    this.logger.log('关闭 Redis 连接');
    return this.client.quit();
  }
}
