import { RecordingService } from '../recording/recording.service';
import { LlmService } from '../llm/llm.service';
export declare class VoiceCallService {
    private readonly recordingService;
    private readonly llmService;
    private readonly logger;
    constructor(recordingService: RecordingService, llmService: LlmService);
    getNLSTokenInfo(): Promise<{
        token: string;
        appId: string;
    } | null>;
    getAppKey(): string;
    buildMessages(history: Array<{
        role: 'user' | 'assistant';
        content: string;
    }>): {
        role: string;
        content: string;
    }[];
    streamChat(messages: {
        role: string;
        content: string;
    }[]): AsyncGenerator<string, void, unknown>;
    synthesizeSentence(text: string): Promise<Buffer>;
    splitIntoSentences(buffer: string): {
        complete: string[];
        remainder: string;
    };
}
