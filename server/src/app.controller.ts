import {
  Controller,
  Get,
  Param,
  Headers,
  Res,
  Post,
  Body,
  Query,
} from '@nestjs/common';
import { Response } from 'express';
import { statSync } from 'fs';
import { AppService } from './app.service';
import { sleep } from './utils';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  async index() {
    return 'Hellp, Sharding Download Server !';
  }

  @Get('getFileMeta/:filename')
  async getFileMetadata(
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    const filePath = this.appService.getSafePath(filename);
    const stats = statSync(filePath);
    const eTag = await this.appService.generateETag(filename);

    res
      .set({
        'Content-Length': stats.size,
        ETag: eTag,
        'Last-Modified': stats.mtime.toISOString(),
      })
      .json({
        size: stats.size,
        eTag,
        lastModified: stats.mtime.toISOString(),
      });
  }

  @Post('download')
  async downloadFile(
    @Body() postData: { url: string; index: number },
    @Headers() headers: Record<string, string>,
    @Res() res: Response,
    @Query('error') error: string,
  ) {
    const { url: filename } = postData;

    if (error === '1') {
      res.status(200).json({ code: '00003', message: '模拟下载失败' });
      return;
    }

    try {
      const { filePath, stats } = await this.appService.validateFile(filename);
      const range = headers.range;

      // 处理完整文件下载
      if (!range) {
        return this.appService.sendFullFile(res, filePath, filename, stats);
      }

      await sleep();
      // if (index >= 1) {
      //   throw new Error('模拟下载失败');
      // }
      // 处理分段下载
      return this.appService.handleRangeRequest(
        res,
        filename,
        filePath,
        range,
        stats.size,
      );
    } catch (error) {
      this.appService.handleDownloadError(error, res);
    }
  }
}
