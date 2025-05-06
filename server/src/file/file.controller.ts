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
import { FileService } from './file.service';
import { sleep } from '../share';

@Controller('file')
export class FileController {
  constructor(private readonly fileService: FileService) {}

  @Get('getFileMeta/:filename')
  async getFileMetadata(
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    const filePath = this.fileService.getSafePath(filename);
    const stats = statSync(filePath);
    const eTag = await this.fileService.generateETag(filename);

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
      const { filePath, stats } = await this.fileService.validateFile(filename);
      const range = headers.range;

      // 处理完整文件下载
      if (!range) {
        return this.fileService.sendFullFile(res, filePath, filename, stats);
      }

      await sleep();

      return this.fileService.handleRangeRequest(
        res,
        filename,
        filePath,
        range,
        stats.size,
      );
    } catch (error) {
      console.log(error);
      this.fileService.handleDownloadError(error, res);
    }
  }
}
