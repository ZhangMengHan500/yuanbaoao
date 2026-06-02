import { Module } from '@nestjs/common';
import { LlmService } from './llm.service';
import { RagService } from './rag.service';
import { PromptService } from './prompt.service';
import { OcrService } from './ocr.service';

// LLM 模块 - 大语言模型、RAG 检索、提示词管理和 OCR 服务
@Module({
  providers: [LlmService, RagService, PromptService, OcrService],
  exports: [LlmService, RagService, PromptService, OcrService],
})
export class LlmModule {}
