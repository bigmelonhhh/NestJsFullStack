import { z } from 'zod';

// 环境变量 Schema：用 Zod 校验，启动即 fail-fast
// 配置不合法时应用直接拒绝启动，而不是跑到一半才报错
const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL 不能为空'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET 至少 16 个字符'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  CORS_ORIGIN: z.string().default('*'),
});

export type EnvConfig = z.infer<typeof envSchema>;

/**
 * 校验并解析环境变量，供 ConfigModule.forRoot({ validate }) 使用
 * 校验失败会打印字段错误并抛出，应用无法启动
 */
export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    // eslint-disable-next-line no-console
    console.error('❌ 环境变量校验失败：', parsed.error.flatten().fieldErrors);
    throw new Error('环境变量配置不合法，请检查 .env 文件');
  }
  return parsed.data;
}

// 应用配置类型（从 EnvConfig 派生，集中暴露给业务层）
export interface AppConfig extends EnvConfig {}

// 便捷访问键，业务层用 ConfigService.get(APP_CONFIG_KEY) 拿到强类型配置
export const APP_CONFIG_KEY = 'app';
