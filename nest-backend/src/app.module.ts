import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { SessionModule } from './session/session.module';
import { MessageModule } from './message/message.module';
import { ChatModule } from './chat/chat.module';
import { PersonaModule } from './persona/persona.module';
import { KnowledgeModule } from './knowledge/knowledge.module';
import { LlmModule } from './llm/llm.module';
import { MemoryModule } from './memory/memory.module';
import { CreateModule } from './create/create.module';
import { SmartEditModule } from './create/smart-edit.module';
import { HomeworkModule } from './homework/homework.module';
import { RecordingModule } from './recording/recording.module';
import { WritingModule } from './writing/writing.module';
import { VoiceCallModule } from './voice-call/voice-call.module';
import { VideoModule } from './video/video.module';
import { DocReaderModule } from './doc-reader/doc-reader.module';
import { TranslateModule } from './translate/translate.module';
import { WebSearchModule } from './web-search/web-search.module';
import { ExamModule } from './exam/exam.module';

// 应用根模块 - 注册所有子模块
@Module({
  imports: [
    // 全局配置模块
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    UserModule,
    SessionModule,
    MessageModule,
    ChatModule,
    PersonaModule,
    KnowledgeModule,
    LlmModule,
    MemoryModule,  // LangChain 记忆模块（支持内存/Redis/PostgreSQL）
    CreateModule,  // AI 创作模块（模板管理 + 图片生成）
    SmartEditModule,  // 智能P图模块
    HomeworkModule,  // 作业批改模块
    RecordingModule,  // AI录音笔模块
    WritingModule,  // AI写作模块
    VoiceCallModule,  // AI语音通话模块
    VideoModule,  // AI视频生成模块
    DocReaderModule,  // 文档阅读模块
    TranslateModule,  // 翻译模块
    WebSearchModule,  // 联网搜索模块
    ExamModule,  // AI出卷模块
  ],
})
export class AppModule {}
