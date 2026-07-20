import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const port = config.get<number>('PORT') ?? 3000;

  // 安全头：CSP、XSS 防护等
  app.use(helmet());

  // CORS：明确允许的前端来源，生产不要用 *
  const origins = config.get<string>('CORS_ORIGIN') ?? '*';
  app.enableCors({
    origin: origins === '*' ? true : origins.split(',').map((s) => s.trim()),
  });

  // 所有业务路由统一加 /api 前缀，健康检查除外
  app.setGlobalPrefix('api', { exclude: ['health'] });

  // 优雅关闭：收到 SIGTERM 时停止接收新连接并释放数据库连接
  app.enableShutdownHooks();

  // Swagger / OpenAPI 文档
  const swaggerConfig = new DocumentBuilder()
    .setTitle('简易电商 API')
    .setDescription(
      'NestJS + Prisma + MySQL + Zod + JWT 学习骨架 | 前端转全栈实战',
    )
    .setVersion('1.0')
    .addBearerAuth() // 标记需要 Bearer Token 的接口
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`服务已启动: http://localhost:${port}`);
  logger.log(`Swagger 文档: http://localhost:${port}/docs`);
  logger.log(`健康检查: http://localhost:${port}/health`);
}

void bootstrap();
