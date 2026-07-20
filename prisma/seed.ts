// 种子数据：初始化分类、商品、演示账号
// 执行：npm run prisma:seed
import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  // 清理旧数据（保留可重复执行）——注意顺序，先删依赖方
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();

  // 演示账号（密码统一 123456）
  const passwordHash = await bcrypt.hash('123456', 10);
  await prisma.user.upsert({
    where: { email: 'admin@demo.com' },
    update: {},
    create: {
      email: 'admin@demo.com',
      passwordHash,
      name: '管理员',
      role: Role.ADMIN,
    },
  });
  await prisma.user.upsert({
    where: { email: 'user@demo.com' },
    update: {},
    create: {
      email: 'user@demo.com',
      passwordHash,
      name: '普通用户',
      role: Role.CUSTOMER,
    },
  });

  // 分类
  const electronics = await prisma.category.create({
    data: { name: '电子产品', slug: 'electronics' },
  });
  const books = await prisma.category.create({
    data: { name: '图书', slug: 'books' },
  });

  // 商品
  await prisma.product.createMany({
    data: [
      {
        name: '机械键盘',
        description: '青轴机械键盘，段落感强',
        price: 299,
        stock: 100,
        categoryId: electronics.id,
        imageUrl: 'https://placehold.co/400?text=Keyboard',
      },
      {
        name: '无线鼠标',
        price: 99,
        stock: 200,
        categoryId: electronics.id,
      },
      {
        name: 'MySQL 必知必会',
        description: 'SQL 入门经典',
        price: 59,
        stock: 50,
        categoryId: books.id,
      },
      {
        name: 'TypeScript 实战',
        price: 79,
        stock: 80,
        categoryId: books.id,
      },
    ],
  });

  // eslint-disable-next-line no-console
  console.log('✅ 种子数据已写入：1 管理员 + 1 普通用户 + 2 分类 + 4 商品');
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error('种子数据写入失败:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
