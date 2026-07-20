import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { ConflictError, UnauthorizedError } from '../shared/errors/app-error';
import { JwtPayload } from '../shared/decorators/current-user.decorator';
import { AuthResponse, LoginInput, RegisterInput } from './dto';

/**
 * 认证服务：注册、登录、签发 JWT
 * 业务规则集中在此层，控制器只做参数解析与调用
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
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

  // 签发 access token，返回不含敏感字段的用户信息
  private signToken(
    userId: string,
    email: string,
    name: string,
    role: string,
  ): AuthResponse {
    const payload: JwtPayload = { sub: userId, email, role };
    const accessToken = this.jwtService.sign(payload);
    return {
      accessToken,
      user: { id: userId, email, name, role },
    };
  }
}
