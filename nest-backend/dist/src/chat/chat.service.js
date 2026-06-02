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
exports.ChatService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const llm_service_1 = require("../llm/llm.service");
const rag_service_1 = require("../llm/rag.service");
const message_service_1 = require("../message/message.service");
const session_service_1 = require("../session/session.service");
const memory_factory_1 = require("../memory/memory.factory");
const web_search_service_1 = require("../web-search/web-search.service");
let ChatService = class ChatService {
    constructor(prisma, llmService, ragService, messageService, sessionService, memoryFactory, webSearchService) {
        this.prisma = prisma;
        this.llmService = llmService;
        this.ragService = ragService;
        this.messageService = messageService;
        this.sessionService = sessionService;
        this.memoryFactory = memoryFactory;
        this.webSearchService = webSearchService;
    }
    async buildChatContext(sessionId, userId, userMessage, enableRag = true, requestPersonaId, deepThinking = false, webSearch = false) {
        const session = await this.prisma.session.findFirst({
            where: { id: sessionId, userId },
        });
        if (!session) {
            throw new common_1.NotFoundException('会话不存在');
        }
        const effectivePersonaId = requestPersonaId || session.personaId;
        if (requestPersonaId && requestPersonaId !== session.personaId) {
            const persona = await this.prisma.persona.findUnique({
                where: { id: requestPersonaId },
            });
            if (persona) {
                await this.prisma.session.update({
                    where: { id: sessionId },
                    data: { personaId: requestPersonaId },
                }).catch(() => { });
            }
        }
        const contextMessages = [];
        let persona = null;
        if (effectivePersonaId) {
            const personaData = await this.prisma.persona.findUnique({
                where: { id: effectivePersonaId },
            });
            if (personaData) {
                persona = personaData;
                contextMessages.push({
                    role: 'system',
                    content: personaData.systemPrompt,
                });
            }
        }
        if (webSearch) {
            const searchContext = await this.webSearchService.search(userMessage);
            if (searchContext) {
                const now = new Date();
                const currentDate = now.toLocaleDateString('zh-CN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    weekday: 'long',
                });
                const currentTime = now.toLocaleTimeString('zh-CN', {
                    hour: '2-digit',
                    minute: '2-digit',
                });
                contextMessages.push({
                    role: 'system',
                    content: `【重要】当前系统时间：${currentDate} ${currentTime}

以下是联网搜索获取的信息，请注意：
1. 搜索结果可能包含过时的信息，请优先参考当前系统时间回答时间相关问题
2. 如果搜索结果与问题无关，可使用自身知识回答
3. 对于"今天是几月几日"、"现在几点"等时间问题，请直接使用当前系统时间回答

搜索结果：\n\n${searchContext}`,
                });
            }
        }
        if (enableRag) {
            const ragContext = await this.ragService.queryDocuments(userMessage);
            if (ragContext) {
                contextMessages.push({
                    role: 'system',
                    content: `以下是相关参考资料，请结合参考资料回答用户问题：\n${ragContext}`,
                });
            }
        }
        if (deepThinking) {
            contextMessages.push({
                role: 'system',
                content: `你是一个具备深度思考能力的AI助手。当用户提出问题时，请严格按以下两阶段回复：

【第一阶段：深度思考分析】
请在回答前先进行完整的深度思考，标注"【深度思考分析】"作为标题，包含以下内容：
1. 明确问题核心需求与隐藏条件
2. 拆解问题结构，分模块逐一分析
3. 考虑所有边界情况、漏洞、风险与备选方案
4. 梳理完整逻辑链，反复校验合理性
只写思考逻辑、拆解、推演、排查漏洞等内容，不给出最终答案。

【第二阶段：最终答案】
思考完毕后，另起一段，标注"【最终答案】"作为标题，仅输出精简、正式的最终答案，不包含任何思考过程。

请务必严格遵循这两阶段格式输出。`,
            });
        }
        const memoryService = this.memoryFactory.getMemoryService();
        const history = await memoryService.getHistory(sessionId, 20);
        if (history.length > 0) {
            for (const msg of history) {
                contextMessages.push({
                    role: msg.role,
                    content: msg.content,
                });
            }
        }
        else {
            const dbHistory = await this.messageService.getRecentMessages(sessionId, 20);
            for (const msg of dbHistory) {
                contextMessages.push({
                    role: msg.role,
                    content: msg.content,
                });
            }
            for (const msg of dbHistory) {
                await memoryService.saveMessage(sessionId, {
                    role: msg.role,
                    content: msg.content,
                });
            }
        }
        return { messages: contextMessages, persona };
    }
    async saveUserMessage(sessionId, content) {
        await this.messageService.createMessage(sessionId, 'user', content);
        const memoryService = this.memoryFactory.getMemoryService();
        await memoryService.saveMessage(sessionId, { role: 'user', content });
    }
    async saveUserMessageWithImage(sessionId, content, imageUrl) {
        await this.messageService.createMessage(sessionId, 'user', content, imageUrl);
        const memoryService = this.memoryFactory.getMemoryService();
        await memoryService.saveMessage(sessionId, { role: 'user', content });
    }
    async saveAssistantMessage(sessionId, content) {
        await this.messageService.createMessage(sessionId, 'assistant', content);
        const memoryService = this.memoryFactory.getMemoryService();
        await memoryService.saveMessage(sessionId, { role: 'assistant', content });
    }
    async *streamReply(messages) {
        yield* this.llmService.streamChat(messages);
    }
    async *streamPhotoSolve(messages) {
        yield* this.llmService.streamChatWithVision(messages);
    }
    async *streamPhotoSolveOcr(messages) {
        yield* this.llmService.streamDashscopeText(messages);
    }
    async generateSessionTitle(sessionId, firstMessage) {
        const title = firstMessage.length > 20
            ? firstMessage.substring(0, 20) + '...'
            : firstMessage;
        await this.prisma.session.update({
            where: { id: sessionId },
            data: { title },
        });
    }
    async autoTitleIfNew(sessionId, userId, firstMessage) {
        const session = await this.prisma.session.findFirst({
            where: { id: sessionId, userId },
            select: { title: true, id: true },
        });
        if (session && session.title === 'New Chat') {
            await this.generateSessionTitle(sessionId, firstMessage);
        }
    }
    async clearSessionMemory(sessionId) {
        const memoryService = this.memoryFactory.getMemoryService();
        await memoryService.clearHistory(sessionId);
    }
    getMemoryType() {
        return this.memoryFactory.getMemoryTypeName();
    }
};
exports.ChatService = ChatService;
exports.ChatService = ChatService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        llm_service_1.LlmService,
        rag_service_1.RagService,
        message_service_1.MessageService,
        session_service_1.SessionService,
        memory_factory_1.MemoryFactory,
        web_search_service_1.WebSearchService])
], ChatService);
//# sourceMappingURL=chat.service.js.map