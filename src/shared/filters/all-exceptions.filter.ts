import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';
import { AppError } from '../errors/app-error';

/**
 * 全局异常过滤器：统一错误响应格式
 * {
 *   code: 'NOT_FOUND',          // 业务错误码，前端按此分支
 *   message: '商品不存在: xxx',   // 人类可读信息
 *   timestamp: '...',
 *   path: '/api/products/xxx'
 * }
 *
 * 处理三类异常：
 * 1. AppError —— 业务层主动抛出的可预期错误，按其 statusCode 返回
 * 2. HttpException —— NestJS 内置异常（如 ValidationPipe 抛出的）
 * 3. Prisma 已知错误 —— 转成合适的 HTTP 状态码（如唯一约束冲突→409）
 * 4. 其他未知异常 —— 记录完整堆栈，返回 500，不泄露内部细节
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const base = {
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    // 1. 我们自己的业务错误
    if (exception instanceof AppError) {
      response.status(exception.statusCode).json({
        code: exception.code,
        message: exception.message,
        ...base,
      });
      return;
    }

    // 2. NestJS HttpException（含内置 ValidationPipe、守卫抛出的 Unauthorized 等）
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();
      const message =
        typeof res === 'string'
          ? res
          : (res as Record<string, unknown>).message ?? exception.message;
      response.status(status).json({
        code: this.httpStatusToCode(status),
        message,
        ...base,
      });
      return;
    }

    // 3. Prisma 已知错误
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const { status, code, message } = this.mapPrismaError(exception);
      response.status(status).json({ code, message, ...base });
      return;
    }

    // 4. 未知异常：记录完整堆栈，对外只返回通用提示
    this.logger.error(
      `未处理异常: ${request.method} ${request.url}`,
      exception instanceof Error ? exception.stack : String(exception),
    );
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      code: 'INTERNAL_ERROR',
      message: '服务器内部错误，请稍后重试',
      ...base,
    });
  }

  private mapPrismaError(
    e: Prisma.PrismaClientKnownRequestError,
  ): { status: number; code: string; message: string } {
    switch (e.code) {
      case 'P2002': // 唯一约束冲突
        return {
          status: HttpStatus.CONFLICT,
          code: 'CONFLICT',
          message: '数据已存在，违反唯一约束',
        };
      case 'P2025': // 记录不存在
        return {
          status: HttpStatus.NOT_FOUND,
          code: 'NOT_FOUND',
          message: '资源不存在',
        };
      default:
        return {
          status: HttpStatus.BAD_REQUEST,
          code: 'DB_ERROR',
          message: `数据库错误: ${e.code}`,
        };
    }
  }

  private httpStatusToCode(status: number): string {
    switch (status) {
      case 400:
        return 'BAD_REQUEST';
      case 401:
        return 'UNAUTHORIZED';
      case 403:
        return 'FORBIDDEN';
      case 404:
        return 'NOT_FOUND';
      case 409:
        return 'CONFLICT';
      case 422:
        return 'VALIDATION_ERROR';
      default:
        return 'ERROR';
    }
  }
}
