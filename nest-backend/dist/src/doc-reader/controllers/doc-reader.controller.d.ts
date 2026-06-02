import { Response } from 'express';
import { DocService } from '../services/doc.service';
import { DocQAService } from '../services/doc-qa.service';
import { DocSummaryService } from '../services/doc-summary.service';
import { UploadDocDto } from '../dto/upload-doc.dto';
import { QARequestDto } from '../dto/qa-request.dto';
export declare class DocReaderController {
    private docService;
    private qaService;
    private summaryService;
    constructor(docService: DocService, qaService: DocQAService, summaryService: DocSummaryService);
    uploadDocument(userId: string, file: Express.Multer.File, dto: UploadDocDto): Promise<{
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
    getDocument(userId: string, id: string): Promise<{
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
    getDocumentStatus(userId: string, id: string): Promise<{
        status: string;
        parseError: string | null;
    }>;
    getDocumentContent(userId: string, id: string, page?: number, pageSize?: number): Promise<{
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
    getDocumentSummary(userId: string, id: string): Promise<Record<string, any>>;
    deleteDocument(userId: string, id: string): Promise<{
        deleted: boolean;
    }>;
    getChunk(id: string): Promise<{
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
    createConversation(userId: string, documentId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        title: string | null;
        documentId: string;
    }>;
    getConversations(userId: string, documentId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        title: string | null;
        documentId: string;
    }[]>;
    getMessages(id: string): Promise<{
        id: string;
        createdAt: Date;
        role: string;
        content: string;
        conversationId: string;
        citations: import("@prisma/client/runtime/library").JsonValue | null;
    }[]>;
    chat(userId: string, id: string, dto: QARequestDto, res: Response): Promise<void>;
}
