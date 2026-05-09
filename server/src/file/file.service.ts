import { Injectable } from '@nestjs/common';
import { Response } from 'express';
import { createReadStream, promises as fs, Stats } from 'fs';
import { join, resolve, sep } from 'path';
import { createHash } from 'crypto';
import { pipeline } from 'stream/promises';

@Injectable()
export class FileService {
  private readonly storagePath =
    process.env.STORAGE_PATH || join(__dirname, '..', 'public');
  private readonly rootPath = resolve(this.storagePath);
  private readonly etagCache = new Map<string, { etag: string; mtimeMs: number }>();
  private readonly pendingEtags = new Map<string, Promise<string>>();
  private readonly maxEtagCacheSize = 100;

  getSafePath(filename: string): string {
    if (filename.includes('\0')) {
      throw new Error('Invalid filename');
    }

    const safePath = resolve(this.rootPath, filename);

    if (!safePath.startsWith(this.rootPath + sep) && safePath !== this.rootPath) {
      throw new Error('Path traversal detected');
    }

    return safePath;
  }

  async validateFile(filename: string) {
    const filePath = this.getSafePath(filename);
    const stats = await fs.lstat(filePath);

    if (stats.isSymbolicLink() || !stats.isFile()) {
      throw new Error('Not a regular file');
    }

    return { filePath, stats };
  }

  async generateETag(filePath: string): Promise<string> {
    return new Promise((resolvePromise, reject) => {
      const hash = createHash('sha256');
      const stream = createReadStream(filePath);

      stream.on('data', (chunk) => hash.update(chunk));
      stream.on('end', () => resolvePromise(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  async getETag(filePath: string, stats: Stats): Promise<string> {
    const cached = this.etagCache.get(filePath);

    if (cached && cached.mtimeMs === stats.mtimeMs) {
      return cached.etag;
    }

    if (stats.size > 10 * 1024 * 1024) {
      const etag = `W/\"${stats.size}-${stats.mtimeMs}\"`;
      this.setCachedEtag(filePath, etag, stats.mtimeMs);
      return etag;
    }

    const pending = this.pendingEtags.get(filePath);
    if (pending) {
      return pending;
    }

    const etagPromise = this.generateETag(filePath)
      .then((etag) => {
        this.setCachedEtag(filePath, etag, stats.mtimeMs);
        return etag;
      })
      .finally(() => {
        this.pendingEtags.delete(filePath);
      });

    this.pendingEtags.set(filePath, etagPromise);
    return etagPromise;
  }

  async sendFullFile(
    res: Response,
    filePath: string,
    filename: string,
    stats: Stats,
  ) {
    res.set(await this.buildDownloadHeaders(filePath, filename, stats));

    const readStream = createReadStream(filePath);
    await pipeline(readStream, res);
  }

  async handleRangeRequest(
    res: Response,
    filename: string,
    filePath: string,
    rangeHeader: string,
    stats: Stats,
  ) {
    if (!rangeHeader) {
      await this.sendFullFile(res, filePath, filename, stats);
      return;
    }

    const fileSize = stats.size;
    const ranges = this.parseRangeHeader(rangeHeader, fileSize);

    if (ranges.length > 1) {
      res.status(501).set({ 'Accept-Ranges': 'bytes' }).end();
      return;
    }

    const { start, end } = ranges[0];
    const contentLength = end - start + 1;
    res.status(206).set(
      await this.buildDownloadHeaders(filePath, filename, stats, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Content-Length': contentLength,
      }),
    );

    const readStream = createReadStream(filePath, { start, end });
    await pipeline(readStream, res);
  }

  private parseRangeHeader(range: string, fileSize: number) {
    const BYTES_PREFIX = 'bytes=';
    if (!range.startsWith(BYTES_PREFIX)) {
      throw new Error('Invalid range unit');
    }

    if (fileSize === 0) {
      throw new Error('Range Not Satisfiable');
    }

    return range
      .slice(BYTES_PREFIX.length)
      .split(',')
      .map((item) => {
        const [startStr, endStr] = item.split('-');
        const start = startStr ? parseInt(startStr, 10) : Number.NaN;
        const end = endStr ? parseInt(endStr, 10) : fileSize - 1;

        if (Number.isNaN(start) && Number.isNaN(end)) {
          throw new Error('Invalid range');
        }

        if (Number.isNaN(start)) {
          const suffixLength = Math.min(end, fileSize);
          return { start: fileSize - suffixLength, end: fileSize - 1 };
        }

        if (Number.isNaN(end)) {
          if (start >= fileSize) {
            throw new Error('Range Not Satisfiable');
          }
          return { start, end: fileSize - 1 };
        }

        if (start > end || start >= fileSize) {
          throw new Error('Range Not Satisfiable');
        }

        return { start, end: Math.min(end, fileSize - 1) };
      });
  }

  private setCachedEtag(filePath: string, etag: string, mtimeMs: number) {
    if (this.etagCache.has(filePath)) {
      this.etagCache.delete(filePath);
    }

    this.etagCache.set(filePath, { etag, mtimeMs });

    if (this.etagCache.size > this.maxEtagCacheSize) {
      const oldestKey = this.etagCache.keys().next().value;
      if (oldestKey) {
        this.etagCache.delete(oldestKey);
      }
    }
  }

  private async buildDownloadHeaders(
    filePath: string,
    filename: string,
    stats: Stats,
    extraHeaders: Record<string, string | number> = {},
  ) {
    return {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      'Content-Length': stats.size,
      'Accept-Ranges': 'bytes',
      ETag: await this.getETag(filePath, stats),
      ...extraHeaders,
    };
  }

  handleDownloadError(error: Error, res: Response, fileSize?: number) {
    switch (error.message) {
      case 'Path traversal detected':
      case 'Not a regular file':
        res.status(404).json({ code: 'FILE_NOT_FOUND' });
        break;
      case 'Invalid filename':
      case 'Invalid range unit':
      case 'Invalid range':
        res.status(400).json({ code: 'INVALID_RANGE_UNIT' });
        break;
      case 'Range Not Satisfiable':
        if (typeof fileSize === 'number') {
          res.status(416).set({ 'Content-Range': `bytes */${fileSize}` }).end();
          return;
        }
        res.status(416).end();
        break;
      default:
        res.status(500).json({ code: 'INTERNAL_ERROR' });
    }
  }
}
