import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * JWT 鉴权守卫：套在控制器/方法上，校验请求携带的 token
 * 校验通过后 req.user 即 JwtStrategy.validate 的返回值
 *
 * 用法：
 *   @UseGuards(JwtAuthGuard)
 *   @Get('profile')
 *   getProfile(@CurrentUser() user: RequestUser) { ... }
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
