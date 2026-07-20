import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload, RequestUser } from '../shared/decorators/current-user.decorator';

/**
 * JWT 策略：解析 Authorization: Bearer <token> 头
 * - secretOrKey 从环境变量读取
 * - validate 返回的对象会被挂到 req.user 上，供 @CurrentUser() 取用
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET')!,
    });
  }

  async validate(payload: JwtPayload): Promise<RequestUser> {
    // 这里只做 token 解析，不再查库（token 本身即凭证）
    // 如需更严格，可在此查库确认用户仍存在/未被禁用
    return { sub: payload.sub, email: payload.email, role: payload.role };
  }
}
