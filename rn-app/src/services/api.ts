import axios, {AxiosInstance, InternalAxiosRequestConfig} from 'axios';
import {API_BASE_URL} from '../constants';
import {mmkvStorage} from './mmkv';
import {TemplatePaginatedResponse, ImageJob, StyleCategory, AiStyleTemplate} from '../types';

// 创建 axios 实例
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {'Content-Type': 'application/json'},
});

// 请求拦截器 - 自动附加 token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = mmkvStorage.getToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error),
);

// 响应拦截器
api.interceptors.response.use(
  response => response.data,
  error => {
    console.error('API Error:', error?.response?.data || error.message);
    // 401 未授权：清除失效 token（不强制刷新页面，避免破坏用户体验）
    if (error?.response?.status === 401) {
      mmkvStorage.removeToken();
      mmkvStorage.removeUser();
    }
    return Promise.reject(error);
  },
);

export default api;

// ====== API 接口定义 ======

// 认证
export const authAPI = {
  register: (data: {email: string; username?: string; password: string; confirmPassword: string}) =>
    api.post('/auth/register', data),
  login: (data: {email: string; password: string}) =>
    api.post('/auth/login', data),
};

// 会话
export const sessionAPI = {
  list: () => api.get('/sessions'),
  create: (data: {title?: string; personaId?: string}) =>
    api.post('/sessions', data),
  delete: (id: string) => api.delete(`/sessions/${id}`),
  // 更新会话绑定的角色
  updatePersona: (id: string, personaId: string) =>
    api.patch(`/sessions/${id}/persona`, {personaId}),
};

// 消息
export const messageAPI = {
  list: (sessionId: string) => api.get(`/messages/${sessionId}`),
  save: (data: {sessionId: string; role: string; content: string}) =>
    api.post('/messages', data),
};

// 聊天（SSE 流式）
export const chatAPI = {
  streamUrl: () => `${API_BASE_URL}/chat/stream`,
};

// 角色人设
export const personaAPI = {
  list: () => api.get('/personas'),
  create: (data: {
    name: string;
    description?: string;
    systemPrompt: string;
  }) => api.post('/personas', data),
  delete: (id: string) => api.delete(`/personas/${id}`),
};

// 知识库
export const knowledgeAPI = {
  list: () => api.get('/knowledge'),
  add: (data: {title: string; content: string; docType?: string}) =>
    api.post('/knowledge', data),
  uploadFile: (formData: FormData) =>
    api.post('/knowledge/upload', formData, {
      headers: {'Content-Type': undefined} as any,
    }),
  delete: (id: string) => api.delete(`/knowledge/${id}`),
};

// AI 创作
export const createAPI = {
  // 获取模板列表（支持分类过滤 + 分页）
  getTemplates: (params?: {category?: string; page?: number; pageSize?: number}) =>
    api.get<any, TemplatePaginatedResponse>('/create/templates', {params}),

  // 获取模板详情
  getTemplate: (id: string) => api.get(`/create/templates/${id}`),

  // 获取风格分类（含模板）
  getStyleCategories: () =>
    api.get<any, StyleCategory[]>('/create/style-categories'),

  // 获取风格模板列表
  getStyleTemplates: (categoryId?: string) =>
    api.get<any, AiStyleTemplate[]>('/create/style-templates', {
      params: categoryId ? {categoryId} : undefined,
    }),

  // AI 生图
  aiGen: (data: {
    templateId?: string;
    userDescription: string;
    aspectRatio?: string;
    negativePrompt?: string;
    referenceImageUrl?: string;
  }) => api.post<any, ImageJob>('/create/ai-gen', data),

  // 智能 P 图
  aiEdit: (data: {editInstruction: string; referenceImageUrl: string}) =>
    api.post<any, ImageJob>('/create/ai-edit', data),

  // 王者 COS
  cos: (data: {characterName: string; referenceImageUrl: string}) =>
    api.post<any, ImageJob>('/create/cos', data),

  // 查询任务状态
  getJobStatus: (jobId: string) =>
    api.get<any, ImageJob>(`/create/jobs/${jobId}`),

  // 获取用户任务历史
  getUserJobs: (params?: {page?: number; pageSize?: number}) =>
    api.get('/create/jobs', {params}),

  // 上传参考图片（不手动设置 Content-Type，让浏览器自动带上 boundary）
  uploadImage: (formData: FormData) =>
    api.post('/create/upload', formData, {
      headers: {'Content-Type': undefined} as any,
    }),
};

// AI录音笔
export const recordingAPI = {
  processUrl: () => `${API_BASE_URL}/recording/process`,
  ttsUrl: () => `${API_BASE_URL}/recording/tts`,
};

// AI 视频生成
export const videoAPI = {
  generate: (data: {
    prompt: string;
    inputImageUrl?: string;
    resolution?: string;
    negativePrompt?: string;
  }) => api.post('/video/generate', data),

  getJobStatus: (jobId: string) =>
    api.get(`/video/jobs/${jobId}`),

  getUserJobs: (params?: {page?: number; pageSize?: number}) =>
    api.get('/video/jobs', {params}),
};

// 翻译
export const translateAPI = {
  streamUrl: () => `${API_BASE_URL}/translate/stream`,
  photoUrl: () => `${API_BASE_URL}/translate/photo`,
  ttsUrl: () => `${API_BASE_URL}/translate/tts`,
};
