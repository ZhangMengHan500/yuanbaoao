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
exports.HomeworkController = void 0;
const common_1 = require("@nestjs/common");
const path_1 = require("path");
const fs_1 = require("fs");
const homework_service_1 = require("./homework.service");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const public_decorator_1 = require("../common/decorators/public.decorator");
const class_validator_1 = require("class-validator");
class GradeDto {
}
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: '图片URL不能为空' }),
    __metadata("design:type", String)
], GradeDto.prototype, "imageUrl", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GradeDto.prototype, "text", void 0);
let HomeworkController = class HomeworkController {
    constructor(homeworkService) {
        this.homeworkService = homeworkService;
    }
    async grade(dto, res) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        res.flushHeaders();
        try {
            const { imageUrl, text } = dto;
            let imageBase64 = '';
            let mimeType = 'image/jpeg';
            const uploadsMatch = imageUrl.match(/\/uploads\/.+/);
            if (uploadsMatch) {
                const filePath = (0, path_1.join)(process.cwd(), uploadsMatch[0]);
                const buf = (0, fs_1.readFileSync)(filePath);
                imageBase64 = buf.toString('base64');
                const ext = uploadsMatch[0].split('.').pop()?.toLowerCase() || 'jpg';
                mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
                console.log('[Homework] 图片已读取, base64长度:', imageBase64.length);
            }
            if (!imageBase64) {
                res.write(`data: ${JSON.stringify({ error: '无法读取图片' })}\n\n`);
                res.end();
                return;
            }
            console.log('[Homework] 开始批改...');
            let fullResponse = '';
            for await (const token of this.homeworkService.streamGrade(imageBase64, mimeType, text || '')) {
                fullResponse += token;
                res.write(`data: ${JSON.stringify({ token, done: false })}\n\n`);
            }
            res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
            res.end();
        }
        catch (error) {
            console.error('[Homework] 批改错误:', error);
            res.write(`data: ${JSON.stringify({ error: error.message || '批改失败' })}\n\n`);
            res.end();
        }
    }
};
exports.HomeworkController = HomeworkController;
__decorate([
    (0, common_1.Post)('grade'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [GradeDto, Object]),
    __metadata("design:returntype", Promise)
], HomeworkController.prototype, "grade", null);
exports.HomeworkController = HomeworkController = __decorate([
    (0, common_1.Controller)('homework'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, public_decorator_1.Public)(),
    __metadata("design:paramtypes", [homework_service_1.HomeworkService])
], HomeworkController);
//# sourceMappingURL=homework.controller.js.map