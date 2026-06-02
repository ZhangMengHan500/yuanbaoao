import {STORAGE_KEYS} from '../constants';

// Web shim: uses localStorage instead of native MMKV
const get = (key: string): string | null => localStorage.getItem(key);
const set = (key: string, value: string) => localStorage.setItem(key, value);
const remove = (key: string) => localStorage.removeItem(key);

export const storage = {
  getString: (key: string) => get(key),
  set: (key: string, value: string) => set(key, value),
  delete: (key: string) => remove(key),
};

export const mmkvStorage = {
  getToken: () => get(STORAGE_KEYS.TOKEN) || null,
  setToken: (token: string) => set(STORAGE_KEYS.TOKEN, token),
  removeToken: () => remove(STORAGE_KEYS.TOKEN),

  getUser: () => {
    const data = get(STORAGE_KEYS.USER);
    return data ? JSON.parse(data) : null;
  },
  setUser: (user: any) => set(STORAGE_KEYS.USER, JSON.stringify(user)),

  getChatHistory: (sessionId: string) => {
    const data = get(`${STORAGE_KEYS.CHAT_HISTORY}${sessionId}`);
    return data ? JSON.parse(data) : [];
  },
  setChatHistory: (sessionId: string, messages: any[]) => {
    set(`${STORAGE_KEYS.CHAT_HISTORY}${sessionId}`, JSON.stringify(messages));
  },

  getSessionList: () => {
    const data = get(STORAGE_KEYS.SESSION_LIST);
    return data ? JSON.parse(data) : [];
  },
  setSessionList: (sessions: any[]) => {
    set(STORAGE_KEYS.SESSION_LIST, JSON.stringify(sessions));
  },

  getCurrentSession: () => get(STORAGE_KEYS.CURRENT_SESSION) || null,
  setCurrentSession: (sessionId: string) =>
    set(STORAGE_KEYS.CURRENT_SESSION, sessionId),

  // 用户偏好
  getThemeColor: () => get(STORAGE_KEYS.THEME_COLOR) || '蓝色',
  setThemeColor: (color: string) => set(STORAGE_KEYS.THEME_COLOR, color),
  getVoiceName: () => get(STORAGE_KEYS.VOICE_NAME) || '七七',
  setVoiceName: (voice: string) => set(STORAGE_KEYS.VOICE_NAME, voice),
  getAutoRead: () => get(STORAGE_KEYS.AUTO_READ) !== 'false', // 默认开启
  setAutoRead: (enabled: boolean) => set(STORAGE_KEYS.AUTO_READ, String(enabled)),

  // 录音记录列表
  getRecordingList: () => {
    const data = get(STORAGE_KEYS.RECORDING_LIST);
    return data ? JSON.parse(data) : [];
  },
  setRecordingList: (list: any[]) => {
    set(STORAGE_KEYS.RECORDING_LIST, JSON.stringify(list));
  },
  addRecordingRecord: (record: any) => {
    const list = mmkvStorage.getRecordingList();
    list.unshift(record);
    set(STORAGE_KEYS.RECORDING_LIST, JSON.stringify(list));
  },
  toggleRecordingFavorite: (id: string) => {
    const list = mmkvStorage.getRecordingList();
    const item = list.find((r: any) => r.id === id);
    if (item) item.favorited = !item.favorited;
    set(STORAGE_KEYS.RECORDING_LIST, JSON.stringify(list));
  },
};
