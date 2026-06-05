import {MMKV} from 'react-native-mmkv';
import {STORAGE_KEYS} from '../constants';

// MMKV 实例
export const storage = new MMKV();

// 存储工具函数
export const mmkvStorage = {
  // Token
  getToken: () => storage.getString(STORAGE_KEYS.TOKEN) || null,
  setToken: (token: string) => storage.set(STORAGE_KEYS.TOKEN, token),
  removeToken: () => storage.delete(STORAGE_KEYS.TOKEN),

  // 用户信息
  getUser: () => {
    const data = storage.getString(STORAGE_KEYS.USER);
    return data ? JSON.parse(data) : null;
  },
  setUser: (user: any) =>
    storage.set(STORAGE_KEYS.USER, JSON.stringify(user)),
  removeUser: () => storage.delete(STORAGE_KEYS.USER),

  // 聊天历史（按会话ID存储）
  getChatHistory: (sessionId: string) => {
    const data = storage.getString(`${STORAGE_KEYS.CHAT_HISTORY}${sessionId}`);
    return data ? JSON.parse(data) : [];
  },
  setChatHistory: (sessionId: string, messages: any[]) => {
    storage.set(
      `${STORAGE_KEYS.CHAT_HISTORY}${sessionId}`,
      JSON.stringify(messages),
    );
  },

  // 会话列表
  getSessionList: () => {
    const data = storage.getString(STORAGE_KEYS.SESSION_LIST);
    return data ? JSON.parse(data) : [];
  },
  setSessionList: (sessions: any[]) => {
    storage.set(STORAGE_KEYS.SESSION_LIST, JSON.stringify(sessions));
  },

  // 当前会话
  getCurrentSession: () =>
    storage.getString(STORAGE_KEYS.CURRENT_SESSION) || null,
  setCurrentSession: (sessionId: string) =>
    storage.set(STORAGE_KEYS.CURRENT_SESSION, sessionId),

  // 用户偏好
  getThemeColor: () => storage.getString(STORAGE_KEYS.THEME_COLOR) || '蓝色',
  setThemeColor: (color: string) => storage.set(STORAGE_KEYS.THEME_COLOR, color),
  getVoiceName: () => storage.getString(STORAGE_KEYS.VOICE_NAME) || '七七',
  setVoiceName: (voice: string) => storage.set(STORAGE_KEYS.VOICE_NAME, voice),
  getAutoRead: () => storage.getString(STORAGE_KEYS.AUTO_READ) !== 'false', // 默认开启
  setAutoRead: (enabled: boolean) => storage.set(STORAGE_KEYS.AUTO_READ, String(enabled)),

  // 录音记录列表
  getRecordingList: () => {
    const data = storage.getString(STORAGE_KEYS.RECORDING_LIST);
    return data ? JSON.parse(data) : [];
  },
  setRecordingList: (list: any[]) => {
    storage.set(STORAGE_KEYS.RECORDING_LIST, JSON.stringify(list));
  },
  addRecordingRecord: (record: any) => {
    const list = mmkvStorage.getRecordingList();
    list.unshift(record);
    storage.set(STORAGE_KEYS.RECORDING_LIST, JSON.stringify(list));
  },
  toggleRecordingFavorite: (id: string) => {
    const list = mmkvStorage.getRecordingList();
    const item = list.find((r: any) => r.id === id);
    if (item) item.favorited = !item.favorited;
    storage.set(STORAGE_KEYS.RECORDING_LIST, JSON.stringify(list));
  },
};
