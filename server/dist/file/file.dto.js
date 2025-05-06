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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DownloadDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class DownloadDto {
}
exports.DownloadDto = DownloadDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: '文件obs地址，或者根据根据业务场景对应的文件对应参数',
        examples: ['htts://obs/downloader/711.jpg', 'hgsku-ssmks'],
    }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], DownloadDto.prototype, "url", void 0);
//# sourceMappingURL=file.dto.js.map