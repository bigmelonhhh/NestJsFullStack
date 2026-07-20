import { Injectable } from '@nestjs/common';
import { Prisma, Product } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundError } from '../shared/errors/app-error';
import { toPrismaPagination } from '../shared/pagination';
import {
  CreateProductInput,
  ProductQueryInput,
  UpdateProductInput,
} from './dto';

/**
 * 商品服务：CRUD + 分页查询
 * 公开查询只返回 isActive=true 的商品；写操作由控制器层守卫限制为管理员
 */
@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ProductQueryInput) {
    const where: Prisma.ProductWhereInput = {
      isActive: true, // 公开列表只看上架商品
    };
    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }
    if (query.keyword) {
      where.name = { contains: query.keyword };
    }

    const { skip, take } = toPrismaPagination(query);
    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take,
        include: { category: true }, // 关联分类，避免前端再查一次（防 N+1）
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      items,
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { category: true },
    });
    if (!product) {
      throw new NotFoundError('商品', id);
    }
    return product;
  }

  async create(input: CreateProductInput) {
    return this.prisma.product.create({
      data: {
        name: input.name,
        description: input.description,
        price: input.price,
        stock: input.stock,
        categoryId: input.categoryId,
        imageUrl: input.imageUrl,
      },
      include: { category: true },
    });
  }

  async update(id: string, input: UpdateProductInput) {
    // 先确认存在，不存在抛 404（而非 Prisma 的 P2025）
    await this.findOne(id);
    return this.prisma.product.update({
      where: { id },
      data: input,
      include: { category: true },
    });
  }

  async remove(id: string): Promise<{ id: string }> {
    await this.findOne(id);
    await this.prisma.product.delete({ where: { id } });
    return { id };
  }
}
