import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { Request } from 'express';

// JWT payload 里携带的已登录用户信息（由 JwtStrategy.validate 返回）
export interface JwtPayload {
  sub: string; // userId
  email: string;
  role: string;
}

// 注入到请求上的 user 对象类型
export interface RequestUser extends JwtPayload {}

/**
 * @CurrentUser() 装饰器：从 req.user 取出当前登录用户
 * 用法：
 *   @Get('profile')
 *   @UseGuards(JwtAuthGuard)
 *   getProfile(@CurrentUser() user: RequestUser) { ... }
 *
 * 需配合 JwtAuthGuard 使用，否则 req.user 为 undefined
 */
export const CurrentUser = createParamDecorator(
  (data: keyof RequestUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const user = request.user as RequestUser | undefined;
    return data ? user?.[data] : user;
  },
);
