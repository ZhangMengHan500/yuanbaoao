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
exports.LlmService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const openai_1 = require("@langchain/openai");
let LlmService = class LlmService {
    constructor(configService) {
        this.configService = configService;
        this.chatModel = new openai_1.ChatOpenAI({
            configuration: {
                baseURL: this.configService.get('LLM_BASE_URL') || 'https://api.deepseek.com/v1',
                apiKey: this.configService.get('LLM_API_KEY') || '',
            },
            model: this.configService.get('LLM_MODEL') || 'deepseek-chat',
            temperature: 0.7,
            streaming: true,
        });
        this.visionModel = new openai_1.ChatOpenAI({
            configuration: {
                baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
                apiKey: this.configService.get('DASHSCOPE_API_KEY') || '',
            },
            model: 'qwen-vl-plus',
            temperature: 0.7,
            streaming: true,
        });
        this.dashscopeTextModel = new openai_1.ChatOpenAI({
            configuration: {
                baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
                apiKey: this.configService.get('DASHSCOPE_API_KEY') || '',
            },
            model: 'qwen-plus',
            temperature: 0.7,
            streaming: true,
        });
    }
    async *streamChat(messages) {
        const stream = await this.chatModel.stream(messages.map((m) => ({
            role: m.role === 'assistant' ? 'assistant' : m.role === 'system' ? 'system' : 'user',
            content: m.content,
        })));
        for await (const chunk of stream) {
            const content = chunk.content;
            if (typeof content === 'string' && content.length > 0) {
                yield content;
            }
        }
    }
    async *streamChatWithVision(messages) {
        const stream = await this.visionModel.stream(messages.map((m) => ({
            role: m.role === 'assistant' ? 'assistant' : m.role === 'system' ? 'system' : 'user',
            content: m.content,
        })));
        for await (const chunk of stream) {
            const content = chunk.content;
            if (typeof content === 'string' && content.length > 0) {
                yield content;
            }
        }
    }
    async chat(messages) {
        const response = await this.chatModel.invoke(messages.map((m) => ({
            role: m.role === 'assistant' ? 'assistant' : m.role === 'system' ? 'system' : 'user',
            content: m.content,
        })));
        return typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
    }
    async *streamDashscopeText(messages) {
        const stream = await this.dashscopeTextModel.stream(messages.map((m) => ({
            role: m.role,
            content: m.content,
        })));
        for await (const chunk of stream) {
            const content = chunk.content;
            if (typeof content === 'string' && content.length > 0) {
                yield content;
            }
        }
    }
};
exports.LlmService = LlmService;
exports.LlmService = LlmService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], LlmService);
//# sourceMappingURL=llm.service.js.map