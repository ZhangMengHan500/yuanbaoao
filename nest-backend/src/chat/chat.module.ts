import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { SessionModule } from '../session/session.module';
import { MessageModule } from '../message/message.module';
import { LlmModule } from '../llm/llm.module';
import { PrismaModule } from '../prisma/prisma.module';
import { MemoryModule } from '../memory/memory.module';
import { WebSearchModule } from '../web-search/web-search.module';

// 聊天模块 - 核心对话功能（SSE 流式输出 + LangChain 记忆）
@Module({
  imports: [SessionModule, MessageModule, LlmModule, PrismaModule, MemoryModule, WebSearchModule],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
