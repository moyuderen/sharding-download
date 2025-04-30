"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppService = void 0;
const common_1 = require("@nestjs/common");
const fs_1 = require("fs");
const path_1 = require("path");
const crypto_1 = require("crypto");
const promises_1 = require("stream/promises");
let AppService = class AppService {
    constructor() {
        this.storagePath = (0, path_1.join)(process.cwd(), 'public');
    }
    getSafePath(filename) {
        const safePath = (0, path_1.join)(this.storagePath, filename);
        if (!safePath.startsWith(this.storagePath)) {
            throw new Error('Path traversal detected');
        }
        return safePath;
    }
    async validateFile(filename) {
        const filePath = this.getSafePath(filename);
        const stats = (0, fs_1.statSync)(filePath);
        if (!stats.isFile()) {
            throw new Error('Not a regular file');
        }
        return { filePath, stats };
    }
    async generateETag(filename) {
        return new Promise((resolve, reject) => {
            const hash = (0, crypto_1.createHash)('sha256');
            const stream = (0, fs_1.createReadStream)(this.getSafePath(filename));
            stream.on('data', (chunk) => hash.update(chunk));
            stream.on('end', () => resolve(`${hash.digest('hex')}`));
            stream.on('error', reject);
        });
    }
    async sendFullFile(res, filePath, filename, stats) {
        res.set({
            'Content-Type': 'application/octet-stream',
            'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
            'Content-Length': stats.size,
        });
        const readStream = (0, fs_1.createReadStream)(filePath);
        await (0, promises_1.pipeline)(readStream, res);
    }
    async handleRangeRequest(res, filename, filePath, rangeHeader, fileSize) {
        if (!rangeHeader) {
            await this.sendFullFile(res, filePath, filename, (0, fs_1.statSync)(filePath));
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
        const readStream = (0, fs_1.createReadStream)(filePath, { start, end });
        await (0, promises_1.pipeline)(readStream, res);
    }
    parseRangeHeader(range, fileSize) {
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
            if (isNaN(start) && isNaN(end))
                throw new Error('Invalid range');
            if (isNaN(start))
                return { start: fileSize - end, end: fileSize - 1 };
            if (isNaN(end))
                return { start, end: fileSize - 1 };
            if (start > end || end > fileSize) {
                throw new Error('Range Not Satisfiable');
            }
            return { start, end };
        });
    }
    handleDownloadError(error, res) {
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
};
exports.AppService = AppService;
exports.AppService = AppService = __decorate([
    (0, common_1.Injectable)()
], AppService);
//# sourceMappingURL=app.service.js.map