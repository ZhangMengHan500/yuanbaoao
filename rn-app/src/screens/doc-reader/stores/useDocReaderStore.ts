import { create } from 'zustand';
import {
  ReadingDoc,
  ReadingChunk,
  DocSummary,
  DocConversation,
  DocMessage,
  Citation,
  docReaderApi,
} from '../../../services/docReaderApi';

interface DocReaderState {
  document: ReadingDoc | null;
  chunks: ReadingChunk[];
  summaries: DocSummary;
  totalPages: number;
  currentPage: number;
  conversation: DocConversation | null;
  messages: DocMessage[];
  isStreaming: boolean;
  streamingContent: string;
  activeTab: 'summary' | 'content' | 'chat';
  selectedChunkId: string | null;
  showCitationPopup: boolean;
  citationChunk: ReadingChunk | null;

  uploadDocument: (formData: FormData) => Promise<ReadingDoc>;
  loadDocument: (docId: string) => Promise<void>;
  loadContent: (page?: number) => Promise<void>;
  loadSummary: () => Promise<void>;
  setActiveTab: (tab: 'summary' | 'content' | 'chat') => void;
  createConversation: () => Promise<void>;
  sendMessage: (message: string) => Promise<void>;
  jumpToChunk: (chunkId: string) => void;
  showCitation: (chunkId: string) => Promise<void>;
  hideCitation: () => void;
  pollStatus: () => Promise<void>;
  reset: () => void;
}

export const useDocReaderStore = create<DocReaderState>((set, get) => ({
  document: null,
  chunks: [],
  summaries: {},
  totalPages: 0,
  currentPage: 1,
  conversation: null,
  messages: [],
  isStreaming: false,
  streamingContent: '',
  activeTab: 'summary',
  selectedChunkId: null,
  showCitationPopup: false,
  citationChunk: null,

  uploadDocument: async (formData) => {
    const doc = await docReaderApi.uploadDocument(formData);
    set({ document: doc });
    return doc;
  },

  loadDocument: async (docId) => {
    const doc = await docReaderApi.getDocument(docId);
    set({ document: doc });
    await get().loadContent(1);
    await get().loadSummary();
  },

  loadContent: async (page = 1) => {
    const { document } = get();
    if (!document) return;

    // 一次加载全部内容（ pageSize 设为大值）
    const result = await docReaderApi.getDocumentContent(document.id, 1, 500);
    set({
      chunks: result.chunks,
      totalPages: 1,
      currentPage: 1,
    });
  },

  loadSummary: async () => {
    const { document } = get();
    if (!document) return;

    const summaries = await docReaderApi.getDocumentSummary(document.id);
    set({ summaries });
  },

  setActiveTab: (tab) => {
    set({ activeTab: tab });
  },

  createConversation: async () => {
    const { document, conversation } = get();
    if (!document || conversation) return;

    const conv = await docReaderApi.createConversation(document.id);
    set({ conversation: conv });
  },

  sendMessage: async (message) => {
    const { conversation, messages } = get();
    if (!conversation) {
      await get().createConversation();
    }

    const conv = get().conversation;
    if (!conv) return;

    const userMessage: DocMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: message,
      createdAt: new Date().toISOString(),
    };
    set({ messages: [...messages, userMessage], isStreaming: true, streamingContent: '' });

    await docReaderApi.streamChat(
      conv.id,
      message,
      (content) => {
        set(state => ({
          streamingContent: state.streamingContent + content,
        }));
      },
      (fullContent, citations) => {
        const assistantMessage: DocMessage = {
          id: `temp-${Date.now()}`,
          role: 'assistant',
          content: fullContent,
          citations,
          createdAt: new Date().toISOString(),
        };
        set(state => ({
          messages: [...state.messages, assistantMessage],
          isStreaming: false,
          streamingContent: '',
        }));
      },
      (error) => {
        set({ isStreaming: false, streamingContent: '' });
        console.error('问答失败:', error);
      },
    );
  },

  jumpToChunk: (chunkId) => {
    set({ selectedChunkId: chunkId, activeTab: 'content' });
  },

  showCitation: async (chunkId) => {
    const chunk = await docReaderApi.getChunk(chunkId);
    set({ showCitationPopup: true, citationChunk: chunk });
  },

  hideCitation: () => {
    set({ showCitationPopup: false, citationChunk: null });
  },

  pollStatus: async () => {
    const { document } = get();
    if (!document || document.status === 'ready' || document.status === 'error') {
      return;
    }

    const status = await docReaderApi.getDocumentStatus(document.id);
    set(state => ({
      document: state.document ? { ...state.document, status: status.status as any } : null,
    }));

    if (status.status === 'parsing' || status.status === 'pending') {
      setTimeout(() => get().pollStatus(), 2000);
    } else if (status.status === 'ready') {
      await get().loadContent(1);
      await get().loadSummary();
    }
  },

  reset: () => {
    set({
      document: null,
      chunks: [],
      summaries: {},
      totalPages: 0,
      currentPage: 1,
      conversation: null,
      messages: [],
      isStreaming: false,
      streamingContent: '',
      activeTab: 'summary',
      selectedChunkId: null,
      showCitationPopup: false,
      citationChunk: null,
    });
  },
}));
