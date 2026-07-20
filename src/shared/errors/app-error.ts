// 类型化错误层级：所有业务错误都继承 AppError，全局过滤器统一处理
// 设计原则：不抛裸 Error，错误带 code + statusCode，便于前端按 code 分支处理

export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number,
    public readonly isOperational: boolean = true,
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

// 400 - 请求参数错误
export class ValidationError extends AppError {
  constructor(public readonly details: unknown) {
    super('请求参数校验失败', 'VALIDATION_ERROR', 400);
  }
}

// 401 - 未登录 / token 失效
export class UnauthorizedError extends AppError {
  constructor(message = '未登录或登录已过期') {
    super(message, 'UNAUTHORIZED', 401);
  }
}

// 403 - 已登录但无权限
export class ForbiddenError extends AppError {
  constructor(message = '无权访问该资源') {
    super(message, 'FORBIDDEN', 403);
  }
}

// 404 - 资源不存在
export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(
      id ? `${resource}不存在: ${id}` : `${resource}不存在`,
      'NOT_FOUND',
      404,
    );
  }
}

// 409 - 冲突（如邮箱已注册、库存不足）
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 'CONFLICT', 409);
  }
}

// 业务规则违反（如库存不足导致下单失败）—— 业务上可预期，但请求被拒绝
export class BusinessError extends AppError {
  constructor(message: string, code = 'BUSINESS_ERROR') {
    super(message, code, 422);
  }
}

// 429 - 请求过于频繁（限流触发）
export class TooManyRequestsError extends AppError {
  constructor(message = '请求过于频繁，请稍后再试') {
    super(message, 'TOO_MANY_REQUESTS', 429);
  }
}
