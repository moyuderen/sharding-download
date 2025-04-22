import { Injectable } from '@nestjs/common';
import { Response } from 'express';
import { createReadStream, statSync, Stats } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';
import { pipeline } from 'stream/promises';

@Injectable()
export class AppService {
  private readonly storagePath = join(process.cwd(), 'uploads');

  getSafePath(filename: string): string {
    const safePath = join(this.storagePath, filename);
    if (!safePath.startsWith(this.storagePath)) {
      throw new Error('Path traversal detected');
    }
    return safePath;
  }

  async validateFile(filename: string) {
    const filePath = this.getSafePath(filename);
    const stats = statSync(filePath);

    if (!stats.isFile()) {
      throw new Error('Not a regular file');
    }

    return { filePath, stats };
  }

  async generateETag(filename: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = createHash('sha256');
      const stream = createReadStream(this.getSafePath(filename));

      stream.on('data', (chunk) => hash.update(chunk));
      stream.on('end', () => resolve(`${hash.digest('hex')}`));
      stream.on('error', reject);
    });
  }

  async sendFullFile(
    res: Response,
    filePath: string,
    filename: string,
    stats: Stats,
  ) {
    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      'Content-Length': stats.size,
    });

    const readStream = createReadStream(filePath);
    await pipeline(readStream, res);
  }

  async handleRangeRequest(
    res: Response,
    filename: string,
    filePath: string,
    rangeHeader: string,
    fileSize: number,
  ) {
    if (!rangeHeader) {
      await this.sendFullFile(res, filePath, filename, statSync(filePath));
      return;
    }
    const ranges = this.parseRangeHeader(rangeHeader, fileSize);

    if (ranges.length > 1) {
      res.status(501).set({ 'Accept-Ranges': 'bytes' }).end();
      return;
    }

    const { start, end } = ranges[0];
    const contentLength = end - start + 1;
    res.status(206).set({
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Content-Length': contentLength,
      'Content-Type': 'application/octet-stream',
      'Accept-Ranges': 'bytes',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      Etag: await this.generateETag(filename),
    });

    const readStream = createReadStream(filePath, { start, end });
    await pipeline(readStream, res);
  }

  private parseRangeHeader(range: string, fileSize: number) {
    const BYTES_PREFIX = 'bytes=';
    if (!range.startsWith(BYTES_PREFIX)) {
      throw new Error('Invalid range unit');
    }

    return range
      .slice(BYTES_PREFIX.length)
      .split(',')
      .map((range) => {
        const [startStr, endStr] = range.split('-');
        const start = parseInt(startStr, 10);
        const end = endStr ? parseInt(endStr, 10) : fileSize - 1;

        if (isNaN(start) && isNaN(end)) throw new Error('Invalid range');
        if (isNaN(start)) return { start: fileSize - end, end: fileSize - 1 };
        if (isNaN(end)) return { start, end: fileSize - 1 };

        if (start > end || end > fileSize) {
          throw new Error('Range Not Satisfiable');
        }

        return { start, end };
      });
  }

  handleDownloadError(error: Error, res: Response) {
    switch (error.message) {
      case 'Path traversal detected':
      case 'Not a regular file':
        res.status(404).json({ code: 'FILE_NOT_FOUND' });
        break;
      case 'Invalid range unit':
        res.status(400).json({ code: 'INVALID_RANGE_UNIT' });
        break;
      case 'Range Not Satisfiable':
        res.status(416).end();
        break;
      default:
        res.status(500).end();
    }
  }
}
