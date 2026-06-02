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
exports.DocQAService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const llm_service_1 = require("../../llm/llm.service");
const doc_embedding_service_1 = require("./doc-embedding.service");
let DocQAService = class DocQAService {
    constructor(prisma, llmService, embeddingService) {
        this.prisma = prisma;
        this.llmService = llmService;
        this.embeddingService = embeddingService;
    }
    async createConversation(docId, userId) {
        const doc = await this.prisma.readingDoc.findFirst({
            where: { id: docId, userId },
        });
        if (!doc) {
            throw new common_1.NotFoundException('文档不存在');
        }
        return this.prisma.docConversation.create({
            data: {
                documentId: docId,
                userId,
                title: `关于《${doc.title}》的对话`,
            },
        });
    }
    async getConversations(docId, userId) {
        return this.prisma.docConversation.findMany({
            where: { documentId: docId, userId },
            orderBy: { updatedAt: 'desc' },
        });
    }
    async getMessages(conversationId) {
        return this.prisma.docMessage.findMany({
            where: { conversationId },
            orderBy: { createdAt: 'asc' },
        });
    }
    async *streamChat(conversationId, userId, message) {
        const conversation = await this.prisma.docConversation.findFirst({
            where: { id: conversationId, userId },
            include: { document: true },
        });
        if (!conversation) {
            throw new common_1.NotFoundException('对话不存在');
        }
        const docId = conversation.documentId;
        await this.prisma.docMessage.create({
            data: {
                conversationId,
                role: 'user',
                content: message,
            },
        });
        const searchResults = await this.embeddingService.queryChunks(docId, message, 10);
        const topResults = searchResults
            .sort((a, b) => a.score - b.score)
            .slice(0, 5);
        const citationChunks = await Promise.all(topResults.map(async (result) => {
            const chunk = await this.prisma.readingChunk.findFirst({
                where: {
                    documentId: docId,
                    pageNumber: result.metadata.page,
                    startOffset: result.metadata.startOffset,
                },
                select: { id: true },
            });
            return chunk?.id || null;
        }));
        const citations = topResults.map((result, index) => ({
            index: index + 1,
            chunkId: citationChunks[index] || `${docId}_chunk_${result.metadata.paragraph}`,
            page: result.metadata.page,
            text: result.content.substring(0, 200),
            startOffset: result.metadata.startOffset,
            endOffset: result.metadata.endOffset,
        }));
        const contextText = topResults
            .map((r, i) => `[${i + 1}] ${r.content}`)
            .join('\n\n');
        const systemPrompt = `你是一个专业的文档阅读助手。请基于以下文档内容回答用户问题。

【文档片段】
${contextText}

【回答要求】
1. 仅基于提供的文档内容回答
2. 如文档无相关内容，明确告知
3. 使用 [数字] 标注引用来源，如 [1] [2]
4. 引用需准确对应文档片段`;
        let fullContent = '';
        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message },
        ];
        for await (const chunk of this.llmService.streamChat(messages)) {
            fullContent += chunk;
            yield { type: 'chunk', content: chunk, citations: [] };
        }
        const finalCitations = this.parseCitations(fullContent, citations);
        await this.prisma.docMessage.create({
            data: {
                conversationId,
                role: 'assistant',
                content: fullContent,
                citations: finalCitations,
            },
        });
        yield {
            type: 'done',
            fullContent,
            citations: finalCitations,
        };
    }
    parseCitations(text, availableCitations) {
        const usedIndices = new Set();
        const citationPattern = /\[(\d+)\]/g;
        let match;
        while ((match = citationPattern.exec(text)) !== null) {
            const index = parseInt(match[1], 10);
            if (index >= 1 && index <= availableCitations.length) {
                usedIndices.add(index);
            }
        }
        return availableCitations.filter(c => usedIndices.has(c.index));
    }
    async getChunkById(chunkId) {
        const parts = chunkId.split('_chunk_');
        if (parts.length !== 2) {
            throw new common_1.NotFoundException('无效的片段ID');
        }
        const docId = parts[0];
        const chunkIndex = parseInt(parts[1], 10);
        const chunk = await this.prisma.readingChunk.findFirst({
            where: {
                documentId: docId,
                chunkIndex,
            },
        });
        if (!chunk) {
            throw new common_1.NotFoundException('片段不存在');
        }
        return chunk;
    }
};
exports.DocQAService = DocQAService;
exports.DocQAService = DocQAService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        llm_service_1.LlmService,
        doc_embedding_service_1.DocEmbeddingService])
], DocQAService);
//# sourceMappingURL=doc-qa.service.js.map