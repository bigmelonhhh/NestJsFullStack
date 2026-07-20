import { z } from 'zod';
import { paginationSchema } from '../shared/pagination';

// 创建商品 schema（前端可复用）
export const createProductSchema = z.object({
  name: z.string().min(1, '商品名不能为空').max(200),
  description: z.string().max(2000).optional(),
  // 金额用 number 传输，落库转 Decimal；禁止负数
  price: z.number().min(0, '价格不能为负'),
  stock: z.number().int().min(0, '库存不能为负'),
  categoryId: z.string().uuid('分类ID格式不正确'),
  imageUrl: z.string().url().optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;

// 更新商品 schema（所有字段可选）
export const updateProductSchema = createProductSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export type UpdateProductInput = z.infer<typeof updateProductSchema>;

// 商品列表查询 schema（分页 + 过滤）
export const productQuerySchema = paginationSchema.extend({
  categoryId: z.string().uuid().optional(),
  keyword: z.string().optional(),
});

export type ProductQueryInput = z.infer<typeof productQuerySchema>;
