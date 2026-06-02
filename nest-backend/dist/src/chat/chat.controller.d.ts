import { Response } from 'express';
import { ChatService } from './chat.service';
declare class ChatStreamDto {
    content: string;
    sessionId: string;
    personaId?: string;
    enableRag?: boolean;
    deepThinking?: boolean;
    webSearch?: boolean;
}
declare class PhotoSolveDto {
    content: string;
    sessionId: string;
    imageUrl: string;
    personaId?: string;
}
export declare class ChatController {
    private readonly chatService;
    constructor(chatService: ChatService);
    streamChat(dto: ChatStreamDto, res: Response, userId?: string): Promise<void>;
    getMemoryType(): {
        type: string;
    };
    photoSolve(dto: PhotoSolveDto, res: Response, userId?: string): Promise<void>;
    clearMemory(sessionId: string): Promise<{
        message: string;
    }>;
}
export {};
