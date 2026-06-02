import { PrismaService } from '../prisma/prisma.service';
import { RagService } from '../llm/rag.service';
export declare class KnowledgeService {
    private prisma;
    private ragService;
    constructor(prisma: PrismaService, ragService: RagService);
    getDocuments(): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        content: string;
        docType: string;
        source: string | null;
    }[]>;
    getDocumentById(id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        content: string;
        docType: string;
        source: string | null;
    }>;
    addDocument(data: {
        title: string;
        content: string;
        docType?: string;
        source?: string;
    }): Promise<{
        vectorChunks: number;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        content: string;
        docType: string;
        source: string | null;
    }>;
    addDocumentFromFile(file: Express.Multer.File): Promise<{
        vectorChunks: number;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        content: string;
        docType: string;
        source: string | null;
    }>;
    deleteDocument(id: string): Promise<{
        deleted: boolean;
    }>;
    searchDocuments(query: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        content: string;
        docType: string;
        source: string | null;
    }[]>;
}
