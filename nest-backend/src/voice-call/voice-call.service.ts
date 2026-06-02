import { Injectable, Logger } from '@nestjs/common';
import { RecordingService } from '../recording/recording.service';
import { LlmService } from '../llm/llm.service';

const VOICE_CHAT_SYSTEM_PROMPT = `你是元宝AI助手，正在进行语音通话。请用简短自然的口语回答，每次回复控制在2-3句话以内。不要使用Markdown格式。不要使用编号列表。直接说话，像朋友聊天一样。`;

const MAX_HISTORY_TURNS = 10;

@Injectable()
export class VoiceCallService {
  private readonly logger = new Logger(VoiceCallService.name);

  constructor(
    private readonly recordingService: RecordingService,
    private readonly llmService: LlmService,
  ) {}

  async getNLSTokenInfo() {
    return this.recordingService.getNLSToken();
  }

  getAppKey(): string {
    return this.recordingService.getAppKey();
  }

  /**
   * 构建语音对话的 LLM messages 数组
   */
  buildMessages(history: Array<{ role: 'user' | 'assistant'; content: string }>) {
    const recentHistory = history.slice(-MAX_HISTORY_TURNS * 2);
    return [
      { role: 'system', content: VOICE_CHAT_SYSTEM_PROMPT },
      ...recentHistory.map(m => ({ role: m.role, content: m.content })),
    ];
  }

  /**
   * 流式调用 LLM
   */
  async *streamChat(messages: { role: string; content: string }[]) {
    yield* this.llmService.streamChat(messages);
  }

  /**
   * 文本转语音
   */
  async synthesizeSentence(text: string): Promise<Buffer> {
    return this.recordingService.synthesizeSpeech(text);
  }

  /**
   * 将累积的文本按句子拆分
   * 返回完整句子和剩余未完成部分
   */
  splitIntoSentences(buffer: string): { complete: string[]; remainder: string } {
    const sentences: string[] = [];
    let remainder = buffer;

    // 按句末标点拆分
    const sentenceEndRegex = /[^。！？\n]*[。！？\n]/g;
    let match;
    let lastIndex = 0;

    while ((match = sentenceEndRegex.exec(remainder)) !== null) {
      const sentence = remainder.slice(lastIndex, match.index + match[0].length).trim();
      if (sentence) {
        sentences.push(sentence);
      }
      lastIndex = match.index + match[0].length;
    }

    remainder = remainder.slice(lastIndex);

    // 如果剩余部分超过50字且有逗号，在逗号处拆分
    if (remainder.length > 50) {
      const commaIndex = remainder.lastIndexOf('，');
      if (commaIndex > 10) {
        sentences.push(remainder.slice(0, commaIndex + 1).trim());
        remainder = remainder.slice(commaIndex + 1);
      }
    }

    return { complete: sentences, remainder };
  }
}
