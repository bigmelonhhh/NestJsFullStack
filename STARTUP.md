# fullstack-demo 启动指南

> 面向 Win11 + VSCode + Docker 环境，从零到跑起来的完整步骤。
> **重要**：你 Docker Desktop 里已有 Django 项目的容器在跑（mysql 占 3307、redis 占 6380、nginx 占 80），本项目 fullstack-demo 用 **3306 端口**（宿主空闲），两者完全独立运行。

---

## 你当前 Docker 里已有的容器（来自截图）

| 容器名 | 镜像 | 端口映射 | 归属 |
| --- | --- | --- | --- |
| project_mysql | mysql:8.0 | 3307 → 容器 3306 | Django 项目 |
| project_redis | redis:7.2-al | 6380 → 容器 6379 | Django 项目 |
| project_nginx | nginx:1.25 | 80 → 容器 80 | Django 项目 |

**宿主机端口 3306 当前是空的**，fullstack-demo 就用它。两套 MySQL 怎么完全独立：

| | 端口（宿主→容器） | 容器名 | 数据卷 | 镜像 |
| --- | --- | --- | --- | --- |
| Django 项目 MySQL | 3307 → 3306 | project_mysql | Django 自己的卷 | mysql:8.0 |
| 本项目 MySQL | **3306 → 3306** | **ecommerce-mysql** | **ecommerce-mysql-data** | **mysql:8.4-lts** |

容器名、数据卷、镜像版本都不同，**完全互不干扰**。

---

## 前置条件（你已具备）
- ✅ Docker Desktop 已安装并启动
- ✅ VSCode 已安装
- ✅ Node.js 已安装（项目用 v22）
- ✅ 项目依赖已装好（node_modules 已存在）

---

## 启动步骤（7 步）

### 步骤 1：确认 Docker Desktop 运行中
- 系统托盘 Docker 鲸鱼图标**变绿** = 引擎就绪
- 终端验证：
  ```bash
  docker info
  ```
  能正常输出 = OK
- （可选）看一眼当前容器：
  ```bash
  docker ps
  ```
  确认能看到 Django 项目的 project_mysql 等容器在跑

### 步骤 2：用 VSCode 打开项目
- 方式一：VSCode → 文件 → 打开文件夹 → 选 `D:\workbuddydoc\fullstack-demo`
- 方式二：终端运行
  ```bash
  code D:\workbuddydoc\fullstack-demo
  ```
- 打开后按 `` Ctrl+` `` 打开内置终端，后续命令都在这里跑

### 步骤 3：启动 MySQL 容器（端口 3306，与 Django 的 3307 互不冲突）
```bash
docker compose up -d
```
- 镜像用 `mysql:8.0`（本地已有，免拉取秒起）；与 Django 项目同镜像但容器名/数据卷独立
- 验证：
  ```bash
  docker ps
  ```
  应该看到 **4 个**运行中容器：原来 3 个 Django 的 + 新加的 `ecommerce-mysql`
- 确认端口映射：PORTS 列应显示 `0.0.0.0:3306->3306/tcp`（注意是 3306，不是 3307）

> 如果这步报端口冲突或拉镜像失败，看下面「常见问题 Q1 / Q2」。

### 步骤 4：等待 MySQL 完全就绪
```bash
docker exec ecommerce-mysql mysqladmin ping -h localhost -uroot -proot123
```
- 返回 `mysqld is alive` = 数据库可连接
- 若返回连接失败，说明还在启动，**等 10 秒重试**

### 步骤 5：建表（Prisma 数据库迁移）
```bash
npx prisma migrate dev --name init
```
- 这会：读取 `prisma/schema.prisma` → 生成 SQL → 应用到 MySQL → 重新生成 Prisma Client
- 成功标志：输出 `Applied migration`，且 `prisma/migrations/` 目录被创建
- 验证表已建（注意连的是 ecommerce 库）：
  ```bash
  docker exec ecommerce-mysql mysql -uroot -proot123 -D ecommerce -e "show tables;"
  ```
  应看到 users / categories / products / orders / order_items

### 步骤 6：写入演示数据（种子）
```bash
npm run prisma:seed
```
- 写入：1 个管理员 + 1 个普通用户 + 2 个分类 + 4 个商品
- 成功标志：输出 `✅ 种子数据已写入`

### 步骤 7：启动后端服务
```bash
npm run start:dev
```
- 开发模式，代码改动自动重启
- 成功标志：终端输出
  ```
  [Nest] LOG [Bootstrap] 服务已启动: http://localhost:3000
  [Nest] LOG [Bootstrap] Swagger 文档: http://localhost:3000/docs
  ```
- 这个终端会一直运行（监听请求），**不要关闭**

---

## 访问与测试
| 地址 | 用途 |
| --- | --- |
| http://localhost:3000/docs | Swagger API 文档（推荐，可视化调接口） |
| http://localhost:3000/health | 健康检查 |
| http://localhost:3000/api/products | 商品列表（JSON） |

**在 Swagger 里调接口（推荐方式）：**
1. 浏览器打开 `/docs`
2. 点右上角「Authorize」
3. 先调 `POST /api/auth/login`（用下面的演示账号），复制返回的 `accessToken`
4. 回到 Authorize，填 `Bearer <粘贴的token>`，点 Authorize
5. 之后调任何带锁图标的接口都会自动带 token

---

## 演示账号
| 角色 | 邮箱 | 密码 | 能做什么 |
| --- | --- | --- | --- |
| 管理员 | admin@demo.com | 123456 | 登录、下单、**增删改商品** |
| 普通用户 | user@demo.com | 123456 | 登录、下单、查商品 |

---

## 用 Workbench / Navicat 看 fullstack-demo 的数据
- Host: `127.0.0.1`
- Port: `3306`
- User: `root`
- Password: `root123`
- Database: `ecommerce`

> 这是 fullstack-demo 的库（容器 ecommerce-mysql）。要看 Django 项目的库则连 **3307**（容器 project_mysql）。两个库完全独立。

---

## 常见问题排查

### Q1：`docker compose up` 报 `failed size validation` 或卡在拉镜像
这是某个镜像加速器返回了损坏的层数据。两种解法：

**解法 A：精简镜像加速器（推荐）**
1. Docker Desktop → Settings → Docker Engine
2. 把 `registry-mirrors` 列表精简到 1-2 个稳定的，例如：
   ```json
   {
     "registry-mirrors": ["https://docker.m.daocloud.io"]
   }
   ```
3. 点 `Apply & Restart`，等 Docker 重启完成
4. 清理损坏的层后重拉：
   ```bash
   docker image prune -f
   docker compose up -d
   ```

**解法 B：换 MySQL 镜像 tag**
编辑 `docker-compose.yml`，把 `image: mysql:8.4-lts` 改成 `image: mysql:8.4`，再 `docker compose up -d`。不同 tag 的层数据不同，能绕过损坏层。

### Q2：端口 3306 也被占用了
说明宿主 3306 也有东西（极少见，但万一）。改 `docker-compose.yml` 的端口映射为 `"3308:3306"`，同时改 `.env` 的 `DATABASE_URL` 端口为 3308。两端必须一致。

### Q3：`prisma migrate dev` 报 `Can't reach database server`
MySQL 容器还没就绪。执行步骤 4 的 ping 命令确认返回 `alive` 后再重试。也可能端口不一致——docker-compose 和 .env 都应是 3306。

### Q4：`npm run start:dev` 报环境变量错误
确认项目根目录有 `.env` 文件且 `DATABASE_URL` 端口是 3306。没有就：
```bash
cp .env.example .env
```

### Q5：想重来 / 清空数据
```bash
docker compose down -v     # 停容器并删除数据卷
docker compose up -d       # 重新起
npx prisma migrate dev     # 重新建表
npm run prisma:seed        # 重新灌数据
```
> 这只影响 fullstack-demo 的容器和卷，**不会动 Django 项目的容器**。

### Q6：怎么确认没和 Django 项目冲突
```bash
docker ps
```
应该看到 4 个容器（project_mysql、project_redis、project_nginx、ecommerce-mysql），端口分别是 3307/6380/80/3306，没有 "port already allocated" 报错就 OK。

---

## 停止服务
```bash
# 停后端服务：在运行 npm run start:dev 的终端按 Ctrl+C

# 只停 fullstack-demo 的 MySQL（保留数据，不影响 Django）
docker compose down

# 停并彻底清空数据（重来时用）
docker compose down -v
```
> 停掉 ecommerce-mysql 容器**不会影响** Django 项目的 project_mysql 等容器。

---

## 一次跑通后的日常使用
之后每次开发只需要：
```bash
docker compose up -d      # 起 MySQL（已起则跳过）
npm run start:dev         # 起后端
```
改代码自动热重载；改 `schema.prisma` 后跑 `npx prisma migrate dev` 同步表结构。
