import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { Request } from 'express';

/**
 * @Token() 装饰器：从请求头提取 raw JWT（用于登出时写入黑名单）
 * 用法：
 *   @Post('logout')
 *   @UseGuards(JwtAuthGuard)
 *   logout(@Token() token: string) { ... }
 *
 * 必须配合 JwtAuthGuard 使用（守卫已校验过 token 有效性）
 */
export const Token = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): string => {
    const req = ctx.switchToHttp().getRequest<Request>();
    const auth = req.headers.authorization || '';
    return auth.startsWith('Bearer ') ? auth.slice(7) : '';
  },
);
