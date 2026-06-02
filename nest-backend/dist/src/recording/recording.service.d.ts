import { ConfigService } from '@nestjs/config';
export declare class RecordingService {
    private configService;
    private readonly logger;
    private readonly dashscopeApiKey;
    private readonly asrAppKey;
    private readonly accessKeyId;
    private readonly accessKeySecret;
    private cachedNlsToken;
    constructor(configService: ConfigService);
    getNLSToken(): Promise<{
        token: string;
        appId: string;
    } | null>;
    getAppKey(): string;
    getSimulatedText(): string;
    recognizeSpeech(audioBase64: string, format?: string): Promise<string>;
    recognizeSpeechStrict(audioBase64: string, format?: string): Promise<string>;
    private callDashScopeASR;
    private createTranscriptionTask;
    private queryTranscriptionTask;
    private fetchTranscriptionText;
    private sleep;
    private simulateRecognition;
    streamAIResponse(text: string): AsyncGenerator<string>;
    streamSummary(text: string, duration?: string): AsyncGenerator<string>;
    streamAnalysis(text: string, duration?: string): AsyncGenerator<string>;
    synthesizeSpeech(text: string): Promise<Buffer>;
    private callDashScopeTTS;
    private callAliyunTTS;
    private percentEncode;
    private generateId;
}
