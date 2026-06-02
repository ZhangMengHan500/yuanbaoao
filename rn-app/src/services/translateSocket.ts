/**
 * 同传翻译 Socket.IO 客户端
 * 封装 /translate namespace 的连接和事件管理
 */

import {io, Socket} from 'socket.io-client';
import {API_BASE_URL} from '../constants';
import {mmkvStorage} from './mmkv';

export type TranslateEvent =
  | 'connection-established'
  | 'interim-result'
  | 'translation-result'
  | 'audio-chunk'
  | 'translation-error'
  | 'translation-complete';

export class TranslateSocket {
  private socket: Socket | null = null;

  connect(): Promise<boolean> {
    return new Promise(resolve => {
      const token = mmkvStorage.getToken();
      this.socket = io(`${API_BASE_URL}/translate`, {
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

  on(event: TranslateEvent, handler: (...args: any[]) => void) {
    this.socket?.on(event, handler);
  }

  off(event: TranslateEvent, handler: (...args: any[]) => void) {
    this.socket?.off(event, handler);
  }

  emitStartTranslation(
    sourceLang: string,
    targetLang: string,
    enableTts: boolean,
  ) {
    this.socket?.emit('start-translation', {
      sourceLang,
      targetLang,
      enableTts,
    });
  }

  emitAudioData(base64: string) {
    this.socket?.emit('audio-data', base64);
  }

  emitStopTranslation() {
    this.socket?.emit('stop-translation');
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
