import { PrismaService } from '../../prisma/prisma.service';
import { DocChunkerService } from './doc-chunker.service';
import { DocEmbeddingService } from './doc-embedding.service';
import { DocSummaryService } from './doc-summary.service';
export declare class DocService {
    private prisma;
    private chunkerService;
    private embeddingService;
    private summaryService;
    constructor(prisma: PrismaService, chunkerService: DocChunkerService, embeddingService: DocEmbeddingService, summaryService: DocSummaryService);
    uploadDocument(userId: string, file: Express.Multer.File, title?: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        title: string;
        status: string;
        wordCount: number | null;
        fileUrl: string;
        fileType: string;
        fileSize: number;
        pageCount: number | null;
        parseError: string | null;
    }>;
    private parseDocumentWithTimeout;
    private parseDocument;
    getDocuments(userId: string): Promise<{
        id: string;
        createdAt: Date;
        title: string;
        status: string;
        wordCount: number | null;
        fileType: string;
        fileSize: number;
        pageCount: number | null;
    }[]>;
    getDocumentById(docId: string, userId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        title: string;
        status: string;
        wordCount: number | null;
        fileUrl: string;
        fileType: string;
        fileSize: number;
        pageCount: number | null;
        parseError: string | null;
    }>;
    getDocumentContent(docId: string, userId: string, page?: number, pageSize?: number): Promise<{
        chunks: {
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
        }[];
        pagination: {
            page: number;
            pageSize: number;
            total: number;
            totalPages: number;
        };
    }>;
    getDocumentStatus(docId: string, userId: string): Promise<{
        status: string;
        parseError: string | null;
    }>;
    deleteDocument(docId: string, userId: string): Promise<{
        deleted: boolean;
    }>;
    getChunkById(chunkId: string): Promise<{
        document: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            title: string;
            status: string;
            wordCount: number | null;
            fileUrl: string;
            fileType: string;
            fileSize: number;
            pageCount: number | null;
            parseError: string | null;
        };
    } & {
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
    private cleanFileName;
}
