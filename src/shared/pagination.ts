import { z } from 'zod';

// 分页查询通用 schema：page 从 1 开始，pageSize 1~100
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

// 计算分页 skip/take（供 Prisma 查询用）
export function toPrismaPagination(input: PaginationInput): {
  skip: number;
  take: number;
} {
  return {
    skip: (input.page - 1) * input.pageSize,
    take: input.pageSize,
  };
}
