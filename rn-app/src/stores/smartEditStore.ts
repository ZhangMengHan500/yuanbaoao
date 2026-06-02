import {create} from 'zustand';
import {API_BASE_URL} from '../constants';
import {mmkvStorage} from '../services/mmkv';

type Status = 'idle' | 'uploading' | 'processing' | 'done' | 'error';

interface Progress {
  step: number;
  totalSteps: number;
  percent: number;
  status: string;
}

interface SmartEditState {
  image: string | null;
  prompt: string;
  selectedTool: string | null;
  progress: Progress;
  resultUrl: string | null;
  status: Status;
  errorMsg: string;
  jobId: string | null;

  setImage: (uri: string | null) => void;
  setPrompt: (prompt: string | ((prev: string) => string)) => void;
  setSelectedTool: (tool: string | null) => void;
  startProcess: (tool: string, ratio?: string) => Promise<void>;
  submitWithPrompt: (tool?: string) => Promise<void>;
  pollJobResult: (jobId: string) => Promise<void>;
  reset: () => void;
}

const INITIAL_PROGRESS: Progress = {step: 0, totalSteps: 5, percent: 0, status: 'idle'};
const TOTAL_STEPS = 5;
const TARGET_PERCENT = 95;
const SPEED = 19; // 每秒增长 19%，5 秒到 95%

let _timer: ReturnType<typeof setInterval> | null = null;
let _currentPercent = 0;
let _apiDone = false;
let _pendingResultUrl: string | null = null;
let _pendingJobId: string | null = null;

function stopTimer() {
  if (_timer) {
    clearInterval(_timer);
    _timer = null;
  }
}

function finishIfReady(get: () => SmartEditState, set: (p: Partial<SmartEditState>) => void) {
  if (_apiDone && _currentPercent >= TARGET_PERCENT) {
    console.log(`[Timer] FINISH: percent=${_currentPercent}, apiDone=${_apiDone}`);
    stopTimer();
    set({
      progress: {step: TOTAL_STEPS, totalSteps: TOTAL_STEPS, percent: 100, status: 'completed'},
      status: 'done',
      resultUrl: _pendingResultUrl,
    });
    _pendingResultUrl = null;
    _pendingJobId = null;
  }
}

function startTimer(get: () => SmartEditState, set: (p: Partial<SmartEditState>) => void) {
  stopTimer();
  _currentPercent = 0;
  _apiDone = false;
  _pendingResultUrl = null;
  _pendingJobId = null;

  console.log('[Timer] startTimer called');
  _timer = setInterval(() => {
    _currentPercent = Math.min(_currentPercent + SPEED * 0.1, TARGET_PERCENT);
    const percent = Math.round(_currentPercent * 10) / 10;
    const step = Math.min(Math.round((percent / 100) * TOTAL_STEPS), TOTAL_STEPS);
    console.log(`[Timer] tick: percent=${percent}, apiDone=${_apiDone}`);
    set({progress: {step, totalSteps: TOTAL_STEPS, percent, status: 'processing'}});

    finishIfReady(get, set);
  }, 100);
}

export const useSmartEditStore = create<SmartEditState>((set, get) => ({
  image: null,
  prompt: '',
  selectedTool: null,
  progress: INITIAL_PROGRESS,
  resultUrl: null,
  status: 'idle',
  errorMsg: '',
  jobId: null,

  setImage: (uri) => {
    stopTimer();
    set({image: uri, resultUrl: null, status: 'idle', progress: INITIAL_PROGRESS});
  },
  setPrompt: (promptOrFn) => {
    if (typeof promptOrFn === 'function') {
      set(state => ({prompt: promptOrFn(state.prompt)}));
    } else {
      set({prompt: promptOrFn});
    }
  },
  setSelectedTool: (tool) => set({selectedTool: tool}),

  startProcess: async (tool: string, ratio?: string) => {
    const {image} = get();
    if (!image) return;

    set({status: 'uploading', errorMsg: '', resultUrl: null, progress: INITIAL_PROGRESS, selectedTool: tool});

    try {
      const token = mmkvStorage.getToken();
      const isUrl = image.startsWith('http://') || image.startsWith('https://');
      const isDataUri = image.startsWith('data:');

      const formData = new FormData();

      if (isUrl || isDataUri) {
        formData.append('imageUrl', image);
      } else {
        const uriParts = image.split('.');
        const fileType = uriParts[uriParts.length - 1] || 'png';
        formData.append('image', {
          uri: image,
          name: `reference.${fileType}`,
          type: `image/${fileType}`,
        } as any);
      }

      formData.append('tool', tool);
      if (ratio) {
        formData.append('ratio', ratio);
      }

      console.log('[SmartEdit Store] startProcess:', {tool, image: image?.substring(0, 80)});

      const response = await fetch(`${API_BASE_URL}/create/smart-edit`, {
        method: 'POST',
        body: formData,
        headers: {Authorization: `Bearer ${token}`},
      });

      if (!response.ok) {
        const err = await response.text();
        console.error('[SmartEdit Store] API error:', response.status, err);
        throw new Error(`提交失败: ${err}`);
      }

      const result = await response.json();
      const jobId = result.data?.jobId || result.jobId;
      set({jobId, status: 'processing'});

      // 启动进度条（无固定时长，一直跑到 95%）
      startTimer(get, set);

      // SSE 只负责收结果 URL，不影响进度
      const progressUrl = `${API_BASE_URL}/create/smart-edit/progress/${jobId}`;
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
                      console.log(`[SSE] completed, percent=${_currentPercent}`);
                      _apiDone = true;
                      _pendingResultUrl = data.resultUrl || null;
                      _pendingJobId = jobId;
                      controller.abort();
                      finishIfReady(get, set);
                      if (!data.resultUrl) {
                        get().pollJobResult(jobId);
                      }
                      return;
                    }
                    if (data.status === 'failed') {
                      stopTimer();
                      set({status: 'error', errorMsg: data.error || '处理失败'});
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

  submitWithPrompt: async (tool?: string) => {
    const {image, prompt} = get();
    if (!image || !prompt.trim()) return;

    set({status: 'uploading', errorMsg: '', resultUrl: null, progress: INITIAL_PROGRESS});

    try {
      const token = mmkvStorage.getToken();
      const isUrl = image.startsWith('http://') || image.startsWith('https://');
      const isDataUri = image.startsWith('data:');

      const formData = new FormData();

      if (isUrl || isDataUri) {
        formData.append('imageUrl', image);
      } else {
        const uriParts = image.split('.');
        const fileType = uriParts[uriParts.length - 1] || 'png';
        formData.append('image', {
          uri: image,
          name: `reference.${fileType}`,
          type: `image/${fileType}`,
        } as any);
      }

      formData.append('tool', tool || 'custom');
      formData.append('prompt', prompt);

      console.log('[SmartEdit Store] submitWithPrompt:', {prompt: prompt?.substring(0, 40)});

      const response = await fetch(`${API_BASE_URL}/create/smart-edit`, {
        method: 'POST',
        body: formData,
        headers: {Authorization: `Bearer ${token}`},
      });

      if (!response.ok) {
        const err = await response.text();
        console.error('[SmartEdit Store] API error:', response.status, err);
        throw new Error(`提交失败: ${err}`);
      }

      const result = await response.json();
      const jobId = result.data?.jobId || result.jobId;
      set({jobId, status: 'processing'});

      startTimer(get, set);

      const progressUrl = `${API_BASE_URL}/create/smart-edit/progress/${jobId}`;
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
                      console.log(`[SSE] completed, percent=${_currentPercent}`);
                      _apiDone = true;
                      _pendingResultUrl = data.resultUrl || null;
                      _pendingJobId = jobId;
                      controller.abort();
                      finishIfReady(get, set);
                      if (!data.resultUrl) {
                        get().pollJobResult(jobId);
                      }
                      return;
                    }
                    if (data.status === 'failed') {
                      stopTimer();
                      set({status: 'error', errorMsg: data.error || '处理失败'});
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
        const res = await fetch(`${API_BASE_URL}/create/smart-edit/job/${jobId}`, {
          headers: {Authorization: `Bearer ${token}`},
        });
        const data = await res.json();
        const job = data.data || data;
        if (job.status === 'completed' && job.resultImageUrl) {
          _apiDone = true;
          _pendingResultUrl = job.resultImageUrl;
          _pendingJobId = jobId;
          finishIfReady(get, set);
          return;
        }
        if (job.status === 'failed') {
          stopTimer();
          set({status: 'error', errorMsg: job.errorMsg || '处理失败'});
          return;
        }
      } catch {}
    }
  },

  reset: () => {
    stopTimer();
    set({
      image: null,
      prompt: '',
      selectedTool: null,
      progress: INITIAL_PROGRESS,
      resultUrl: null,
      status: 'idle',
      errorMsg: '',
      jobId: null,
    });
  },
}));
