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
import { RecordingService } from './recording.service';
import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';

interface ClientState {
  nlsSocket: WebSocket | null;
  nlsTaskId: string | null;
  isRecognizing: boolean;
  isStopping: boolean;
  fullText: string;
  audioChunks: Buffer[];
}

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/recording',
})
export class RecordingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(RecordingGateway.name);
  private clientStates = new Map<string, ClientState>();

  @WebSocketServer()
  server: Server;

  constructor(private readonly recordingService: RecordingService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    this.clientStates.set(client.id, {
      nlsSocket: null,
      nlsTaskId: null,
      isRecognizing: false,
      isStopping: false,
      fullText: '',
      audioChunks: [],
    });
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    const state = this.clientStates.get(client.id);
    if (state?.nlsSocket) {
      state.nlsSocket.close();
    }
    this.clientStates.delete(client.id);
  }

  /**
   * 开始实时语音识别
   * 前端发送: { format?: string }
   */
  @SubscribeMessage('start-recognition')
  async handleStartRecognition(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { format?: string },
  ) {
    this.logger.log(`Start recognition for ${client.id}`);
    const state = this.clientStates.get(client.id);
    if (!state) return;

    state.fullText = '';
    state.audioChunks = [];
    state.isRecognizing = true;

    try {
      // 获取 NLS Token
      const tokenInfo = await this.recordingService.getNLSToken();
      if (!tokenInfo) {
        // Token 获取失败，使用模拟模式
        this.logger.warn('NLS Token 获取失败，使用模拟识别模式');
        client.emit('recognition-mode', { mode: 'simulation' });
        return;
      }

      // 连接阿里云 NLS WebSocket
      const nlsSocket = await this.connectToNLS(client, tokenInfo);
      state.nlsSocket = nlsSocket;
      client.emit('recognition-mode', { mode: 'realtime' });
    } catch (err) {
      this.logger.error(`Start recognition failed: ${err.message}`);
      client.emit('recognition-mode', { mode: 'simulation' });
    }
  }

  /**
   * 连接阿里云 NLS WebSocket
   */
  private async connectToNLS(
    client: Socket,
    tokenInfo: { token: string; appId: string },
  ): Promise<WebSocket> {
    const { token, appId } = tokenInfo;
    const nlsUrl = 'wss://nls-gateway.cn-shanghai.aliyuncs.com/ws/v1';

    return new Promise((resolve, reject) => {
      const nlsSocket = new WebSocket(nlsUrl, {
        headers: {
          'X-NLS-Token': token,
        },
      });

      nlsSocket.on('open', () => {
        this.logger.log('NLS WebSocket connected');

        // 发送 StartRecognition 消息
        const startMsg = {
          header: {
            message_id: this.generateId(),
            task_id: this.generateId(),
            namespace: 'SpeechRecognizer',
            name: 'StartRecognition',
            appkey: this.recordingService.getAppKey(),
          },
          payload: {
            format: 'pcm',
            sample_rate: 16000,
            enable_intermediate_result: true,
            enable_punctuation_prediction: true,
            enable_inverse_text_normalization: true,
          },
          context: {
            sdk: {
              name: 'nls-nodejs-sdk',
              version: '1.0.0',
              language: 'nodejs',
            },
          },
        };

        const state = this.clientStates.get(client.id);
        if (state) {
          state.nlsTaskId = startMsg.header.task_id;
        }

        nlsSocket.send(JSON.stringify(startMsg));
        resolve(nlsSocket);
      });

      nlsSocket.on('message', (data: Buffer, isBinary: boolean) => {
        if (!isBinary) {
          try {
            const msg = JSON.parse(data.toString());
            this.handleNLSMessage(client, msg);
          } catch {}
        }
      });

      nlsSocket.on('error', (err) => {
        this.logger.error(`NLS WebSocket error: ${err.message}`);
        reject(err);
      });

      nlsSocket.on('close', () => {
        this.logger.log('NLS WebSocket closed');
        // NLS 连接关闭后，发送最终结果给前端
        const state = this.clientStates.get(client.id);
        if (state?.isStopping) {
          state.isStopping = false;
          this.logger.log(`Sending recognition-complete, fullText length: ${state.fullText.length}`);
          client.emit('recognition-complete', {
            fullText: state.fullText || '',
          });
        }
      });
    });
  }

  /**
   * 处理 NLS 返回的消息
   */
  private handleNLSMessage(client: Socket, msg: any) {
    const name = msg.header?.name;

    if (name === 'RecognitionStarted') {
      this.logger.log('NLS Recognition started');
      client.emit('recognition-started');
    } else if (name === 'RecognitionResultChanged') {
      // 中间结果（正在识别中）
      const text = msg.payload?.result || '';
      const sentenceId = msg.payload?.sentence_id || 0;
      client.emit('interim-result', {
        text,
        sentenceId,
        isFinal: false,
      });
    } else if (name === 'RecognitionCompleted') {
      // 最终结果
      const text = msg.payload?.result || '';
      const state = this.clientStates.get(client.id);
      if (state) {
        state.fullText += text;
      }
      client.emit('final-result', {
        text,
        fullText: state?.fullText || text,
      });
    } else if (name === 'TaskFailed') {
      this.logger.error(`NLS Task failed: ${JSON.stringify(msg)}`);
      client.emit('recognition-error', {
        message: msg.header?.status_message || 'Recognition failed',
      });
    }
  }

  /**
   * 接收音频数据
   * 前端发送音频 PCM 数据（二进制）
   */
  @SubscribeMessage('audio-data')
  handleAudioData(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: any,
  ) {
    const state = this.clientStates.get(client.id);
    if (!state?.isRecognizing) return;

    if (state.nlsSocket && state.nlsSocket.readyState === WebSocket.OPEN) {
      // 发送到 NLS
      // data 可能是 base64 编码的 PCM 数据
      const pcmBuffer = Buffer.from(data, 'base64');
      state.nlsSocket.send(pcmBuffer);
    } else {
      // 模拟模式：收集音频数据
      state.audioChunks.push(Buffer.from(data, 'base64'));
    }
  }

  /**
   * 停止识别
   */
  @SubscribeMessage('stop-recognition')
  async handleStopRecognition(@ConnectedSocket() client: Socket) {
    this.logger.log(`Stop recognition for ${client.id}`);
    const state = this.clientStates.get(client.id);
    if (!state) return;

    state.isRecognizing = false;

    if (state.nlsSocket && state.nlsSocket.readyState === WebSocket.OPEN) {
      // 设置停止标记，等 NLS WebSocket 关闭后再发送 recognition-complete
      state.isStopping = true;

      // 发送 StopRecognition
      const stopMsg = {
        header: {
          message_id: this.generateId(),
          task_id: state.nlsTaskId,
          namespace: 'SpeechRecognizer',
          name: 'StopRecognition',
          appkey: this.recordingService.getAppKey(),
        },
        payload: {},
      };
      state.nlsSocket.send(JSON.stringify(stopMsg));

      // 超时保护：5秒后如果 NLS 还没关闭，强制发送结果
      setTimeout(() => {
        if (state.isStopping) {
          state.isStopping = false;
          this.logger.log(`NLS close timeout, force sending recognition-complete`);
          client.emit('recognition-complete', {
            fullText: state.fullText || '',
          });
          if (state.nlsSocket) {
            state.nlsSocket.close();
            state.nlsSocket = null;
          }
        }
      }, 5000);
    } else {
      // NLS 不可用，直接发送结果
      client.emit('recognition-complete', {
        fullText: state.fullText || '',
      });
    }
  }

  /**
   * 模拟识别（当 NLS 不可用时）
   * 前端在停止录音后调用
   */
  @SubscribeMessage('simulate-recognition')
  async handleSimulateRecognition(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { audioBase64: string },
  ) {
    this.logger.log(`Simulate recognition for ${client.id}`);
    const state = this.clientStates.get(client.id);
    if (!state) return;

    // 模拟逐字输出
    const fullText = this.recordingService.getSimulatedText();
    let currentText = '';

    for (let i = 0; i < fullText.length; i++) {
      currentText += fullText[i];
      client.emit('interim-result', {
        text: currentText,
        sentenceId: 0,
        isFinal: i === fullText.length - 1,
      });
      await this.sleep(50);
    }

    state.fullText = fullText;
    client.emit('final-result', { text: fullText, fullText });
    client.emit('recognition-complete', { fullText });
  }

  private generateId(): string {
    return uuidv4().split('-').join('');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
