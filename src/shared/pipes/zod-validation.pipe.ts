import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';
import { ZodSchema } from 'zod';
import { ValidationError } from '../errors/app-error';

/**
 * Zod 校验管道：把任意 Zod schema 变成 NestJS Pipe
 * 用法：@Body(new ZodValidationPipe(createProductSchema)) dto
 *
 * 校验失败抛 ValidationError（400），全局过滤器统一返回结构化错误
 * 校验通过后返回 zod 解析后的数据（带默认值、类型转换）
 */
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown, _metadata: ArgumentMetadata): unknown {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      // 把 zod 的错误明细透出，前端可逐字段展示
      throw new ValidationError(result.error.issues);
    }
    return result.data;
  }
}
