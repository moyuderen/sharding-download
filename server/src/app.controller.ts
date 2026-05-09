import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('App')
@Controller()
export class AppController {
  @Get('healthy')
  @ApiOperation({ summary: '健康检查，确认服务正常启动' })
  @ApiResponse({
    status: 200,
    description: 'healthy',
  })
  async index() {
    return 'healthy';
  }
}
