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
import { TranslateService } from './translate.service';
import { RecordingService } from '../recording/recording.service';
import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';

interface TranslateClientState {
  nlsSocket: WebSocket | null;
  nlsTaskId: string | null;
  isRecording: boolean;
  sourceLang: string;
  targetLang: string;
  enableTts: boolean;
  fullSource: string;
  fullTranslation: string;
}

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/translate',
})
export class TranslateGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(TranslateGateway.name);
  private clientStates = new Map<string, TranslateClientState>();

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly translateService: TranslateService,
    private readonly recordingService: RecordingService,
  ) {}

  private generateId(): string {
    return uuidv4().split('-').join('');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Translate client connected: ${client.id}`);
    this.clientStates.set(client.id, {
      nlsSocket: null,
      nlsTaskId: null,
      isRecording: false,
      sourceLang: 'auto',
      targetLang: 'zh',
      enableTts: false,
      fullSource: '',
      fullTranslation: '',
    });
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Translate client disconnected: ${client.id}`);
    const state = this.clientStates.get(client.id);
    if (state?.nlsSocket) {
      state.nlsSocket.close();
    }
    this.clientStates.delete(client.id);
  }

  /**
   * 开始同传翻译 - 连接 NLS 实时语音识别
   * 完全复制 RecordingGateway 的 NLS 连接模式
   */
  @SubscribeMessage('start-translation')
  async handleStartTranslation(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      sourceLang: string;
      targetLang: string;
      enableTts?: boolean;
    },
  ) {
    const state = this.clientStates.get(client.id);
    if (!state) return;

    state.sourceLang = data.sourceLang || 'auto';
    state.targetLang = data.targetLang || 'zh';
    state.enableTts = data.enableTts || false;
    state.isRecording = true;
    state.fullSource = '';
    state.fullTranslation = '';

    this.logger.log(
      `开始同传: ${state.sourceLang} -> ${state.targetLang}, tts=${state.enableTts}`,
    );

    try {
      // 获取 NLS Token（与 RecordingGateway 完全相同）
      const tokenInfo = await this.recordingService.getNLSToken();
      this.logger.log(`NLS Token 获取结果: ${tokenInfo ? '成功' : '失败'}, appId=${tokenInfo?.appId}`);
      if (!tokenInfo) {
        this.logger.warn('NLS Token 获取失败');
        client.emit('translation-error', { message: '语音识别服务不可用' });
        state.isRecording = false;
        return;
      }

      // 连接 NLS WebSocket（与 RecordingGateway 完全相同）
      const nlsSocket = await this.connectToNLS(client, state, tokenInfo);
      state.nlsSocket = nlsSocket;

      client.emit('connection-established', {
        sourceLang: state.sourceLang,
        targetLang: state.targetLang,
      });
      this.logger.log('NLS 连接成功，同传翻译已启动');
    } catch (err: any) {
      this.logger.error(`同传 NLS 连接失败: ${err.message}`);
      client.emit('translation-error', { message: '语音识别连接失败' });
      state.isRecording = false;
    }
  }

  /**
   * 接收音频数据 - 实时转发到 NLS
   * 与 RecordingGateway 的 handleAudioData 完全相同
   */
  @SubscribeMessage('audio-data')
  handleAudioData(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: any,
  ) {
    const state = this.clientStates.get(client.id);
    if (!state?.isRecording) return;

    if (state.nlsSocket && state.nlsSocket.readyState === WebSocket.OPEN) {
      // base64 -> PCM buffer -> 发送到 NLS（与 RecordingGateway 完全相同）
      const pcmBuffer = Buffer.from(data, 'base64');
      state.nlsSocket.send(pcmBuffer);
    }
  }

  /**
   * 停止同传翻译 - 发送 StopRecognition 给 NLS
   */
  @SubscribeMessage('stop-translation')
  async handleStopTranslation(@ConnectedSocket() client: Socket) {
    const state = this.clientStates.get(client.id);
    if (!state) return;

    state.isRecording = false;

    // 发送 StopRecognition 给 NLS（与 RecordingGateway 完全相同）
    if (state.nlsSocket && state.nlsTaskId && state.nlsSocket.readyState === WebSocket.OPEN) {
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
      this.logger.log('已发送 StopRecognition');
    } else {
      // NLS 不可用，直接发送完成事件
      client.emit('translation-complete', {
        fullSource: state.fullSource,
        fullTranslation: state.fullTranslation,
      });
    }
  }

  /**
   * 连接 NLS WebSocket
   * 完全复制 RecordingGateway.connectToNLS 的实现
   */
  private async connectToNLS(
    client: Socket,
    state: TranslateClientState,
    tokenInfo: { token: string; appId: string },
  ): Promise<WebSocket> {
    const { token } = tokenInfo;
    const nlsUrl = 'wss://nls-gateway.cn-shanghai.aliyuncs.com/ws/v1';

    return new Promise((resolve, reject) => {
      const nlsSocket = new WebSocket(nlsUrl, {
        headers: {
          'X-NLS-Token': token,
        },
      });

      nlsSocket.on('open', () => {
        this.logger.log('Translate NLS WebSocket connected');

        // 发送 StartRecognition（与 RecordingGateway 完全相同的消息格式）
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

        state.nlsTaskId = startMsg.header.task_id;
        nlsSocket.send(JSON.stringify(startMsg));
        this.logger.log(`StartRecognition 已发送, taskId=${state.nlsTaskId}`);
        resolve(nlsSocket);
      });

      nlsSocket.on('message', (data: Buffer, isBinary: boolean) => {
        if (!isBinary) {
          try {
            const msg = JSON.parse(data.toString());
            this.handleNLSMessage(client, state, msg);
          } catch {}
        }
      });

      nlsSocket.on('error', (err) => {
        this.logger.error(`Translate NLS error: ${err.message}`);
        reject(err);
      });

      nlsSocket.on('close', () => {
        this.logger.log('Translate NLS WebSocket closed');
        state.nlsSocket = null;
        // NLS 关闭后，发送最终结果
        if (state.fullSource) {
          client.emit('translation-complete', {
            fullSource: state.fullSource,
            fullTranslation: state.fullTranslation,
          });
        }
      });
    });
  }

  /**
   * 处理 NLS 返回的消息
   * 与 RecordingGateway.handleNLSMessage 使用完全相同的消息名
   */
  private handleNLSMessage(
    client: Socket,
    state: TranslateClientState,
    msg: any,
  ) {
    const name = msg.header?.name;

    if (name === 'RecognitionStarted') {
      this.logger.log('Translate NLS Recognition started');
    } else if (name === 'RecognitionResultChanged') {
      // 中间结果（正在识别中）
      const text = msg.payload?.result || '';
      if (text) {
        client.emit('interim-result', {
          text,
          isFinal: false,
        });
      }
    } else if (name === 'RecognitionCompleted') {
      // 最终结果 - 识别完成的句子
      const text = msg.payload?.result || '';
      if (text) {
        state.fullSource += text;
        this.logger.log(`NLS 识别完成: "${text}"`);

        // 发送识别结果到前端
        client.emit('interim-result', {
          text,
          isFinal: true,
        });

        // 实时翻译这个句子
        this.translateSentence(client, state, text);
      }
    } else if (name === 'TaskFailed') {
      this.logger.error(`Translate NLS Task failed: ${JSON.stringify(msg)}`);
      this.logger.error(`TaskFailed details: code=${msg.header?.status_code}, message=${msg.header?.status_message}`);
      client.emit('translation-error', {
        message: `语音识别失败: ${msg.header?.status_message || 'unknown'}`,
      });
    } else {
      this.logger.log(`Translate NLS unknown message: ${name}, data=${JSON.stringify(msg).substring(0, 200)}`);
    }
  }

  /**
   * 翻译单个句子（异步，不阻塞识别）
   */
  private async translateSentence(
    client: Socket,
    state: TranslateClientState,
    text: string,
  ) {
    try {
      const translated = await this.translateService.translateText(
        text,
        state.sourceLang,
        state.targetLang,
      );

      state.fullTranslation += translated;

      client.emit('translation-result', {
        sourceText: text,
        translatedText: translated,
      });

      // TTS 播报翻译结果
      if (state.enableTts && translated) {
        try {
          const audioBuffer =
            await this.recordingService.synthesizeSpeech(translated);
          client.emit('audio-chunk', {
            audioBase64: audioBuffer.toString('base64'),
          });
        } catch (ttsError: any) {
          this.logger.warn('TTS 合成失败:', ttsError.message);
        }
      }
    } catch (error: any) {
      this.logger.warn(`翻译失败: ${error.message}`);
    }
  }
}
