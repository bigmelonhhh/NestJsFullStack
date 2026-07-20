# 简易电商系统（fullstack-demo）前后端全栈 Demo

面向**前端转全栈**学习的全栈骨架，技术栈：**NestJS + Prisma + MySQL 8.0 + Redis 7 + Zod + JWT + Swagger**，配套 **React + Vite + antd** 电商前端。
项目刻意保持精简但工程化规范完整，覆盖认证、商品、下单、缓存、限流、登出黑名单等核心场景，可直接 `npm run start:dev` + `npm run dev`（前端）跑通闭环。

---

## 技术栈

| 层 | 技术 | 作用 |
| --- | --- | --- |
| 运行时 | Node.js + TypeScript | 前后端同语言，类型安全 |
| 后端框架 | NestJS 10 | 企业级 Node 后端（DI/模块/守卫/拦截器） |
| ORM | Prisma 5 | Schema 即真相，类型安全查询，迁移管理 |
| 数据库 | MySQL 8.0 | 关系型存储（商品/订单/用户真相源） |
| 缓存/状态 | Redis 7 | 商品缓存、登录限流计数器、JWT 黑名单 |
| 校验 | Zod | 单一 schema，前端可复用做表单校验 |
| 鉴权 | JWT + Passport + bcrypt | 无状态鉴权，密码哈希存储 |
| 文档 | Swagger / OpenAPI | 接口文档自动生成 |
| 前端 | React 18 + Vite + antd | 电商前端（登录/商品/购物车/下单） |
| 部署 | Docker Compose | 一键起本地 MySQL + Redis |

---

## 目录结构（feature-first）

```
fullstack-demo/
├── prisma/
│   ├── schema.prisma        # 数据模型（唯一真相）
│   └── seed.ts              # 种子数据
├── docker-compose.yml       # 本地 MySQL(3306) + Redis(6380)
├── .env.example             # 环境变量模板
├── src/
│   ├── main.ts              # 启动入口（helmet/cors/swagger）
│   ├── app.module.ts        # 模块聚合 + 全局过滤器/拦截器
│   ├── config/              # 环境变量校验（fail-fast，含 REDIS_*）
│   ├── prisma/              # 全局 Prisma 连接
│   ├── redis/               # RedisModule + RedisService（全局注入）
│   ├── shared/              # 跨模块通用：错误/过滤器/守卫/管道/装饰器
│   ├── auth/                # 注册、登录、JWT、登出、限流守卫
│   ├── users/               # 用户资料
│   ├── products/            # 商品 CRUD（管理员写）+ Redis 缓存
│   └── orders/              # 下单（事务+防超卖）、我的订单
└── react-web/               # 电商前端（Vite + antd）
    ├── src/pages/           # Login/ProductList/ProductDetail/Cart/OrderList/OrderDetail
    ├── src/api/             # axios 封装（拦截器带 token、401 跳登录）
    └── src/store/           # redux-toolkit：auth / cart
```

**后端三层架构**：Controller（HTTP）→ Service（业务）→ Prisma（数据访问）。Controller 不写业务逻辑，Service 不碰 HTTP 类型。

---

## 快速启动（5 步）

```bash
# 1. 起本地 MySQL + Redis（Docker，端口 3306 / 6380）
docker compose up -d

# 2. 准备环境变量
cp .env.example .env

# 3. 安装依赖（后端）
npm install

# 4. 建表 + 生成 Prisma Client + 种子数据
npx prisma migrate deploy
npm run prisma:seed

# 5. 启动后端（3000）+ 前端（5173）
npm run start:dev
cd react-web && npm install && npm run dev
```

启动后：
- 后端服务：http://localhost:3000 ，Swagger：http://localhost:3000/docs ，健康检查：/health
- 前端页面：http://localhost:5173
- Redis：宿主机 127.0.0.1:6380（容器 6379）

---

## 演示账号

| 角色 | 邮箱 | 密码 | 权限 |
| --- | --- | --- | --- |
| 管理员 | admin@demo.com | 123456 | 可增删改商品 |
| 普通用户 | user@demo.com | 123456 | 浏览商品、下单、登出 |

---

## 接口清单

| 方法 | 路径 | 鉴权 | 说明 |
| --- | --- | --- | --- |
| GET | /health | - | 健康检查 |
| POST | /api/auth/register | - | 注册 |
| POST | /api/auth/login | - | 登录（含 Redis 限流），返回 JWT |
| POST | /api/auth/logout | 登录 | 登出，当前 token 加入黑名单 |
| GET | /api/users/profile | 登录 | 当前用户资料 |
| GET | /api/products | - | 商品列表（分页，Redis 缓存） |
| GET | /api/products/:id | - | 商品详情（Redis 缓存） |
| POST | /api/products | 管理员 | 创建商品（失效缓存） |
| PATCH | /api/products/:id | 管理员 | 更新商品（失效缓存） |
| DELETE | /api/products/:id | 管理员 | 删除商品（失效缓存） |
| POST | /api/orders | 登录 | 下单（事务扣库存防超卖） |
| GET | /api/orders | 登录 | 我的订单列表 |
| GET | /api/orders/:id | 登录 | 订单详情 |

> Swagger 带锁接口需在右上角「Authorize」填入登录返回的 `accessToken`。

---

## 试一下完整流程（curl）

```bash
# 1. 登录拿 token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@demo.com","password":"123456"}'
# 返回 { accessToken: "xxx", user: {...} }

# 2. 浏览商品（命中 Redis 缓存）
curl http://localhost:3000/api/products

# 3. 下单（把 token 填进去）
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <你的token>" \
  -d '{"items":[{"productId":"<商品id>","quantity":2}]}'

# 4. 登出（token 立即失效）
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer <你的token>"
```

---

## Redis 集成（缓存 / 限流 / 黑名单）

项目用 Redis 承担三类"要快、要共享、会过期"的临时状态，与 MySQL（真相源）互补：

1. **商品缓存（读缓存）** — `src/products/products.service.ts`
   - key：`products:list:{md5(query)}`（TTL 60s）、`product:{id}`（TTL 120s）
   - 命中直接返回，未命中查 MySQL 并回写；写操作（增/改/删）用 `SCAN` 失效 `products:list:*` 并 `del product:{id}`
   - 模式：**Cache-Aside**——先更新 DB 再删缓存，TTL 作为最终一致兜底
2. **登录限流（原子计数）** — `src/auth/rate-limit.guard.ts`
   - key：`login:rate:{ip}`，固定窗口 15 分钟最多 5 次，超阈值返回 `429`
   - 用 Redis 而非内存：多实例共享、进程重启不丢
3. **JWT 黑名单（临时状态）** — `src/auth/auth.controller.ts` + `src/auth/jwt.strategy.ts`
   - 登录 token 带 `jti`；登出时把 `jti` 写入 `jwt:blacklist:{jti}`，TTL=token 剩余有效期
   - 每次请求 `JwtStrategy.validate` 查黑名单，命中即拒（401），补上 JWT 无法主动吊销的短板

**怎么看 Redis 数据**：用 Another Redis Desktop Manager（ARDM，便携版免安装），连接 `127.0.0.1:6380`，密码留空。列表缓存 TTL 仅 60s，浏览完会自然过期消失，属正常。

---

## 重点学习知识点对照

| 文件 | 学什么 |
| --- | --- |
| `prisma/schema.prisma` | 数据建模、索引、枚举、关系、金额用 Decimal |
| `src/config/config.ts` | 环境变量集中校验，启动 fail-fast（含 REDIS_*） |
| `src/shared/errors/app-error.ts` | 类型化错误层级（含 TooManyRequestsError 429） |
| `src/shared/filters/all-exceptions.filter.ts` | 全局异常处理，统一错误响应格式 |
| `src/auth/` | 注册登录、bcrypt 哈希、JWT 签发/校验、登出黑名单 |
| `src/auth/rate-limit.guard.ts` | 基于 Redis 的登录限流（固定窗口计数器） |
| `src/redis/redis.service.ts` | Redis 封装（get/set/del/incr/SCAN 模式删除） |
| `src/products/products.service.ts` | 标准 CRUD + 分页 + 缓存(Cache-Aside) + 写时失效 |
| `src/orders/orders.service.ts` | **事务 + 乐观锁防超卖**（核心难点） |
| `react-web/src/api/client.ts` | axios 封装：拦截器带 token、401 跳登录 |

---

## AI Coding：怎么让 AI 在这个骨架上加业务

> 在 fullstack-demo 新增模块，遵循 feature-first 结构：schema.prisma 加模型 → `prisma migrate` → 新建 `src/xxx/`（module/controller/service/dto.ts）→ Service 注入 PrismaService、RedisService → Controller 用 JwtAuthGuard、DTO 用 Zod schema。
> 护栏：金额一律 Decimal；列表必须分页；写操作走 Service，多步写用 `$transaction`；密码/token 不进日志。

---

## 后续可扩展

- [x] Redis 缓存商品列表（cache-aside）
- [x] 前端电商工程接入（react-web）
- [ ] 订单状态机（PENDING→PAID→SHIPPED）
- [ ] refresh token + httpOnly cookie
- [ ] 购物车迁 Redis（Hash 结构，跨设备同步）
- [ ] 文件上传（商品图片，presigned URL）
- [ ] 单元测试（Vitest，mock Prisma）

---

## 常见问题

**Q: `prisma migrate` 连不上数据库？**
A: 确认 `docker compose up -d` 已起，`.env` 的 `DATABASE_URL` 端口/密码与 `docker-compose.yml` 一致。

**Q: Swagger 里 POST 接口 body 无字段提示？**
A: 本骨架用 Zod 校验，Swagger 展示简略；完整字段看各模块 `dto.ts` 的 Zod schema（接口契约真相）。

**Q: 怎么连 Workbench 看 MySQL？**
A: Host=127.0.0.1 Port=3306 User=root Password=root123 Database=ecommerce（与 Django 的 mysql 容器 3307 互不干扰）。

**Q: 怎么用 ARDM 看 Redis？**
A: 下载 ARDM 便携版，连接 Host=127.0.0.1 Port=6380（注意非 6379），用户名/密码留空。左侧即见 `products:*`、`jwt:blacklist:*` 等 key。

**Q: Redis 里看不到商品 key？**
A: 商品列表缓存 TTL 仅 60s、详情 120s，浏览完会自动过期消失，属正常缓存行为；下单走 MySQL 事务不写 Redis，故不会产生 key。开着 `docker exec ecommerce-redis redis-cli MONITOR` 刷新页面可实时看到 `get`/`set`。
