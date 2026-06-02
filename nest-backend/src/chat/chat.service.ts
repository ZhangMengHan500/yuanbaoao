import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LlmService } from '../llm/llm.service';
import { RagService } from '../llm/rag.service';
import { MessageService } from '../message/message.service';
import { SessionService } from '../session/session.service';
import { MemoryFactory } from '../memory/memory.factory';
import { WebSearchService } from '../web-search/web-search.service';

// 聊天服务 - 核心对话逻辑（SSE 流式输出 + LangChain 记忆）
@Injectable()
export class ChatService {
  constructor(
    private prisma: PrismaService,
    private llmService: LlmService,
    private ragService: RagService,
    private messageService: MessageService,
    private sessionService: SessionService,
    private memoryFactory: MemoryFactory,  // 注入记忆工厂
    private webSearchService: WebSearchService,  // 新增
  ) {}

  // 获取对话上下文（历史消息 + 系统提示 + RAG 检索）
  // 现在优先从记忆系统获取历史，降级到数据库查询
  async buildChatContext(
    sessionId: string,
    userId: string,
    userMessage: string,
    enableRag: boolean = true,
    requestPersonaId?: string,
    deepThinking: boolean = false,
    webSearch: boolean = false,  // 新增
  ): Promise<{ messages: { role: string; content: string }[]; persona: any }> {
    // 获取会话信息（包含角色人设）
    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new NotFoundException('会话不存在');
    }

    // 优先使用请求中的 personaId（前端选中的角色），否则用会话绑定的角色
    const effectivePersonaId = requestPersonaId || session.personaId;

    // 如果请求的角色和会话绑定的不同，更新会话的角色绑定
    if (requestPersonaId && requestPersonaId !== session.personaId) {
      // 检查persona是否存在
      const persona = await this.prisma.persona.findUnique({
        where: { id: requestPersonaId },
      });
      if (persona) {
        await this.prisma.session.update({
          where: { id: sessionId },
          data: { personaId: requestPersonaId },
        }).catch(() => {}); // 静默失败，不影响聊天
      }
    }

    // 构建消息列表
    const contextMessages: { role: string; content: string }[] = [];

    // 如果有角色人设，注入系统提示词（LangChain Prompt 注入）
    let persona: any = null;
    if (effectivePersonaId) {
      const personaData = await this.prisma.persona.findUnique({
        where: { id: effectivePersonaId },
      });
      if (personaData) {
        persona = personaData;
        // ====== LangChain 角色 Prompt 注入 ======
        // 将角色人设的 systemPrompt 放在消息列表最前面
        // 大模型会以此作为系统指令，按照角色风格回答
        contextMessages.push({
          role: 'system',
          content: personaData.systemPrompt,
        });
      }
    }

    // ========== 联网搜索：在 RAG 之前注入 ==========
    // 开启联网搜索时，先搜索相关内容作为上下文
    if (webSearch) {
      const searchContext = await this.webSearchService.search(userMessage);
      if (searchContext) {
        // 获取当前日期时间
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

    // RAG 检索：查询相关知识文档作为额外上下文
    if (enableRag) {
      const ragContext = await this.ragService.queryDocuments(userMessage);
      if (ragContext) {
        contextMessages.push({
          role: 'system',
          content: `以下是相关参考资料，请结合参考资料回答用户问题：\n${ragContext}`,
        });
      }
    }

    // 深度思索模式：注入思考指令
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

    // ========== 从记忆系统获取历史消息 ==========
    // 优先使用 LangChain 记忆系统（支持内存/Redis/PostgreSQL 三种方案）
    // 通过环境变量 MEMORY_TYPE 切换，不需要改代码
    const memoryService = this.memoryFactory.getMemoryService();
    const history = await memoryService.getHistory(sessionId, 20);

    // 如果记忆系统有历史，直接使用
    if (history.length > 0) {
      for (const msg of history) {
        contextMessages.push({
          role: msg.role,
          content: msg.content,
        });
      }
    } else {
      // 降级：从数据库查询历史（兼容旧数据）
      const dbHistory = await this.messageService.getRecentMessages(sessionId, 20);
      for (const msg of dbHistory) {
        contextMessages.push({
          role: msg.role,
          content: msg.content,
        });
      }
      // 同步到记忆系统（下次就能从记忆中读取了）
      for (const msg of dbHistory) {
        await memoryService.saveMessage(sessionId, {
          role: msg.role as 'user' | 'assistant' | 'system',
          content: msg.content,
        });
      }
    }

    return { messages: contextMessages, persona };
  }

  // 保存用户消息（同时写入数据库 + 记忆系统）
  async saveUserMessage(sessionId: string, content: string) {
    // 写入数据库（持久化）
    await this.messageService.createMessage(sessionId, 'user', content);
    // 写入记忆系统（加速后续读取）
    const memoryService = this.memoryFactory.getMemoryService();
    await memoryService.saveMessage(sessionId, { role: 'user', content });
  }

  // 保存带图片的用户消息（拍照答疑场景）
  async saveUserMessageWithImage(sessionId: string, content: string, imageUrl: string) {
    await this.messageService.createMessage(sessionId, 'user', content, imageUrl);
    const memoryService = this.memoryFactory.getMemoryService();
    await memoryService.saveMessage(sessionId, { role: 'user', content });
  }

  // 保存助手消息（同时写入数据库 + 记忆系统）
  async saveAssistantMessage(sessionId: string, content: string) {
    // 写入数据库（持久化）
    await this.messageService.createMessage(sessionId, 'assistant', content);
    // 写入记忆系统（加速后续读取）
    const memoryService = this.memoryFactory.getMemoryService();
    await memoryService.saveMessage(sessionId, { role: 'assistant', content });
  }

  // 流式调用 LLM 并返回 token 迭代器
  async *streamReply(messages: { role: string; content: string }[]) {
    yield* this.llmService.streamChat(messages);
  }

  // 流式调用 Vision LLM（拍照答疑场景，支持多模态内容）
  async *streamPhotoSolve(messages: { role: string; content: any }[]) {
    yield* this.llmService.streamChatWithVision(messages);
  }

  // 流式调用 DashScope 文本模型（OCR 后的文本问答）
  async *streamPhotoSolveOcr(messages: { role: string; content: string }[]) {
    yield* this.llmService.streamDashscopeText(messages);
  }

  // 自动生成会话标题（取用户第一条消息的前 20 个字符）
  async generateSessionTitle(sessionId: string, firstMessage: string) {
    const title = firstMessage.length > 20
      ? firstMessage.substring(0, 20) + '...'
      : firstMessage;
    await this.prisma.session.update({
      where: { id: sessionId },
      data: { title },
    });
  }

  // 自动标题：仅当会话标题仍为 "New Chat" 时，用第一条用户消息生成标题
  async autoTitleIfNew(sessionId: string, userId: string, firstMessage: string) {
    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, userId },
      select: { title: true, id: true },
    });
    if (session && session.title === 'New Chat') {
      await this.generateSessionTitle(sessionId, firstMessage);
    }
  }

  // 清空某个会话的记忆（同时清数据库 + 记忆系统）
  async clearSessionMemory(sessionId: string) {
    const memoryService = this.memoryFactory.getMemoryService();
    await memoryService.clearHistory(sessionId);
  }

  // 获取当前使用的记忆类型（用于 API 返回给前端）
  getMemoryType(): string {
    return this.memoryFactory.getMemoryTypeName();
  }
}
