// 用户类型
export interface User {
  id: string;
  email: string;
  username: string;
  avatar?: string;
}

// 会话类型
export interface Session {
  id: string;
  userId: string;
  title: string;
  personaId?: string;
  persona?: Persona;  // 关联的角色人设（后端 include 返回）
  createdAt: string;
  updatedAt: string;
}

// 消息类型
export interface Message {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  imageUrl?: string;
  createdAt: string;
  // 录音卡片字段
  mediaType?: 'text' | 'recording';
  audioUri?: string;
  audioDuration?: number;
  transcript?: string;
  summary?: string;
  analysis?: string;
  // 联网搜索字段
  webSearch?: boolean;
}

// 录音数据（RecordingScreen → ChatScreen 传递）
export interface RecordingData {
  audioUri: string | null;
  duration: number;
  transcript: string;
  summary: string;
  analysis: string;
}

// 角色人设类型
export interface Persona {
  id: string;
  name: string;
  description?: string;
  systemPrompt: string;
  avatar?: string;
  isDefault: boolean;
}

// SSE 流式事件
export interface SSEMessageEvent {
  data: string;
  event?: string;
  id?: string;
}

// AI 创作模板
export interface Template {
  id: string;
  name: string;
  category: string;
  description?: string;
  stylePrompt: string;
  previewUrl: string;
  hasOriginal: boolean;
  isActive: boolean;
  sortOrder: number;
}

// 风格分类
export interface StyleCategory {
  id: string;
  name: string;
  sort: number;
  templates: AiStyleTemplate[];
}

// AI 风格模板
export interface AiStyleTemplate {
  id: string;
  name: string;
  coverImg: string;
  prompt: string;
  categoryId: string;
  category?: StyleCategory;
}

// 图片生成任务
export interface ImageJob {
  id: string;
  userId: string;
  templateId?: string;
  jobType: 'ai_gen' | 'ai_edit' | 'cos';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  prompt: string;
  negativePrompt?: string;
  referenceImageUrl?: string;
  resultImageUrl?: string;
  stylePrompt?: string;
  errorMsg?: string;
  createdAt: string;
  updatedAt: string;
}

// 模板分页响应
export interface TemplatePaginatedResponse {
  items: Template[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// 图生图任务
export interface Img2ImgJob {
  id: string;
  userId: string;
  templateId?: string;
  jobType: 'img2img';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  prompt: string;
  negativePrompt?: string;
  referenceImageUrl?: string;
  resultImageUrl?: string;
  stylePrompt?: string;
  errorMsg?: string;
  createdAt: string;
  updatedAt: string;
}

// 图生图进度
export interface Img2ImgProgress {
  step: number;
  totalSteps: number;
  percent: number;
  status: string;
  resultUrl?: string;
  error?: string;
}
