"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const fs_1 = require("fs");
const file_service_1 = require("./file.service");
const share_1 = require("../share");
const file_dto_1 = require("./file.dto");
let FileController = class FileController {
    constructor(fileService) {
        this.fileService = fileService;
    }
    async getFileMetadata(filename, res) {
        const filePath = this.fileService.getSafePath(filename);
        const stats = (0, fs_1.statSync)(filePath);
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
            name: filename,
        });
    }
    async downloadFile(postData, headers, res, error) {
        const { url: filename } = postData;
        if (error === '1') {
            res.status(200).json({ code: '00003', message: '模拟下载失败' });
            return;
        }
        try {
            const { filePath, stats } = await this.fileService.validateFile(filename);
            const range = headers.range;
            if (!range) {
                return this.fileService.sendFullFile(res, filePath, filename, stats);
            }
            await (0, share_1.sleep)();
            return this.fileService.handleRangeRequest(res, filename, filePath, range, stats.size);
        }
        catch (error) {
            console.log(error);
            this.fileService.handleDownloadError(error, res);
        }
    }
};
exports.FileController = FileController;
__decorate([
    (0, common_1.Get)('getFileMeta/:filename'),
    (0, swagger_1.ApiOperation)({ summary: '获取文件元信息' }),
    (0, swagger_1.ApiParam)({
        name: 'filename',
        example: '711.jpg',
        description: '文件名称',
        required: true,
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: '文件元信息',
        example: {
            size: 1847928,
            eTag: 'afe35b83ccd35635b9ea7dc49ba5808c282533499275c8c811da2138c90b5b38',
            lastModified: '2025-05-06T03:10:20.391Z',
            name: '711.jpg',
        },
    }),
    __param(0, (0, common_1.Param)('filename')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], FileController.prototype, "getFileMetadata", null);
__decorate([
    (0, common_1.Post)('download'),
    (0, swagger_1.ApiOperation)({ summary: '分段下载' }),
    (0, swagger_1.ApiQuery)({
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
    }),
    (0, swagger_1.ApiHeader)({
        name: 'Range',
        description: 'Range of bytes to fetch',
        required: true,
        schema: {
            type: 'string',
            example: 'bytes=0-1024',
        },
    }),
    (0, swagger_1.ApiBody)({
        type: file_dto_1.DownloadDto,
        enum: '771.jpg',
        examples: {
            demo: {
                summary: '文件地址或者文件对应的参数',
                value: {
                    url: '711.jpg',
                },
            },
        },
    }),
    (0, swagger_1.ApiResponse)({
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
                    example: 'afe35b83ccd35635b9ea7dc49ba5808c282533499275c8c811da2138c90b5b38',
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
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        example: {
            code: '00003',
            message: '模拟文件下载错误',
        },
        description: '返回错误信息',
    }),
    (0, swagger_1.ApiResponse)({
        status: 500,
        description: '系统错误',
    }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Headers)()),
    __param(2, (0, common_1.Res)()),
    __param(3, (0, common_1.Query)('error')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object, String]),
    __metadata("design:returntype", Promise)
], FileController.prototype, "downloadFile", null);
exports.FileController = FileController = __decorate([
    (0, swagger_1.ApiTags)('分片下载相关'),
    (0, common_1.Controller)('file'),
    __metadata("design:paramtypes", [file_service_1.FileService])
], FileController);
//# sourceMappingURL=file.controller.js.map