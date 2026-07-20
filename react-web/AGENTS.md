# AGENTS.md

This file provides guidance to Qoder (qoder.com) when working with code in this repository.

## 项目定位

电商前端单页应用（React 18 + Vite + antd + Redux Toolkit），与根目录 NestJS 后端通过 `/api` 代理通信。本文件约束前端页面 UI 与功能开发规范。

## Commands

```bash
npm run dev       # 开发服务器 (localhost:5173)，/api 代理到后端 localhost:3000
npm run build     # 生产构建 (tsc -b && vite build)
npm run lint      # ESLint 检查
npm run preview   # 预览生产构建产物
```

## 样式规范（Tailwind + Ant Design 混合）

**职责划分**：
- **Antd 组件**：复杂交互组件（Layout、Form、Table、Dropdown、Badge、Modal、Pagination 等）
- **Tailwind 原子类**：布局间距、颜色、圆角、阴影、响应式、排版等视觉细节

**强制规则**：
1. 优先使用 Tailwind 原子类完成视觉样式，仅在需要复杂交互时引入 antd 组件
2. **禁止新建独立 CSS/SCSS 文件**；新增全局样式追加到 `src/index.css` 的 `@layer utilities` 或根作用域
3. 品牌色通过 Tailwind 扩展色名引用（`primary` / `secondary` / `cta` / `accent` / `surface` / `dark`），**禁止硬编码十六进制值**
4. antd 样式覆盖通过 `tailwind.config.js` 的 `important: "#root"` 机制解决，不写额外覆盖 CSS
5. 动画与通用工具类（滚动条、卡片 hover、入场动画、玻璃效果）集中维护在 `src/index.css`，组件内只引用类名
6. 图标统一使用 `lucide-react` 或 `@ant-design/icons`，**严禁使用 emoji 作为图标**

**设计令牌**（`tailwind.config.js`）：
- `primary: #1C1917`（深炭黑）、`secondary: #44403C`（暖灰）、`cta: #CA8A04`（金色）、`accent: #A16207`（金色 hover）、`surface: #FAFAF9`（底色）、`dark: #0C0A09`（文字）
- 字体：`font-heading`（Cormorant, serif）、`font-body`（Montserrat, sans-serif）
- 阴影：`shadow-glass`、`shadow-glass-hover`
- 圆角：`rounded-xl`（16px）、`rounded-2xl`（24px）
- 过渡时长：`duration-fluid`（500ms）

## 设计风格约束（Liquid Glass / Premium SaaS）

> 设计系统主文件：`design-system/premium-e-commerce/MASTER.md`（Source of Truth）
> 页面级覆盖：`design-system/premium-e-commerce/pages/[page].md`（存在时优先于 MASTER）

**整体风格**：Liquid Glass — 流动玻璃质感、半透明层、动态模糊、平滑过渡

**强制约束**：
1. 卡片/容器使用玻璃效果（`.glass-card` 或 `backdrop-blur` + 半透明白底 + 细边框）
2. 标题使用 `font-heading`（Cormorant 衬线体），正文使用 `font-body`（Montserrat）
3. CTA 按钮使用金色（`bg-cta text-white`），hover 加深为 `accent`
4. 所有可点击元素必须 `cursor-pointer` + hover 视觉反馈（颜色/阴影/边框变化）
5. 文字对比度不低于 4.5:1，浅色模式下正文用 `dark`（#0C0A09），辅助文字用 `secondary`（#44403C）
6. hover 状态不使用 scale 变换（避免布局偏移），改用 translateY + shadow
7. 玻璃效果（backdrop-filter）仅用于卡片/导航等有限元素，避免大面积模糊导致性能问题

**禁止事项**：
- 鲜艳撞色、方块化布局、活泼色调
- emoji 作为 UI 图标
- 无过渡的突变状态切换
- 布局偏移型 hover（scale transform）
- 低对比度文字（灰色文字用于正文）

## 动效规范

| 场景 | 时长 | 缓动函数 | 示例 |
|------|------|----------|------|
| 微交互（hover、focus） | 150-300ms | `ease` | 按钮颜色变化 |
| 卡片浮起/入场 | 400-600ms | `cubic-bezier(0.4, 0, 0.2, 1)` | `.product-card`、`.animate-fade-in-up` |
| 页面过渡/模态框 | 300-500ms | `cubic-bezier(0.4, 0, 0.2, 1)` | Modal 淡入 |
| 加载指示器 | 循环 | `linear` | Skeleton `animate-pulse` |

**动效规则**：
1. 所有状态变化必须有过渡，禁止突变
2. 加载超过 300ms 必须展示 Skeleton 或 Spinner
3. 装饰性动画仅用于加载指示，禁止用于装饰元素
4. 必须尊重 `prefers-reduced-motion` 媒体查询（已在全局 CSS 中处理）
5. 图片使用 `loading="lazy"` 延迟加载

## 代码组织规范

### 文件结构约定

```
src/
├── api/           # 数据访问层（页面只调这里，不直接碰 axios）
├── layouts/       # 布局组件
├── pages/         # 页面组件（一个文件 = 一个路由页面）
├── store/         # Redux Toolkit slices
├── types/         # TypeScript 类型定义（与后端 DTO 对齐）
├── utils/         # 纯函数工具
├── styles/pages/  # 页面级样式（极少使用）
└── mocks/         # MSW 接口 Mock（离线开发）
```

### 页面组件模式

每个页面组件遵循统一模式：
- 使用 `useState` + `useCallback` + `useEffect` 管理数据加载
- 错误处理：catch 中用 `message.error()` 提示，从 `AxiosError.response.data.message` 取后端错误信息
- 加载状态：用 antd `<Spin>` 包裹内容区
- 空状态：用 antd `<Empty>`
- 列表页必须带分页（antd `<Pagination>`）

### API 层规范

- 所有接口调用集中在 `src/api/ecommerce.ts`，按领域分组（`authApi` / `productApi` / `orderApi`）
- 每个方法返回 `.then(r => r.data)` 解包后的纯数据，页面不接触 AxiosResponse
- 新增接口：在对应领域对象中追加方法，类型从 `src/types/` 引入

### 状态管理规范

- 全局状态用 Redux Toolkit slice（`authSlice`、`cartSlice`）
- 组件中使用类型安全的 `useAppDispatch` / `useAppSelector`（从 `src/store` 导入）
- 需要持久化的状态（如购物车）在 slice 内手动同步 localStorage
- 页面级临时数据（loading、列表、分页）用组件 `useState`，不进 Redux

### 类型规范

- 类型定义集中在 `src/types/`，与后端 Prisma 模型对齐
- **金额字段（price/totalAmount）后端为 Decimal，JSON 序列化为 `string`**，前端展示时用 `Number()` 转换 + `formatCurrency()` 格式化
- 分页响应统一使用 `Paginated<T>` 泛型
- 新增类型在 `src/types/ecommerce.ts` 或 `src/types/auth.ts` 中追加

## 路由规范

- 路由表在 `src/main.tsx` 中用 `createBrowserRouter` 声明式定义
- `App.tsx` 是路由守卫：无 token → 跳 `/login`，有 token → `ShopLayout` 包裹子路由
- 新增受保护页面：在 `App` 的 `children` 数组中追加路由项
- 新增公开页面：在顶层路由数组中追加（与 `/login` 同级）

## 与后端对接注意事项

- 开发环境 Vite 代理 `/api` → `http://localhost:3000`，前端请求路径不带域名
- 后端全局路由前缀为 `/api`，前端 axios baseURL 开发环境为 `/api`、生产环境读 `VITE_API_BASE_URL`
- 后端错误响应格式：`{ statusCode, message, code }`，前端按 `code` 字段做业务分支
- 401 由 axios 响应拦截器统一处理（清凭证 + 跳登录），页面无需重复处理
