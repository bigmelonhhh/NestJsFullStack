import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { Prisma, Product } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
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
 *
 * Redis 缓存策略（读多写少，典型缓存场景）：
 * - 列表缓存：key=products:list:{hash(query)}，TTL 60s
 * - 详情缓存：key=product:{id}，TTL 120s
 * - 写操作（增/改/删）主动失效：del product:{id} + SCAN del products:list:*
 */
@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  // 缓存 TTL（秒）
  private static readonly LIST_TTL = 60;
  private static readonly DETAIL_TTL = 120;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * 商品列表（分页 + 分类筛选 + 关键词搜索）
   * 查询参数组合有限，按参数生成 hash 作为缓存 key
   */
  async findAll(query: ProductQueryInput) {
    const cacheKey = this.listCacheKey(query);

    // 1. 先查缓存，命中直接返回（大幅减少 MySQL 查询）
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      this.logger.debug(`列表缓存命中: ${cacheKey}`);
      return JSON.parse(cached);
    }

    // 2. 未命中，查数据库
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

    const result = {
      items,
      total,
      page: query.page,
      pageSize: query.pageSize,
    };

    // 3. 回写缓存（序列化后存入，60s 过期）
    await this.redis.set(cacheKey, JSON.stringify(result), ProductsService.LIST_TTL);

    return result;
  }

  async findOne(id: string): Promise<Product> {
    const cacheKey = `product:${id}`;

    // 1. 先查缓存
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      this.logger.debug(`详情缓存命中: ${cacheKey}`);
      return JSON.parse(cached) as Product;
    }

    // 2. 未命中，查数据库
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { category: true },
    });
    if (!product) {
      throw new NotFoundError('商品', id);
    }

    // 3. 回写缓存
    await this.redis.set(cacheKey, JSON.stringify(product), ProductsService.DETAIL_TTL);

    return product;
  }

  async create(input: CreateProductInput) {
    const product = await this.prisma.product.create({
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
    // 新增商品后，列表页内容变化，失效所有列表缓存
    await this.invalidateListCache();
    return product;
  }

  async update(id: string, input: UpdateProductInput) {
    // 先确认存在，不存在抛 404（而非 Prisma 的 P2025）
    await this.findOne(id);
    const product = await this.prisma.product.update({
      where: { id },
      data: input,
      include: { category: true },
    });
    // 更新后失效该商品详情 + 所有列表缓存（价格/库存/状态可能进列表）
    await this.redis.del(`product:${id}`);
    await this.invalidateListCache();
    return product;
  }

  async remove(id: string): Promise<{ id: string }> {
    await this.findOne(id);
    await this.prisma.product.delete({ where: { id } });
    await this.redis.del(`product:${id}`);
    await this.invalidateListCache();
    return { id };
  }

  /**
   * 生成列表缓存 key：按查询参数 hash，保证同参数命中同一缓存
   * 截取前 16 位，足够区分且 key 更短
   */
  private listCacheKey(query: ProductQueryInput): string {
    const raw = JSON.stringify({
      p: query.page,
      s: query.pageSize,
      c: query.categoryId ?? '',
      k: query.keyword ?? '',
    });
    const hash = createHash('md5').update(raw).digest('hex').slice(0, 16);
    return `products:list:${hash}`;
  }

  /**
   * 失效所有列表缓存（写操作后调用）
   * 用 SCAN 删除 products:list:* 模式，避免 KEYS 阻塞 Redis
   */
  private async invalidateListCache(): Promise<void> {
    const n = await this.redis.delByPattern('products:list:*');
    if (n > 0) {
      this.logger.debug(`已失效 ${n} 个列表缓存 key`);
    }
  }
}
