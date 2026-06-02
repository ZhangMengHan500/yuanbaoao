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
var VoiceCallController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.VoiceCallController = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const recording_service_1 = require("../recording/recording.service");
let VoiceCallController = VoiceCallController_1 = class VoiceCallController {
    constructor(configService, recordingService) {
        this.configService = configService;
        this.recordingService = recordingService;
        this.logger = new common_1.Logger(VoiceCallController_1.name);
        this.logger.log('VoiceCall controller ready');
    }
    async tts(body) {
        const { text, voice = '七七' } = body;
        if (!text || !text.trim()) {
            return { audio: '' };
        }
        this.logger.log(`TTS request: text="${text.substring(0, 50)}...", voice=${voice}`);
        try {
            const audioBuffer = await this.recordingService.synthesizeSpeech(text);
            if (audioBuffer && audioBuffer.length > 0) {
                const audioBase64 = audioBuffer.toString('base64');
                this.logger.log(`TTS success: ${audioBase64.length} chars base64`);
                return { audio: audioBase64 };
            }
            this.logger.warn('TTS returned empty audio');
            return { audio: '' };
        }
        catch (err) {
            this.logger.error(`TTS failed: ${err.message}`);
            return { audio: '' };
        }
    }
};
exports.VoiceCallController = VoiceCallController;
__decorate([
    (0, common_1.Post)('tts'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], VoiceCallController.prototype, "tts", null);
exports.VoiceCallController = VoiceCallController = VoiceCallController_1 = __decorate([
    (0, common_1.Controller)('voice-call'),
    __metadata("design:paramtypes", [config_1.ConfigService,
        recording_service_1.RecordingService])
], VoiceCallController);
//# sourceMappingURL=voice-call.controller.js.map