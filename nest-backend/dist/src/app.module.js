"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_module_1 = require("./prisma/prisma.module");
const auth_module_1 = require("./auth/auth.module");
const user_module_1 = require("./user/user.module");
const session_module_1 = require("./session/session.module");
const message_module_1 = require("./message/message.module");
const chat_module_1 = require("./chat/chat.module");
const persona_module_1 = require("./persona/persona.module");
const knowledge_module_1 = require("./knowledge/knowledge.module");
const llm_module_1 = require("./llm/llm.module");
const memory_module_1 = require("./memory/memory.module");
const create_module_1 = require("./create/create.module");
const smart_edit_module_1 = require("./create/smart-edit.module");
const homework_module_1 = require("./homework/homework.module");
const recording_module_1 = require("./recording/recording.module");
const writing_module_1 = require("./writing/writing.module");
const voice_call_module_1 = require("./voice-call/voice-call.module");
const video_module_1 = require("./video/video.module");
const doc_reader_module_1 = require("./doc-reader/doc-reader.module");
const translate_module_1 = require("./translate/translate.module");
const web_search_module_1 = require("./web-search/web-search.module");
const exam_module_1 = require("./exam/exam.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
            }),
            prisma_module_1.PrismaModule,
            auth_module_1.AuthModule,
            user_module_1.UserModule,
            session_module_1.SessionModule,
            message_module_1.MessageModule,
            chat_module_1.ChatModule,
            persona_module_1.PersonaModule,
            knowledge_module_1.KnowledgeModule,
            llm_module_1.LlmModule,
            memory_module_1.MemoryModule,
            create_module_1.CreateModule,
            smart_edit_module_1.SmartEditModule,
            homework_module_1.HomeworkModule,
            recording_module_1.RecordingModule,
            writing_module_1.WritingModule,
            voice_call_module_1.VoiceCallModule,
            video_module_1.VideoModule,
            doc_reader_module_1.DocReaderModule,
            translate_module_1.TranslateModule,
            web_search_module_1.WebSearchModule,
            exam_module_1.ExamModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map