// 与 NestJS 后端 auth/users 模块对齐的用户与鉴权类型
export type Role = "CUSTOMER" | "ADMIN"

export type AuthUser = {
  id: string
  email: string
  name: string
  phone?: string | null
  role: Role
  createdAt?: string
}

// 登录/注册成功响应：{ accessToken, user }
export type AuthResponse = {
  accessToken: string
  user: AuthUser
}

// 个人资料响应（GET /api/users/profile 返回 user 对象本身）
export type ProfileResponse = AuthUser
