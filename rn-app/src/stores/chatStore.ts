import {create} from 'zustand';
import {Message, Session, Persona, RecordingData} from '../types';
import {mmkvStorage} from '../services/mmkv';
import {sessionAPI, messageAPI} from '../services/api';
import {DEFAULT_PERSONA} from '../constants';

interface ChatState {
  // 会话列表
  sessions: Session[];
  // 当前活跃会话ID
  currentSessionId: string | null;
  // 消息记录（按会话ID索引）
  messages: Record<string, Message[]>;
  // 当前选中的角色人设
  currentPersona: Persona | null;
  // AI 是否正在回复
  isStreaming: boolean;
  // 录音完成结果（一次性消费）
  recordingResult: RecordingData | null;

  // Actions
  loadSessions: () => Promise<void>;
  createSession: (title?: string, personaId?: string) => Promise<Session>;
  deleteSession: (id: string) => Promise<void>;
  setCurrentSession: (id: string) => void;
  loadMessages: (sessionId: string) => Promise<void>;
  addMessage: (sessionId: string, message: Message) => void;
  updateLastAssistantMessage: (sessionId: string, token: string) => void;
  setLastAssistantContent: (sessionId: string, content: string) => void;
  updateMessage: (sessionId: string, messageId: string, updates: Partial<Message>) => void;
  setStreaming: (streaming: boolean) => void;
  setCurrentPersona: (persona: Persona | null) => void;
  updateSessionPersona: (sessionId: string, persona: Persona) => Promise<void>;
  clearMessages: (sessionId: string) => void;
  setRecordingResult: (data: RecordingData | null) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  sessions: [],
  currentSessionId: null,
  messages: {},
  currentPersona: null,
  isStreaming: false,
  recordingResult: null,

  loadSessions: async () => {
    const dedupe = (list: Session[]) => {
      const seen = new Set<string>();
      return list.filter(s => {
        if (seen.has(s.id)) return false;
        seen.add(s.id);
        return true;
      });
    };

    const token = mmkvStorage.getToken();
    if (!token) {
      const sessions = dedupe(mmkvStorage.getSessionList());
      set({sessions});
      mmkvStorage.setSessionList(sessions);
      return;
    }
    try {
      const res: any = await sessionAPI.list();
      const sessions = res.data || [];
      set({sessions});
      mmkvStorage.setSessionList(sessions);
    } catch {
      const sessions = dedupe(mmkvStorage.getSessionList());
      set({sessions});
      mmkvStorage.setSessionList(sessions);
    }
  },

  createSession: async (title, personaId) => {
    const token = mmkvStorage.getToken();
    if (!token) {
      const session: Session = {
        id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        userId: 'local',
        title: title || 'New Chat',
        personaId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const newList = [session, ...get().sessions];
      set({sessions: newList});
      mmkvStorage.setSessionList(newList);
      return session;
    }
    const res: any = await sessionAPI.create({
      title: title || 'New Chat',
      personaId,
    });
    const session = res.data;
    const newList = [session, ...get().sessions];
    set({sessions: newList});
    mmkvStorage.setSessionList(newList);
    return session;
  },

  deleteSession: async id => {
    const token = mmkvStorage.getToken();
    if (token) {
      try {
        await sessionAPI.delete(id);
      } catch {
        // 即使API删除失败，也从本地状态移除
      }
    }
    // 从状态中移除该会话及其消息
    const newSessions = get().sessions.filter(s => s.id !== id);
    set({
      sessions: newSessions,
      messages: Object.fromEntries(
        Object.entries(get().messages).filter(([key]) => key !== id),
      ),
      currentSessionId:
        get().currentSessionId === id ? null : get().currentSessionId,
    });
    // 同步持久化到本地存储，防止刷新后重新出现
    mmkvStorage.setSessionList(newSessions);
  },

  setCurrentSession: id => {
    set({currentSessionId: id});
    mmkvStorage.setCurrentSession(id);

    // 切换会话时，自动恢复该会话绑定的角色人设
    const session = get().sessions.find(s => s.id === id);
    if (session?.persona) {
      // 后端返回的 persona 对象（关联查询）
      set({currentPersona: session.persona as Persona});
    } else if (session?.personaId) {
      // 只有 personaId，从已有角色列表中查找
      // 这种情况发生在本地离线模式
    }
    // 如果没有 persona 信息，保持当前的 currentPersona 不变
  },

  loadMessages: async sessionId => {
    const token = mmkvStorage.getToken();
    if (!token) {
      const msgs = mmkvStorage.getChatHistory(sessionId);
      set(state => ({messages: {...state.messages, [sessionId]: msgs}}));
      return;
    }
    try {
      const res: any = await messageAPI.list(sessionId);
      const msgs = res.data || [];
      set(state => ({messages: {...state.messages, [sessionId]: msgs}}));
      mmkvStorage.setChatHistory(sessionId, msgs);
    } catch {
      const msgs = mmkvStorage.getChatHistory(sessionId);
      set(state => ({messages: {...state.messages, [sessionId]: msgs}}));
    }
  },

  addMessage: (sessionId, message) => {
    set(state => {
      const msgs = [...(state.messages[sessionId] || []), message];
      mmkvStorage.setChatHistory(sessionId, msgs);
      return {messages: {...state.messages, [sessionId]: msgs}};
    });
  },

  updateLastAssistantMessage: (sessionId, token) => {
    set(state => {
      const msgs = [...(state.messages[sessionId] || [])];
      const lastMsg = msgs[msgs.length - 1];
      if (lastMsg && lastMsg.role === 'assistant') {
        msgs[msgs.length - 1] = {...lastMsg, content: lastMsg.content + token};
      }
      mmkvStorage.setChatHistory(sessionId, msgs);
      return {messages: {...state.messages, [sessionId]: msgs}};
    });
  },

  setLastAssistantContent: (sessionId, content) => {
    set(state => {
      const msgs = [...(state.messages[sessionId] || [])];
      const lastMsg = msgs[msgs.length - 1];
      if (lastMsg && lastMsg.role === 'assistant') {
        msgs[msgs.length - 1] = {...lastMsg, content};
      }
      mmkvStorage.setChatHistory(sessionId, msgs);
      return {messages: {...state.messages, [sessionId]: msgs}};
    });
  },

  updateMessage: (sessionId, messageId, updates) => {
    set(state => {
      const msgs = (state.messages[sessionId] || []).map(m =>
        m.id === messageId ? {...m, ...updates} : m,
      );
      mmkvStorage.setChatHistory(sessionId, msgs);
      return {messages: {...state.messages, [sessionId]: msgs}};
    });
  },

  setStreaming: streaming => set({isStreaming: streaming}),
  setCurrentPersona: persona => set({currentPersona: persona}),

  // 更新当前会话绑定的角色（同步到后端 + 本地状态）
  updateSessionPersona: async (sessionId, persona) => {
    set({currentPersona: persona});
    // 更新本地 sessions 列表中该会话的 persona
    set(state => ({
      sessions: state.sessions.map(s =>
        s.id === sessionId ? {...s, persona, personaId: persona.id} : s,
      ),
    }));
    // 同步到后端
    const token = mmkvStorage.getToken();
    if (token) {
      try {
        await sessionAPI.updatePersona(sessionId, persona.id);
      } catch (err) {
        console.error('更新会话角色失败:', err);
      }
    }
  },

  clearMessages: sessionId => {
    set(state => ({messages: {...state.messages, [sessionId]: []}}));
  },

  setRecordingResult: data => set({recordingResult: data}),
}));
