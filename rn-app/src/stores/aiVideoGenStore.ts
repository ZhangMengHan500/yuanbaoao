import {create} from 'zustand';
import {videoAPI} from '../services/api';

type Status = 'idle' | 'uploading' | 'generating' | 'done' | 'error';
type Mode = 'txt2vid' | 'img2vid';

interface Progress {
  percent: number;
  status: string;
  elapsed: number; // 已用秒数
  estimated: number; // 预估总秒数
}

interface AiVideoGenState {
  prompt: string;
  inputImage: string | null;
  resolution: string;
  mode: Mode;
  progress: Progress;
  resultVideoUrl: string | null;
  status: Status;
  errorMsg: string;
  jobId: string | null;

  setPrompt: (prompt: string) => void;
  setInputImage: (uri: string | null) => void;
  setResolution: (resolution: string) => void;
  setMode: (mode: Mode) => void;
  generate: () => Promise<void>;
  reset: () => void;
}

const INITIAL_PROGRESS: Progress = {percent: 0, status: 'idle', elapsed: 0, estimated: 180};

let _progressTimer: ReturnType<typeof setInterval> | null = null;
let _startTime = 0;
const ESTIMATED_TOTAL = 180; // 预估 3 分钟

function stopProgressTimer() {
  if (_progressTimer) {
    clearInterval(_progressTimer);
    _progressTimer = null;
  }
}

function startProgressTimer(set: (p: Partial<AiVideoGenState>) => void) {
  stopProgressTimer();
  _startTime = Date.now();

  _progressTimer = setInterval(() => {
    const elapsed = Math.floor((Date.now() - _startTime) / 1000);
    // 前 30 秒快速增长到 30%，之后缓慢增长，最高 90%
    let percent: number;
    if (elapsed < 30) {
      percent = Math.min(30, (elapsed / 30) * 30);
    } else if (elapsed < 120) {
      percent = 30 + ((elapsed - 30) / 90) * 50; // 30% → 80%
    } else {
      percent = Math.min(90, 80 + ((elapsed - 120) / 180) * 10); // 80% → 90%
    }
    set({
      progress: {
        percent: Math.round(percent * 10) / 10,
        status: 'generating',
        elapsed,
        estimated: ESTIMATED_TOTAL,
      },
    });
  }, 1000);
}

export const useAiVideoGenStore = create<AiVideoGenState>((set, get) => ({
  prompt: '',
  inputImage: null,
  resolution: '1280x720',
  mode: 'txt2vid',
  progress: INITIAL_PROGRESS,
  resultVideoUrl: null,
  status: 'idle',
  errorMsg: '',
  jobId: null,

  setPrompt: (prompt) => set({prompt}),
  setInputImage: (uri) => {
    stopProgressTimer();
    set({inputImage: uri, mode: uri ? 'img2vid' : 'txt2vid'});
  },
  setResolution: (resolution) => set({resolution}),
  setMode: (mode) => set({mode}),

  generate: async () => {
    const {prompt, inputImage, resolution, mode} = get();
    if (!prompt.trim()) return;

    stopProgressTimer();
    set({status: 'uploading', errorMsg: '', resultVideoUrl: null, progress: INITIAL_PROGRESS});

    try {
      let inputImageUrl: string | undefined;

      if (inputImage && mode === 'img2vid') {
        const isHttpUrl = inputImage.startsWith('http://') || inputImage.startsWith('https://');
        const isBlobUrl = inputImage.startsWith('blob:');
        const isDataUri = inputImage.startsWith('data:');

        if (isHttpUrl) {
          inputImageUrl = inputImage;
        } else if (isBlobUrl || isDataUri) {
          const res = await fetch(inputImage);
          const blob = await res.blob();
          const ext = blob.type.split('/')[1] || 'png';
          const file = new File([blob], `reference.${ext}`, {type: blob.type});
          const formData = new FormData();
          formData.append('file', file);
          const {createAPI} = await import('../services/api');
          const uploadRes = await createAPI.uploadImage(formData);
          inputImageUrl = uploadRes.data?.url || uploadRes.url;
        } else {
          const uriParts = inputImage.split('.');
          const fileType = uriParts[uriParts.length - 1] || 'png';
          const formData = new FormData();
          formData.append('file', {
            uri: inputImage,
            name: `reference.${fileType}`,
            type: `image/${fileType}`,
          } as any);
          const {createAPI} = await import('../services/api');
          const uploadRes = await createAPI.uploadImage(formData);
          inputImageUrl = uploadRes.data?.url || uploadRes.url;
        }
      }

      const result = await videoAPI.generate({
        prompt,
        inputImageUrl,
        resolution,
      });

      const jobId = result.data?.id || result.id;
      set({jobId, status: 'generating'});

      // 启动真实进度条
      startProgressTimer(set);

      // 轮询任务结果
      pollResult(jobId, set);
    } catch (error: any) {
      stopProgressTimer();
      set({status: 'error', errorMsg: error.message || '请求失败'});
    }
  },

  reset: () => {
    stopProgressTimer();
    set({
      prompt: '',
      inputImage: null,
      resolution: '1280x720',
      mode: 'txt2vid',
      progress: INITIAL_PROGRESS,
      resultVideoUrl: null,
      status: 'idle',
      errorMsg: '',
      jobId: null,
    });
  },
}));

async function pollResult(
  jobId: string,
  set: (p: Partial<AiVideoGenState>) => void,
) {
  for (let i = 0; i < 200; i++) {
    await new Promise(r => setTimeout(r, 3000));
    try {
      const res = await videoAPI.getJobStatus(jobId);
      const job = res.data || res;

      if (job.status === 'completed') {
        stopProgressTimer();
        set({
          progress: {percent: 100, status: 'completed', elapsed: Math.floor((Date.now() - _startTime) / 1000), estimated: ESTIMATED_TOTAL},
          status: 'done',
          resultVideoUrl: job.resultVideoUrl,
        });
        return;
      }
      if (job.status === 'failed') {
        stopProgressTimer();
        set({status: 'error', errorMsg: job.errorMsg || '生成失败'});
        return;
      }
    } catch {}
  }
  stopProgressTimer();
  set({status: 'error', errorMsg: '生成超时，请重试'});
}
