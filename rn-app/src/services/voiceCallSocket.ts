/**
 * AI语音通话 Socket.IO 客户端
 * 封装 /voice-call namespace 的连接和事件管理
 */

import {io, Socket} from 'socket.io-client';
import {API_BASE_URL} from '../constants';
import {mmkvStorage} from './mmkv';

export type VoiceCallEvent =
  | 'call-started'
  | 'call-ended'
  | 'call-error'
  | 'user-speech'
  | 'interim-result'
  | 'ai-thinking'
  | 'ai-text-chunk'
  | 'ai-speech'
  | 'ai-speech-chunk'
  | 'ai-audio'
  | 'ai-interrupted'
  | 'ai-done'
  | 'recognition-error';

export class VoiceCallSocket {
  private socket: Socket | null = null;

  connect(): Promise<boolean> {
    return new Promise(resolve => {
      const token = mmkvStorage.getToken();
      this.socket = io(`${API_BASE_URL}/voice-call`, {
        transports: ['websocket'],
        auth: token ? {token} : undefined,
      });

      const timeout = setTimeout(() => resolve(false), 5000);
      this.socket.on('connect', () => {
        clearTimeout(timeout);
        resolve(true);
      });
      this.socket.on('connect_error', () => {
        clearTimeout(timeout);
        resolve(false);
      });
    });
  }

  on(event: VoiceCallEvent, handler: (...args: any[]) => void) {
    this.socket?.on(event, handler);
  }

  off(event: VoiceCallEvent, handler: (...args: any[]) => void) {
    this.socket?.off(event, handler);
  }

  emitStartCall() {
    this.socket?.emit('start-call');
  }

  emitAudioData(base64: string) {
    this.socket?.emit('audio-data', base64);
  }

  emitInterrupt() {
    this.socket?.emit('interrupt');
  }

  emitEndCall() {
    this.socket?.emit('end-call');
  }

  emitAiDone() {
    this.socket?.emit('ai-done');
  }

  disconnect() {
    this.socket?.removeAllListeners();
    this.socket?.disconnect();
    this.socket = null;
  }

  get isConnected() {
    return this.socket?.connected ?? false;
  }
}
