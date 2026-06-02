import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

@Injectable()
export class RecordingService {
  private readonly logger = new Logger(RecordingService.name);
  private readonly dashscopeApiKey: string;
  private readonly asrAppKey: string;
  private readonly accessKeyId: string;
  private readonly accessKeySecret: string;
  private cachedNlsToken: { token: string; appId: string; expireTime: number } | null = null;

  constructor(private configService: ConfigService) {
    this.dashscopeApiKey = this.configService.get<string>('DASHSCOPE_API_KEY') || '';
    this.asrAppKey = this.configService.get<string>('ASR_APP_KEY') || '';
    this.accessKeyId = this.configService.get<string>('ALIBABA_ACCESS_KEY_ID') || '';
    this.accessKeySecret = this.configService.get<string>('ALIBABA_ACCESS_KEY_SECRET') || '';
    this.logger.log(`ASR service ready, DashScope key=${this.dashscopeApiKey.substring(0, 10)}...`);
  }

  /**
   * 获取阿里云 NLS Token（用于 WebSocket 实时识别）
   * 返回 { token, appId } 或 null（如果 AccessKey 无效）
   */
  async getNLSToken(): Promise<{ token: string; appId: string } | null> {
    // 检查缓存
    if (this.cachedNlsToken && Date.now() < this.cachedNlsToken.expireTime) {
      return { token: this.cachedNlsToken.token, appId: this.cachedNlsToken.appId };
    }

    try {
      const RPCClient = require('@alicloud/pop-core').RPCClient;
      const client = new RPCClient({
        accessKeyId: this.accessKeyId,
        accessKeySecret: this.accessKeySecret,
        endpoint: 'http://nls-meta.cn-shanghai.aliyuncs.com',
        apiVersion: '2019-02-28',
      });

      const result = await client.request('CreateToken', { TokenExpireTime: 3600 });
      const token = result.Token?.Id;
      const appId = result.Token?.AppId;

      if (token) {
        // 缓存 token（提前 5 分钟过期）
        this.cachedNlsToken = {
          token,
          appId: String(appId || this.asrAppKey),
          expireTime: Date.now() + 3500 * 1000,
        };
        this.logger.log(`NLS Token 获取成功, appId=${appId}`);
        return { token, appId: String(appId || this.asrAppKey) };
      }
    } catch (err) {
      this.logger.warn(`NLS Token 获取失败: ${err.message}`);
    }

    return null;
  }

  getAppKey(): string {
    return this.asrAppKey;
  }

  /**
   * 获取模拟识别文本（当 NLS 不可用时使用）
   */
  getSimulatedText(): string {
    const texts = [
      '今天我们要讨论一下项目的进度安排，前端部分已经完成了基本框架的搭建，接下来需要完成各个功能模块的开发。',
      '请帮我总结一下这段录音的重点内容，包括主要讨论的问题和达成的共识。',
      '这节课我们学习了人工智能的基本概念，包括机器学习、深度学习和自然语言处理的应用场景。',
      '下午三点有一个技术评审会议，需要准备一下技术方案的演示文档，重点说明系统架构和技术选型。',
      '帮我写一封邮件给客户，告知项目进展顺利，预计下周五可以完成第一阶段的交付。',
    ];
    return texts[Math.floor(Math.random() * texts.length)];
  }

  // ==================== 语音识别 ====================

  /**
   * 语音识别主入口
   * 使用 DashScope Paraformer-v2 异步 API
   */
  async recognizeSpeech(audioBase64: string, format: string = 'wav'): Promise<string> {
    const audioKB = Math.round((audioBase64.length * 3) / 4 / 1024);
    this.logger.log(`语音识别: ${audioKB}KB, format=${format}`);

    try {
      const result = await this.callDashScopeASR(audioBase64, format);
      if (result) {
        this.logger.log(`识别成功: ${result.substring(0, 80)}`);
        return result;
      }
    } catch (err) {
      this.logger.warn(`DashScope ASR失败: ${err.message}`);
    }

    this.logger.log('回退到模拟识别');
    return this.simulateRecognition();
  }

  /**
   * 严格语音识别（不回退到模拟文本）
   * 失败时抛出异常
   */
  async recognizeSpeechStrict(audioBase64: string, format: string = 'wav'): Promise<string> {
    const audioKB = Math.round((audioBase64.length * 3) / 4 / 1024);
    this.logger.log(`严格语音识别: ${audioKB}KB, format=${format}`);

    const result = await this.callDashScopeASR(audioBase64, format);
    if (result) {
      this.logger.log(`识别成功: ${result.substring(0, 80)}`);
      return result;
    }
    throw new Error('语音识别结果为空');
  }

  /**
   * 调用 DashScope Paraformer ASR
   * Step 1: 创建异步转写任务
   * Step 2: 轮询任务结果
   */
  private async callDashScopeASR(audioBase64: string, format: string): Promise<string> {
    // 保存音频到临时文件
    const tmpFile = path.join(os.tmpdir(), `asr_${Date.now()}.${format}`);
    const audioBuffer = Buffer.from(audioBase64, 'base64');
    fs.writeFileSync(tmpFile, audioBuffer);
    this.logger.log(`临时文件: ${tmpFile} (${audioBuffer.length} bytes)`);

    try {
      // Step 1: 通过 DashScope API 上传并创建转写任务
      const taskId = await this.createTranscriptionTask(tmpFile);
      this.logger.log(`转写任务已创建: ${taskId}`);

      // Step 2: 轮询结果（最多等 60 秒）
      for (let i = 0; i < 30; i++) {
        await this.sleep(2000);
        const result = await this.queryTranscriptionTask(taskId);
        this.logger.debug(`轮询 [${i + 1}]: status=${result.status}`);

        if (result.status === 'SUCCEEDED' && result.text) {
          return result.text;
        }
        if (result.status === 'FAILED') {
          throw new Error(`转写失败: ${result.errorMessage || 'unknown'}`);
        }
      }

      throw new Error('转写超时 (60s)');
    } finally {
      // 清理临时文件
      try { fs.unlinkSync(tmpFile); } catch {}
    }
  }

  /**
   * 创建 DashScope 异步转写任务
   * 使用 Paraformer-v2 模型
   */
  private async createTranscriptionTask(filePath: string): Promise<string> {
    // 读取文件并转为 data URL
    const fileBuffer = fs.readFileSync(filePath);
    const base64Data = fileBuffer.toString('base64');
    // 根据文件扩展名确定 MIME 类型
    const ext = filePath.split('.').pop()?.toLowerCase() || 'wav';
    const mimeMap: Record<string, string> = {
      wav: 'audio/wav',
      mp3: 'audio/mpeg',
      pcm: 'audio/pcm',
      m4a: 'audio/m4a',
      mp4: 'audio/mp4',
      webm: 'audio/webm',
      ogg: 'audio/ogg',
    };
    const mime = mimeMap[ext] || 'audio/wav';
    const dataUrl = `data:${mime};base64,${base64Data}`;

    this.logger.log(`创建转写任务: format=${ext}, mime=${mime}, size=${fileBuffer.length} bytes`);

    const response = await fetch(
      'https://dashscope.aliyuncs.com/api/v1/services/audio/asr/transcription',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.dashscopeApiKey}`,
          'Content-Type': 'application/json',
          'X-DashScope-Async': 'enable',
        },
        body: JSON.stringify({
          model: 'paraformer-v2',
          input: {
            file_urls: [dataUrl],
          },
          parameters: {
            language_hints: ['zh'],
          },
        }),
      },
    );

    const data = await response.json() as any;
    this.logger.log(`创建任务响应: ${JSON.stringify(data).substring(0, 300)}`);

    if (data.output?.task_id) {
      return data.output.task_id;
    }

    throw new Error(`创建任务失败: ${data.code} - ${data.message}`);
  }

  /**
   * 查询转写任务结果
   */
  private async queryTranscriptionTask(
    taskId: string,
  ): Promise<{ status: string; text?: string; errorMessage?: string }> {
    const response = await fetch(
      `https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.dashscopeApiKey}`,
        },
      },
    );

    const data = await response.json() as any;
    this.logger.debug(`查询响应: ${JSON.stringify(data).substring(0, 300)}`);

    const status = data.output?.task_status || 'UNKNOWN';

    if (status === 'SUCCEEDED') {
      // 从结果 URL 获取文本
      const results = data.output?.results || [];
      if (results.length > 0 && results[0].transcription_url) {
        const textResult = await this.fetchTranscriptionText(results[0].transcription_url);
        return { status: 'SUCCEEDED', text: textResult };
      }
      return { status: 'SUCCEEDED', text: '' };
    }

    if (status === 'FAILED') {
      return { status: 'FAILED', errorMessage: data.output?.message || 'Task failed' };
    }

    return { status };
  }

  /**
   * 从转写结果 URL 获取文本
   */
  private async fetchTranscriptionText(url: string): Promise<string> {
    const response = await fetch(url);
    const data = await response.json() as any;

    // DashScope 转写结果格式
    if (data.transcripts && Array.isArray(data.transcripts)) {
      return data.transcripts.map((t: any) => t.text || '').join('');
    }

    return JSON.stringify(data);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 模拟识别（后备）
   */
  private simulateRecognition(): string {
    const mockTexts = [
      '今天我们要讨论一下项目的进度安排，前端部分已经完成了基本框架的搭建，接下来需要完成各个功能模块的开发。',
      '请帮我总结一下这段录音的重点内容，包括主要讨论的问题和达成的共识。',
      '这节课我们学习了人工智能的基本概念，包括机器学习、深度学习和自然语言处理的应用场景。',
      '下午三点有一个技术评审会议，需要准备一下技术方案的演示文档，重点说明系统架构和技术选型。',
      '帮我写一封邮件给客户，告知项目进展顺利，预计下周五可以完成第一阶段的交付。',
    ];
    return mockTexts[Math.floor(Math.random() * mockTexts.length)];
  }

  // ==================== AI 流式回答 ====================

  async *streamAIResponse(text: string): AsyncGenerator<string> {
    const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.dashscopeApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'qwen-plus',
        messages: [
          {
            role: 'system',
            content: '你是一个智能助手，擅长对用户的内容进行分析、总结和回答。请用简洁清晰的中文回答，使用Markdown格式。',
          },
          { role: 'user', content: text },
        ],
        stream: true,
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI API Error: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No reader');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const dataStr = line.slice(6).trim();
          if (dataStr === '[DONE]') return;
          try {
            const parsed = JSON.parse(dataStr);
            const token = parsed.choices?.[0]?.delta?.content;
            if (token) yield token;
          } catch {}
        }
      }
    }
  }

  // ==================== AI 结构化总结 ====================

  async *streamSummary(text: string, duration?: string): AsyncGenerator<string> {
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.dashscopeApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'qwen-plus',
        messages: [
          {
            role: 'system',
            content: `你是一个专业的会议记录和内容总结助手。请根据用户提供的语音转写文本，生成结构化的总结报告。

输出格式要求（严格使用Markdown）：
1. 第一行是标题（用一句话概括主题）
2. 第二行是日期和时间，格式：YYYY-MM-DD | HH:MM
3. 然后是正文段落，简要描述内容概要
4. 接着是"## 小结"部分，用编号列表列出主要讨论点
5. 最后是"## 要点"部分，用bullet list列出关键信息

示例格式：
# 标题内容
${dateStr} | ${timeStr}

正文描述...

## 小结
1. 第一个讨论点
2. 第二个讨论点

## 要点
- 要点一
- 要点二`,
          },
          { role: 'user', content: `录音时长：${duration || '未知'}\n\n以下是语音转写内容，请生成结构化总结：\n\n${text}` },
        ],
        stream: true,
        temperature: 0.5,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI API Error: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No reader');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const dataStr = line.slice(6).trim();
          if (dataStr === '[DONE]') return;
          try {
            const parsed = JSON.parse(dataStr);
            const token = parsed.choices?.[0]?.delta?.content;
            if (token) yield token;
          } catch {}
        }
      }
    }
  }

  // ==================== AI 深度分析 ====================

  async *streamAnalysis(text: string, duration?: string): AsyncGenerator<string> {
    const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.dashscopeApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'qwen-plus',
        messages: [
          {
            role: 'system',
            content: `你是一个智能分析助手，擅长对语音内容进行深度分析和解读。请用简洁、专业、有洞察力的中文进行分析。

分析要求：
1. 分析说话者的主要观点和意图
2. 识别内容中的关键技术或概念
3. 给出你的专业见解和建议
4. 分段输出，每段一个要点，用自然流畅的语言表达
5. 不要使用Markdown格式，直接输出纯文本段落
6. 每段之间空一行`,
          },
          { role: 'user', content: `录音时长：${duration || '未知'}\n\n以下是语音转写内容，请进行深度分析：\n\n${text}` },
        ],
        stream: true,
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI API Error: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No reader');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const dataStr = line.slice(6).trim();
          if (dataStr === '[DONE]') return;
          try {
            const parsed = JSON.parse(dataStr);
            const token = parsed.choices?.[0]?.delta?.content;
            if (token) yield token;
          } catch {}
        }
      }
    }
  }

  // ==================== TTS 语音合成 ====================

  async synthesizeSpeech(text: string): Promise<Buffer> {
    this.logger.log('语音合成...');
    try {
      const audioBuffer = await this.callDashScopeTTS(text);
      this.logger.log(`TTS成功: ${audioBuffer.length} bytes`);
      return audioBuffer;
    } catch (err) {
      this.logger.warn(`DashScope TTS失败: ${err.message}, 尝试 NLS TTS`);
      try {
        const audioBuffer = await this.callAliyunTTS(text);
        this.logger.log(`NLS TTS成功: ${audioBuffer.length} bytes`);
        return audioBuffer;
      } catch (err2) {
        this.logger.warn(`NLS TTS也失败: ${err2.message}`);
        return Buffer.alloc(0);
      }
    }
  }

  /**
   * DashScope CosyVoice TTS — WebSocket 流式合成
   */
  private async callDashScopeTTS(text: string): Promise<Buffer> {
    const WebSocket = require('ws');
    const wssUrl = `wss://dashscope.aliyuncs.com/api-ws/v1/inference/?Token=${this.dashscopeApiKey}`;

    return new Promise((resolve, reject) => {
      const ws = new WebSocket(wssUrl);
      const audioChunks: Buffer[] = [];
      let finished = false;
      const timeout = setTimeout(() => {
        if (!finished) {
          finished = true;
          ws.close();
          reject(new Error('DashScope TTS timeout'));
        }
      }, 15000);

      ws.on('open', () => {
        // 发送运行指令
        ws.send(JSON.stringify({
          header: {
            action: 'run-task',
            task_id: this.generateId(),
            streaming: 'once',
          },
          payload: {
            task_group: 'audio',
            task: 'tts',
            function: 'SpeechSynthesizer',
            model: 'cosyvoice-v2',
            parameters: {
              text_type: 'PlainText',
              voice: 'longxiaochun',
              format: 'wav',
              sample_rate: 16000,
              volume: 50,
              pitch: 50,
              speed: 100,
            },
            input: {
              text,
            },
          },
        }));
      });

      ws.on('message', (data: Buffer, isBinary: boolean) => {
        if (isBinary) {
          audioChunks.push(data);
        } else {
          try {
            const msg = JSON.parse(data.toString());
            if (msg.header?.event === 'task-finished') {
              finished = true;
              clearTimeout(timeout);
              ws.close();
              resolve(Buffer.concat(audioChunks));
            } else if (msg.header?.event === 'task-failed') {
              finished = true;
              clearTimeout(timeout);
              ws.close();
              reject(new Error(`TTS task failed: ${JSON.stringify(msg)}`));
            }
          } catch {}
        }
      });

      ws.on('error', (err) => {
        if (!finished) {
          finished = true;
          clearTimeout(timeout);
          reject(err);
        }
      });

      ws.on('close', () => {
        if (!finished) {
          finished = true;
          clearTimeout(timeout);
          if (audioChunks.length > 0) {
            resolve(Buffer.concat(audioChunks));
          } else {
            reject(new Error('TTS WebSocket closed without audio'));
          }
        }
      });
    });
  }

  private async callAliyunTTS(text: string): Promise<Buffer> {
    const accessKeyId = this.configService.get<string>('ALIBABA_ACCESS_KEY_ID') || '';
    const accessKeySecret = this.configService.get<string>('ALIBABA_ACCESS_KEY_SECRET') || '';
    const host = 'nls-gateway.cn-shanghai.aliyuncs.com';
    const path = '/stream/v1/tts';
    const timestamp = new Date().toISOString().replace(/[:\-]|\.\d{3}/g, '');

    const params: Record<string, string> = {
      Action: 'SubmitTask',
      Version: '2021-03-25',
      AppKey: this.asrAppKey,
      Timestamp: timestamp,
      Text: text,
      Voice: 'zhixiaoxia',
      Format: 'wav',
      SampleRate: '16000',
      Volume: '50',
      Speed: '100',
      Pitch: '50',
    };

    const sortedKeys = Object.keys(params).sort();
    const canonicalQuery = sortedKeys
      .map((k) => `${this.percentEncode(k)}=${this.percentEncode(params[k])}`)
      .join('&');

    const stringToSign = `POST&${this.percentEncode(path)}&${this.percentEncode(canonicalQuery)}`;
    const signature = crypto
      .createHmac('sha1', accessKeySecret + '&')
      .update(stringToSign)
      .digest('base64');

    const queryStr = sortedKeys
      .map((k) => `${this.percentEncode(k)}=${this.percentEncode(params[k])}`)
      .join('&');

    const url = `https://${host}${path}?Signature=${this.percentEncode(signature)}&${queryStr}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`TTS HTTP ${response.status}`);
    }

    return Buffer.from(await response.arrayBuffer());
  }

  private percentEncode(str: string): string {
    return encodeURIComponent(str)
      .replace(/\+/g, '%20')
      .replace(/\*/g, '%2A')
      .replace(/%7E/g, '~');
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
  }
}
