import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { VoiceCallService } from './voice-call.service';
import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';

interface VoiceCallState {
  isInCall: boolean;
  isNlsReady: boolean;
  isAiSpeaking: boolean;
  isInterrupted: boolean;
  isProcessing: boolean; // 正在处理用户语音（等待 LLM 回复）
  nlsSocket: WebSocket | null;
  nlsTaskId: string | null;
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  fullAiResponse: string;
  silenceTimer: ReturnType<typeof setTimeout> | null;
  lastInterimText: string;
}

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/voice-call',
})
export class VoiceCallGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(VoiceCallGateway.name);
  private clientStates = new Map<string, VoiceCallState>();

  @WebSocketServer()
  server: Server;

  constructor(private readonly voiceCallService: VoiceCallService) {}

  handleConnection(client: Socket) {
    this.logger.log(`VoiceCall client connected: ${client.id}`);
    this.clientStates.set(client.id, {
      isInCall: false,
      isNlsReady: false,
      isAiSpeaking: false,
      isInterrupted: false,
      isProcessing: false,
      nlsSocket: null,
      nlsTaskId: null,
      conversationHistory: [],
      fullAiResponse: '',
      silenceTimer: null,
      lastInterimText: '',
    });
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`VoiceCall client disconnected: ${client.id}`);
    const state = this.clientStates.get(client.id);
    if (state?.nlsSocket) {
      state.nlsSocket.close();
    }
    this.clientStates.delete(client.id);
  }

  /**
   * 开始语音通话
   */
  @SubscribeMessage('start-call')
  async handleStartCall(@ConnectedSocket() client: Socket) {
    this.logger.log(`Start voice call for ${client.id}`);
    const state = this.clientStates.get(client.id);
    if (!state) return;

    state.isInCall = true;
    state.isNlsReady = false;
    state.conversationHistory = [];
    state.fullAiResponse = '';

    try {
      const tokenInfo = await this.voiceCallService.getNLSTokenInfo();
      if (!tokenInfo) {
        this.logger.warn('NLS Token 获取失败，使用模拟模式');
        // Token 获取失败时仍然允许通话，只是没有实时语音识别
        client.emit('call-started');
        return;
      }

      const nlsSocket = await this.connectToNLS(client, tokenInfo);
      state.nlsSocket = nlsSocket;
      client.emit('call-started');

      // 连接成功后发送问候语
      await this.sendGreeting(client, state);
    } catch (err) {
      this.logger.error(`Start call failed: ${err.message}`);
      // 即使 NLS 连接失败，也允许通话（降级模式）
      client.emit('call-started');
      await this.sendGreeting(client, state);
    }
  }

  /**
   * 发送问候语音 — 生成 TTS 音频发送给客户端
   */
  private async sendGreeting(client: Socket, state: VoiceCallState) {
    const greeting = '你好，我是元宝AI助手，有什么可以帮助您的吗？';
    this.logger.log(`Sending greeting: ${greeting}`);

    state.isAiSpeaking = true;
    client.emit('ai-thinking');
    client.emit('ai-text-chunk', { text: greeting });

    try {
      // 尝试生成 TTS 音频
      const ok = await this.ttsAndSend(client, state, greeting);
      if (!ok) {
        // TTS 失败时回退到文本，让客户端用 Web Speech API 朗读
        client.emit('ai-speech', { text: greeting });
      }
    } finally {
      // 重置 AI 说话状态，允许后续用户语音识别和处理正常进行
      state.isAiSpeaking = false;
      state.lastInterimText = '';
    }

    state.conversationHistory.push({ role: 'assistant', content: greeting });
    // 不在这里发 ai-done，等客户端播放完音频后发回 ai-done
  }

  /**
   * 连接阿里云 NLS WebSocket（对齐 recording gateway 的工作方式）
   */
  private async connectToNLS(
    client: Socket,
    tokenInfo: { token: string; appId: string },
  ): Promise<WebSocket> {
    const { token } = tokenInfo;
    const nlsUrl = 'wss://nls-gateway.cn-shanghai.aliyuncs.com/ws/v1';

    return new Promise((resolve, reject) => {
      const nlsSocket = new WebSocket(nlsUrl, {
        headers: { 'X-NLS-Token': token },
      });

      nlsSocket.on('open', () => {
        this.logger.log('NLS WebSocket connected for voice call');

        const taskId = this.generateId();
        const appkey = this.voiceCallService.getAppKey();
        const startMsg = {
          header: {
            message_id: this.generateId(),
            task_id: taskId,
            namespace: 'SpeechRecognizer',
            name: 'StartRecognition',
            appkey,
          },
          payload: {
            format: 'pcm',
            sample_rate: 16000,
            enable_intermediate_result: true,
            enable_punctuation_prediction: true,
            enable_inverse_text_normalization: true,
          },
        };

        const state = this.clientStates.get(client.id);
        if (state) {
          state.nlsTaskId = taskId;
        }

        this.logger.log(`NLS StartRecognition: appkey=${appkey}, taskId=${taskId}`);
        nlsSocket.send(JSON.stringify(startMsg));

        // 对齐 recording gateway：open 后立即 resolve，不等 RecognitionStarted
        // NLS 会在后台处理 StartRecognition，音频数据到了就会开始识别
        resolve(nlsSocket);
      });

      nlsSocket.on('message', (data: Buffer, isBinary: boolean) => {
        if (isBinary) {
          this.logger.log(`NLS binary message received, size: ${data.length}`);
          return;
        }
        try {
          const msg = JSON.parse(data.toString());
          const msgName = msg.header?.name || 'unknown';
          const statusText = msg.header?.status_text || msg.header?.status_message || '';
          this.logger.log(`NLS message: ${msgName} ${statusText ? '(' + statusText + ')' : ''}`);

          if (msgName !== 'RecognitionResultChanged') {
            this.logger.log(`NLS full message: ${JSON.stringify(msg).substring(0, 500)}`);
          }

          this.handleNLSMessage(client, msg);
        } catch (err) {
          this.logger.warn(`NLS message parse error: ${err.message}`);
        }
      });

      nlsSocket.on('error', (err) => {
        this.logger.error(`NLS WebSocket error: ${err.message}`);
        reject(err);
      });

      nlsSocket.on('close', (code, reason) => {
        this.logger.log(`NLS WebSocket closed: code=${code}, reason=${reason}`);
        const state = this.clientStates.get(client.id);
        if (state) {
          state.nlsSocket = null;
          state.isNlsReady = false;
        }
      });

      // 超时保护：10 秒内 WebSocket 没打开则 reject
      setTimeout(() => {
        if (nlsSocket.readyState !== WebSocket.OPEN) {
          this.logger.error('NLS WebSocket connection timeout');
          nlsSocket.close();
          reject(new Error('NLS connection timeout'));
        }
      }, 10000);
    });
  }

  /**
   * 处理 NLS 返回的消息
   */
  private handleNLSMessage(client: Socket, msg: any) {
    const name = msg.header?.name;
    const state = this.clientStates.get(client.id);
    if (!state) return;

    if (name === 'RecognitionStarted') {
      this.logger.log('NLS Recognition started (voice call)');
      state.isNlsReady = true;
    } else if (name === 'RecognitionResultChanged') {
      const text = msg.payload?.result || '';
      if (!text) return;

      // 如果已经在处理用户语音，忽略 interim results（避免 NLS 残余结果打断 AI）
      if (state.isProcessing) return;

      // 只有当用户说了新的、有意义的内容时才打断 AI
      // 判断：文本明显比之前长（说明用户在说新的话），且至少 4 个字符
      if (state.isAiSpeaking && !state.isInterrupted && text.length >= 4) {
        // 检查是否是新的语音（文本变化较大）
        const prevText = state.lastInterimText || '';
        const isNewSpeech = text.length > prevText.length + 2 || !text.startsWith(prevText.substring(0, 5));
        if (isNewSpeech) {
          this.logger.log(`User interrupted AI speech with: ${text.substring(0, 30)}`);
          state.isInterrupted = true;
          state.isAiSpeaking = false;
          client.emit('ai-interrupted');
        }
      }

      client.emit('interim-result', { text });
      state.lastInterimText = text;

      // 重置静音计时器：3秒内没有新结果就强制结束
      if (state.silenceTimer) clearTimeout(state.silenceTimer);
      state.silenceTimer = setTimeout(() => {
        if (state.lastInterimText && state.isInCall && !state.isProcessing && !state.isAiSpeaking) {
          this.logger.log(`Silence detected, force completing with: ${state.lastInterimText}`);
          const finalText = state.lastInterimText;
          state.lastInterimText = '';
          state.isProcessing = true;
          client.emit('user-speech', { text: finalText });
          state.conversationHistory.push({ role: 'user', content: finalText });
          this.processUserUtterance(client, finalText);
        }
      }, 3000);
    } else if (name === 'RecognitionCompleted') {
      if (state.silenceTimer) clearTimeout(state.silenceTimer);

      // 如果已经在处理中（silence timer 已触发），跳过
      if (state.isProcessing) {
        this.logger.log('RecognitionCompleted ignored (already processing)');
        return;
      }

      const text = msg.payload?.result || '';
      if (text && text.trim()) {
        this.logger.log(`User speech: ${text}`);
        state.isProcessing = true;
        state.lastInterimText = '';
        client.emit('user-speech', { text });
        state.conversationHistory.push({ role: 'user', content: text });
        this.processUserUtterance(client, text);
      }
    } else if (name === 'TaskFailed') {
      const statusText = msg.header?.status_text || msg.header?.status_message || 'Unknown error';
      this.logger.error(`NLS Task failed: ${statusText} | full: ${JSON.stringify(msg)}`);
      client.emit('recognition-error', {
        message: statusText,
      });
    }
  }

  /**
   * 处理用户语音：LLM 流式回复（客户端用 Web Speech API 朗读）
   */
  private async processUserUtterance(client: Socket, userText: string) {
    const state = this.clientStates.get(client.id);
    if (!state) return;

    state.isInterrupted = false;
    state.isAiSpeaking = true;
    state.fullAiResponse = '';

    client.emit('ai-thinking');

    try {
      const messages = this.voiceCallService.buildMessages(state.conversationHistory);
      let tokenBuffer = '';
      let sentenceBuffer = '';
      const ttsPromises: Promise<void>[] = [];
      let ttsSuccessCount = 0;

      for await (const token of this.voiceCallService.streamChat(messages)) {
        if (state.isInterrupted || !state.isInCall) {
          this.logger.log('LLM stream interrupted');
          break;
        }

        tokenBuffer += token;
        state.fullAiResponse += token;
        sentenceBuffer += token;

        // 流式发送文本片段用于实时显示
        if (state.isInCall) {
          client.emit('ai-text-chunk', { text: token });
        }

        // 检测完整句子，立即开始 TTS（不阻塞 LLM 流）
        const { complete, remainder } = this.voiceCallService.splitIntoSentences(sentenceBuffer);
        sentenceBuffer = remainder;

        for (const sentence of complete) {
          if (!state.isInCall || state.isInterrupted) break;
          const ttsPromise = this.ttsAndSend(client, state, sentence).then(ok => { if (ok) ttsSuccessCount++; });
          ttsPromises.push(ttsPromise);
        }
      }

      // 处理剩余文本
      if (sentenceBuffer.trim() && state.isInCall && !state.isInterrupted) {
        ttsPromises.push(this.ttsAndSend(client, state, sentenceBuffer.trim()).then(ok => { if (ok) ttsSuccessCount++; }));
      }

      // 等待所有 TTS 完成
      await Promise.all(ttsPromises);

      // 如果 edge-tts 全部失败，发送完整文本让客户端用 Web Speech API 朗读
      if (ttsSuccessCount === 0 && state.fullAiResponse && state.isInCall && !state.isInterrupted) {
        this.logger.log('All TTS failed, sending full text for client-side speech synthesis');
        client.emit('ai-speech', { text: state.fullAiResponse });
      }

      // 保存对话历史
      if (state.fullAiResponse && !state.isInterrupted && state.isInCall) {
        state.conversationHistory.push({
          role: 'assistant',
          content: state.fullAiResponse,
        });
      }

      state.isAiSpeaking = false;
      state.isProcessing = false;
      state.lastInterimText = '';
      // 不在这里发 ai-done，等客户端播放完音频后发回 ai-done
    } catch (err) {
      this.logger.error(`Process utterance error: ${err.message}`);
      state.isAiSpeaking = false;
      state.isProcessing = false;
      state.lastInterimText = '';
      client.emit('ai-done');
    }
  }

  /**
   * 单句 TTS 并发送音频给客户端（使用 edge-tts）
   */
  private async ttsAndSend(client: Socket, state: VoiceCallState, text: string): Promise<boolean> {
    if (!state.isInCall || state.isInterrupted) return false;
    try {
      this.logger.log(`TTS sentence: ${text.substring(0, 30)}`);
      const audioBase64 = await this.callEdgeTTS(text);
      if (!state.isInCall || state.isInterrupted) return false;
      if (audioBase64) {
        client.emit('ai-speech-chunk', { audio: audioBase64, text });
        return true;
      }
      return false;
    } catch (err) {
      this.logger.error(`TTS sentence error: ${err.message}`);
      return false;
    }
  }

  /**
   * 调用 edge-tts — 通过 HTTP 请求本地 /voice-call/tts 端点
   * 避免子进程调用 Python 的路径和环境问题
   */
  private async callEdgeTTS(text: string): Promise<string> {
    const port = process.env.PORT || 3000;
    const url = `http://127.0.0.1:${port}/voice-call/tts`;
    this.logger.log(`Edge TTS HTTP call: text="${text.substring(0, 30)}"`);

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice: '七七' }),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      throw new Error(`TTS HTTP ${response.status}`);
    }

    const result = await response.json();
    const audioBase64 = result.data?.audio || result.audio || '';
    this.logger.log(`Edge TTS success: ${audioBase64.length} chars`);
    return audioBase64;
  }

  /**
   * 接收音频数据 — 转发到 NLS
   */
  @SubscribeMessage('audio-data')
  handleAudioData(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: any,
  ) {
    const state = this.clientStates.get(client.id);
    if (!state) return;

    if (!state.isInCall) return;

    if (!state.nlsSocket || state.nlsSocket.readyState !== WebSocket.OPEN) {
      return;
    }

    try {
      const pcmBuffer = Buffer.from(data, 'base64');
      state.nlsSocket.send(pcmBuffer);
    } catch (err) {
      this.logger.warn(`Audio data error: ${err.message}`);
    }
  }

  /**
   * 用户主动打断
   */
  @SubscribeMessage('interrupt')
  handleInterrupt(@ConnectedSocket() client: Socket) {
    const state = this.clientStates.get(client.id);
    if (!state) return;

    if (state.isAiSpeaking) {
      state.isInterrupted = true;
      state.isAiSpeaking = false;
      client.emit('ai-interrupted');
    }
  }

  /**
   * 客户端播放完音频后通知服务端
   */
  @SubscribeMessage('ai-done')
  handleAiDone(@ConnectedSocket() client: Socket) {
    const state = this.clientStates.get(client.id);
    if (!state) return;
    state.isAiSpeaking = false;
    this.logger.log('Client reported AI playback finished');
  }

  /**
   * 结束通话
   */
  @SubscribeMessage('end-call')
  async handleEndCall(@ConnectedSocket() client: Socket) {
    this.logger.log(`End voice call for ${client.id}`);
    const state = this.clientStates.get(client.id);
    if (!state) return;

    state.isInCall = false;
    state.isAiSpeaking = false;
    state.isProcessing = false;
    state.isInterrupted = true; // 中断 LLM 流
    state.isNlsReady = false;

    if (state.silenceTimer) {
      clearTimeout(state.silenceTimer);
      state.silenceTimer = null;
    }

    if (state.nlsSocket && state.nlsSocket.readyState === WebSocket.OPEN) {
      const stopMsg = {
        header: {
          message_id: this.generateId(),
          task_id: state.nlsTaskId,
          namespace: 'SpeechRecognizer',
          name: 'StopRecognition',
          appkey: this.voiceCallService.getAppKey(),
        },
        payload: {},
      };
      state.nlsSocket.send(JSON.stringify(stopMsg));
      state.nlsSocket.close();
      state.nlsSocket = null;
    }

    client.emit('call-ended', {
      transcript: state.conversationHistory,
    });
  }

  private generateId(): string {
    return uuidv4().split('-').join('');
  }
}
