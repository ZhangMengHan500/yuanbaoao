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
var VoiceCallService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.VoiceCallService = void 0;
const common_1 = require("@nestjs/common");
const recording_service_1 = require("../recording/recording.service");
const llm_service_1 = require("../llm/llm.service");
const VOICE_CHAT_SYSTEM_PROMPT = `你是元宝AI助手，正在进行语音通话。请用简短自然的口语回答，每次回复控制在2-3句话以内。不要使用Markdown格式。不要使用编号列表。直接说话，像朋友聊天一样。`;
const MAX_HISTORY_TURNS = 10;
let VoiceCallService = VoiceCallService_1 = class VoiceCallService {
    constructor(recordingService, llmService) {
        this.recordingService = recordingService;
        this.llmService = llmService;
        this.logger = new common_1.Logger(VoiceCallService_1.name);
    }
    async getNLSTokenInfo() {
        return this.recordingService.getNLSToken();
    }
    getAppKey() {
        return this.recordingService.getAppKey();
    }
    buildMessages(history) {
        const recentHistory = history.slice(-MAX_HISTORY_TURNS * 2);
        return [
            { role: 'system', content: VOICE_CHAT_SYSTEM_PROMPT },
            ...recentHistory.map(m => ({ role: m.role, content: m.content })),
        ];
    }
    async *streamChat(messages) {
        yield* this.llmService.streamChat(messages);
    }
    async synthesizeSentence(text) {
        return this.recordingService.synthesizeSpeech(text);
    }
    splitIntoSentences(buffer) {
        const sentences = [];
        let remainder = buffer;
        const sentenceEndRegex = /[^。！？\n]*[。！？\n]/g;
        let match;
        let lastIndex = 0;
        while ((match = sentenceEndRegex.exec(remainder)) !== null) {
            const sentence = remainder.slice(lastIndex, match.index + match[0].length).trim();
            if (sentence) {
                sentences.push(sentence);
            }
            lastIndex = match.index + match[0].length;
        }
        remainder = remainder.slice(lastIndex);
        if (remainder.length > 50) {
            const commaIndex = remainder.lastIndexOf('，');
            if (commaIndex > 10) {
                sentences.push(remainder.slice(0, commaIndex + 1).trim());
                remainder = remainder.slice(commaIndex + 1);
            }
        }
        return { complete: sentences, remainder };
    }
};
exports.VoiceCallService = VoiceCallService;
exports.VoiceCallService = VoiceCallService = VoiceCallService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [recording_service_1.RecordingService,
        llm_service_1.LlmService])
], VoiceCallService);
//# sourceMappingURL=voice-call.service.js.map