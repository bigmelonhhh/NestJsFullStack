import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { validateEnv } from './config/config';
import { OrdersModule } from './orders/orders.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProductsModule } from './products/products.module';
import { AllExceptionsFilter } from './shared/filters/all-exceptions.filter';
import { LoggingInterceptor } from './shared/interceptors/logging.interceptor';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    // 环境变量集中校验：不合法直接拒绝启动
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    PrismaModule, // 全局数据库
    AuthModule,
    UsersModule,
    ProductsModule,
    OrdersModule,
  ],
  controllers: [AppController],
  providers: [
    // 全局异常过滤器：统一错误响应格式
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    // 全局日志拦截器：记录每个请求耗时
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule {}
