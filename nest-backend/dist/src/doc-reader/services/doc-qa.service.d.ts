import { PrismaService } from '../../prisma/prisma.service';
import { LlmService } from '../../llm/llm.service';
import { DocEmbeddingService } from './doc-embedding.service';
import { Citation } from '../interfaces/document.interface';
export declare class DocQAService {
    private prisma;
    private llmService;
    private embeddingService;
    constructor(prisma: PrismaService, llmService: LlmService, embeddingService: DocEmbeddingService);
    createConversation(docId: string, userId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        title: string | null;
        documentId: string;
    }>;
    getConversations(docId: string, userId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        title: string | null;
        documentId: string;
    }[]>;
    getMessages(conversationId: string): Promise<{
        id: string;
        createdAt: Date;
        role: string;
        content: string;
        conversationId: string;
        citations: import("@prisma/client/runtime/library").JsonValue | null;
    }[]>;
    streamChat(conversationId: string, userId: string, message: string): AsyncGenerator<{
        type: string;
        content: string;
        citations: never[];
        fullContent?: undefined;
    } | {
        type: string;
        fullContent: string;
        citations: Citation[];
        content?: undefined;
    }, void, unknown>;
    private parseCitations;
    getChunkById(chunkId: string): Promise<{
        id: string;
        createdAt: Date;
        title: string | null;
        content: string;
        startOffset: number;
        endOffset: number;
        documentId: string;
        chunkIndex: number;
        pageNumber: number | null;
        paragraphNum: number | null;
        tokenCount: number;
        vectorId: string | null;
    }>;
}
