import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RateLimitGuard } from './rate-limit.guard';
import { ZodValidationPipe } from '../shared/pipes/zod-validation.pipe';
import { Token } from '../shared/decorators/token.decorator';
import { AuthService } from './auth.service';
import { LoginInput, RegisterInput, loginSchema, registerSchema } from './dto';

@ApiTags('认证')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: '注册新用户' })
  register(
    @Body(new ZodValidationPipe(registerSchema)) dto: RegisterInput,
  ) {
    return this.authService.register(dto);
  }

  @Post('login')
  @UseGuards(RateLimitGuard) // Redis 限流：同 IP 15 分钟最多 5 次，防暴力破解
  @ApiOperation({ summary: '登录，返回 JWT' })
  login(@Body(new ZodValidationPipe(loginSchema)) dto: LoginInput) {
    return this.authService.login(dto);
  }

  @Post('logout')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '登出，将当前 token 加入黑名单' })
  async logout(@Token() token: string) {
    await this.authService.logout(token);
    return { message: '已登出' };
  }
}
