import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LlmService } from '../../llm/llm.service';
import { DocEmbeddingService } from './doc-embedding.service';
import { Citation } from '../interfaces/document.interface';

@Injectable()
export class DocQAService {
  constructor(
    private prisma: PrismaService,
    private llmService: LlmService,
    private embeddingService: DocEmbeddingService,
  ) {}

  async createConversation(docId: string, userId: string) {
    const doc = await this.prisma.readingDoc.findFirst({
      where: { id: docId, userId },
    });

    if (!doc) {
      throw new NotFoundException('文档不存在');
    }

    return this.prisma.docConversation.create({
      data: {
        documentId: docId,
        userId,
        title: `关于《${doc.title}》的对话`,
      },
    });
  }

  async getConversations(docId: string, userId: string) {
    return this.prisma.docConversation.findMany({
      where: { documentId: docId, userId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getMessages(conversationId: string) {
    return this.prisma.docMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async *streamChat(
    conversationId: string,
    userId: string,
    message: string,
  ) {
    const conversation = await this.prisma.docConversation.findFirst({
      where: { id: conversationId, userId },
      include: { document: true },
    });

    if (!conversation) {
      throw new NotFoundException('对话不存在');
    }

    const docId = conversation.documentId;

    await this.prisma.docMessage.create({
      data: {
        conversationId,
        role: 'user',
        content: message,
      },
    });

    const searchResults = await this.embeddingService.queryChunks(
      docId,
      message,
      10,
    );

    const topResults = searchResults
      .sort((a, b) => a.score - b.score)
      .slice(0, 5);

    // 查询实际的 chunk 数据库 ID，用于前端引用跳转
    const citationChunks = await Promise.all(
      topResults.map(async (result) => {
        const chunk = await this.prisma.readingChunk.findFirst({
          where: {
            documentId: docId,
            pageNumber: result.metadata.page,
            startOffset: result.metadata.startOffset,
          },
          select: { id: true },
        });
        return chunk?.id || null;
      }),
    );

    const citations: Citation[] = topResults.map((result, index) => ({
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
        citations: finalCitations as any,
      },
    });

    yield {
      type: 'done',
      fullContent,
      citations: finalCitations,
    };
  }

  private parseCitations(text: string, availableCitations: Citation[]): Citation[] {
    const usedIndices = new Set<number>();
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

  async getChunkById(chunkId: string) {
    const parts = chunkId.split('_chunk_');
    if (parts.length !== 2) {
      throw new NotFoundException('无效的片段ID');
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
      throw new NotFoundException('片段不存在');
    }

    return chunk;
  }
}
