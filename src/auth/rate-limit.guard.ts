import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { RedisService } from '../redis/redis.service';
import { TooManyRequestsError } from '../shared/errors/app-error';

/**
 * 登录限流守卫：基于 Redis 固定窗口计数器，防暴力破解
 *
 * 策略：同一 IP 15 分钟内最多 5 次登录尝试
 * - INCR login:rate:{ip}，首次计数时 EXPIRE 设 900s 窗口
 * - 超过 5 次直接抛 429 TooManyRequestsError
 *
 * 用 Redis 而非内存计数：多实例部署共享计数，且进程重启不丢失
 * 用法：@Post('login') @UseGuards(RateLimitGuard)
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private static readonly WINDOW = 900; // 15 分钟窗口（秒）
  private static readonly MAX_ATTEMPTS = 5; // 窗口内最大尝试次数

  constructor(private readonly redis: RedisService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<Request>();
    const ip = this.getClientIp(req);

    const key = `login:rate:${ip}`;
    const count = await this.redis.incr(key);

    // 首次计数时设置过期时间（固定窗口）
    if (count === 1) {
      await this.redis.expire(key, RateLimitGuard.WINDOW);
    }

    if (count > RateLimitGuard.MAX_ATTEMPTS) {
      throw new TooManyRequestsError(
        '登录尝试过于频繁，请 15 分钟后再试',
      );
    }

    return true;
  }

  /** 提取客户端真实 IP（考虑反向代理场景） */
  private getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return req.socket.remoteAddress || 'unknown';
  }
}
