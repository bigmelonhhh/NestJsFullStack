import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { RedisService } from '../redis/redis.service';
import {
  JwtPayload,
  RequestUser,
} from '../shared/decorators/current-user.decorator';
import { UnauthorizedError } from '../shared/errors/app-error';

/**
 * JWT 策略：解析 Authorization: Bearer <token> 头
 * - secretOrKey 从环境变量读取
 * - validate 返回的对象会被挂到 req.user 上，供 @CurrentUser() 取用
 *
 * Redis 黑名单校验：validate 时查 jwt:blacklist:{jti}，
 * 命中说明该 token 已被登出/吊销，拒绝访问。
 * 这补上了「JWT 无状态、无法即时吊销」的短板。
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly config: ConfigService,
    private readonly redis: RedisService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET')!,
    });
  }

  async validate(payload: JwtPayload): Promise<RequestUser> {
    // 黑名单校验：token 是否已被主动登出
    if (payload.jti) {
      const blocked = await this.redis.exists(`jwt:blacklist:${payload.jti}`);
      if (blocked) {
        throw new UnauthorizedError('登录已失效，请重新登录');
      }
    }

    return { sub: payload.sub, email: payload.email, role: payload.role };
  }
}
