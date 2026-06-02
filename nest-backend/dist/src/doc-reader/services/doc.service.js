"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const doc_chunker_service_1 = require("./doc-chunker.service");
const doc_embedding_service_1 = require("./doc-embedding.service");
const doc_summary_service_1 = require("./doc-summary.service");
const pdfParse = require("pdf-parse");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const PARSE_TIMEOUT_MS = 120 * 1000;
const SUPPORTED_EXTENSIONS = ['.pdf', '.txt'];
let DocService = class DocService {
    constructor(prisma, chunkerService, embeddingService, summaryService) {
        this.prisma = prisma;
        this.chunkerService = chunkerService;
        this.embeddingService = embeddingService;
        this.summaryService = summaryService;
    }
    async uploadDocument(userId, file, title) {
        const ext = path.extname(file.originalname).toLowerCase();
        if (!SUPPORTED_EXTENSIONS.includes(ext)) {
            throw new common_1.BadRequestException('仅支持 PDF 和 TXT 文件');
        }
        const fileUrl = file.path;
        const fileSize = file.size;
        const fileType = ext === '.pdf' ? 'pdf' : 'txt';
        const doc = await this.prisma.readingDoc.create({
            data: {
                user: { connect: { id: userId } },
                title: title || this.cleanFileName(file.originalname),
                fileUrl,
                fileType,
                fileSize,
                status: 'parsing',
            },
        });
        this.parseDocumentWithTimeout(doc.id, fileUrl, fileType).catch(error => {
            console.error(`[DocService] 解析失败: ${error.message}`);
            this.prisma.readingDoc.update({
                where: { id: doc.id },
                data: { status: 'error', parseError: error.message },
            });
        });
        return doc;
    }
    async parseDocumentWithTimeout(docId, fileUrl, fileType) {
        const parsePromise = this.parseDocument(docId, fileUrl, fileType);
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error('文档解析超时，请检查文档是否损坏'));
            }, PARSE_TIMEOUT_MS);
        });
        return Promise.race([parsePromise, timeoutPromise]);
    }
    async parseDocument(docId, fileUrl, fileType) {
        console.log(`[DocService] 开始解析文档: ${docId} (类型: ${fileType})`);
        let text;
        let pageCount;
        if (fileType === 'pdf') {
            const buffer = fs.readFileSync(fileUrl);
            const pdfData = await pdfParse(buffer);
            text = pdfData.text;
            pageCount = pdfData.numpages;
        }
        else {
            text = fs.readFileSync(fileUrl, 'utf-8');
            pageCount = undefined;
        }
        const wordCount = this.chunkerService.countTokens(text);
        await this.prisma.readingDoc.update({
            where: { id: docId },
            data: { pageCount, wordCount },
        });
        const chunks = this.chunkerService.splitIntoChunks(text, docId);
        console.log(`[DocService] 分块完成: ${chunks.length} 个块`);
        const dbChunks = await Promise.all(chunks.map((chunk, index) => this.prisma.readingChunk.create({
            data: {
                documentId: docId,
                content: chunk.content,
                chunkIndex: index,
                pageNumber: chunk.metadata.page,
                paragraphNum: chunk.metadata.paragraph,
                title: chunk.metadata.title,
                startOffset: chunk.metadata.startOffset,
                endOffset: chunk.metadata.endOffset,
                tokenCount: this.chunkerService.countTokens(chunk.content),
            },
        })));
        const vectorIds = await this.embeddingService.storeChunks(docId, chunks);
        await Promise.all(dbChunks.map((dbChunk, index) => this.prisma.readingChunk.update({
            where: { id: dbChunk.id },
            data: { vectorId: vectorIds[index] },
        })));
        await this.summaryService.generateSummaries(docId, chunks);
        await this.prisma.readingDoc.update({
            where: { id: docId },
            data: { status: 'ready' },
        });
        console.log(`[DocService] 文档解析完成: ${docId}`);
    }
    async getDocuments(userId) {
        return this.prisma.readingDoc.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                title: true,
                fileType: true,
                fileSize: true,
                pageCount: true,
                wordCount: true,
                status: true,
                createdAt: true,
            },
        });
    }
    async getDocumentById(docId, userId) {
        const doc = await this.prisma.readingDoc.findFirst({
            where: { id: docId, userId },
        });
        if (!doc) {
            throw new common_1.NotFoundException('文档不存在');
        }
        return doc;
    }
    async getDocumentContent(docId, userId, page = 1, pageSize = 20) {
        await this.getDocumentById(docId, userId);
        const chunks = await this.prisma.readingChunk.findMany({
            where: { documentId: docId },
            orderBy: { chunkIndex: 'asc' },
            skip: (page - 1) * pageSize,
            take: pageSize,
        });
        const total = await this.prisma.readingChunk.count({
            where: { documentId: docId },
        });
        return {
            chunks,
            pagination: {
                page,
                pageSize,
                total,
                totalPages: Math.ceil(total / pageSize),
            },
        };
    }
    async getDocumentStatus(docId, userId) {
        const doc = await this.getDocumentById(docId, userId);
        return { status: doc.status, parseError: doc.parseError };
    }
    async deleteDocument(docId, userId) {
        const doc = await this.getDocumentById(docId, userId);
        await this.embeddingService.deleteDocument(docId);
        if (fs.existsSync(doc.fileUrl)) {
            fs.unlinkSync(doc.fileUrl);
        }
        await this.prisma.readingDoc.delete({ where: { id: docId } });
        return { deleted: true };
    }
    async getChunkById(chunkId) {
        const chunk = await this.prisma.readingChunk.findUnique({
            where: { id: chunkId },
            include: { document: true },
        });
        if (!chunk) {
            throw new common_1.NotFoundException('文档片段不存在');
        }
        return chunk;
    }
    cleanFileName(originalname) {
        let name = originalname.replace(/\.(pdf|txt)$/i, '').trim();
        name = name.replace(/[ç¥èæä°™©®ï»¿]/g, '');
        name = name.replace(/[_\-\s]+/g, ' ').trim();
        if (!name || name.length < 1) {
            const ext = path.extname(originalname).toLowerCase();
            return ext === '.pdf' ? 'PDF文档' : 'TXT文档';
        }
        return name;
    }
};
exports.DocService = DocService;
exports.DocService = DocService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        doc_chunker_service_1.DocChunkerService,
        doc_embedding_service_1.DocEmbeddingService,
        doc_summary_service_1.DocSummaryService])
], DocService);
//# sourceMappingURL=doc.service.js.map