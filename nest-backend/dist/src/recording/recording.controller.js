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
var RecordingController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecordingController = void 0;
const common_1 = require("@nestjs/common");
const recording_service_1 = require("./recording.service");
let RecordingController = RecordingController_1 = class RecordingController {
    constructor(recordingService) {
        this.recordingService = recordingService;
        this.logger = new common_1.Logger(RecordingController_1.name);
    }
    async processAudio(body, res) {
        this.logger.log(`收到请求, body keys: ${JSON.stringify(Object.keys(body || {}))}`);
        this.logger.log(`body type: ${typeof body}, audioBase64: ${body?.audioBase64 ? 'exists' : 'missing'}`);
        const audioBase64 = body?.audioBase64;
        if (!audioBase64) {
            this.logger.warn('audioBase64 is empty or missing');
            res.status(400).json({ message: 'audioBase64 is required', received: JSON.stringify(body) });
            return;
        }
        this.logger.log('收到录音数据，开始处理...');
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        try {
            this.logger.log('步骤1: 语音识别...');
            const transcript = await this.recordingService.recognizeSpeech(audioBase64, body.format || 'wav');
            res.write(`data: ${JSON.stringify({ type: 'transcript', text: transcript })}\n\n`);
            if (!transcript || transcript.trim().length === 0) {
                res.write(`data: ${JSON.stringify({ type: 'error', message: '未能识别到语音内容' })}\n\n`);
                res.write('data: [DONE]\n\n');
                res.end();
                return;
            }
            this.logger.log('步骤2: AI生成回答...');
            const userPrompt = body.prompt
                ? `${body.prompt}\n\n识别内容：${transcript}`
                : `请对以下语音转写内容进行分析和回答：\n\n${transcript}`;
            let aiResponse = '';
            for await (const token of this.recordingService.streamAIResponse(userPrompt)) {
                aiResponse += token;
                res.write(`data: ${JSON.stringify({ type: 'ai_token', token })}\n\n`);
            }
            this.logger.log('步骤3: 完成');
            res.write(`data: ${JSON.stringify({ type: 'done', fullText: aiResponse })}\n\n`);
            res.write('data: [DONE]\n\n');
            res.end();
        }
        catch (error) {
            this.logger.error('录音处理失败:', error);
            res.write(`data: ${JSON.stringify({ type: 'error', message: error.message || '处理失败' })}\n\n`);
            res.write('data: [DONE]\n\n');
            res.end();
        }
    }
    async textToSpeech(body, res) {
        if (!body.text) {
            res.status(400).json({ message: 'text is required' });
            return;
        }
        try {
            const audioBuffer = await this.recordingService.synthesizeSpeech(body.text);
            if (audioBuffer.length === 0) {
                res.status(204).end();
                return;
            }
            res.setHeader('Content-Type', 'audio/wav');
            res.setHeader('Content-Length', audioBuffer.length.toString());
            res.end(audioBuffer);
        }
        catch (error) {
            this.logger.error('TTS失败:', error);
            res.status(500).json({ message: '语音合成失败' });
        }
    }
    async generateSummary(body, res) {
        this.logger.log('收到总结请求');
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        try {
            let fullText = '';
            for await (const token of this.recordingService.streamSummary(body.text, body.duration)) {
                fullText += token;
                res.write(`data: ${JSON.stringify({ type: 'token', token })}\n\n`);
            }
            res.write(`data: ${JSON.stringify({ type: 'done', fullText })}\n\n`);
            res.write('data: [DONE]\n\n');
            res.end();
        }
        catch (error) {
            this.logger.error('总结生成失败:', error);
            res.write(`data: ${JSON.stringify({ type: 'error', message: error.message || '生成失败' })}\n\n`);
            res.write('data: [DONE]\n\n');
            res.end();
        }
    }
    async generateAnalysis(body, res) {
        this.logger.log('收到分析请求');
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        try {
            let fullText = '';
            for await (const token of this.recordingService.streamAnalysis(body.text, body.duration)) {
                fullText += token;
                res.write(`data: ${JSON.stringify({ type: 'token', token })}\n\n`);
            }
            res.write(`data: ${JSON.stringify({ type: 'done', fullText })}\n\n`);
            res.write('data: [DONE]\n\n');
            res.end();
        }
        catch (error) {
            this.logger.error('分析生成失败:', error);
            res.write(`data: ${JSON.stringify({ type: 'error', message: error.message || '生成失败' })}\n\n`);
            res.write('data: [DONE]\n\n');
            res.end();
        }
    }
};
exports.RecordingController = RecordingController;
__decorate([
    (0, common_1.Post)('process'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], RecordingController.prototype, "processAudio", null);
__decorate([
    (0, common_1.Post)('tts'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], RecordingController.prototype, "textToSpeech", null);
__decorate([
    (0, common_1.Post)('summary'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], RecordingController.prototype, "generateSummary", null);
__decorate([
    (0, common_1.Post)('analysis'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], RecordingController.prototype, "generateAnalysis", null);
exports.RecordingController = RecordingController = RecordingController_1 = __decorate([
    (0, common_1.Controller)('recording'),
    __metadata("design:paramtypes", [recording_service_1.RecordingService])
], RecordingController);
//# sourceMappingURL=recording.controller.js.map