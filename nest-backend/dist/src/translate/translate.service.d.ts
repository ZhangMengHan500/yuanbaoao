import { LlmService } from '../llm/llm.service';
import { OcrService } from '../llm/ocr.service';
export declare class TranslateService {
    private readonly llmService;
    private readonly ocrService;
    private readonly logger;
    constructor(llmService: LlmService, ocrService: OcrService);
    private buildTranslationPrompt;
    streamTranslate(text: string, sourceLang: string, targetLang: string): AsyncGenerator<string>;
    translateText(text: string, sourceLang: string, targetLang: string): Promise<string>;
    photoTranslate(imageBase64: string, sourceLang: string, targetLang: string): Promise<{
        originalText: string;
        translatedText: string;
    }>;
}
