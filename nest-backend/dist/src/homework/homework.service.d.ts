import { LlmService } from '../llm/llm.service';
export declare class HomeworkService {
    private readonly llmService;
    private readonly logger;
    constructor(llmService: LlmService);
    streamGrade(imageBase64: string, mimeType: string, extraText: string): AsyncGenerator<string, void, unknown>;
}
