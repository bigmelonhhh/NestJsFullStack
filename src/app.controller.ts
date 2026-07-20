import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('系统')
@Controller('health')
export class AppController {
  @Get()
  @ApiOperation({ summary: '健康检查' })
  check() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
