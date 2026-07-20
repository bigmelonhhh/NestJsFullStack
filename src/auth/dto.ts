import { z } from 'zod';

// 注册请求 schema（前端可直接复用此 schema 做表单校验）
export const registerSchema = z.object({
  email: z.string().email('邮箱格式不正确'),
  password: z.string().min(6, '密码至少 6 位').max(64, '密码最多 64 位'),
  name: z.string().min(1, '昵称不能为空').max(50, '昵称最多 50 字符'),
});

export type RegisterInput = z.infer<typeof registerSchema>;

// 登录请求 schema
export const loginSchema = z.object({
  email: z.string().email('邮箱格式不正确'),
  password: z.string().min(1, '请输入密码'),
});

export type LoginInput = z.infer<typeof loginSchema>;

// 登录响应（不含密码哈希等敏感字段）
export interface AuthResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}
