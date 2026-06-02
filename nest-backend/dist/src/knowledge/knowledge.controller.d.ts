import { KnowledgeService } from './knowledge.service';
declare class CreateKnowledgeDto {
    title: string;
    content: string;
    docType?: string;
    source?: string;
}
export declare class KnowledgeController {
    private readonly knowledgeService;
    constructor(knowledgeService: KnowledgeService);
    getDocuments(): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        content: string;
        docType: string;
        source: string | null;
    }[]>;
    searchDocuments(query: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        content: string;
        docType: string;
        source: string | null;
    }[]>;
    getDocument(id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        content: string;
        docType: string;
        source: string | null;
    }>;
    addDocument(dto: CreateKnowledgeDto): Promise<{
        vectorChunks: number;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        content: string;
        docType: string;
        source: string | null;
    }>;
    uploadDocument(file: Express.Multer.File): Promise<{
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
}
export {};
