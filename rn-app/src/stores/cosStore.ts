import {create} from 'zustand';
import {createAPI} from '../services/api';
import {API_BASE_URL} from '../constants';
import {Platform} from 'react-native';

type Status = 'idle' | 'uploading' | 'generating' | 'done' | 'error';

interface Progress {
  step: number;
  totalSteps: number;
  percent: number;
  status: string;
}

export interface Hero {
  name: string;
  color: string;
  desc: string;
  imageUrl?: string | null;
}

// 默认英雄列表（API 加载失败时的 fallback）
export const HEROES: Hero[] = [
  {name: '蚩妩', color: '#c026d3', desc: '九尾妖狐'},
  {name: '大乔', color: '#3b82f6', desc: '沧海之曜'},
  {name: '朵莉亚', color: '#06b6d4', desc: '人鱼之歌'},
  {name: '李白', color: '#8b5cf6', desc: '青莲剑仙'},
  {name: '貂蝉', color: '#ec4899', desc: '绝世舞姬'},
  {name: '孙悟空', color: '#f59e0b', desc: '齐天大圣'},
  {name: '韩信', color: '#ef4444', desc: '国士无双'},
  {name: '赵云', color: '#10b981', desc: '龙胆银枪'},
];

// 预览图本地缓存（避免重复请求）
const _previewCache: Record<string, string> = {};

interface CosState {
  heroes: Hero[];
  heroesLoading: boolean;
  selectedHero: Hero;
  heroPreviewUrl: string | null;
  previewLoading: boolean;
  userImage: string | null;
  uploadedUrl: string | null;
  progress: Progress;
  resultUrl: string | null;
  status: Status;
  errorMsg: string;
  jobId: string | null;

  fetchHeroes: () => Promise<void>;
  setHero: (hero: Hero) => void;
  fetchHeroPreview: (heroName: string) => Promise<void>;
  setUserImage: (uri: string | null) => void;
  generate: () => Promise<void>;
  reset: () => void;
}

const INITIAL_PROGRESS: Progress = {step: 0, totalSteps: 30, percent: 0, status: 'idle'};
const TOTAL_STEPS = 30;
const TARGET_PERCENT = 95;
const SPEED = 19;

let _timer: ReturnType<typeof setInterval> | null = null;
let _currentPercent = 0;
let _apiDone = false;
let _pendingResultUrl: string | null = null;

function stopTimer() {
  if (_timer) {
    clearInterval(_timer);
    _timer = null;
  }
}

function finishIfReady(set: (p: Partial<CosState>) => void) {
  if (_apiDone && _currentPercent >= TARGET_PERCENT) {
    stopTimer();
    set({
      progress: {step: TOTAL_STEPS, totalSteps: TOTAL_STEPS, percent: 100, status: 'completed'},
      status: 'done',
      resultUrl: _pendingResultUrl,
    });
    _pendingResultUrl = null;
  }
}

function startTimer(set: (p: Partial<CosState>) => void) {
  stopTimer();
  _currentPercent = 0;
  _apiDone = false;
  _pendingResultUrl = null;

  _timer = setInterval(() => {
    _currentPercent = Math.min(_currentPercent + SPEED * 0.1, TARGET_PERCENT);
    const percent = Math.round(_currentPercent * 10) / 10;
    const step = Math.min(Math.round((percent / 100) * TOTAL_STEPS), TOTAL_STEPS);
    set({progress: {step, totalSteps: TOTAL_STEPS, percent, status: 'generating'}});
    finishIfReady(set);
  }, 100);
}

// Web端图片压缩
async function compressImageWeb(uri: string): Promise<File> {
  const res = await fetch(uri);
  const blob = await res.blob();

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const MAX = 800;
      let w = img.width;
      let h = img.height;
      if (w > MAX || h > MAX) {
        if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
        else { w = Math.round(w * MAX / h); h = MAX; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob((compressed) => {
        resolve(new File([compressed!], 'photo.jpg', {type: 'image/jpeg'}));
      }, 'image/jpeg', 0.7);
    };
    img.src = URL.createObjectURL(blob);
  });
}

export const useCosStore = create<CosState>((set, get) => ({
  heroes: HEROES,
  heroesLoading: false,
  selectedHero: HEROES[0],
  heroPreviewUrl: null,
  previewLoading: false,
  userImage: null,
  uploadedUrl: null,
  progress: INITIAL_PROGRESS,
  resultUrl: null,
  status: 'idle',
  errorMsg: '',
  jobId: null,

  fetchHeroes: async () => {
    set({heroesLoading: true});
    try {
      const res = await fetch(`${API_BASE_URL}/create/cos/heroes`);
      const json = await res.json();
      const data = json.data || json;
      if (Array.isArray(data) && data.length > 0) {
        const heroes: Hero[] = data.map((h: any) => ({
          name: h.name,
          color: h.color,
          desc: h.desc,
          imageUrl: h.imageUrl ? `${API_BASE_URL}${h.imageUrl}` : null,
        }));
        set({heroes, heroesLoading: false});
        // 自动选中第一个并设置预览
        const first = heroes[0];
        set({selectedHero: first, heroPreviewUrl: first.imageUrl || null});
      } else {
        set({heroesLoading: false});
      }
    } catch (err) {
      console.warn('[COS] Failed to fetch heroes:', err);
      set({heroesLoading: false});
    }
  },

  setHero: (hero) => {
    stopTimer();
    const previewUrl = hero.imageUrl || null;
    set({selectedHero: hero, heroPreviewUrl: previewUrl, resultUrl: null, status: 'idle'});
  },

  fetchHeroPreview: async (heroName) => {
    // 命中内存缓存直接用
    if (_previewCache[heroName]) {
      set({heroPreviewUrl: _previewCache[heroName], previewLoading: false});
      return;
    }

    set({previewLoading: true});
    try {
      // 请求后端生成/获取预览图
      const res = await fetch(`${API_BASE_URL}/create/cos/preview/${encodeURIComponent(heroName)}`);
      const data = await res.json();
      const url = data.data?.url || data.url;
      if (url) {
        const fullUrl = `${API_BASE_URL}${url}`;
        _previewCache[heroName] = fullUrl;
        set({heroPreviewUrl: fullUrl, previewLoading: false});
      } else {
        set({previewLoading: false});
      }
    } catch (err) {
      console.warn('[COS] Failed to fetch hero preview:', err);
      set({previewLoading: false});
    }
  },

  setUserImage: (uri) => {
    stopTimer();
    set({userImage: uri, uploadedUrl: null});
  },

  generate: async () => {
    const {selectedHero, userImage, uploadedUrl} = get();

    stopTimer();
    set({status: 'uploading', errorMsg: '', resultUrl: null, progress: INITIAL_PROGRESS});

    try {
      let finalUrl = uploadedUrl;

      // 如果有用户图片且未上传过，先上传
      if (userImage && !finalUrl) {
        const formData = new FormData();

        if (Platform.OS === 'web') {
          const file = await compressImageWeb(userImage);
          formData.append('file', file);
        } else {
          const uriParts = userImage.split('.');
          const fileType = uriParts[uriParts.length - 1] || 'jpg';
          formData.append('file', {
            uri: userImage,
            name: `face.${fileType}`,
            type: `image/${fileType}`,
          } as any);
        }

        const uploadRes = await createAPI.uploadImage(formData);
        finalUrl = uploadRes.data?.url || uploadRes.url;
        set({uploadedUrl: finalUrl});
      }

      // 调用 COS 接口
      const result = await createAPI.cos({
        characterName: selectedHero.name,
        referenceImageUrl: finalUrl || '',
      });

      const jobId = result.data?.id || result.id;
      set({jobId, status: 'generating'});

      startTimer(set);
      pollResult(jobId, set);
    } catch (error: any) {
      stopTimer();
      set({status: 'error', errorMsg: error.message || '请求失败'});
    }
  },

  reset: () => {
    stopTimer();
    set({
      userImage: null,
      uploadedUrl: null,
      progress: INITIAL_PROGRESS,
      resultUrl: null,
      status: 'idle',
      errorMsg: '',
      jobId: null,
    });
  },
}));

async function pollResult(jobId: string, set: (p: Partial<CosState>) => void) {
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 2000));
    try {
      const res = await createAPI.getJobStatus(jobId);
      const job = res.data || res;
      if (job.status === 'completed' && job.resultImageUrl) {
        _apiDone = true;
        _pendingResultUrl = job.resultImageUrl;
        finishIfReady(set);
        return;
      }
      if (job.status === 'failed') {
        stopTimer();
        set({status: 'error', errorMsg: job.errorMsg || '生成失败'});
        return;
      }
    } catch {}
  }
  stopTimer();
  set({status: 'error', errorMsg: '生成超时，请重试'});
}
