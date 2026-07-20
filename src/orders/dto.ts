import { z } from 'zod';
import { paginationSchema } from '../shared/pagination';

// 下单请求 schema
export const createOrderSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().uuid('商品ID格式不正确'),
        quantity: z.number().int().min(1, '购买数量至少为 1'),
      }),
    )
    .min(1, '至少购买一件商品'),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

// 我的订单列表查询 schema
export const myOrderQuerySchema = paginationSchema.extend({
  status: z
    .enum(['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED'])
    .optional(),
});

export type MyOrderQueryInput = z.infer<typeof myOrderQuerySchema>;
