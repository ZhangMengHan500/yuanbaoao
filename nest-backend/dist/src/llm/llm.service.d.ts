import { ConfigService } from '@nestjs/config';
export declare class LlmService {
    private configService;
    private chatModel;
    private visionModel;
    private dashscopeTextModel;
    constructor(configService: ConfigService);
    streamChat(messages: {
        role: string;
        content: string;
    }[]): AsyncGenerator<string, void, unknown>;
    streamChatWithVision(messages: {
        role: string;
        content: any;
    }[]): AsyncGenerator<string, void, unknown>;
    chat(messages: {
        role: string;
        content: string;
    }[]): Promise<string>;
    streamDashscopeText(messages: {
        role: string;
        content: string;
    }[]): AsyncGenerator<string, void, unknown>;
}
