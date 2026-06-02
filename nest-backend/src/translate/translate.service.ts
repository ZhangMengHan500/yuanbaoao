import { Injectable, Logger } from '@nestjs/common';
import { LlmService } from '../llm/llm.service';
import { OcrService } from '../llm/ocr.service';

const LANG_MAP: Record<string, string> = {
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

@Injectable()
export class TranslateService {
  private readonly logger = new Logger(TranslateService.name);

  constructor(
    private readonly llmService: LlmService,
    private readonly ocrService: OcrService,
  ) {}

  private buildTranslationPrompt(sourceLang: string, targetLang: string): string {
    const src = LANG_MAP[sourceLang] || sourceLang;
    const tgt = LANG_MAP[targetLang] || targetLang;
    return `You are a professional translator. Translate the following text from ${src} to ${tgt}.
- Output ONLY the translated text, no explanations, notes, or quotes
- Preserve formatting, line breaks, and paragraph structure
- Keep proper nouns, brand names, and technical terms unchanged when appropriate
- For idiomatic expressions, translate to the most natural equivalent in the target language`;
  }

  async *streamTranslate(
    text: string,
    sourceLang: string,
    targetLang: string,
  ): AsyncGenerator<string> {
    const systemPrompt = this.buildTranslationPrompt(sourceLang, targetLang);
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: text },
    ];
    yield* this.llmService.streamDashscopeText(messages);
  }

  async translateText(
    text: string,
    sourceLang: string,
    targetLang: string,
  ): Promise<string> {
    const systemPrompt = this.buildTranslationPrompt(sourceLang, targetLang);
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: text },
    ];
    return this.llmService.chat(messages);
  }

  async photoTranslate(
    imageBase64: string,
    sourceLang: string,
    targetLang: string,
  ): Promise<{ originalText: string; translatedText: string }> {
    const originalText = await this.ocrService.recognizeText(imageBase64);
    if (!originalText) {
      return { originalText: '', translatedText: '' };
    }
    const translatedText = await this.translateText(originalText, sourceLang, targetLang);
    return { originalText, translatedText };
  }
}
