// Web stub for react-native-tts — uses browser SpeechSynthesis API
const Tts = {
  speak: (text: string) => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(utterance);
    }
  },
  stop: () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  },
  setDefaultLanguage: async (_lang: string) => {},
  setDefaultRate: async (_rate: number) => {},
  setDefaultPitch: async (_pitch: number) => {},
  addEventListener: () => ({remove: () => {}}),
  removeEventListener: () => {},
  getInitStatus: () => Promise.resolve(true),
};

export default Tts;
