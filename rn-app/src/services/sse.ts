import {API_BASE_URL} from '../constants';
import {mmkvStorage} from './mmkv';

/**
 * SSE 流式请求 - AI 逐字打字效果
 * 使用 fetch + ReadableStream 实现 POST SSE
 *
 * @param data 请求参数 { sessionId, content, personaId? }
 * @param onMessage 收到每条消息的回调（逐 token）
 * @param onDone 流结束回调
 * @param onError 错误回调
 * @returns 关闭连接的取消函数
 */
export function startSSEStream(
  data: {sessionId: string; content: string; personaId?: string; enableRag?: boolean; deepThinking?: boolean; webSearch?: boolean},
  onMessage: (token: string) => void,
  onDone: () => void,
  onError: (err: any) => void,
): () => void {
  const token = mmkvStorage.getToken();
  const controller = new AbortController();

  fetch(`${API_BASE_URL}/chat/stream`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify(data),
    signal: controller.signal,
  })
    .then(response => {
      if (response.status === 401) {
        mmkvStorage.removeToken();
        mmkvStorage.removeUser();
        if (typeof window !== 'undefined') window.location.reload();
        throw new Error('Unauthorized');
      }
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader');

      const decoder = new TextDecoder();
      let buffer = '';

      const read = (): Promise<void> => {
        return reader.read().then(({done, value}) => {
          if (done) {
            onDone();
            return;
          }

          buffer += decoder.decode(value, {stream: true});
          // 解析 SSE 数据行
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.slice(6).trim();
              if (dataStr === '[DONE]') {
                onDone();
                return;
              }
              try {
                const parsed = JSON.parse(dataStr);
                if (parsed.token) {
                  onMessage(parsed.token);
                } else if (parsed.content) {
                  onMessage(parsed.content);
                } else if (typeof parsed === 'string') {
                  onMessage(parsed);
                }
              } catch {
                // 非JSON数据，直接作为token
                if (dataStr) onMessage(dataStr);
              }
            }
          }

          return read();
        });
      };

      return read();
    })
    .catch(err => {
      if (err.name !== 'AbortError') {
        onError(err);
      }
    });

  // 返回取消函数
  return () => {
    controller.abort();
  };
}

/**
 * SSE 流式请求 - 拍照答疑（Vision 多模态）
 * 与 startSSEStream 相同模式，但 URL 和 body 包含 imageUrl
 */
export function startPhotoSolveStream(
  data: {sessionId: string; content: string; imageUrl: string; personaId?: string},
  onMessage: (token: string) => void,
  onDone: () => void,
  onError: (err: any) => void,
): () => void {
  const token = mmkvStorage.getToken();
  const controller = new AbortController();

  console.log('[PhotoSolve] 请求开始, imageUrl:', data.imageUrl?.substring(0, 80));

  fetch(`${API_BASE_URL}/chat/photo-solve`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify(data),
    signal: controller.signal,
  })
    .then(response => {
      console.log('[PhotoSolve] 响应状态:', response.status);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader');

      const decoder = new TextDecoder();
      let buffer = '';

      const read = (): Promise<void> => {
        return reader.read().then(({done, value}) => {
          if (done) {
            onDone();
            return;
          }

          buffer += decoder.decode(value, {stream: true});
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.slice(6).trim();
              if (dataStr === '[DONE]') {
                onDone();
                return;
              }
              try {
                const parsed = JSON.parse(dataStr);
                if (parsed.token) {
                  onMessage(parsed.token);
                } else if (parsed.content) {
                  onMessage(parsed.content);
                } else if (typeof parsed === 'string') {
                  onMessage(parsed);
                }
              } catch {
                if (dataStr) onMessage(dataStr);
              }
            }
          }

          return read();
        });
      };

      return read();
    })
    .catch(err => {
      console.error('[PhotoSolve] 请求失败:', err.message || err);
      if (err.name !== 'AbortError') {
        onError(err);
      }
    });

  return () => {
    controller.abort();
  };
}

/**
 * SSE 流式请求 - AI 写作
 * 与 startSSEStream 相同模式，但 URL 和 body 包含写作参数
 */
export function startWritingStream(
  data: {
    writingType: string;
    filters: Record<string, string>;
    topic: string;
  },
  onMessage: (token: string) => void,
  onDone: () => void,
  onError: (err: any) => void,
): () => void {
  const token = mmkvStorage.getToken();
  const controller = new AbortController();

  console.log('[Writing] 请求开始, 主题:', data.topic, '类型:', data.writingType);

  fetch(`${API_BASE_URL}/writing/generate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify(data),
    signal: controller.signal,
  })
    .then(response => {
      console.log('[Writing] 响应状态:', response.status);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader');

      const decoder = new TextDecoder();
      let buffer = '';

      const read = (): Promise<void> => {
        return reader.read().then(({done, value}) => {
          if (done) {
            onDone();
            return;
          }

          buffer += decoder.decode(value, {stream: true});
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.slice(6).trim();
              if (dataStr === '[DONE]') {
                onDone();
                return;
              }
              try {
                const parsed = JSON.parse(dataStr);
                if (parsed.token) {
                  onMessage(parsed.token);
                } else if (parsed.content) {
                  onMessage(parsed.content);
                } else if (typeof parsed === 'string') {
                  onMessage(parsed);
                }
              } catch {
                if (dataStr) onMessage(dataStr);
              }
            }
          }

          return read();
        });
      };

      return read();
    })
    .catch(err => {
      console.error('[Writing] 请求失败:', err.message || err);
      if (err.name !== 'AbortError') {
        onError(err);
      }
    });

  return () => {
    controller.abort();
  };
}

/**
 * SSE 流式请求 - 文字翻译
 */
export function startTranslateStream(
  data: {text: string; sourceLang: string; targetLang: string},
  onMessage: (token: string) => void,
  onDone: (fullText: string) => void,
  onError: (err: any) => void,
): () => void {
  const token = mmkvStorage.getToken();
  const controller = new AbortController();

  fetch(`${API_BASE_URL}/translate/stream`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify(data),
    signal: controller.signal,
  })
    .then(response => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader');
      const decoder = new TextDecoder();
      let buffer = '';
      const read = (): Promise<void> =>
        reader.read().then(({done, value}) => {
          if (done) {
            onDone(buffer);
            return;
          }
          buffer += decoder.decode(value, {stream: true});
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          let fullText = '';
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.slice(6).trim();
              if (dataStr === '[DONE]') {
                onDone(fullText);
                return;
              }
              try {
                const parsed = JSON.parse(dataStr);
                if (parsed.type === 'token' && parsed.token) {
                  fullText += parsed.token;
                  onMessage(parsed.token);
                } else if (parsed.type === 'done') {
                  onDone(parsed.fullText || fullText);
                  return;
                } else if (parsed.type === 'error') {
                  onError(parsed.message);
                  return;
                }
              } catch {
                if (dataStr) onMessage(dataStr);
              }
            }
          }
          return read();
        });
      return read();
    })
    .catch(err => {
      if (err.name !== 'AbortError') onError(err);
    });

  return () => {
    controller.abort();
  };
}

/**
 * SSE 流式请求 - 拍照翻译（OCR + 翻译）
 */
export function startPhotoTranslateStream(
  data: {imageBase64: string; sourceLang: string; targetLang: string},
  onOcr: (text: string) => void,
  onMessage: (token: string) => void,
  onDone: (fullText: string, ocrText: string) => void,
  onError: (err: any) => void,
): () => void {
  const token = mmkvStorage.getToken();
  const controller = new AbortController();

  fetch(`${API_BASE_URL}/translate/photo`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify(data),
    signal: controller.signal,
  })
    .then(response => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader');
      const decoder = new TextDecoder();
      let buffer = '';
      const read = (): Promise<void> =>
        reader.read().then(({done, value}) => {
          if (done) return;
          buffer += decoder.decode(value, {stream: true});
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.slice(6).trim();
              if (dataStr === '[DONE]') return;
              try {
                const parsed = JSON.parse(dataStr);
                if (parsed.type === 'ocr') onOcr(parsed.text);
                else if (parsed.type === 'token') onMessage(parsed.token);
                else if (parsed.type === 'done') {
                  onDone(parsed.fullText, parsed.ocrText);
                  return;
                } else if (parsed.type === 'error') {
                  onError(parsed.message);
                  return;
                }
              } catch {}
            }
          }
          return read();
        });
      return read();
    })
    .catch(err => {
      if (err.name !== 'AbortError') onError(err);
    });

  return () => {
    controller.abort();
  };
}
