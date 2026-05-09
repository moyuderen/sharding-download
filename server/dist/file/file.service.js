"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileService = void 0;
const common_1 = require("@nestjs/common");
const fs_1 = require("fs");
const path_1 = require("path");
const crypto_1 = require("crypto");
const promises_1 = require("stream/promises");
let FileService = class FileService {
    constructor() {
        this.storagePath = process.env.STORAGE_PATH || (0, path_1.join)(__dirname, '..', 'public');
        this.rootPath = (0, path_1.resolve)(this.storagePath);
        this.etagCache = new Map();
        this.pendingEtags = new Map();
        this.maxEtagCacheSize = 100;
    }
    getSafePath(filename) {
        if (filename.includes('\0')) {
            throw new Error('Invalid filename');
        }
        const safePath = (0, path_1.resolve)(this.rootPath, filename);
        if (!safePath.startsWith(this.rootPath + path_1.sep) && safePath !== this.rootPath) {
            throw new Error('Path traversal detected');
        }
        return safePath;
    }
    async validateFile(filename) {
        const filePath = this.getSafePath(filename);
        const stats = await fs_1.promises.lstat(filePath);
        if (stats.isSymbolicLink() || !stats.isFile()) {
            throw new Error('Not a regular file');
        }
        return { filePath, stats };
    }
    async generateETag(filePath) {
        return new Promise((resolvePromise, reject) => {
            const hash = (0, crypto_1.createHash)('sha256');
            const stream = (0, fs_1.createReadStream)(filePath);
            stream.on('data', (chunk) => hash.update(chunk));
            stream.on('end', () => resolvePromise(hash.digest('hex')));
            stream.on('error', reject);
        });
    }
    async getETag(filePath, stats) {
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
    async sendFullFile(res, filePath, filename, stats) {
        res.set(await this.buildDownloadHeaders(filePath, filename, stats));
        const readStream = (0, fs_1.createReadStream)(filePath);
        await (0, promises_1.pipeline)(readStream, res);
    }
    async handleRangeRequest(res, filename, filePath, rangeHeader, stats) {
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
        res.status(206).set(await this.buildDownloadHeaders(filePath, filename, stats, {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Content-Length': contentLength,
        }));
        const readStream = (0, fs_1.createReadStream)(filePath, { start, end });
        await (0, promises_1.pipeline)(readStream, res);
    }
    parseRangeHeader(range, fileSize) {
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
    setCachedEtag(filePath, etag, mtimeMs) {
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
    async buildDownloadHeaders(filePath, filename, stats, extraHeaders = {}) {
        return {
            'Content-Type': 'application/octet-stream',
            'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
            'Content-Length': stats.size,
            'Accept-Ranges': 'bytes',
            ETag: await this.getETag(filePath, stats),
            ...extraHeaders,
        };
    }
    handleDownloadError(error, res, fileSize) {
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
};
exports.FileService = FileService;
exports.FileService = FileService = __decorate([
    (0, common_1.Injectable)()
], FileService);
//# sourceMappingURL=file.service.js.map