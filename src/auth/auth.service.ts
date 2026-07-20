import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { ConflictError, UnauthorizedError } from '../shared/errors/app-error';
import { JwtPayload } from '../shared/decorators/current-user.decorator';
import { AuthResponse, LoginInput, RegisterInput } from './dto';

/**
 * 认证服务：注册、登录、登出、签发/注销 JWT
 * 业务规则集中在此层，控制器只做参数解析与调用
 *
 * Redis 在认证链路承担两个职责：
 * 1. 登录限流 —— 由 RateLimitGuard 拦截（RedisService.incr + expire）
 * 2. JWT 黑名单 —— logout 时写入 jwt:blacklist:{jti}，JwtStrategy 查询
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly redis: RedisService,
  ) {}

  async register(input: RegisterInput): Promise<AuthResponse> {
    // 1. 检查邮箱是否已注册
    const exists = await this.prisma.user.findUnique({
      where: { email: input.email },
    });
    if (exists) {
      throw new ConflictError('该邮箱已被注册');
    }

    // 2. 密码哈希：bcrypt，cost=10（生产可调到 12）
    const passwordHash = await bcrypt.hash(input.password, 10);

    // 3. 落库
    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        name: input.name,
      },
    });

    return this.signToken(user.id, user.email, user.name, user.role);
  }

  async login(input: LoginInput): Promise<AuthResponse> {
    // 1. 按邮箱查用户
    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
    });
    if (!user) {
      // 安全实践：不区分"邮箱不存在"与"密码错误"，统一提示
      throw new UnauthorizedError('邮箱或密码错误');
    }

    // 2. 校验密码
    const ok = await bcrypt.compare(input.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedError('邮箱或密码错误');
    }

    return this.signToken(user.id, user.email, user.name, user.role);
  }

  /**
   * 登出：将当前 token 的 jti 写入 Redis 黑名单
   * 黑名单 key 的 TTL = token 剩余有效期，过期后自动清理（避免无限堆积）
   * 之后该 token 再被使用时，JwtStrategy.validate 会查到黑名单并拒绝
   */
  async logout(token: string): Promise<void> {
    // decode 不验签（守卫已验过），只取 jti 和 exp
    const decoded = this.jwtService.decode(token) as
      | { jti?: string; exp?: number }
      | null;
    if (!decoded?.jti) {
      return; // 无 jti 的旧 token，无法注销，直接返回
    }

    const now = Math.floor(Date.now() / 1000);
    const ttl = decoded.exp ? decoded.exp - now : 3600;
    if (ttl > 0) {
      await this.redis.set(
        `jwt:blacklist:${decoded.jti}`,
        '1',
        ttl,
      );
    }
  }

  // 签发 access token，返回不含敏感字段的用户信息
  private signToken(
    userId: string,
    email: string,
    name: string,
    role: string,
  ): AuthResponse {
    // jti：每个 token 唯一标识，用于黑名单精确注销
    const payload: JwtPayload = {
      sub: userId,
      email,
      role,
      jti: randomUUID(),
    };
    const accessToken = this.jwtService.sign(payload);
    return {
      accessToken,
      user: { id: userId, email, name, role },
    };
  }
}
