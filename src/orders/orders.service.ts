import { Injectable } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  BusinessError,
  ForbiddenError,
  NotFoundError,
} from '../shared/errors/app-error';
import { toPrismaPagination } from '../shared/pagination';
import { CreateOrderInput, MyOrderQueryInput } from './dto';

/**
 * 订单服务
 * 核心方法 createOrder：在一个数据库事务里完成「校验商品 → 扣库存 → 写订单」
 * 防超卖用「乐观扣减」：UPDATE ... WHERE stock >= qty，count=0 即库存不足
 */
@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async createOrder(userId: string, input: CreateOrderInput) {
    return this.prisma.$transaction(async (tx) => {
      let total = 0; // 教学版用 number 累加；生产建议用 Decimal 累加避免浮点误差
      const orderItemsData: {
        productId: string;
        quantity: number;
        price: number;
      }[] = [];

      // 逐个商品校验 + 乐观扣库存
      for (const item of input.items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });
        if (!product) {
          throw new NotFoundError('商品', item.productId);
        }
        if (!product.isActive) {
          throw new BusinessError(`商品「${product.name}」已下架`);
        }

        // 乐观锁扣减：仅当库存 >= 购买量时才更新
        // updateMany 返回 count，count=0 说明并发下库存已被抢空
        const result = await tx.product.updateMany({
          where: { id: item.productId, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });
        if (result.count === 0) {
          throw new BusinessError(`商品「${product.name}」库存不足`);
        }

        total += Number(product.price) * item.quantity;
        orderItemsData.push({
          productId: item.productId,
          quantity: item.quantity,
          price: Number(product.price), // 下单时价格快照
        });
      }

      // 创建订单 + 订单项（嵌套写入，一次 INSERT）
      const order = await tx.order.create({
        data: {
          userId,
          status: OrderStatus.PENDING,
          totalAmount: total,
          items: { create: orderItemsData },
        },
        include: {
          items: { include: { product: true } },
        },
      });

      return order;
    });
  }

  async findMyOrders(userId: string, query: MyOrderQueryInput) {
    const where: { userId: string; status?: OrderStatus } = { userId };
    if (query.status) {
      where.status = query.status;
    }
    const { skip, take } = toPrismaPagination(query);
    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take,
        include: { items: { include: { product: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.count({ where }),
    ]);
    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async findOne(userId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { product: true } } },
    });
    if (!order) {
      throw new NotFoundError('订单', orderId);
    }
    // 越权防护：只能看自己的订单
    if (order.userId !== userId) {
      throw new ForbiddenError('无权查看该订单');
    }
    return order;
  }
}
