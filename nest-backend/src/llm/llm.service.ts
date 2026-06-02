import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';

// LLM 服务 - 封装大语言模型调用（支持 OpenAI 兼容接口：DeepSeek/豆包/OpenAI）
@Injectable()
export class LlmService {
  private chatModel: ChatOpenAI;
  private visionModel: ChatOpenAI;
  private dashscopeTextModel: ChatOpenAI;

  constructor(private configService: ConfigService) {
    this.chatModel = new ChatOpenAI({
      configuration: {
        baseURL: this.configService.get<string>('LLM_BASE_URL') || 'https://api.deepseek.com/v1',
        apiKey: this.configService.get<string>('LLM_API_KEY') || '',
      },
      model: this.configService.get<string>('LLM_MODEL') || 'deepseek-chat',
      temperature: 0.7,
      streaming: true,
    });

    // Vision 模型 - 使用阿里云 DashScope Qwen-VL-Plus
    this.visionModel = new ChatOpenAI({
      configuration: {
        baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        apiKey: this.configService.get<string>('DASHSCOPE_API_KEY') || '',
      },
      model: 'qwen-vl-plus',
      temperature: 0.7,
      streaming: true,
    });

    // DashScope 文本模型 - 用于 OCR 后的文本问答（qwen-plus）
    this.dashscopeTextModel = new ChatOpenAI({
      configuration: {
        baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        apiKey: this.configService.get<string>('DASHSCOPE_API_KEY') || '',
      },
      model: 'qwen-plus',
      temperature: 0.7,
      streaming: true,
    });
  }

  // 流式调用 LLM，返回 token 流的异步迭代器
  async *streamChat(messages: { role: string; content: string }[]) {
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

  // 流式调用 Vision LLM（支持多模态内容，用于拍照答疑等 Vision 场景）
  async *streamChatWithVision(messages: { role: string; content: any }[]) {
    const stream = await this.visionModel.stream(
      messages.map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : m.role === 'system' ? 'system' : 'user',
        content: m.content, // 直接传入 multimodal content 数组
      })),
    );

    for await (const chunk of stream) {
      const content = chunk.content;
      if (typeof content === 'string' && content.length > 0) {
        yield content;
      }
    }
  }

  // 非流式调用 LLM（用于简单场景）
  async chat(messages: { role: string; content: string }[]): Promise<string> {
    const response = await this.chatModel.invoke(
      messages.map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : m.role === 'system' ? 'system' : 'user',
        content: m.content,
      })),
    );

    return typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
  }

  // 流式调用 DashScope 文本模型（用于 OCR 后的文本问答）
  async *streamDashscopeText(messages: { role: string; content: string }[]) {
    const stream = await this.dashscopeTextModel.stream(
      messages.map((m) => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content,
      })),
    );

    for await (const chunk of stream) {
      const content = chunk.content;
      if (typeof content === 'string' && content.length > 0) {
        yield content;
      }
    }
  }
}
