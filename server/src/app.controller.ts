import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('App')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('hello')
  @ApiOperation({ summary: '测试服务是否启动成功' })
  @ApiResponse({
    status: 200,
    description: 'Hello, Sharding Download Server !',
  })
  async index() {
    return 'Hello, Sharding Download Server !';
  }
}
