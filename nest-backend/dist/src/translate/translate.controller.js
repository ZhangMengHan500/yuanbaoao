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
exports.TranslateController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const public_decorator_1 = require("../common/decorators/public.decorator");
const translate_service_1 = require("./translate.service");
let TranslateController = class TranslateController {
    constructor(translateService) {
        this.translateService = translateService;
    }
    async streamTranslate(body, res) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        try {
            let fullText = '';
            for await (const token of this.translateService.streamTranslate(body.text, body.sourceLang, body.targetLang)) {
                fullText += token;
                res.write(`data: ${JSON.stringify({ type: 'token', token })}\n\n`);
            }
            res.write(`data: ${JSON.stringify({ type: 'done', fullText })}\n\n`);
            res.write('data: [DONE]\n\n');
        }
        catch (error) {
            res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
        }
        res.end();
    }
    async photoTranslate(body, res) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        try {
            const { originalText, translatedText } = await this.translateService.photoTranslate(body.imageBase64, body.sourceLang, body.targetLang);
            res.write(`data: ${JSON.stringify({ type: 'ocr', text: originalText })}\n\n`);
            res.write(`data: ${JSON.stringify({ type: 'token', token: translatedText })}\n\n`);
            res.write(`data: ${JSON.stringify({ type: 'done', fullText: translatedText, ocrText: originalText })}\n\n`);
            res.write('data: [DONE]\n\n');
        }
        catch (error) {
            res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
        }
        res.end();
    }
    async translateTTS(body, res) {
        res.setHeader('Content-Type', 'audio/wav');
        res.end();
    }
};
exports.TranslateController = TranslateController;
__decorate([
    (0, common_1.Post)('stream'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], TranslateController.prototype, "streamTranslate", null);
__decorate([
    (0, common_1.Post)('photo'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], TranslateController.prototype, "photoTranslate", null);
__decorate([
    (0, common_1.Post)('tts'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], TranslateController.prototype, "translateTTS", null);
exports.TranslateController = TranslateController = __decorate([
    (0, common_1.Controller)('translate'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, public_decorator_1.Public)(),
    __metadata("design:paramtypes", [translate_service_1.TranslateService])
], TranslateController);
//# sourceMappingURL=translate.controller.js.map