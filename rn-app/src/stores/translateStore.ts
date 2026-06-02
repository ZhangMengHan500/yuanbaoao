import {create} from 'zustand';
import {startTranslateStream, startPhotoTranslateStream} from '../services/sse';

export const LANGUAGES = [
  {code: 'auto', label: '自动检测', flag: '🔍'},
  {code: 'zh', label: '中文', flag: '🇨🇳'},
  {code: 'en', label: 'English', flag: '🇺🇸'},
  {code: 'ja', label: '日本語', flag: '🇯🇵'},
  {code: 'ko', label: '한국어', flag: '🇰🇷'},
  {code: 'fr', label: 'Français', flag: '🇫🇷'},
  {code: 'de', label: 'Deutsch', flag: '🇩🇪'},
  {code: 'es', label: 'Español', flag: '🇪🇸'},
  {code: 'ru', label: 'Русский', flag: '🇷🇺'},
  {code: 'pt', label: 'Português', flag: '🇧🇷'},
] as const;

export type TabType = 'text' | 'photo' | 'simultaneous';

interface TranslateState {
  // Tab
  activeTab: TabType;

  // 文字翻译
  sourceText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  isTranslating: boolean;

  // 拍照翻译
  photoImageUri: string | null;
  photoOcrText: string;
  photoTranslatedText: string;
  isPhotoTranslating: boolean;

  // 同传翻译
  isSimulRecording: boolean;
  simulSourceText: string;
  simulTranslatedText: string;
  simulSourceLang: string;
  simulTargetLang: string;
  enableTts: boolean;
  simulTranslationPairs: Array<{source: string; translated: string}>;

  // Actions
  setActiveTab: (tab: TabType) => void;
  setSourceText: (text: string) => void;
  setSourceLang: (lang: string) => void;
  setTargetLang: (lang: string) => void;
  swapLanguages: () => void;
  startTextTranslation: () => void;
  stopTranslation: () => void;
  setPhotoImageUri: (uri: string | null) => void;
  startPhotoTranslation: () => void;
  setSimulSourceLang: (lang: string) => void;
  setSimulTargetLang: (lang: string) => void;
  swapSimulLanguages: () => void;
  setEnableTts: (enabled: boolean) => void;
  setSimulRecording: (recording: boolean) => void;
  addSimulTranslationPair: (source: string, translated: string) => void;
  reset: () => void;
}

const initialState = {
  activeTab: 'text' as TabType,
  sourceText: '',
  translatedText: '',
  sourceLang: 'en',
  targetLang: 'zh',
  isTranslating: false,
  photoImageUri: null,
  photoOcrText: '',
  photoTranslatedText: '',
  isPhotoTranslating: false,
  isSimulRecording: false,
  simulSourceText: '',
  simulTranslatedText: '',
  simulSourceLang: 'auto',
  simulTargetLang: 'zh',
  enableTts: false,
  simulTranslationPairs: [] as Array<{source: string; translated: string}>,
};

let cancelTranslateRef: (() => void) | null = null;
let cancelPhotoTranslateRef: (() => void) | null = null;

export const useTranslateStore = create<TranslateState>((set, get) => ({
  ...initialState,

  setActiveTab: tab => set({activeTab: tab}),

  setSourceText: text => set({sourceText: text}),

  setSourceLang: lang => set({sourceLang: lang}),

  setTargetLang: lang => set({targetLang: lang}),

  swapLanguages: () => {
    const {sourceLang, targetLang} = get();
    if (sourceLang === 'auto') return;
    set({sourceLang: targetLang, targetLang: sourceLang});
  },

  startTextTranslation: () => {
    const {sourceText, sourceLang, targetLang} = get();
    if (!sourceText.trim()) return;

    // 取消上一次翻译
    cancelTranslateRef?.();
    set({isTranslating: true, translatedText: ''});

    let fullText = '';

    cancelTranslateRef = startTranslateStream(
      {text: sourceText, sourceLang, targetLang},
      token => {
        fullText += token;
        set({translatedText: fullText});
      },
      finalText => {
        set({translatedText: finalText, isTranslating: false});
        cancelTranslateRef = null;
      },
      err => {
        console.error('翻译失败:', err);
        set({isTranslating: false});
        cancelTranslateRef = null;
      },
    );
  },

  stopTranslation: () => {
    cancelTranslateRef?.();
    cancelTranslateRef = null;
    set({isTranslating: false});
  },

  setPhotoImageUri: uri => set({photoImageUri: uri}),

  startPhotoTranslation: () => {
    const {photoImageUri, sourceLang, targetLang} = get();
    if (!photoImageUri) return;

    cancelPhotoTranslateRef?.();
    set({isPhotoTranslating: true, photoOcrText: '', photoTranslatedText: ''});

    // 将图片转为 base64
    fetch(photoImageUri)
      .then(res => res.blob())
      .then(blob => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1];
          let ocrText = '';
          let translatedText = '';

          cancelPhotoTranslateRef = startPhotoTranslateStream(
            {imageBase64: base64, sourceLang, targetLang},
            text => {
              ocrText = text;
              set({photoOcrText: text});
            },
            token => {
              translatedText += token;
              set({photoTranslatedText: translatedText});
            },
            (fullText, fullOcr) => {
              set({
                photoTranslatedText: fullText,
                photoOcrText: fullOcr,
                isPhotoTranslating: false,
              });
              cancelPhotoTranslateRef = null;
            },
            err => {
              console.error('拍照翻译失败:', err);
              set({isPhotoTranslating: false});
              cancelPhotoTranslateRef = null;
            },
          );
        };
        reader.readAsDataURL(blob);
      })
      .catch(err => {
        console.error('图片读取失败:', err);
        set({isPhotoTranslating: false});
      });
  },

  setSimulSourceLang: lang => set({simulSourceLang: lang}),

  setSimulTargetLang: lang => set({simulTargetLang: lang}),

  swapSimulLanguages: () => {
    const {simulSourceLang, simulTargetLang} = get();
    if (simulSourceLang === 'auto') return;
    set({simulSourceLang: simulTargetLang, simulTargetLang: simulSourceLang});
  },

  setEnableTts: enabled => set({enableTts: enabled}),

  setSimulRecording: recording => set({isSimulRecording: recording}),

  addSimulTranslationPair: (source, translated) =>
    set(state => ({
      simulTranslationPairs: [...state.simulTranslationPairs, {source, translated}],
      simulSourceText: source,
      simulTranslatedText: translated,
    })),

  reset: () => {
    cancelTranslateRef?.();
    cancelPhotoTranslateRef?.();
    cancelTranslateRef = null;
    cancelPhotoTranslateRef = null;
    set(initialState);
  },
}));
