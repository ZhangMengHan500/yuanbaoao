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
var TranslateService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TranslateService = void 0;
const common_1 = require("@nestjs/common");
const llm_service_1 = require("../llm/llm.service");
const ocr_service_1 = require("../llm/ocr.service");
const LANG_MAP = {
    auto: 'auto-detect',
    zh: 'Chinese',
    en: 'English',
    ja: 'Japanese',
    ko: 'Korean',
    fr: 'French',
    de: 'German',
    es: 'Spanish',
    ru: 'Russian',
    pt: 'Portuguese',
};
let TranslateService = TranslateService_1 = class TranslateService {
    constructor(llmService, ocrService) {
        this.llmService = llmService;
        this.ocrService = ocrService;
        this.logger = new common_1.Logger(TranslateService_1.name);
    }
    buildTranslationPrompt(sourceLang, targetLang) {
        const src = LANG_MAP[sourceLang] || sourceLang;
        const tgt = LANG_MAP[targetLang] || targetLang;
        return `You are a professional translator. Translate the following text from ${src} to ${tgt}.
- Output ONLY the translated text, no explanations, notes, or quotes
- Preserve formatting, line breaks, and paragraph structure
- Keep proper nouns, brand names, and technical terms unchanged when appropriate
- For idiomatic expressions, translate to the most natural equivalent in the target language`;
    }
    async *streamTranslate(text, sourceLang, targetLang) {
        const systemPrompt = this.buildTranslationPrompt(sourceLang, targetLang);
        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: text },
        ];
        yield* this.llmService.streamDashscopeText(messages);
    }
    async translateText(text, sourceLang, targetLang) {
        const systemPrompt = this.buildTranslationPrompt(sourceLang, targetLang);
        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: text },
        ];
        return this.llmService.chat(messages);
    }
    async photoTranslate(imageBase64, sourceLang, targetLang) {
        const originalText = await this.ocrService.recognizeText(imageBase64);
        if (!originalText) {
            return { originalText: '', translatedText: '' };
        }
        const translatedText = await this.translateText(originalText, sourceLang, targetLang);
        return { originalText, translatedText };
    }
};
exports.TranslateService = TranslateService;
exports.TranslateService = TranslateService = TranslateService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [llm_service_1.LlmService,
        ocr_service_1.OcrService])
], TranslateService);
//# sourceMappingURL=translate.service.js.map