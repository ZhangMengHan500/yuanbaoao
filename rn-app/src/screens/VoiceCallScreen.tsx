/**
 * AI语音通话页面 — 深色极简科技风
 * 顶部：自由对话下拉 + 设置图标
 * 中央：呼吸光球 + 对话文本 / 推荐话题
 * 底部：状态提示 + 4个操作按钮
 */

import React, {useState, useRef, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  StatusBar,
  Animated,
  Easing,
  ScrollView,
} from 'react-native';
import {Audio} from 'expo-av';
import {VoiceCallSocket} from '../services/voiceCallSocket';
import {COLORS, SPACING, RADIUS, TYPOGRAPHY, API_BASE_URL} from '../constants';

type CallState = 'connecting' | 'idle' | 'listening' | 'ai-speaking' | 'ended';

interface Message {
  role: 'user' | 'ai';
  text: string;
}

const SUGGESTED_TOPICS = [
  '🎨 晒晒你最近的创作脑洞～',
  '✈️ 一个人旅行时要注意什么',
  '🌊 深海中有哪些未知生物',
  '📱 手机依赖戒断',
  '💡 可以尝试...',
];

const VoiceCallScreen = ({navigation}: any) => {
  const [callState, setCallState] = useState<CallState>('connecting');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [userSpeechText, setUserSpeechText] = useState('');
  const [aiSpeechText, setAiSpeechText] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);

  // 呼吸动画
  const breatheAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // ref 管理可变状态
  const socketRef = useRef<VoiceCallSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const silentGainRef = useRef<GainNode | null>(null);
  const nativeSoundRef = useRef<Audio.Sound | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);
  const speechSynthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const aiDoneTextRef = useRef('');
  const speechQueueRef = useRef<Array<{type: 'audio'; data: string} | {type: 'text'; data: string}>>([]);
  const isSpeakingRef = useRef(false);
  const speechAbortedRef = useRef(false);
  const scrollRef = useRef<ScrollView>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const processSpeechQueueRef = useRef<() => void>(() => {});

  // ── 呼吸光球动画 ──────────────────────────────────────

  useEffect(() => {
    if (callState === 'ended') return;

    // 呼吸循环
    const breathe = Animated.loop(
      Animated.sequence([
        Animated.timing(breatheAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(breatheAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
      ]),
    );

    // 光晕脉冲
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 0.6,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.3,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
      ]),
    );

    breathe.start();
    pulse.start();

    return () => {
      breathe.stop();
      pulse.stop();
    };
  }, [callState, breatheAnim, glowAnim]);

  // AI说话时加强脉冲
  useEffect(() => {
    if (callState === 'ai-speaking') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 800,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: false,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: false,
          }),
        ]),
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [callState, pulseAnim]);

  // ── 自动滚动到最新消息 ──────────────────────────────
  useEffect(() => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({animated: true});
    }, 100);
  }, [messages, aiSpeechText, userSpeechText]);

  // ── 计时器 ──────────────────────────────────────────

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  // ── 停止播放 ────────────────────────────────────────

  const stopPlayback = useCallback(async () => {
    // 清空语音队列
    speechQueueRef.current = [];
    isSpeakingRef.current = false;
    speechAbortedRef.current = true;

    // 停止 Web Audio 播放
    if (currentAudioRef.current) {
      try { currentAudioRef.current.pause(); } catch {}
      currentAudioRef.current = null;
    }

    // 停止 Web Speech API
    if (Platform.OS === 'web' && typeof speechSynthesis !== 'undefined') {
      speechSynthesis.cancel();
    }
    speechSynthRef.current = null;

    // 停止 Native 音频播放
    if (nativeSoundRef.current) {
      try { await nativeSoundRef.current.unloadAsync(); } catch {}
      nativeSoundRef.current = null;
    }
  }, []);

  // ── 语音朗读（后端 TTS + Web Audio API）────────────

  // 调用后端 TTS 获取音频并播放（Web 用 <audio>，Native 用 expo-av）
  const playBackendTTS = useCallback(async (text: string): Promise<boolean> => {
    try {
      console.log('[VoiceCall] Backend TTS fetching:', text.substring(0, 30));

      const response = await fetch(`${API_BASE_URL}/voice-call/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        console.log('[VoiceCall] Backend TTS failed:', response.status);
        return false;
      }

      const result = await response.json();
      // 响应被 TransformInterceptor 包装为 { success, data: { audio } }
      const audioBase64 = result.data?.audio || result.audio;
      if (!audioBase64) {
        console.log('[VoiceCall] Backend TTS returned empty audio', JSON.stringify(result).substring(0, 200));
        return false;
      }

      if (Platform.OS === 'web') {
        // Web: 将 base64 转为 Blob，用 <audio> 元素播放
        const binaryString = atob(audioBase64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'audio/mpeg' });
        const url = URL.createObjectURL(blob);

        await new Promise<void>((resolve, reject) => {
          // eslint-disable-next-line no-undef
          const audio = new window.Audio(url);
          audio.onended = () => {
            console.log('[VoiceCall] Backend TTS audio finished');
            URL.revokeObjectURL(url);
            resolve();
          };
          audio.onerror = () => {
            console.error('[VoiceCall] Backend TTS audio error');
            URL.revokeObjectURL(url);
            reject(new Error('Audio playback failed'));
          };
          audio.play().then(() => {
            console.log('[VoiceCall] Backend TTS audio playing');
          }).catch((err) => {
            console.error('[VoiceCall] Backend TTS play() failed:', err);
            URL.revokeObjectURL(url);
            reject(err);
          });
          // 超时保护
          setTimeout(() => {
            URL.revokeObjectURL(url);
            resolve();
          }, 30000);
        });
      } else {
        // Native: 用 expo-av 播放 base64 音频
        if (nativeSoundRef.current) {
          try { await nativeSoundRef.current.unloadAsync(); } catch {}
          nativeSoundRef.current = null;
        }
        const {sound} = await Audio.Sound.createAsync(
          {uri: `data:audio/mpeg;base64,${audioBase64}`},
          {shouldPlay: true},
        );
        nativeSoundRef.current = sound;
        console.log('[VoiceCall] Backend TTS native audio playing');

        await new Promise<void>((resolve) => {
          sound.setOnPlaybackStatusUpdate((status) => {
            if (status.isLoaded && status.didJustFinish) {
              console.log('[VoiceCall] Backend TTS native audio finished');
              resolve();
            }
          });
          // 超时保护
          setTimeout(resolve, 30000);
        });
      }

      return true;
    } catch (err) {
      console.log('[VoiceCall] Backend TTS error:', err);
      return false;
    }
  }, []);

  // Web Speech API 播放（备用方案）
  const playWebSpeech = useCallback((text: string): Promise<void> => {
    return new Promise((resolve) => {
      if (Platform.OS !== 'web' || typeof speechSynthesis === 'undefined') {
        console.log('[VoiceCall] Web Speech API not available');
        resolve();
        return;
      }

      console.log('[VoiceCall] playWebSpeech:', text.substring(0, 30));
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'zh-CN';
      utterance.rate = 1.0;
      utterance.volume = 1.0;

      // 异步加载 voices
      const setVoice = () => {
        const voices = speechSynthesis.getVoices();
        const zhVoice = voices.find(v => v.lang.startsWith('zh'));
        if (zhVoice) {
          utterance.voice = zhVoice;
          console.log('[VoiceCall] Using voice:', zhVoice.name);
        } else {
          console.log('[VoiceCall] No zh voice found, using default');
        }
      };
      setVoice();
      if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = setVoice;
      }

      utterance.onend = () => {
        console.log('[VoiceCall] Web Speech finished');
        resolve();
      };
      utterance.onerror = (e) => {
        console.error('[VoiceCall] Web Speech error:', e);
        resolve();
      };
      speechSynthesis.speak(utterance);

      // 超时保护：15秒后无论如何继续
      setTimeout(resolve, 15000);
    });
  }, []);

  // ── Web 音频播放 ────────────────────────────────────

  const playAudioWeb = useCallback(async (audioBase64: string) => {
    try {
      console.log('[VoiceCall] playAudioWeb: starting, base64 length:', audioBase64.length);
      // 停止上一段音频
      if (currentAudioRef.current) {
        try { currentAudioRef.current.pause(); } catch {}
        currentAudioRef.current = null;
      }
      const binaryString = atob(audioBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);
      // eslint-disable-next-line no-undef
      const audio = new window.Audio(url);
      currentAudioRef.current = audio;
      await new Promise<void>((resolve) => {
        audio.onended = () => {
          console.log('[VoiceCall] playAudioWeb: audio finished');
          currentAudioRef.current = null;
          URL.revokeObjectURL(url);
          resolve();
        };
        audio.onerror = (e) => {
          console.error('[VoiceCall] playAudioWeb: audio error', e);
          currentAudioRef.current = null;
          URL.revokeObjectURL(url);
          resolve();
        };
        audio.play().then(() => {
          console.log('[VoiceCall] playAudioWeb: audio playing');
        }).catch((err) => {
          console.error('[VoiceCall] playAudioWeb: play() failed', err);
          currentAudioRef.current = null;
          URL.revokeObjectURL(url);
          resolve();
        });
      });
    } catch (err) {
      console.error('[VoiceCall] Web audio playback failed:', err);
    }
  }, []);

  // ── Native 音频播放 ─────────────────────────────────

  const playAudioNative = useCallback(async (audioBase64: string) => {
    try {
      console.log('[VoiceCall] playAudioNative: starting, base64 length:', audioBase64.length);
      if (nativeSoundRef.current) {
        await nativeSoundRef.current.unloadAsync();
        nativeSoundRef.current = null;
      }
      const {sound} = await Audio.Sound.createAsync(
        {uri: `data:audio/mpeg;base64,${audioBase64}`},
        {shouldPlay: true},
      );
      nativeSoundRef.current = sound;
      console.log('[VoiceCall] playAudioNative: audio playing');
    } catch (err) {
      console.error('[VoiceCall] Native audio playback failed:', err);
    }
  }, []);

  const processSpeechQueue = useCallback(async () => {
    if (isSpeakingRef.current) return;
    if (speechAbortedRef.current) {
      speechAbortedRef.current = false;
      return;
    }
    if (speechQueueRef.current.length === 0) {
      // 所有语音播放完毕，通知服务端
      socketRef.current?.emitAiDone();
      return;
    }

    const item = speechQueueRef.current.shift()!;
    isSpeakingRef.current = true;
    console.log('[VoiceCall] Processing speech queue:', item.type, 'length:', item.data.length, 'queue remaining:', speechQueueRef.current.length);

    if (item.type === 'audio') {
      // 预生成的音频，直接播放
      if (Platform.OS === 'web') {
        await playAudioWeb(item.data);
      } else {
        await playAudioNative(item.data);
      }
    } else {
      // 文本，需要 TTS — 后端生成音频，两个平台统一处理
      const success = await playBackendTTS(item.data);
      if (!success && Platform.OS === 'web') {
        // 仅 Web 回退到浏览器内置语音
        console.log('[VoiceCall] Backend TTS failed, trying Web Speech API');
        await playWebSpeech(item.data);
      }
    }

    isSpeakingRef.current = false;
    // 继续处理队列
    processSpeechQueue();
  }, [playBackendTTS, playWebSpeech, playAudioWeb, playAudioNative]);

  // 保持 ref 指向最新的 processSpeechQueue
  useEffect(() => {
    processSpeechQueueRef.current = processSpeechQueue;
  }, [processSpeechQueue]);

  const speakText = useCallback((text: string) => {
    speechQueueRef.current.push({type: 'text', data: text});
    processSpeechQueue();
  }, [processSpeechQueue]);

  // ── Web PCM 流式采集 ────────────────────────────────

  const startWebAudioStream = useCallback(async (): Promise<boolean> => {
    if (Platform.OS !== 'web') return false;
    try {
      console.log('[VoiceCall] Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {sampleRate: 16000, channelCount: 1, echoCancellation: true, noiseSuppression: true},
      });
      mediaStreamRef.current = stream;
      console.log('[VoiceCall] Microphone access granted');

      const audioContext = new AudioContext({sampleRate: 16000});
      await audioContext.resume();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      sourceRef.current = source;
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      let chunkCount = 0;
      processor.onaudioprocess = (event) => {
        const connected = socketRef.current?.isConnected;
        if (!connected) {
          if (chunkCount === 0) {
            console.log('[VoiceCall] onaudioprocess: socket not connected yet, skipping');
          }
          return;
        }
        const inputData = event.inputBuffer.getChannelData(0);
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        const bytes = new Uint8Array(pcm16.buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        socketRef.current?.emitAudioData(btoa(binary));
        chunkCount++;
        if (chunkCount <= 5 || chunkCount % 100 === 0) {
          console.log(`[VoiceCall] Audio chunk #${chunkCount} sent, size: ${bytes.byteLength}`);
        }
      };

      const silentGain = audioContext.createGain();
      silentGain.gain.value = 0;
      silentGainRef.current = silentGain;
      source.connect(processor);
      processor.connect(silentGain);
      silentGain.connect(audioContext.destination);
      console.log('[VoiceCall] Audio processing started, sampleRate:', audioContext.sampleRate);
      return true;
    } catch (err) {
      console.error('[VoiceCall] Web audio stream failed:', err);
      return false;
    }
  }, []);

  // ── 清理所有资源 ────────────────────────────────────

  const cleanupAll = useCallback(async () => {
    stopTimer();

    if (silentGainRef.current) {
      silentGainRef.current.disconnect();
      silentGainRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current && Platform.OS === 'web') {
      try { await audioContextRef.current.close(); } catch {}
      audioContextRef.current = null;
    }
    if (nativeSoundRef.current) {
      try { await nativeSoundRef.current.unloadAsync(); } catch {}
      nativeSoundRef.current = null;
    }

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, [stopTimer]);

  // ── 挂断 ────────────────────────────────────────────

  const handleHangUp = useCallback(async () => {
    socketRef.current?.emitEndCall();
    setCallState('ended');
    await cleanupAll();
    setTimeout(() => navigation.goBack(), 500);
  }, [cleanupAll, navigation]);

  // ── 主流程（只运行一次） ─────────────────────────────

  useEffect(() => {
    mountedRef.current = true;

    const start = async () => {
      console.log('[VoiceCall] Starting voice call...');

      const socket = new VoiceCallSocket();
      socketRef.current = socket;

      const connected = await socket.connect();
      if (!connected) {
        console.error('[VoiceCall] Socket connection failed');
        setCallState('ended');
        return;
      }
      console.log('[VoiceCall] Socket connected');

      socket.on('call-started', () => {
        console.log('[VoiceCall] Call started');
        setCallState('idle');
        startTimer();
      });

      socket.on('call-error', ({message}: {message: string}) => {
        console.error('[VoiceCall] Call error:', message);
        setCallState('ended');
      });

      socket.on('interim-result', ({text}: {text: string}) => {
        console.log('[VoiceCall] Interim:', text);
        // 只在 listening 状态显示实时语音文本
        setCallState('listening');
        setUserSpeechText(text);
      });

      socket.on('user-speech', ({text}: {text: string}) => {
        console.log('[VoiceCall] User said:', text);
        // 固定用户消息到气泡列表，清空实时文本
        setMessages(prev => [...prev, {role: 'user', text}]);
        setUserSpeechText('');
      });

      socket.on('ai-thinking', () => {
        console.log('[VoiceCall] AI thinking...');
        setCallState('ai-speaking');
        setAiSpeechText('正在思考...');
        setUserSpeechText(''); // 确保清空用户实时文本
      });

      // 流式文本片段 — 用于实时显示
      socket.on('ai-text-chunk', ({text}: {text: string}) => {
        setAiSpeechText(prev => {
          if (prev === '正在思考...') return text;
          return prev + text;
        });
      });

      // 完整回复 — 用于语音朗读
      socket.on('ai-speech', ({text}: {text: string}) => {
        console.log('[VoiceCall] AI speech (full):', text.substring(0, 80));
        aiDoneTextRef.current = text;
        setAiSpeechText(text);
        // 加入播放队列，确保问候语等完整回复能被朗读
        speechQueueRef.current.push({type: 'text', data: text});
        processSpeechQueueRef.current();
      });

      // 句子级音频块 — 边生成边播放
      socket.on('ai-speech-chunk', ({audio, text}: {audio: string; text: string}) => {
        console.log('[VoiceCall] AI speech chunk:', text.substring(0, 30), 'size:', audio.length);
        speechQueueRef.current.push({type: 'audio', data: audio});
        processSpeechQueueRef.current();
      });

      socket.on('ai-audio', async ({audioBase64}: {audioBase64: string}) => {
        console.log('[VoiceCall] AI audio received, size:', audioBase64.length);
        if (Platform.OS === 'web') {
          await playAudioWeb(audioBase64);
        } else {
          await playAudioNative(audioBase64);
        }
      });

      socket.on('ai-interrupted', async () => {
        console.log('[VoiceCall] AI interrupted');
        await stopPlayback();
        aiDoneTextRef.current = '';
        setAiSpeechText('');
        setCallState('listening');
      });

      socket.on('ai-done', () => {
        console.log('[VoiceCall] AI done');
        // 将 AI 回复加入消息列表（用 ref 避免嵌套 setState）
        const aiText = aiDoneTextRef.current;
        if (aiText && aiText !== '正在思考...') {
          setMessages(m => [...m, {role: 'ai', text: aiText}]);
        }
        aiDoneTextRef.current = '';
        setAiSpeechText('');
        setCallState('idle');
        setUserSpeechText('');
      });

      socket.on('call-ended', async () => {
        console.log('[VoiceCall] Call ended by server');
        setCallState('ended');
        await cleanupAll();
        setTimeout(() => navigation.goBack(), 500);
      });

      socket.on('recognition-error', ({message}: {message: string}) => {
        console.error('[VoiceCall] Recognition error:', message);
      });

      console.log('[VoiceCall] Emitting start-call...');
      socket.emitStartCall();

      if (Platform.OS === 'web') {
        const audioStarted = await startWebAudioStream();
        console.log('[VoiceCall] Audio stream started:', audioStarted);
      }
    };

    start();

    return () => {
      mountedRef.current = false;
      if (silentGainRef.current) {
        silentGainRef.current.disconnect();
        silentGainRef.current = null;
      }
      if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current = null;
      }
      if (sourceRef.current) {
        sourceRef.current.disconnect();
        sourceRef.current = null;
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop());
        mediaStreamRef.current = null;
      }
      if (Platform.OS === 'web' && typeof speechSynthesis !== 'undefined') {
        speechSynthesis.cancel();
      }
      stopTimer();
    };
  }, []);

  // ── 渲染 ────────────────────────────────────────────

  const orbScale = breatheAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.08],
  });

  const orbOpacity = glowAnim.interpolate({
    inputRange: [0.3, 0.6],
    outputRange: [0.7, 1],
  });

  const statusText =
    callState === 'connecting' ? '正在连接...' :
    callState === 'ended' ? '通话已结束' :
    callState === 'ai-speaking' ? 'AI 正在回答...' :
    callState === 'listening' ? '听你说...' :
    '点击麦克风说话';

  const showTopics = callState === 'idle' && messages.length === 0 && !userSpeechText;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.chatTypeBtn} activeOpacity={0.7}>
          <View style={styles.chatTypeIcon}>
            <Text style={styles.chatTypeEmoji}>💬</Text>
          </View>
          <Text style={styles.chatTypeText}>自由对话</Text>
          <Text style={styles.chatTypeArrow}>⌄</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingsBtn} activeOpacity={0.7}>
          <Text style={styles.settingsIcon}>👤</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.center}>
        <Animated.View
          style={[
            styles.orbContainer,
            {
              transform: [{scale: Animated.multiply(orbScale, pulseAnim)}],
              opacity: orbOpacity,
            },
          ]}>
          <View style={styles.orbGlow} />
          <View style={styles.orbGlow2} />
          <View style={styles.orbGlow3} />
          <View style={styles.orbInner} />
        </Animated.View>
        <View style={styles.dialogArea}>
          {showTopics ? (
            <View style={styles.topicsWrap}>
              {SUGGESTED_TOPICS.map((topic, i) => (
                <TouchableOpacity key={i} style={styles.topicTag} activeOpacity={0.7}>
                  <Text style={styles.topicText}>{topic}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <ScrollView
              ref={scrollRef}
              style={styles.messagesScroll}
              contentContainerStyle={styles.messagesContent}
              showsVerticalScrollIndicator={false}>
              {messages.map((msg, i) => (
                <View key={i} style={[styles.msgBubble, msg.role === 'user' ? styles.msgUser : styles.msgAi]}>
                  <Text style={[styles.msgText, msg.role === 'user' ? styles.msgTextUser : styles.msgTextAi]}>
                    {msg.text}
                  </Text>
                </View>
              ))}
              {userSpeechText && callState === 'listening' && (
                <View style={[styles.msgBubble, styles.msgUser]}>
                  <Text style={[styles.msgText, styles.msgTextUser]}>{userSpeechText}</Text>
                </View>
              )}
              {callState === 'ai-speaking' && aiSpeechText === '正在思考...' && (
                <View style={[styles.msgBubble, styles.msgAi]}>
                  <Text style={[styles.msgText, styles.msgTextAi]}>●●●</Text>
                </View>
              )}
              {aiSpeechText && aiSpeechText !== '正在思考...' && callState === 'ai-speaking' && (
                <View style={[styles.msgBubble, styles.msgAi]}>
                  <Text style={[styles.msgText, styles.msgTextAi]}>{aiSpeechText}</Text>
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </View>
      <View style={styles.bottomSection}>
        <View style={styles.statusRow}>
          {callState === 'ai-speaking' && (
            <View style={styles.statusDot} />
          )}
          <Text style={styles.statusText}>{statusText}</Text>
        </View>

        {/* 操作按钮 */}
        <View style={styles.actionsRow}>
          {/* 摄像头（关闭状态） */}
          <TouchableOpacity style={[styles.actionBtn, styles.actionBtnGray]} activeOpacity={0.7}>
            <Text style={styles.actionIcon}>📷</Text>
            <View style={styles.slashLine} />
          </TouchableOpacity>

          {/* 麦克风 */}
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnDark]}
            activeOpacity={0.7}>
            <Text style={styles.actionIcon}>🎙️</Text>
          </TouchableOpacity>

          {/* 字幕/文字 */}
          <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDark]} activeOpacity={0.7}>
            <Text style={styles.actionIconBtn}>
              <Text style={styles.actionIconTextA}>A</Text>
            </Text>
          </TouchableOpacity>

          {/* 挂断 */}
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnRed]}
            onPress={handleHangUp}
            activeOpacity={0.7}>
            <Text style={styles.hangUpIcon}>📞</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footerText}>内容由 AI 生成</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },

  // ── 顶部栏 ──────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: Platform.OS === 'ios' ? 56 : 20,
    paddingBottom: SPACING.md,
  },
  chatTypeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: RADIUS.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
  },
  chatTypeIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.semantic.success,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatTypeEmoji: {
    fontSize: 12,
  },
  chatTypeText: {
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.text.white,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  chatTypeArrow: {
    fontSize: 14,
    color: COLORS.text.darkMuted,
    marginLeft: 2,
  },
  settingsBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsIcon: {
    fontSize: 22,
    color: COLORS.text.darkMuted,
  },

  // ── 中央区域 ─────────────────────────────────────────
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },

  // 呼吸光球 — 多层叠加模拟柔光
  orbContainer: {
    width: 220,
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xxl,
  },
  orbGlow: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(0, 210, 210, 0.08)',
  },
  orbGlow2: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(0, 220, 220, 0.12)',
  },
  orbGlow3: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(0, 230, 230, 0.2)',
  },
  orbInner: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#00E8E8',
    shadowColor: '#00FFFF',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.9,
    shadowRadius: 40,
    elevation: 15,
  },

  // 对话区域
  dialogArea: {
    flex: 1,
    width: '100%',
    maxHeight: 360,
  },
  messagesScroll: {
    flex: 1,
  },
  messagesContent: {
    paddingVertical: SPACING.sm,
    paddingBottom: SPACING.lg,
  },
  msgBubble: {
    maxWidth: '85%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.sm,
  },
  msgUser: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(124,106,239,0.25)',
    borderBottomRightRadius: 4,
  },
  msgAi: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderBottomLeftRadius: 4,
  },
  msgText: {
    fontSize: TYPOGRAPHY.sizes.lg,
    lineHeight: 24,
  },
  msgTextUser: {
    color: COLORS.text.white,
  },
  msgTextAi: {
    color: COLORS.text.darkSecondary,
  },

  // 推荐话题
  topicsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    justifyContent: 'center',
    paddingTop: SPACING.lg,
  },
  topicTag: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: RADIUS.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  topicText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.text.darkSecondary,
  },

  // ── 底部 ────────────────────────────────────────────
  bottomSection: {
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    paddingHorizontal: SPACING.xl,
    alignItems: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xl,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.semantic.success,
  },
  statusText: {
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.text.darkMuted,
  },

  // 操作按钮行
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginBottom: SPACING.lg,
  },
  actionBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnGray: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  actionBtnDark: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  actionBtnRed: {
    backgroundColor: COLORS.semantic.error,
  },
  actionIcon: {
    fontSize: 22,
  },
  slashLine: {
    position: 'absolute',
    width: 28,
    height: 2,
    backgroundColor: COLORS.text.darkMuted,
    transform: [{rotate: '45deg'}],
  },
  actionIconBtn: {
    fontSize: 20,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.text.white,
  },
  actionIconTextA: {
    fontSize: 20,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.text.white,
  },
  hangUpIcon: {
    fontSize: 22,
    transform: [{rotate: '135deg'}],
  },

  footerText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.text.darkFaint,
  },
});

export default VoiceCallScreen;
