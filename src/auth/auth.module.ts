import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { JwtStrategy } from './jwt.strategy';
import { RateLimitGuard } from './rate-limit.guard';

@Module({
  imports: [
    PassportModule,
    // JWT 密钥与过期时间从环境变量读取，不硬编码
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: config.get<string>('JWT_EXPIRES_IN') },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtAuthGuard, RateLimitGuard],
  // 导出 JwtAuthGuard 供其他模块鉴权；导出 JwtModule 以便复用
  exports: [AuthService, JwtAuthGuard, JwtModule],
})
export class AuthModule {}
