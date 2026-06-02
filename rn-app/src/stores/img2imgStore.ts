import {create} from 'zustand';
import {API_BASE_URL} from '../constants';
import {mmkvStorage} from '../services/mmkv';

type Status = 'idle' | 'uploading' | 'generating' | 'done' | 'error';

interface Progress {
  step: number;
  totalSteps: number;
  percent: number;
  status: string;
}

interface Img2ImgState {
  referenceImage: string | null;
  prompt: string;
  styleName: string;
  progress: Progress;
  resultUrl: string | null;
  status: Status;
  errorMsg: string;
  jobId: string | null;

  setReferenceImage: (uri: string | null) => void;
  setPrompt: (prompt: string) => void;
  setStyleName: (name: string) => void;
  startGenerate: () => Promise<void>;
  pollJobResult: (jobId: string) => Promise<void>;
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

function finishIfReady(set: (p: Partial<Img2ImgState>) => void) {
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

function startTimer(set: (p: Partial<Img2ImgState>) => void) {
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

export const useImg2ImgStore = create<Img2ImgState>((set, get) => ({
  referenceImage: null,
  prompt: '',
  styleName: '',
  progress: INITIAL_PROGRESS,
  resultUrl: null,
  status: 'idle',
  errorMsg: '',
  jobId: null,

  setReferenceImage: (uri) => {
    stopTimer();
    set({referenceImage: uri});
  },
  setPrompt: (prompt) => set({prompt}),
  setStyleName: (name) => set({styleName: name}),

  startGenerate: async () => {
    const {referenceImage, prompt} = get();
    if (!referenceImage || !prompt.trim()) return;

    stopTimer();
    set({status: 'uploading', errorMsg: '', resultUrl: null, progress: INITIAL_PROGRESS});

    try {
      const token = mmkvStorage.getToken();
      const isUrl = referenceImage.startsWith('http://') || referenceImage.startsWith('https://');
      const isDataUri = referenceImage.startsWith('data:');

      const formData = new FormData();

      if (isUrl || isDataUri) {
        formData.append('imageUrl', referenceImage);
      } else {
        const uriParts = referenceImage.split('.');
        const fileType = uriParts[uriParts.length - 1] || 'png';
        formData.append('image', {
          uri: referenceImage,
          name: `reference.${fileType}`,
          type: `image/${fileType}`,
        } as any);
      }

      formData.append('prompt', prompt);

      console.log('[Img2Img Store] startGenerate:', {isUrl, referenceImage: referenceImage?.substring(0, 80), prompt: prompt?.substring(0, 40)});

      const response = await fetch(`${API_BASE_URL}/create/img2img`, {
        method: 'POST',
        body: formData,
        headers: {Authorization: `Bearer ${token}`},
      });

      if (!response.ok) {
        const err = await response.text();
        console.error('[Img2Img Store] API error:', response.status, err);
        throw new Error(`提交失败: ${err}`);
      }

      const result = await response.json();
      const jobId = result.data?.jobId || result.jobId;
      set({jobId, status: 'generating'});

      // 启动平滑进度条
      startTimer(set);

      // SSE 只负责收结果 URL，不影响进度
      const progressUrl = `${API_BASE_URL}/create/img2img/progress/${jobId}`;
      const controller = new AbortController();
      fetch(progressUrl, {
        headers: {Authorization: `Bearer ${token}`},
        signal: controller.signal,
      })
        .then(res => {
          const reader = res.body?.getReader();
          if (!reader) return;
          const decoder = new TextDecoder();
          let buffer = '';

          const read = () => {
            reader.read().then(({done, value}) => {
              if (done) return;
              buffer += decoder.decode(value, {stream: true});
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              for (const line of lines) {
                if (line.startsWith('data:')) {
                  try {
                    const data = JSON.parse(line.slice(5));

                    if (data.status === 'completed') {
                      _apiDone = true;
                      _pendingResultUrl = data.resultUrl || null;
                      controller.abort();
                      finishIfReady(set);
                      if (!data.resultUrl) {
                        get().pollJobResult(jobId);
                      }
                      return;
                    }
                    if (data.status === 'failed') {
                      stopTimer();
                      set({status: 'error', errorMsg: data.error || '生成失败'});
                      controller.abort();
                      return;
                    }
                  } catch {}
                }
              }
              read();
            });
          };
          read();
        })
        .catch(() => {});
    } catch (error: any) {
      stopTimer();
      set({status: 'error', errorMsg: error.message || '请求失败'});
    }
  },

  pollJobResult: async (jobId: string) => {
    const token = mmkvStorage.getToken();
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 2000));
      try {
        const res = await fetch(`${API_BASE_URL}/create/img2img/job/${jobId}`, {
          headers: {Authorization: `Bearer ${token}`},
        });
        const data = await res.json();
        const job = data.data || data;
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
  },

  reset: () => {
    stopTimer();
    set({
      referenceImage: null,
      prompt: '',
      styleName: '',
      progress: INITIAL_PROGRESS,
      resultUrl: null,
      status: 'idle',
      errorMsg: '',
      jobId: null,
    });
  },
}));
