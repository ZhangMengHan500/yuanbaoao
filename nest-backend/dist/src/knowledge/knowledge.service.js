"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KnowledgeService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const rag_service_1 = require("../llm/rag.service");
let KnowledgeService = class KnowledgeService {
    constructor(prisma, ragService) {
        this.prisma = prisma;
        this.ragService = ragService;
    }
    async getDocuments() {
        return this.prisma.knowledgeDoc.findMany({
            orderBy: { createdAt: 'desc' },
        });
    }
    async getDocumentById(id) {
        const doc = await this.prisma.knowledgeDoc.findUnique({ where: { id } });
        if (!doc)
            throw new common_1.NotFoundException('文档不存在');
        return doc;
    }
    async addDocument(data) {
        const doc = await this.prisma.knowledgeDoc.create({
            data: {
                title: data.title,
                content: data.content,
                docType: data.docType || 'text',
                source: data.source,
            },
        });
        const ragResult = await this.ragService.addDocument(doc.id, doc.title, doc.content);
        return { ...doc, vectorChunks: ragResult.added };
    }
    async addDocumentFromFile(file) {
        const ext = file.originalname.split('.').pop()?.toLowerCase();
        let content = '';
        if (ext === 'txt' || ext === 'md') {
            content = file.buffer.toString('utf-8');
        }
        else if (ext === 'pdf') {
            const pdfParse = require('pdf-parse');
            const pdfData = await pdfParse(file.buffer);
            content = pdfData.text;
        }
        else {
            throw new common_1.BadRequestException('仅支持 .txt 和 .pdf 文件');
        }
        if (!content.trim()) {
            throw new common_1.BadRequestException('文件内容为空');
        }
        let title = file.originalname.replace(/\.[^.]+$/, '');
        if (title.match(/[çèéêëàâäùûüôöîï]/) || title.length < 2) {
            try {
                const buffer = Buffer.from(file.originalname, 'latin1');
                title = buffer.toString('utf-8').replace(/\.[^.]+$/, '');
            }
            catch (e) {
                const firstLine = content.split('\n')[0]?.trim();
                if (firstLine && firstLine.length > 0 && firstLine.length < 100) {
                    title = firstLine;
                }
            }
        }
        return this.addDocument({
            title,
            content,
            docType: ext,
            source: file.originalname,
        });
    }
    async deleteDocument(id) {
        const doc = await this.prisma.knowledgeDoc.findUnique({ where: { id } });
        if (!doc)
            throw new common_1.NotFoundException('文档不存在');
        await this.ragService.deleteDocument(id);
        await this.prisma.knowledgeDoc.delete({ where: { id } });
        return { deleted: true };
    }
    async searchDocuments(query) {
        return this.prisma.knowledgeDoc.findMany({
            where: {
                OR: [
                    { title: { contains: query } },
                    { content: { contains: query } },
                ],
            },
            orderBy: { createdAt: 'desc' },
        });
    }
};
exports.KnowledgeService = KnowledgeService;
exports.KnowledgeService = KnowledgeService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        rag_service_1.RagService])
], KnowledgeService);
//# sourceMappingURL=knowledge.service.js.map