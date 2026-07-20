# Redis 集成方案（基于最佳实践）

> 基于当前 NestJS + Prisma + MySQL 后端项目，接入 Redis 实现三大核心功能。
> 全部代码已实现并通过端到端验证（tsc 零错误 + curl 全链路通过）。

---

## 一、架构总览

Redis 在本项目里承担三个角色，对应三个最佳实践场景：

| 角色 | 解决什么问题 | 对应代码 | Redis 命令 |
|------|------------|---------|-----------|
| 读缓存 | 商品列表/详情重复查询打 MySQL | `ProductsService` | `GET/SET/DEL/SCAN` |
| 原子计数 | 登录接口被暴力破解 | `RateLimitGuard` | `INCR/EXPIRE` |
| 跨请求状态 | JWT 无法即时吊销（登出后仍有效） | `AuthService.logout` + `JwtStrategy` | `SET EX/EXISTS` |

**技术选型**：ioredis 5.11.1（原生封装），不用 cache-manager。原因：限流/黑名单需要 `INCR/EXPIRE/SET NX` 等原生命令，cache-manager 的抽象反而束手束脚。

---

## 二、基础设施搭建

### 2.1 docker-compose.yml（Redis 服务）
```yaml
redis:
  image: redis:7-alpine
  container_name: ecommerce-redis
  ports:
    - "6380:6379"   # 避开 Django 项目的 redis
  volumes:
    - ecommerce-redis-data:/data
  command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru
  healthcheck:
    test: ["CMD", "redis-cli", "ping"]
```
- `appendonly yes`：AOF 持久化，重启不丢数据
- `maxmemory 256mb` + `allkeys-lru`：内存满时自动淘汰最久未用的 key

### 2.2 RedisModule + RedisService（全局可注入）
- `src/redis/redis.module.ts`：`@Global()` 模块，与 PrismaModule 同模式
- `src/redis/redis.service.ts`：封装 ioredis，提供 `get/set/del/incr/expire/exists/delByPattern`
- `delByPattern` 用 `SCAN`（非 `KEYS`），避免阻塞 Redis

### 2.3 环境变量
`.env` 新增：
```
REDIS_HOST=localhost
REDIS_PORT=6380
REDIS_PASSWORD=
```
`config.ts` 用 Zod 校验，启动即 fail-fast。

---

## 三、功能实现详解

### 功能 1：商品缓存（读多写少，典型缓存场景）

**原理**：商品列表/详情是典型的「读多写少」——用户反复浏览，但商品变更频率低。用 Redis 缓存查询结果，大幅减少 MySQL 压力。

**Key 设计**：
| 场景 | Key 格式 | TTL | 示例 |
|------|---------|-----|------|
| 列表 | `products:list:{md5(query)前16位}` | 60s | `products:list:bde0e43960be0676` |
| 详情 | `product:{id}` | 120s | `product:abc-123` |

**失效策略**：
- 商品 `create/update/remove` 时：
  - `DEL product:{id}`（失效详情缓存）
  - `SCAN + DEL products:list:*`（失效所有列表缓存，因为价格/库存/状态可能影响列表）
- 用 SCAN 而非 KEYS，避免阻塞 Redis

**代码位置**：`src/products/products.service.ts`
```typescript
async findAll(query) {
  const cacheKey = this.listCacheKey(query);
  const cached = await this.redis.get(cacheKey);  // 1. 先查缓存
  if (cached) return JSON.parse(cached);           // 命中直接返回
  // 2. 未命中查 DB
  const result = await this.prisma.product.findMany(...);
  // 3. 回写缓存
  await this.redis.set(cacheKey, JSON.stringify(result), 60);
  return result;
}
```

### 功能 2：登录限流（安全刚需，防暴力破解）

**原理**：登录接口无频率限制时，攻击者可无限尝试密码。用 Redis 固定窗口计数器限制同一 IP 的尝试频率。

**策略**：同一 IP 15 分钟内最多 5 次登录尝试。

**实现**：
```
INCR login:rate:{ip}    → 计数 +1
首次计数时 EXPIRE 900   → 设 15 分钟窗口
count > 5              → 抛 429 TooManyRequestsError
```

**为什么用 Redis 而非内存计数**：
- 多实例部署时共享计数（内存计数各实例独立，绕过限流）
- 进程重启不丢失计数

**代码位置**：
- `src/auth/rate-limit.guard.ts`：限流守卫
- `src/shared/errors/app-error.ts`：新增 `TooManyRequestsError`（429）
- `src/auth/auth.controller.ts`：`@Post('login')` 加 `@UseGuards(RateLimitGuard)`

### 功能 3：JWT 黑名单（补上「无法即时吊销」短板）

**问题**：JWT 是无状态的——签发后 7 天内一直有效，用户点「登出」只是删了前端 token，后端无法阻止旧 token 继续使用。

**原理**：给每个 token 加唯一标识 `jti`，登出时把 `jti` 写入 Redis 黑名单（TTL = token 剩余有效期），后续请求时 `JwtStrategy.validate` 查黑名单，命中即拒绝。

**流程**：
```
签发 token：payload 加 jti = randomUUID()
登出：     decode token 拿 jti + exp
           SET jwt:blacklist:{jti} 1 EX {exp - now}
验证：     JwtStrategy.validate 查 EXISTS jwt:blacklist:{jti}
           命中 → 抛 401「登录已失效，请重新登录」
```

**TTL 设计**：黑名单 key 的 TTL = token 剩余有效期。token 过期后黑名单 key 自动清理，避免无限堆积。

**代码位置**：
- `src/shared/decorators/current-user.decorator.ts`：`JwtPayload` 加 `jti`
- `src/shared/decorators/token.decorator.ts`：`@Token()` 装饰器提取 raw token
- `src/auth/auth.service.ts`：`signToken` 生成 jti，`logout` 写黑名单
- `src/auth/jwt.strategy.ts`：`validate` 查黑名单
- `src/auth/auth.controller.ts`：新增 `@Post('logout')`

---

## 四、前端联动

| 文件 | 改动 |
|------|------|
| `api/ecommerce.ts` | `authApi` 新增 `logout()` 调 `/auth/logout` |
| `layouts/ShopLayout.tsx` | `onLogout` 改为 `try{await authApi.logout()}finally{clearAuth+navigate}`（乐观登出：后端 401 也不阻塞前端退出） |

---

## 五、验证结果（curl 全链路）

| 功能 | 验证方式 | 结果 |
|------|---------|------|
| 商品缓存 | 调两次 `/api/products`，查 Redis key | 第一次查 DB 写缓存，第二次命中缓存 |
| JWT 黑名单 | 登录→访问 profile(200)→登出→再访问(401) | 登出后 token 立即失效 |
| 登录限流 | 连续 7 次错误密码登录 | 前 5 次 401，第 6 次 429 |
| 类型检查 | `npx tsc --noEmit`（前后端） | 零错误 |

---

## 六、启动步骤

```bash
cd D:\workbuddydoc\fullstack-demo

# 1. 启动 MySQL + Redis 容器
docker compose up -d

# 2. 确认两个容器健康
docker exec ecommerce-mysql mysqladmin ping -h localhost -uroot -proot123
docker exec ecommerce-redis redis-cli ping

# 3. 启动后端
npm run start:dev
# 日志应显示 [RedisService] Redis 已连接

# 4. 启动前端
cd react-web && npm run dev
```

---

## 七、新增/修改文件清单

### 新增文件（4 个）
| 文件 | 用途 |
|------|------|
| `src/redis/redis.module.ts` | 全局 Redis 模块 |
| `src/redis/redis.service.ts` | ioredis 封装（get/set/del/incr/expire/exists/delByPattern） |
| `src/auth/rate-limit.guard.ts` | 登录限流守卫（INCR+EXPIRE，5次/15分钟） |
| `src/shared/decorators/token.decorator.ts` | @Token() 装饰器（提取 raw JWT） |

### 修改文件（10 个）
| 文件 | 改动 |
|------|------|
| `docker-compose.yml` | 加 redis 服务 + 数据卷 |
| `.env` / `.env.example` | 加 REDIS_HOST/PORT/PASSWORD |
| `src/config/config.ts` | Zod 校验加 Redis 配置 |
| `src/app.module.ts` | imports 加 RedisModule |
| `src/products/products.service.ts` | 注入 RedisService，findAll/findOne 加缓存，写操作失效 |
| `src/auth/auth.controller.ts` | login 加 RateLimitGuard，新增 logout 接口 |
| `src/auth/auth.service.ts` | 注入 RedisService，signToken 加 jti，新增 logout 方法 |
| `src/auth/jwt.strategy.ts` | 注入 RedisService，validate 查黑名单 |
| `src/auth/auth.module.ts` | providers 加 RateLimitGuard |
| `src/shared/errors/app-error.ts` | 新增 TooManyRequestsError(429) |
| `src/shared/decorators/current-user.decorator.ts` | JwtPayload 加 jti |
| `react-web/src/api/ecommerce.ts` | authApi 加 logout() |
| `react-web/src/layouts/ShopLayout.tsx` | onLogout 调后端黑名单 |

---

## 八、进阶方向（当前 demo 未实现，留作扩展）

| 功能 | Redis 结构 | 场景 |
|------|-----------|------|
| 购物车迁 Redis | Hash `cart:{userId}` | 跨设备同步，替代 localStorage |
| 热门商品排行 | ZSET `hot:products` | 首页热销榜 |
| 库存原子扣减 | `DECR stock:{id}` | 秒杀级高并发（当前 DB 乐观锁已够用） |
| 异步队列 | BullMQ / Stream | 订单后置任务（发邮件、统计） |
| 分布式锁 | `SET NX` | 多实例定时任务串行化 |
