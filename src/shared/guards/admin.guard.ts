import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import { ForbiddenError } from '../errors/app-error';
import { RequestUser } from '../decorators/current-user.decorator';

/**
 * 管理员权限守卫：检查当前用户 role 是否为 ADMIN
 * 必须在 JwtAuthGuard 之后使用（依赖 req.user 已被填充）
 *
 * 用法：@UseGuards(JwtAuthGuard, AdminGuard)
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as RequestUser | undefined;
    if (!user || user.role !== 'ADMIN') {
      throw new ForbiddenError('需要管理员权限');
    }
    return true;
  }
}
