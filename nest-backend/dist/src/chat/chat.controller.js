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
exports.ChatController = void 0;
const common_1 = require("@nestjs/common");
const path_1 = require("path");
const fs_1 = require("fs");
const chat_service_1 = require("./chat.service");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const public_decorator_1 = require("../common/decorators/public.decorator");
const class_validator_1 = require("class-validator");
class ChatStreamDto {
}
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: '消息内容不能为空' }),
    __metadata("design:type", String)
], ChatStreamDto.prototype, "content", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: '会话ID不能为空' }),
    __metadata("design:type", String)
], ChatStreamDto.prototype, "sessionId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ChatStreamDto.prototype, "personaId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], ChatStreamDto.prototype, "enableRag", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], ChatStreamDto.prototype, "deepThinking", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], ChatStreamDto.prototype, "webSearch", void 0);
class PhotoSolveDto {
}
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: '消息内容不能为空' }),
    __metadata("design:type", String)
], PhotoSolveDto.prototype, "content", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: '会话ID不能为空' }),
    __metadata("design:type", String)
], PhotoSolveDto.prototype, "sessionId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: '图片URL不能为空' }),
    __metadata("design:type", String)
], PhotoSolveDto.prototype, "imageUrl", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PhotoSolveDto.prototype, "personaId", void 0);
let ChatController = class ChatController {
    constructor(chatService) {
        this.chatService = chatService;
    }
    async streamChat(dto, res, userId) {
        const effectiveUserId = userId || 'a3dfb476-937a-4303-808c-316b512c2514';
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        res.flushHeaders();
        try {
            const { content, sessionId, personaId, enableRag = true, deepThinking = false, webSearch = false } = dto;
            await this.chatService.saveUserMessage(sessionId, content);
            await this.chatService.autoTitleIfNew(sessionId, effectiveUserId, content);
            const { messages } = await this.chatService.buildChatContext(sessionId, effectiveUserId, content, enableRag, personaId, deepThinking, webSearch);
            messages.push({ role: 'user', content });
            let fullResponse = '';
            for await (const token of this.chatService.streamReply(messages)) {
                fullResponse += token;
                res.write(`data: ${JSON.stringify({ token, done: false })}\n\n`);
            }
            if (fullResponse) {
                await this.chatService.saveAssistantMessage(sessionId, fullResponse);
            }
            res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
            res.end();
        }
        catch (error) {
            console.error('流式聊天错误:', error);
            res.write(`data: ${JSON.stringify({ error: error.message || '处理请求时出错' })}\n\n`);
            res.end();
        }
    }
    getMemoryType() {
        return {
            type: this.chatService.getMemoryType(),
        };
    }
    async photoSolve(dto, res, userId) {
        const effectiveUserId = userId || 'a3dfb476-937a-4303-808c-316b512c2514';
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        res.flushHeaders();
        try {
            const { content, sessionId, imageUrl, personaId } = dto;
            console.log('[PhotoSolve] 收到请求, imageUrl:', imageUrl?.substring(0, 80));
            await this.chatService.saveUserMessageWithImage(sessionId, content, imageUrl);
            await this.chatService.autoTitleIfNew(sessionId, effectiveUserId, '拍题答疑');
            const context = await this.chatService.buildChatContext(sessionId, effectiveUserId, content, false, personaId);
            const messages = context.messages;
            messages.push({
                role: 'system',
                content: `你是专业全学科AI解题大师。请使用 Markdown 格式回答，包括：
- 标题用 ## 和 ###
- 重点内容用 **加粗**
- 步骤用有序列表 1. 2. 3.
- 代码或公式用反引号包裹
- 适当使用分隔线 ---

回答结构：
## 题目解析
## 标准答案
## 详细步骤
## 知识点总结
## 易错提醒

请确保解答准确、步骤清晰、语言通俗易懂。`,
            });
            let imageDataUrl = imageUrl;
            const uploadsMatch = imageUrl.match(/\/uploads\/.+/);
            if (uploadsMatch) {
                const filePath = (0, path_1.join)(process.cwd(), uploadsMatch[0]);
                const buf = (0, fs_1.readFileSync)(filePath);
                const ext = uploadsMatch[0].split('.').pop() || 'jpg';
                const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
                imageDataUrl = `data:${mime};base64,${buf.toString('base64')}`;
                console.log('[PhotoSolve] 图片已转为 data URL, 长度:', imageDataUrl.length);
            }
            messages.push({
                role: 'user',
                content: [
                    { type: 'image_url', image_url: { url: imageDataUrl } },
                    { type: 'text', text: content || '请解答这道题目' },
                ],
            });
            console.log('[PhotoSolve] 开始调用视觉模型...');
            let fullResponse = '';
            for await (const token of this.chatService.streamPhotoSolve(messages)) {
                fullResponse += token;
                res.write(`data: ${JSON.stringify({ token, done: false })}\n\n`);
            }
            if (fullResponse) {
                await this.chatService.saveAssistantMessage(sessionId, fullResponse);
            }
            res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
            res.end();
        }
        catch (error) {
            console.error('拍照答疑错误:', error);
            res.write(`data: ${JSON.stringify({ error: error.message || '处理请求时出错' })}\n\n`);
            res.end();
        }
    }
    async clearMemory(sessionId) {
        await this.chatService.clearSessionMemory(sessionId);
        return { message: '记忆已清空' };
    }
};
exports.ChatController = ChatController;
__decorate([
    (0, common_1.Post)('stream'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ChatStreamDto, Object, String]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "streamChat", null);
__decorate([
    (0, common_1.Get)('memory-type'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ChatController.prototype, "getMemoryType", null);
__decorate([
    (0, common_1.Post)('photo-solve'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [PhotoSolveDto, Object, String]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "photoSolve", null);
__decorate([
    (0, common_1.Delete)('memory/:sessionId'),
    __param(0, (0, common_1.Param)('sessionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "clearMemory", null);
exports.ChatController = ChatController = __decorate([
    (0, common_1.Controller)('chat'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, public_decorator_1.Public)(),
    __metadata("design:paramtypes", [chat_service_1.ChatService])
], ChatController);
//# sourceMappingURL=chat.controller.js.map