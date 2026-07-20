# AGENTS.md

This file provides guidance to Qoder (qoder.com) when working with code in this repository.

## Project Overview

前后端分离的简易电商系统。根目录是 NestJS 后端，`react-web/` 是 React 前端。两个项目各自独立的 `package.json` 和 `node_modules`。

> 前端开发时请同时参考 [`react-web/AGENTS.md`](react-web/AGENTS.md)，其中包含 UI 样式规范、组件模式、状态管理等前端专属约束。

## Commands

### Backend (root directory)

```bash
docker compose up -d              # 启动本地 MySQL(3306) + Redis(6380)
npm run start:dev                 # 开发模式启动后端 (localhost:3000, watch)
npm run build                     # 编译 TypeScript → dist/
npm run prisma:generate           # 生成 Prisma Client
npm run prisma:migrate            # 开发环境数据库迁移 (prisma migrate dev)
npm run prisma:deploy             # 生产环境迁移部署
npm run prisma:seed               # 填充种子数据 (ts-node prisma/seed.ts)
npm run prisma:studio             # 打开 Prisma 可视化数据库管理
```

### Frontend (react-web/)

```bash
cd react-web && npm run dev       # 开发服务器 (localhost:5173, /api 代理到 3000)
cd react-web && npm run build     # 生产构建 (tsc -b && vite build)
cd react-web && npm run lint      # ESLint 检查
```

### Environment

后端环境变量在根目录 `.env`（参考 `.env.example`），前端在 `react-web/.env.development`。

## Architecture

### Backend: Feature-First 三层架构

```
Controller (HTTP 层，不写业务逻辑)
  → Service (业务逻辑，不碰 HTTP 类型)
    → PrismaService (数据访问)
```

每个业务模块在 `src/<feature>/` 下包含：`*.module.ts`、`*.controller.ts`、`*.service.ts`、`dto.ts`（Zod schema 作为接口契约）。

全局基础设施（`app.module.ts` 注册）：
- `PrismaModule` / `RedisModule` — 全局注入，业务 Service 直接 inject 使用
- `AllExceptionsFilter` — 统一错误响应格式
- `LoggingInterceptor` — 请求耗时日志
- 路由前缀 `/api`（`/health` 除外）

### Backend: Key Patterns

- **DTO 校验**：用 Zod schema + `ZodValidationPipe`，不用 class-validator。用法：`@Body(new ZodValidationPipe(schema)) dto`
- **错误处理**：抛 `AppError` 子类（`src/shared/errors/app-error.ts`），不抛裸 Error。全局过滤器按 `code` + `statusCode` 统一响应
- **Redis 三用途**：商品读缓存（Cache-Aside，先更新 DB 再删缓存）、登录限流（固定窗口计数器）、JWT 黑名单（登出时 jti 写入，validate 时检查）
- **环境变量**：`src/config/config.ts` 用 Zod 校验，启动 fail-fast

### Backend: Business Rules

- 金额一律 `Decimal`（Prisma schema 中 `@db.Decimal(10,2)`），绝不用 Float
- 列表接口必须分页（`src/shared/pagination.ts`）
- 多步写操作走 `prisma.$transaction`（如下单扣库存防超卖）
- 管理员权限用 `AdminGuard`（`src/shared/guards/admin.guard.ts`）
- 鉴权用 `JwtAuthGuard` + `@CurrentUser()` 装饰器获取当前用户

### Frontend: React + Vite + antd

- **路由**：`react-router-dom` v7，`main.tsx` 定义路由表，`App.tsx` 是登录守卫 + Layout 包裹
- **状态管理**：Redux Toolkit，两个 slice — `authSlice`（token/user）、`cartSlice`（购物车）
- **API 层**：`src/api/client.ts` 是 axios 实例（拦截器自动带 JWT、401 跳登录），业务接口在 `src/api/ecommerce.ts`
- **开发代理**：Vite 将 `/api` 代理到 `http://localhost:3000`（见 `vite.config.ts`）
- **样式**：Tailwind CSS + antd 组件库

### Adding a New Backend Module

1. `prisma/schema.prisma` 加模型 → `npm run prisma:migrate`
2. 新建 `src/<feature>/`：module / controller / service / dto.ts（Zod schema）
3. Service 注入 `PrismaService`（和 `RedisService` 如需缓存）
4. Controller 使用 `JwtAuthGuard`、DTO 用 `ZodValidationPipe`
5. 在 `app.module.ts` 的 imports 中注册新 Module

## Infrastructure Notes

- Docker Compose 管理 MySQL 8.0（端口 3306）和 Redis 7（宿主机端口 **6380**，非默认 6379）
- 后端 Swagger 文档：`http://localhost:3000/docs`
- 后端使用 `@/*` 路径别名映射 `src/*`（tsconfig paths）
- 前端无测试框架；后端暂无测试（规划中用 Vitest mock Prisma）
