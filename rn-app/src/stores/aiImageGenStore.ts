import {create} from 'zustand';
import {createAPI} from '../services/api';

type Status = 'idle' | 'uploading' | 'generating' | 'done' | 'error';

interface Progress {
  step: number;
  totalSteps: number;
  percent: number;
  status: string;
}

interface AiImageGenState {
  prompt: string;
  referenceImage: string | null;
  aspectRatio: string;
  progress: Progress;
  resultUrl: string | null;
  status: Status;
  errorMsg: string;
  jobId: string | null;

  setPrompt: (prompt: string) => void;
  setReferenceImage: (uri: string | null) => void;
  setAspectRatio: (ratio: string) => void;
  generate: () => Promise<void>;
  reset: () => void;
}

const INITIAL_PROGRESS: Progress = {step: 0, totalSteps: 30, percent: 0, status: 'idle'};
const TOTAL_STEPS = 30;
const TARGET_PERCENT = 95;
const SPEED = 19; // 每秒 19%，5 秒到 95%

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

function finishIfReady(set: (p: Partial<AiImageGenState>) => void) {
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

function startTimer(set: (p: Partial<AiImageGenState>) => void) {
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

export const useAiImageGenStore = create<AiImageGenState>((set, get) => ({
  prompt: '',
  referenceImage: null,
  aspectRatio: '1:1',
  progress: INITIAL_PROGRESS,
  resultUrl: null,
  status: 'idle',
  errorMsg: '',
  jobId: null,

  setPrompt: (prompt) => set({prompt}),
  setReferenceImage: (uri) => {
    stopTimer();
    set({referenceImage: uri});
  },
  setAspectRatio: (ratio) => set({aspectRatio: ratio}),

  generate: async () => {
    const {prompt, referenceImage, aspectRatio} = get();
    if (!prompt.trim()) return;

    stopTimer();
    set({status: 'uploading', errorMsg: '', resultUrl: null, progress: INITIAL_PROGRESS});

    try {
      let referenceImageUrl: string | undefined;

      // 如果有参考图，先上传
      if (referenceImage) {
        const isHttpUrl = referenceImage.startsWith('http://') || referenceImage.startsWith('https://');
        const isBlobUrl = referenceImage.startsWith('blob:');
        const isDataUri = referenceImage.startsWith('data:');

        if (isHttpUrl) {
          // HTTP URL 直接用
          referenceImageUrl = referenceImage;
        } else if (isBlobUrl || isDataUri) {
          // Blob URL 或 Data URI：转为 File 再上传
          const res = await fetch(referenceImage);
          const blob = await res.blob();
          const ext = blob.type.split('/')[1] || 'png';
          const file = new File([blob], `reference.${ext}`, {type: blob.type});
          const formData = new FormData();
          formData.append('file', file);
          const uploadRes = await createAPI.uploadImage(formData);
          referenceImageUrl = uploadRes.data?.url || uploadRes.url;
        } else {
          // 本地文件路径（React Native）
          const uriParts = referenceImage.split('.');
          const fileType = uriParts[uriParts.length - 1] || 'png';
          const formData = new FormData();
          formData.append('file', {
            uri: referenceImage,
            name: `reference.${fileType}`,
            type: `image/${fileType}`,
          } as any);
          const uploadRes = await createAPI.uploadImage(formData);
          referenceImageUrl = uploadRes.data?.url || uploadRes.url;
        }
      }

      // 调用 AI 生图接口
      const result = await createAPI.aiGen({
        userDescription: prompt,
        aspectRatio,
        referenceImageUrl,
      });

      const jobId = result.data?.id || result.id;
      set({jobId, status: 'generating'});

      // 启动平滑进度条
      startTimer(set);

      // 轮询任务结果
      pollResult(jobId, set, get);
    } catch (error: any) {
      stopTimer();
      set({status: 'error', errorMsg: error.message || '请求失败'});
    }
  },

  reset: () => {
    stopTimer();
    set({
      prompt: '',
      referenceImage: null,
      aspectRatio: '1:1',
      progress: INITIAL_PROGRESS,
      resultUrl: null,
      status: 'idle',
      errorMsg: '',
      jobId: null,
    });
  },
}));

async function pollResult(
  jobId: string,
  set: (p: Partial<AiImageGenState>) => void,
  get: () => AiImageGenState,
) {
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
