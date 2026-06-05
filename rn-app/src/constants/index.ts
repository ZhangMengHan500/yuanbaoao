// API 基础地址：Web 环境下自动使用当前域名，Native 环境使用 localhost
export const API_BASE_URL =
  typeof window !== 'undefined' && window.location?.hostname
    ? `${window.location.protocol}//${window.location.host}`
    : 'http://localhost:3000';

// 将相对路径图片 URL 转为完整 URL（移动端需要完整地址）
export const resolveImageUrl = (url: string | null | undefined): string => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/')) return `${API_BASE_URL}${url}`;
  return url;
};

// MMKV 存储键名
export const STORAGE_KEYS = {
  TOKEN: 'auth_token',
  USER: 'user_info',
  CHAT_HISTORY: 'chat_history_',
  SESSION_LIST: 'session_list',
  CURRENT_SESSION: 'current_session',
  PERSONA_LIST: 'persona_list',
  THEME_COLOR: 'theme_color',
  VOICE_NAME: 'voice_name',
  AUTO_READ: 'auto_read',
  RECORDING_LIST: 'recording_list',
};

// 默认角色人设
export const DEFAULT_PERSONA = {
  id: 'default',
  name: '元宝AI助手',
  description: '通用AI助手，可以回答各种问题',
  systemPrompt:
    '你是元宝AI助手，一个友好、专业、乐于助人的AI。请用简洁清晰的方式回答问题。',
  avatar: '🤖',
  isDefault: true,
};

// ═══════════════════════════════════════════════════════════
// 设计 Token — 所有颜色/间距/圆角/字号统一引用此文件
// 禁止在 StyleSheet.create 中使用硬编码颜色值
// ═══════════════════════════════════════════════════════════

export const COLORS = {
  dark: {
    bg: '#0d1117',
    surface: '#161b22',
    surfaceAlt: '#1c2333',
    border: 'rgba(255,255,255,0.06)',
    borderSubtle: 'rgba(255,255,255,0.04)',
  },
  light: {
    bg: '#F5F5F5',
    surface: '#FFFFFF',
    surfaceAlt: '#FAFAFA',
    border: '#F0F0F0',
    borderSubtle: '#E5E5E5',
  },
  accent: {
    primary: '#7c6aef',
    primaryLight: 'rgba(124,106,239,0.15)',
    primaryHover: 'rgba(124,106,239,0.08)',
    primaryMuted: 'rgba(124,106,239,0.1)',
  },
  text: {
    darkPrimary: '#f0f6fc',
    darkSecondary: '#e6edf3',
    darkMuted: '#8b949e',
    darkFaint: '#484f58',
    lightPrimary: '#1A1A1A',
    lightSecondary: '#333333',
    lightMuted: '#666666',
    lightFaint: '#999999',
    white: '#FFFFFF',
  },
  semantic: {
    success: '#22C55E',
    error: '#EF4444',
    warning: '#F59E0B',
    info: '#3B82F6',
  },
  overlay: {
    light: 'rgba(0,0,0,0.45)',
    medium: 'rgba(0,0,0,0.65)',
  },
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
};

export const TYPOGRAPHY = {
  sizes: {
    xs: 10,
    sm: 12,
    base: 13,
    md: 14,
    lg: 15,
    xl: 16,
    xxl: 17,
    title: 20,
    hero: 24,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    heavy: '800' as const,
  },
  lineHeights: {
    tight: 18,
    normal: 22,
    relaxed: 24,
    loose: 28,
  },
};
