# 简易电商系统后端（fullstack-demo）

面向**前端转全栈**学习的后端骨架，技术栈：**NestJS + Prisma + MySQL 8.4 + Zod + JWT + Swagger**。
项目刻意保持精简但工程化规范完整，覆盖认证、商品、下单三大核心业务，可直接 `npm run dev` 跑起来。

---

## 技术栈

| 层 | 技术 | 作用 |
| --- | --- | --- |
| 运行时 | Node.js + TypeScript | 前后端同语言，类型安全 |
| 框架 | NestJS 10 | 企业级 Node 后端（DI/模块/守卫/拦截器） |
| ORM | Prisma 5 | Schema 即真相，类型安全查询，迁移管理 |
| 数据库 | MySQL 8.4 LTS | 关系型存储 |
| 校验 | Zod | 单一 schema，前端可复用做表单校验 |
| 鉴权 | JWT + Passport + bcrypt | 无状态鉴权，密码哈希存储 |
| 文档 | Swagger / OpenAPI | 接口文档自动生成 |
| 部署 | Docker Compose | 一键起本地 MySQL |

---

## 目录结构（feature-first）

```
fullstack-demo/
├── prisma/
│   ├── schema.prisma        # 数据模型（唯一真相）
│   └── seed.ts              # 种子数据
├── docker-compose.yml       # 本地 MySQL 8.4
├── .env.example             # 环境变量模板
└── src/
    ├── main.ts              # 启动入口（helmet/cors/swagger）
    ├── app.module.ts        # 模块聚合 + 全局过滤器/拦截器
    ├── app.controller.ts    # 健康检查
    ├── config/              # 环境变量校验（fail-fast）
    ├── prisma/              # 全局 Prisma 连接
    ├── shared/              # 跨模块通用：错误/过滤器/守卫/管道/装饰器
    ├── auth/                # 注册、登录、JWT
    ├── users/               # 用户资料
    ├── products/            # 商品 CRUD（管理员写）
    └── orders/              # 下单（事务+防超卖）、我的订单
```

**三层架构**：Controller（HTTP）→ Service（业务）→ Prisma（数据访问）。Controller 不写业务逻辑，Service 不碰 HTTP 类型。

---

## 快速启动（5 步）

```bash
# 1. 起本地 MySQL 8.4（Docker）
docker compose up -d

# 2. 准备环境变量
cp .env.example .env

# 3. 安装依赖
npm install

# 4. 建表 + 生成 Prisma Client
npx prisma migrate dev --name init

# 5. 写入种子数据 + 启动
npm run prisma:seed
npm run start:dev
```

启动后：
- 服务：http://localhost:3000
- Swagger 文档：http://localhost:3000/docs
- 健康检查：http://localhost:3000/health

---

## 演示账号

| 角色 | 邮箱 | 密码 | 权限 |
| --- | --- | --- | --- |
| 管理员 | admin@demo.com | 123456 | 可增删改商品 |
| 普通用户 | user@demo.com | 123456 | 浏览商品、下单 |

---

## 接口清单

| 方法 | 路径 | 鉴权 | 说明 |
| --- | --- | --- | --- |
| GET | /health | - | 健康检查 |
| POST | /api/auth/register | - | 注册 |
| POST | /api/auth/login | - | 登录，返回 JWT |
| GET | /api/users/profile | 登录 | 当前用户资料 |
| GET | /api/products | - | 商品列表（分页） |
| GET | /api/products/:id | - | 商品详情 |
| POST | /api/products | 管理员 | 创建商品 |
| PATCH | /api/products/:id | 管理员 | 更新商品 |
| DELETE | /api/products/:id | 管理员 | 删除商品 |
| POST | /api/orders | 登录 | 下单（事务扣库存） |
| GET | /api/orders | 登录 | 我的订单列表 |
| GET | /api/orders/:id | 登录 | 订单详情 |

> Swagger 文档里带锁图标的接口需在右上角「Authorize」填入登录返回的 `accessToken`。

---

## 试一下完整流程

```bash
# 1. 注册/登录拿 token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@demo.com","password":"123456"}'
# 返回 { accessToken: "xxx", user: {...} }

# 2. 浏览商品
curl http://localhost:3000/api/products

# 3. 下单（把 token 填进去）
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <你的token>" \
  -d '{"items":[{"productId":"<商品id>","quantity":2}]}'
```

---

## 重点学习知识点对照

| 文件 | 学什么 |
| --- | --- |
| `prisma/schema.prisma` | 数据建模、索引、枚举、关系、金额用 Decimal |
| `src/config/config.ts` | 环境变量集中校验，启动 fail-fast |
| `src/shared/errors/app-error.ts` | 类型化错误层级，告别裸 `throw Error` |
| `src/shared/filters/all-exceptions.filter.ts` | 全局异常处理，统一错误响应格式 |
| `src/auth/` | 注册登录、bcrypt 哈希、JWT 签发与校验 |
| `src/shared/guards/admin.guard.ts` | RBAC 权限控制 |
| `src/shared/pipes/zod-validation.pipe.ts` | Zod 校验，前端可复用 schema |
| `src/products/` | 标准 CRUD + 分页 + 关联查询（防 N+1） |
| `src/orders/orders.service.ts` | **事务 + 乐观锁防超卖**（核心难点） |

---

## AI Coding：怎么让 AI 在这个骨架上加业务

这个骨架本身就是为 AI Coding 设计的。加一个新业务（比如「购物车」）时，给 AI 这样的指令：

> 在 fullstack-demo 项目里新增「购物车」模块，遵循现有 feature-first 结构：
> 1. 在 prisma/schema.prisma 加 CartItem 模型（userId、productId、quantity，关联 User 和 Product）
> 2. 执行 `npx prisma migrate dev --name add_cart` 生成迁移
> 3. 新建 src/cart/ 目录，包含 module/controller/service/dto.ts
> 4. Service 注入 PrismaService，Controller 用 JwtAuthGuard，DTO 用 Zod schema
> 5. 接口：GET /api/cart（查我的购物车）、POST /api/cart（加入）、PATCH /api/cart/:id（改数量）、DELETE /api/cart/:id（删除）
> 6. 严格遵循三层架构，Controller 不写业务逻辑，错误用 src/shared/errors 里的类型

关键护栏（在 `AGENTS.md` 或对话里强调）：
- 金额一律 `Decimal`，禁止 `Float`
- 查询列表必须分页，禁止 `SELECT *`
- 所有写操作走 Service，多步写操作用 `$transaction`
- 密码、token 绝不进日志
- 前端可复用的校验逻辑放 `dto.ts` 的 Zod schema

---

## 后续可扩展

- [ ] Redis 缓存商品列表（cache-aside）
- [ ] 订单状态机（PENDING→PAID→SHIPPED）
- [ ] refresh token + httpOnly cookie
- [ ] 文件上传（商品图片，presigned URL）
- [ ] 单元测试（Vitest，mock Prisma）
- [ ] 前端工程接入（从 OpenAPI 生成 TS 类型，打通前后端类型）

---

## 常见问题

**Q: `prisma migrate dev` 报连不上数据库？**
A: 确认 `docker compose up -d` 已起，`.env` 里 `DATABASE_URL` 的端口/密码与 `docker-compose.yml` 一致。

**Q: Swagger 里 POST 接口的 body 没有字段提示？**
A: 本骨架用 Zod 校验，Swagger 对 body 展示较简略。完整字段看各模块 `dto.ts` 的 Zod schema，那是接口契约的真相。

**Q: 怎么连 Workbench 看数据？**
A: Host=127.0.0.1 Port=3306 User=root Password=root123 Database=ecommerce（Docker 容器映射端口，与 Django 项目的 mysql 容器端口 3307 互不干扰）。
