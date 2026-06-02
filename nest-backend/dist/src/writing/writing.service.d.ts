import { LlmService } from '../llm/llm.service';
interface WritingGenerateDto {
    writingType: string;
    filters: Record<string, string>;
    topic: string;
}
export declare class WritingService {
    private readonly llmService;
    constructor(llmService: LlmService);
    buildPrompt(dto: WritingGenerateDto): string;
    streamWrite(topic: string, systemPrompt: string): AsyncGenerator<string, void, unknown>;
}
export {};
