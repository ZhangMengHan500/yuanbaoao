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
exports.DocSummaryService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const llm_service_1 = require("../../llm/llm.service");
let DocSummaryService = class DocSummaryService {
    constructor(prisma, llmService) {
        this.prisma = prisma;
        this.llmService = llmService;
    }
    async generateSummaries(docId, chunks) {
        console.log(`[DocSummary] 开始生成摘要: ${docId}`);
        const fullText = chunks.map(c => c.content).join('\n\n');
        const [executive, keyPoints, outline] = await Promise.all([
            this.generateExecutiveSummary(fullText),
            this.generateKeyPoints(fullText),
            this.generateOutline(chunks),
        ]);
        await this.prisma.readingSummary.createMany({
            data: [
                { documentId: docId, type: 'executive', content: executive },
                { documentId: docId, type: 'key_points', content: JSON.stringify(keyPoints) },
                { documentId: docId, type: 'outline', content: outline },
            ],
        });
        console.log(`[DocSummary] 摘要生成完成: ${docId}`);
    }
    async generateExecutiveSummary(text) {
        const inputText = text.substring(0, 3000);
        const messages = [
            {
                role: 'system',
                content: '你是一个专业的文档摘要助手。请为以下文档生成一个简洁的执行摘要（200-300字），概括文档的核心内容、主要观点和结论。',
            },
            {
                role: 'user',
                content: `请为以下文档生成执行摘要：\n\n${inputText}`,
            },
        ];
        let result = '';
        for await (const chunk of this.llmService.streamChat(messages)) {
            result += chunk;
        }
        return result;
    }
    async generateKeyPoints(text) {
        const inputText = text.substring(0, 3000);
        const messages = [
            {
                role: 'system',
                content: '你是一个专业的文档分析助手。请从文档中提取5-10个关键要点，以JSON数组格式返回，每个要点是一句话。',
            },
            {
                role: 'user',
                content: `请提取以下文档的关键要点：\n\n${inputText}\n\n请直接返回JSON数组，格式如：["要点1", "要点2", ...]`,
            },
        ];
        let result = '';
        for await (const chunk of this.llmService.streamChat(messages)) {
            result += chunk;
        }
        try {
            const jsonMatch = result.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        }
        catch (e) {
            console.error('[DocSummary] 解析关键要点失败:', e);
        }
        return result.split('\n').filter(line => line.trim()).slice(0, 10);
    }
    async generateOutline(chunks) {
        const titles = chunks
            .map(c => c.metadata.title)
            .filter(t => t && t.length > 0);
        if (titles.length > 0) {
            const cleaned = titles.map(t => t.replace(/^\d+\.\s*/, '').trim());
            return cleaned.map((t, i) => `${i + 1}. ${t}`).join('\n');
        }
        const fullText = chunks.map(c => c.content).join('\n\n').substring(0, 3000);
        const messages = [
            {
                role: 'system',
                content: '你是一个专业的文档分析助手。请为以下文档生成一个结构化的大纲，列出主要章节和子章节。只返回纯文本大纲，不要使用markdown格式（不要用##、**等标记符号），每行一个章节标题，用数字编号。',
            },
            {
                role: 'user',
                content: `请为以下文档生成大纲：\n\n${fullText}`,
            },
        ];
        let result = '';
        for await (const chunk of this.llmService.streamChat(messages)) {
            result += chunk;
        }
        return result
            .replace(/^#{1,6}\s+/gm, '')
            .replace(/\*\*(.*?)\*\*/g, '$1')
            .replace(/^\s*[-*]\s+/gm, '• ')
            .trim();
    }
    async getSummaries(docId) {
        const summaries = await this.prisma.readingSummary.findMany({
            where: { documentId: docId },
            orderBy: { createdAt: 'desc' },
        });
        const result = {};
        for (const summary of summaries) {
            if (summary.type === 'key_points') {
                try {
                    result[summary.type] = JSON.parse(summary.content);
                }
                catch {
                    result[summary.type] = summary.content;
                }
            }
            else {
                result[summary.type] = summary.content;
            }
        }
        return result;
    }
};
exports.DocSummaryService = DocSummaryService;
exports.DocSummaryService = DocSummaryService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        llm_service_1.LlmService])
], DocSummaryService);
//# sourceMappingURL=doc-summary.service.js.map