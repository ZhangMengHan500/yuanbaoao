import { PrismaService } from '../prisma/prisma.service';
import { LlmService } from '../llm/llm.service';
import { RagService } from '../llm/rag.service';
import { MessageService } from '../message/message.service';
import { SessionService } from '../session/session.service';
import { MemoryFactory } from '../memory/memory.factory';
import { WebSearchService } from '../web-search/web-search.service';
export declare class ChatService {
    private prisma;
    private llmService;
    private ragService;
    private messageService;
    private sessionService;
    private memoryFactory;
    private webSearchService;
    constructor(prisma: PrismaService, llmService: LlmService, ragService: RagService, messageService: MessageService, sessionService: SessionService, memoryFactory: MemoryFactory, webSearchService: WebSearchService);
    buildChatContext(sessionId: string, userId: string, userMessage: string, enableRag?: boolean, requestPersonaId?: string, deepThinking?: boolean, webSearch?: boolean): Promise<{
        messages: {
            role: string;
            content: string;
        }[];
        persona: any;
    }>;
    saveUserMessage(sessionId: string, content: string): Promise<void>;
    saveUserMessageWithImage(sessionId: string, content: string, imageUrl: string): Promise<void>;
    saveAssistantMessage(sessionId: string, content: string): Promise<void>;
    streamReply(messages: {
        role: string;
        content: string;
    }[]): AsyncGenerator<string, void, unknown>;
    streamPhotoSolve(messages: {
        role: string;
        content: any;
    }[]): AsyncGenerator<string, void, unknown>;
    streamPhotoSolveOcr(messages: {
        role: string;
        content: string;
    }[]): AsyncGenerator<string, void, unknown>;
    generateSessionTitle(sessionId: string, firstMessage: string): Promise<void>;
    autoTitleIfNew(sessionId: string, userId: string, firstMessage: string): Promise<void>;
    clearSessionMemory(sessionId: string): Promise<void>;
    getMemoryType(): string;
}
