import {
  Controller,
  Get,
  Param,
  Headers,
  Res,
  Post,
  Body,
  Query,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
  ApiBody,
  ApiHeader,
} from '@nestjs/swagger';
import { Response } from 'express';
import { FileService } from './file.service';
import { sleep } from '../share';
import { DownloadDto } from './file.dto';

@ApiTags('分片下载相关')
@Controller('file')
export class FileController {
  private readonly logger = new Logger(FileController.name);

  constructor(private readonly fileService: FileService) {}

  @Get('getFileMeta/:filename')
  @ApiOperation({ summary: '获取文件元信息' })
  @ApiParam({
    name: 'filename',
    example: '711.jpg',
    description: '文件名称',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: '文件元信息',
    example: {
      size: 1847928,
      eTag: 'afe35b83ccd35635b9ea7dc49ba5808c282533499275c8c811da2138c90b5b38',
      lastModified: '2025-05-06T03:10:20.391Z',
      name: '711.jpg',
    },
  })
  async getFileMetadata(
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    try {
      const { filePath, stats } = await this.fileService.validateFile(filename);
      const eTag = await this.fileService.getETag(filePath, stats);

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
          name: filename,
        });
    } catch (error) {
      this.handleControllerError(error, res);
    }
  }

  @Post('download')
  @ApiOperation({ summary: '分段下载' })
  @ApiQuery({
    name: 'error',
    description: '测试下载失败，为"1"时，接口返回错误(非必填)',
    examples: {
      success: {
        summary: '接口成功',
        description: '不传或者传其他值',
        value: '2',
      },
      fail: {
        summary: '接口失败',
        value: '1',
        description: '传"1"时这个接口失败',
      },
    },
    required: false,
  })
  @ApiHeader({
    name: 'Range',
    description: 'Range of bytes to fetch',
    required: true,
    schema: {
      type: 'string',
      example: 'bytes=0-1024',
    },
  })
  @ApiBody({
    type: DownloadDto,
    enum: '771.jpg',
    examples: {
      demo: {
        summary: '文件地址或者文件对应的参数',
        value: {
          url: '711.jpg',
        },
      },
    },
  })
  @ApiResponse({
    status: 206,
    example: 'ffd8ffe000104a1xxxxxxx',
    headers: {
      'Content-range': {
        description: 'Range of bytes being sent in the response',
        schema: {
          type: 'string',
          example: 'bytes 1-1000/288888',
        },
      },
      'Content-length': {
        description: '文件总字节数',
        schema: {
          type: 'number',
          example: '288888',
        },
      },
      ETag: {
        description: '文件唯一标识，类似hash',
        schema: {
          type: 'string',
          example:
            'afe35b83ccd35635b9ea7dc49ba5808c282533499275c8c811da2138c90b5b38',
        },
      },
      'Content-Disposition': {
        description: '文件名称信息',
        schema: {
          type: 'string',
          example: `attachment; filename*=UTF-8''711.jpg}`,
        },
      },
    },
    description: '返回的流信息',
  })
  @ApiResponse({
    status: 200,
    example: {
      code: '00003',
      message: '模拟文件下载错误',
    },
    description: '返回错误信息',
  })
  @ApiResponse({
    status: 500,
    description: '系统错误',
  })
  async downloadFile(
    @Body() postData: DownloadDto,
    @Headers() headers: Record<string, string>,
    @Res() res: Response,
    @Query('error') error: string,
  ) {
    const { url: filename } = postData;
    let fileSize: number | undefined;

    if (error === '1') {
      res.status(200).json({ code: '00003', message: '模拟下载失败' });
      return;
    }

    try {
      const { filePath, stats } = await this.fileService.validateFile(filename);
      fileSize = stats.size;
      const range = headers.range;

      if (!range) {
        return this.fileService.sendFullFile(res, filePath, filename, stats);
      }

      await sleep();

      return this.fileService.handleRangeRequest(
        res,
        filename,
        filePath,
        range,
        stats,
      );
    } catch (error) {
      this.handleControllerError(error, res, fileSize);
    }
  }

  private handleControllerError(
    error: unknown,
    res: Response,
    fileSize?: number,
  ) {
    const normalizedError =
      error instanceof Error ? error : new Error('Unknown error');
    this.logger.error(normalizedError.message, normalizedError.stack);
    this.fileService.handleDownloadError(normalizedError, res, fileSize);
  }
}
