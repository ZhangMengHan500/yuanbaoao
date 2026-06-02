import api from './api';

export interface ReadingDoc {
  id: string;
  title: string;
  fileType: string;
  fileSize: number;
  pageCount?: number;
  wordCount?: number;
  status: 'pending' | 'parsing' | 'ready' | 'error';
  createdAt: string;
}

export interface ReadingChunk {
  id: string;
  content: string;
  chunkIndex: number;
  pageNumber?: number;
  paragraphNum?: number;
  title?: string;
  documentId?: string;
}

export interface DocSummary {
  executive?: string;
  key_points?: string[];
  outline?: string;
}

export interface DocConversation {
  id: string;
  documentId: string;
  title?: string;
  createdAt: string;
}

export interface DocMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  createdAt: string;
}

export interface Citation {
  index: number;
  chunkId: string;
  page: number;
  text: string;
}

export interface ChatEvent {
  type: 'chunk' | 'done' | 'error';
  content?: string;
  fullContent?: string;
  citations?: Citation[];
  message?: string;
}

export const docReaderApi = {
  async uploadDocument(formData: FormData, title?: string): Promise<ReadingDoc> {
    if (title) {
      formData.append('title', title);
    }
    const res: any = await api.post('/doc-reader/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data || res;
  },

  async getDocuments(): Promise<ReadingDoc[]> {
    const res: any = await api.get('/doc-reader/documents');
    return res.data || res || [];
  },

  async getDocument(id: string): Promise<ReadingDoc> {
    const res: any = await api.get(`/doc-reader/documents/${id}`);
    return res.data || res;
  },

  async getDocumentStatus(id: string): Promise<{ status: string; parseError?: string }> {
    const res: any = await api.get(`/doc-reader/documents/${id}/status`);
    return res.data || res;
  },

  async getDocumentContent(id: string, page: number = 1, pageSize: number = 20) {
    const res: any = await api.get(`/doc-reader/documents/${id}/content`, {
      params: { page, pageSize },
    });
    return res.data || res;
  },

  async getDocumentSummary(id: string): Promise<DocSummary> {
    const res: any = await api.get(`/doc-reader/documents/${id}/summary`);
    return res.data || res;
  },

  async deleteDocument(id: string): Promise<void> {
    await api.delete(`/doc-reader/documents/${id}`);
  },

  async getChunk(id: string): Promise<ReadingChunk> {
    const res: any = await api.get(`/doc-reader/chunks/${id}`);
    return res.data || res;
  },

  async createConversation(documentId: string): Promise<DocConversation> {
    const res: any = await api.post('/doc-reader/conversations', { documentId });
    return res.data || res;
  },

  async getConversations(documentId: string): Promise<DocConversation[]> {
    const res: any = await api.get('/doc-reader/conversations', {
      params: { documentId },
    });
    return res.data || res || [];
  },

  async getMessages(conversationId: string): Promise<DocMessage[]> {
    const res: any = await api.get(`/doc-reader/conversations/${conversationId}/messages`);
    return res.data || res || [];
  },

  async streamChat(
    conversationId: string,
    message: string,
    onChunk: (content: string) => void,
    onDone: (fullContent: string, citations: Citation[]) => void,
    onError?: (error: string) => void,
  ): Promise<void> {
    const { mmkvStorage } = await import('./mmkv');
    const token = mmkvStorage.getToken();

    const response = await fetch(
      `${api.defaults.baseURL}/doc-reader/conversations/${conversationId}/chat`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message }),
      },
    );

    const reader = response.body?.getReader();
    if (!reader) {
      onError?.('无法建立连接');
      return;
    }

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
          try {
            const event: ChatEvent = JSON.parse(line.slice(6));

            if (event.type === 'chunk' && event.content) {
              onChunk(event.content);
            } else if (event.type === 'done') {
              onDone(event.fullContent || '', event.citations || []);
            } else if (event.type === 'error') {
              onError?.(event.message || '未知错误');
            }
          } catch (e) {
            console.error('解析SSE事件失败:', e);
          }
        }
      }
    }
  },
};

export default docReaderApi;
