import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  CurrentUser,
  RequestUser,
} from '../shared/decorators/current-user.decorator';
import { UsersService } from './users.service';

@ApiTags('用户')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  @ApiOperation({ summary: '获取当前登录用户资料' })
  getProfile(@CurrentUser() user: RequestUser) {
    return this.usersService.getProfile(user.sub);
  }
}
