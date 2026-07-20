# fullstack-demo 后端骨架 · 交付概览

## 已完成
一个可 `clone → 起库 → 跑起来` 的简易电商后端骨架，面向**前端转全栈学习**。

- **技术栈**：NestJS 10 + Prisma 5 + MySQL 8.4 + Zod + JWT + Swagger + Docker Compose
- **验证状态**：依赖安装成功（451 包）· Prisma 客户端生成成功 · `nest build` 编译零错误

## 业务模块
| 模块 | 接口 | 鉴权 |
| --- | --- | --- |
| 认证 auth | 注册 / 登录 | 公开 |
| 用户 users | 当前用户资料 | JWT |
| 商品 products | 列表 / 详情 / 增删改 | 列表详情公开；写操作管理员 |
| 订单 orders | 下单 / 我的订单 / 订单详情 | JWT |

## 关键架构决策
- **feature-first 目录**：按业务模块组织，不按技术层
- **三层架构**：Controller（HTTP）→ Service（业务）→ Prisma（数据）
- **Zod 单一 schema**：dto.ts 的 schema 同时做后端校验 + 前端可复用，打通类型
- **类型化错误 + 全局过滤器**：统一 `{code, message, timestamp, path}` 响应，映射 Prisma 错误码
- **下单事务 + 乐观锁防超卖**：`updateMany where stock>=qty`，count=0 即库存不足
- **配置集中校验 fail-fast**：env 不合法直接拒绝启动

## 如何运行
```bash
docker compose up -d                 # 1. 起 MySQL 8.4
cp .env.example .env                 # 2. 配置环境变量
npm install                          # 3. 装依赖（已完成）
npx prisma migrate dev --name init   # 4. 建表（需 MySQL 已起）
npm run prisma:seed                  # 5. 写入演示账号+商品
npm run start:dev                    # 6. 启动开发服务
```
启动后：
- Swagger 文档：http://localhost:3000/docs
- 健康检查：http://localhost:3000/health
- API 前缀：/api

## 演示账号（seed 写入）
- 管理员：admin@demo.com / 123456
- 普通用户：user@demo.com / 123456

## 后续可扩展
- [ ] JWT refresh token + httpOnly cookie
- [ ] Redis 缓存热点商品
- [ ] 单元测试（Vitest）
- [ ] 前端接入：从 dto.ts 的 zod schema 生成前端类型与表单校验
- [ ] 订单状态机（支付/发货/取消流转）
- [ ] Dockerfile + CI 部署
