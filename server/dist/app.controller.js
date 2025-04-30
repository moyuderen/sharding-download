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
exports.AppController = void 0;
const common_1 = require("@nestjs/common");
const fs_1 = require("fs");
const app_service_1 = require("./app.service");
const utils_1 = require("./utils");
let AppController = class AppController {
    constructor(appService) {
        this.appService = appService;
    }
    async index() {
        return 'Hellp, Sharding Download Server !';
    }
    async getFileMetadata(filename, res) {
        const filePath = this.appService.getSafePath(filename);
        const stats = (0, fs_1.statSync)(filePath);
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
    async downloadFile(postData, headers, res, error) {
        const { url: filename } = postData;
        if (error === '1') {
            res.status(200).json({ code: '00003', message: '模拟下载失败' });
            return;
        }
        try {
            const { filePath, stats } = await this.appService.validateFile(filename);
            const range = headers.range;
            if (!range) {
                return this.appService.sendFullFile(res, filePath, filename, stats);
            }
            await (0, utils_1.sleep)();
            return this.appService.handleRangeRequest(res, filename, filePath, range, stats.size);
        }
        catch (error) {
            this.appService.handleDownloadError(error, res);
        }
    }
};
exports.AppController = AppController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AppController.prototype, "index", null);
__decorate([
    (0, common_1.Get)('getFileMeta/:filename'),
    __param(0, (0, common_1.Param)('filename')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "getFileMetadata", null);
__decorate([
    (0, common_1.Post)('download'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Headers)()),
    __param(2, (0, common_1.Res)()),
    __param(3, (0, common_1.Query)('error')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object, String]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "downloadFile", null);
exports.AppController = AppController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [app_service_1.AppService])
], AppController);
//# sourceMappingURL=app.controller.js.map