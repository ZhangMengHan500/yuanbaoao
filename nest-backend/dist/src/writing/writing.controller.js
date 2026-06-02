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
exports.WritingController = void 0;
const common_1 = require("@nestjs/common");
const writing_service_1 = require("./writing.service");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const public_decorator_1 = require("../common/decorators/public.decorator");
const class_validator_1 = require("class-validator");
class WritingGenerateDto {
}
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: '写作类型不能为空' }),
    __metadata("design:type", String)
], WritingGenerateDto.prototype, "writingType", void 0);
__decorate([
    (0, class_validator_1.IsObject)(),
    (0, class_validator_1.IsNotEmpty)({ message: '筛选条件不能为空' }),
    __metadata("design:type", Object)
], WritingGenerateDto.prototype, "filters", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: '主题不能为空' }),
    __metadata("design:type", String)
], WritingGenerateDto.prototype, "topic", void 0);
let WritingController = class WritingController {
    constructor(writingService) {
        this.writingService = writingService;
    }
    async generate(dto, res) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        res.flushHeaders();
        try {
            const systemPrompt = this.writingService.buildPrompt(dto);
            console.log('[Writing] 开始生成, 主题:', dto.topic, '类型:', dto.writingType, '筛选:', JSON.stringify(dto.filters));
            let fullResponse = '';
            for await (const token of this.writingService.streamWrite(dto.topic, systemPrompt)) {
                fullResponse += token;
                res.write(`data: ${JSON.stringify({ token, done: false })}\n\n`);
            }
            console.log('[Writing] 生成完成, 总字数:', fullResponse.length);
            res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
            res.end();
        }
        catch (error) {
            console.error('[Writing] 生成错误:', error);
            res.write(`data: ${JSON.stringify({ error: error.message || '生成失败' })}\n\n`);
            res.end();
        }
    }
};
exports.WritingController = WritingController;
__decorate([
    (0, common_1.Post)('generate'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [WritingGenerateDto, Object]),
    __metadata("design:returntype", Promise)
], WritingController.prototype, "generate", null);
exports.WritingController = WritingController = __decorate([
    (0, common_1.Controller)('writing'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, public_decorator_1.Public)(),
    __metadata("design:paramtypes", [writing_service_1.WritingService])
], WritingController);
//# sourceMappingURL=writing.controller.js.map