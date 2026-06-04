/**
 * AI录音笔页面（仿腾讯元宝APP）
 * 点击录音 → 实时转写 → 自动AI总结+分析 → 悬浮弹窗查看分析
 */

import React, {useState, useRef, useCallback, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  Platform,
  Alert,
  Animated,
  Easing,
  Modal,
  Pressable,
} from 'react-native';
// Web环境使用MediaRecorder API进行录音
import Markdown from 'react-native-markdown-display';
import {io, Socket} from 'socket.io-client';
import {API_BASE_URL, COLORS} from '../constants';
import {mmkvStorage} from '../services/mmkv';
import {useChatStore} from '../stores/chatStore';

const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');

type TabType = 'transcribe' | 'summary';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}

const RecordingScreen = ({navigation}: any) => {
  const [activeTab, setActiveTab] = useState<TabType>('transcribe');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAITyping, setIsAITyping] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [summaryText, setSummaryText] = useState('');
  const [analysisText, setAnalysisText] = useState('');
  const [showAnalysisPopup, setShowAnalysisPopup] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [isGeneratingAnalysis, setIsGeneratingAnalysis] = useState(false);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [recognitionDone, setRecognitionDone] = useState(false);

  const setRecordingResult = useChatStore(s => s.setRecordingResult);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const analysisScrollRef = useRef<ScrollView>(null);
  const socketRef = useRef<Socket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const currentMsgIdRef = useRef('');
  const elapsedSecondsRef = useRef(0);
  const finalTranscriptRef = useRef('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const waveAnim = useRef(new Animated.Value(0)).current;
  const waveAnimLoop = useRef<Animated.CompositeAnimation | null>(null);
  const popupAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      stopWaveAnimation();
      recordingRef.current?.stopAndUnloadAsync().catch(() => {});
      cleanupWebSocket();
      cleanupAudioStream();
    };
  }, []);

  // 将 Blob 转为 base64 data URL（可持久化存储）
  const blobToDataURL = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

  // 清理 blob URL（仅临时 blob 需要 revoke）
  useEffect(() => {
    return () => {
      if (audioUri && audioUri.startsWith('blob:')) {
        URL.revokeObjectURL(audioUri);
      }
    };
  }, [audioUri]);

  // 录音完成后，等 AI 总结+分析都生成完毕，将数据传递给 ChatScreen
  const goBackDoneRef = useRef(false);
  useEffect(() => {
    if (!recognitionDone || goBackDoneRef.current) return;
    if (isGeneratingSummary || isGeneratingAnalysis) return;
    const fullText = finalTranscriptRef.current;
    if (!fullText || fullText.trim().length === 0) return;
    goBackDoneRef.current = true;
    setRecordingResult({
      audioUri,
      duration: elapsedSecondsRef.current,
      transcript: fullText,
      summary: summaryText,
      analysis: analysisText,
    });
  }, [recognitionDone, isGeneratingSummary, isGeneratingAnalysis, summaryText, analysisText]);

  const cleanupWebSocket = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, []);

  const cleanupAudioStream = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  }, []);

  const startWaveAnimation = useCallback(() => {
    waveAnimLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(waveAnim, {toValue: 1, duration: 500, easing: Easing.inOut(Easing.sin), useNativeDriver: false}),
        Animated.timing(waveAnim, {toValue: 0, duration: 500, easing: Easing.inOut(Easing.sin), useNativeDriver: false}),
      ]),
    );
    waveAnimLoop.current.start();
  }, [waveAnim]);

  const stopWaveAnimation = useCallback(() => {
    waveAnimLoop.current?.stop();
    waveAnim.setValue(0);
  }, [waveAnim]);

  const startTimer = useCallback(() => {
    setElapsedSeconds(0);
    elapsedSecondsRef.current = 0;
    timerRef.current = setInterval(() => {
      elapsedSecondsRef.current += 1;
      setElapsedSeconds(elapsedSecondsRef.current);
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({animated: true});
    }, 100);
  }, []);

  // 生成AI总结
  const generateSummary = useCallback(async (text: string, duration: string) => {
    setIsGeneratingSummary(true);
    setSummaryText('');
    const token = mmkvStorage.getToken();
    try {
      const response = await fetch(`${API_BASE_URL}/recording/summary`, {
        method: 'POST',
        headers: {Authorization: `Bearer ${token}`, 'Content-Type': 'application/json'},
        body: JSON.stringify({text, duration}),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader');
      const decoder = new TextDecoder();
      let buffer = '';
      let fullText = '';
      while (true) {
        const {done, value} = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, {stream: true});
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (dataStr === '[DONE]') break;
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.type === 'token') {
                fullText += parsed.token;
                setSummaryText(fullText);
              }
            } catch {}
          }
        }
      }
    } catch (err: any) {
      console.error('Summary failed:', err);
      setSummaryText('总结生成失败，请重试');
    } finally {
      setIsGeneratingSummary(false);
    }
  }, []);

  // 生成AI分析
  const generateAnalysis = useCallback(async (text: string, duration: string) => {
    setIsGeneratingAnalysis(true);
    setAnalysisText('');
    const token = mmkvStorage.getToken();
    try {
      const response = await fetch(`${API_BASE_URL}/recording/analysis`, {
        method: 'POST',
        headers: {Authorization: `Bearer ${token}`, 'Content-Type': 'application/json'},
        body: JSON.stringify({text, duration}),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader');
      const decoder = new TextDecoder();
      let buffer = '';
      let fullText = '';
      while (true) {
        const {done, value} = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, {stream: true});
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (dataStr === '[DONE]') break;
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.type === 'token') {
                fullText += parsed.token;
                setAnalysisText(fullText);
                setTimeout(() => analysisScrollRef.current?.scrollToEnd({animated: true}), 50);
              }
            } catch {}
          }
        }
      }
    } catch (err: any) {
      console.error('Analysis failed:', err);
      setAnalysisText('分析生成失败，请重试');
    } finally {
      setIsGeneratingAnalysis(false);
    }
  }, []);

  // Web 平台 PCM 流式采集 + MediaRecorder 保存本地音频
  const startWebAudioStream = useCallback(async (): Promise<boolean> => {
    if (Platform.OS !== 'web') return false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {sampleRate: 16000, channelCount: 1, echoCancellation: true, noiseSuppression: true},
      });
      mediaStreamRef.current = stream;

      // 启动 MediaRecorder 保存本地音频用于播放
      audioChunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      const recorder = new MediaRecorder(stream, {mimeType});
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.start(200);

      // PCM 流式采集用于语音识别
      const audioContext = new AudioContext({sampleRate: 16000});
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      processor.onaudioprocess = (event) => {
        if (!socketRef.current?.connected) return;
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
        socketRef.current.emit('audio-data', btoa(binary));
      };
      source.connect(processor);
      processor.connect(audioContext.destination);
      return true;
    } catch (err) {
      console.error('Web audio failed:', err);
      return false;
    }
  }, []);

  // 开始录音
  const startRecording = useCallback(async () => {
    if (isProcessing || isAITyping) return;

    // 立即设置状态，确保UI刷新
    setIsRecording(true);
    setRecognitionDone(false);
    goBackDoneRef.current = false;
    setAudioUri(null);
    setMessages([]);
    setSummaryText('');
    setAnalysisText('');
    startTimer();
    startWaveAnimation();

    try {
      // 清理旧连接
      cleanupWebSocket();
      cleanupAudioStream();

      // 创建新 WebSocket
      const token = mmkvStorage.getToken();
      const socket = io(`${API_BASE_URL}/recording`, {
        transports: ['websocket'],
        auth: token ? {token} : undefined,
      });
      socketRef.current = socket;

      // 等待连接
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(resolve, 3000);
        socket.on('connect', () => { clearTimeout(timeout); resolve(); });
        socket.on('connect_error', () => { clearTimeout(timeout); resolve(); });
      });

      if (!socket.connected) {
        Alert.alert('提示', '无法连接服务器');
        stopRecording();
        return;
      }

      // 注册事件监听
      socket.on('recognition-mode', (data: {mode: string}) => {
        console.log('Recognition mode:', data.mode);
      });

      socket.on('recognition-started', () => {
        console.log('Recognition started');
      });

      socket.on('interim-result', (data: {text: string; sentenceId: number; isFinal: boolean}) => {
        // 始终更新 finalTranscriptRef，确保 recognition-complete 时有文本可用
        if (data.text && data.text.trim().length > 0) {
          finalTranscriptRef.current = data.text;
        }
        setMessages(prev =>
          prev.map(m =>
            m.id === currentMsgIdRef.current
              ? {...m, content: data.text, isStreaming: true}
              : m,
          ),
        );
        scrollToBottom();
      });

      socket.on('final-result', (data: {text: string; fullText: string}) => {
        finalTranscriptRef.current = data.fullText;
        setMessages(prev =>
          prev.map(m =>
            m.id === currentMsgIdRef.current
              ? {...m, content: data.fullText, isStreaming: false}
              : m,
          ),
        );
      });

      socket.on('recognition-complete', (data: {fullText: string}) => {
        console.log('Recognition complete, fullText:', data.fullText?.substring(0, 50));
        setIsProcessing(false);
        setIsAITyping(false);
        setRecognitionDone(true);
        // 优先用 data.fullText，其次用 finalTranscriptRef（从 interim-result 持续更新）
        const fullText = data.fullText || finalTranscriptRef.current;
        console.log('Final fullText for AI:', fullText?.substring(0, 80));
        if (fullText && fullText.trim().length > 0) {
          const duration = formatTime(elapsedSecondsRef.current);
          generateSummary(fullText, duration);
          generateAnalysis(fullText, duration);
        }
      });

      socket.on('recognition-error', (data: {message: string}) => {
        console.error('Recognition error:', data.message);
        setIsProcessing(false);
      });

      // 发送开始识别
      socket.emit('start-recognition', {format: 'wav'});

      // 启动音频采集
      if (Platform.OS === 'web') {
        const started = await startWebAudioStream();
        if (!started) {
          Alert.alert('提示', '无法访问麦克风');
          stopRecording();
          return;
        }
      } else {
        // Native环境：使用MediaRecorder API（简化版）
        try {
          const stream = await navigator.mediaDevices.getUserMedia({audio: true});
          mediaRecorderRef.current = new MediaRecorder(stream);
          audioChunksRef.current = [];

          mediaRecorderRef.current.ondataavailable = (event) => {
            if (event.data.size > 0) {
              audioChunksRef.current.push(event.data);
            }
          };

          mediaRecorderRef.current.start(1000);
        } catch (err) {
          Alert.alert('提示', '需要麦克风权限才能录音');
          stopRecording();
          return;
        }
      }

      // 创建用户消息
      const userMsgId = `msg_${Date.now()}_user`;
      currentMsgIdRef.current = userMsgId;
      setMessages([{id: userMsgId, role: 'user', content: '正在识别...', isStreaming: true}]);
      scrollToBottom();

    } catch (err: any) {
      console.error('录音启动失败:', err);
      Alert.alert('录音失败', err.message || '请重试');
      stopRecording();
    }
  }, [isProcessing, isAITyping, startTimer, startWaveAnimation, scrollToBottom, cleanupWebSocket, cleanupAudioStream, startWebAudioStream, generateSummary, generateAnalysis]);

  // 停止录音
  const stopRecording = useCallback(async () => {
    stopTimer();
    stopWaveAnimation();
    setIsRecording(false);
    setIsProcessing(true);

    if (Platform.OS === 'web') {
      // 停止 MediaRecorder 并生成本地音频 URL
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        await new Promise<void>((resolve) => {
          const recorder = mediaRecorderRef.current!;
          recorder.onstop = async () => {
            const blob = new Blob(audioChunksRef.current, {type: recorder.mimeType});
            const url = await blobToDataURL(blob);
            setAudioUri(url);
            mediaRecorderRef.current = null;
            audioChunksRef.current = [];
            resolve();
          };
          recorder.stop();
        });
      }
      cleanupAudioStream();
      if (socketRef.current?.connected) {
        socketRef.current.emit('stop-recognition');
      }
    } else {
      try {
        if (recordingRef.current) {
          await recordingRef.current.stopAndUnloadAsync();
          const uri = recordingRef.current.getURI();
          setAudioUri(uri);
          recordingRef.current = null;
          if (uri) {
            const response = await fetch(uri);
            const blob = await response.blob();
            const arrayBuffer = await blob.arrayBuffer();
            const bytes = new Uint8Array(arrayBuffer);
            const chunkSize = 4096;
            for (let i = 0; i < bytes.length; i += chunkSize) {
              const chunk = bytes.slice(i, i + chunkSize);
              let binary = '';
              for (let j = 0; j < chunk.byteLength; j++) {
                binary += String.fromCharCode(chunk[j]);
              }
              if (socketRef.current?.connected) {
                socketRef.current.emit('audio-data', btoa(binary));
              }
              await new Promise(r => setTimeout(r, 10));
            }
            if (socketRef.current?.connected) {
              socketRef.current.emit('stop-recognition');
            }
          }
        }
      } catch (err: any) {
        console.error('Native recording failed:', err);
        if (socketRef.current?.connected) {
          socketRef.current.emit('simulate-recognition', {audioBase64: ''});
        }
      }
    }
  }, [stopTimer, stopWaveAnimation, cleanupAudioStream]);

  const handleToggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  const openAnalysisPopup = useCallback(() => {
    setShowAnalysisPopup(true);
    Animated.spring(popupAnim, {toValue: 1, useNativeDriver: true, tension: 65, friction: 11}).start();
  }, [popupAnim]);

  const closeAnalysisPopup = useCallback(() => {
    Animated.timing(popupAnim, {toValue: 0, duration: 200, useNativeDriver: true}).start(() => {
      setShowAnalysisPopup(false);
    });
  }, [popupAnim]);

  const isBusy = isRecording || isProcessing || isAITyping;

  const handleGoBack = useCallback(() => {
    // 如果录音数据就绪但尚未传递，先传递给 ChatScreen
    if (recognitionDone && !goBackDoneRef.current) {
      const fullText = finalTranscriptRef.current;
      if (fullText && fullText.trim().length > 0) {
        goBackDoneRef.current = true;
        setRecordingResult({
          audioUri,
          duration: elapsedSecondsRef.current,
          transcript: fullText,
          summary: summaryText,
          analysis: analysisText,
        });
      }
    }
    navigation.goBack();
  }, [recognitionDone, audioUri, summaryText, analysisText, navigation, setRecordingResult]);

  return (
    <View style={styles.container}>
      {/* 顶部导航栏 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={handleGoBack} activeOpacity={0.7}>
          <Text style={styles.backArrow}>{'‹'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AI录音笔</Text>
        <View style={styles.headerRight}>
          {analysisText !== '' && (
            <TouchableOpacity style={styles.aiFloatingBtn} onPress={openAnalysisPopup} activeOpacity={0.8}>
              <Text style={styles.aiFloatingBtnText}>{'✨'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 录音面板 */}
      <View style={styles.recordingPanel}>
        <View style={styles.waveArea}>
          {isRecording ? (
            <View style={styles.waveContainer}>
              {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                <Animated.View
                  key={i}
                  style={[
                    styles.waveBar,
                    {
                      height: waveAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [10 + Math.abs(i - 4) * 3, 30 + (9 - Math.abs(i - 4)) * 5 + Math.random() * 10],
                      }),
                      opacity: waveAnim.interpolate({inputRange: [0, 1], outputRange: [0.3, 0.8]}),
                    },
                  ]}
                />
              ))}
            </View>
          ) : isProcessing ? (
            <View style={styles.waveContainer}>
              <Text style={styles.processingHint}>{'识别中...'}</Text>
            </View>
          ) : (
            <View style={styles.waveContainer}>
              <View style={styles.centerLineWrap}>
                <View style={styles.centerDotTop} />
                <View style={styles.centerLineBody} />
                <View style={styles.centerDotBottom} />
              </View>
            </View>
          )}
        </View>
        <Text style={[styles.timer, isRecording && styles.timerActive]}>
          {formatTime(elapsedSeconds)}
        </Text>
        {isRecording && <Text style={styles.recordingHint}>{'正在录音，点击按钮停止'}</Text>}
      </View>

      {/* 标签页 */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'transcribe' && styles.tabActive]}
          onPress={() => setActiveTab('transcribe')}
          activeOpacity={0.7}>
          <Text style={[styles.tabText, activeTab === 'transcribe' && styles.tabTextActive]}>{'实时转写'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'summary' && styles.tabActive]}
          onPress={() => setActiveTab('summary')}
          activeOpacity={0.7}>
          <Text style={[styles.tabText, activeTab === 'summary' && styles.tabTextActive]}>{'AI总结'}</Text>
        </TouchableOpacity>
      </View>

      {/* 内容区域 */}
      <View style={styles.contentArea}>
        {activeTab === 'transcribe' ? (
          <ScrollView ref={scrollRef} style={styles.chatScroll} contentContainerStyle={styles.chatContent} onContentSizeChange={scrollToBottom}>
            {messages.length === 0 ? (
              <View style={styles.illustrationArea}>
                <Text style={styles.illustrationEmoji}>{'📻'}</Text>
                <Text style={styles.illustrationHint}>{'点击下方按钮开始录音'}</Text>
                <Text style={styles.illustrationSubHint}>{'录音内容将实时转写为文字'}</Text>
              </View>
            ) : (
              messages.map(msg => (
                <View key={msg.id} style={[styles.messageRow, msg.role === 'user' ? styles.userRow : styles.aiRow]}>
                  {msg.role === 'assistant' && (
                    <View style={styles.aiAvatar}>
                      <Text style={styles.aiAvatarText}>{'🤖'}</Text>
                    </View>
                  )}
                  <View style={[styles.messageBubble, msg.role === 'user' ? styles.userBubble : styles.aiBubble]}>
                    {msg.role === 'user' ? (
                      <Text style={styles.userMessageText}>{msg.content}</Text>
                    ) : msg.isStreaming && !msg.content ? (
                      <View style={styles.typingIndicator}>
                        <Text style={styles.typingDot}>{'●'}</Text>
                        <Text style={styles.typingDot}>{'●'}</Text>
                        <Text style={styles.typingDot}>{'●'}</Text>
                      </View>
                    ) : (
                      <Text style={styles.aiMessageText}>{msg.content}</Text>
                    )}
                    {msg.isStreaming && msg.content ? <Text style={styles.cursor}>{'▍'}</Text> : null}
                  </View>
                </View>
              ))
            )}
            {isProcessing && messages.length > 0 && (
              <View style={styles.processingRow}>
                <View style={styles.aiAvatar}>
                  <Text style={styles.aiAvatarText}>{'🤖'}</Text>
                </View>
                <View style={[styles.messageBubble, styles.aiBubble]}>
                  <Text style={styles.processingText}>{'🔍 正在识别语音...'}</Text>
                </View>
              </View>
            )}
          </ScrollView>
        ) : summaryText ? (
          <ScrollView style={styles.summaryScroll}>
            <View style={styles.summaryContainer}>
              <Markdown style={summaryMarkdownStyles}>{summaryText}</Markdown>
            </View>
          </ScrollView>
        ) : isGeneratingSummary ? (
          <View style={styles.illustrationArea}>
            <Text style={styles.illustrationEmoji}>{'⏳'}</Text>
            <Text style={styles.illustrationHint}>{'AI正在生成总结...'}</Text>
            <Text style={styles.illustrationSubHint}>{'请稍候，正在分析录音内容'}</Text>
          </View>
        ) : (
          <View style={styles.illustrationArea}>
            <Text style={styles.illustrationEmoji}>{'📻'}</Text>
            <Text style={styles.illustrationHint}>{'录音结束后自动生成总结'}</Text>
            <Text style={styles.illustrationSubHint}>{'AI将自动提炼关键内容'}</Text>
          </View>
        )}
      </View>

      {/* 底部录音按钮 */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.recordBtn, isRecording && styles.recordBtnActive, isBusy && !isRecording && styles.recordBtnDisabled]}
          onPress={handleToggleRecording}
          disabled={isBusy && !isRecording}
          activeOpacity={0.8}>
          <Text style={[styles.recordBtnText, isRecording && styles.recordBtnTextActive]}>
            {isRecording ? '停止录制' : isProcessing ? '识别中...' : isAITyping ? 'AI回答中...' : '开始录音'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* AI分析悬浮弹窗 */}
      <Modal visible={showAnalysisPopup} transparent animationType="none" onRequestClose={closeAnalysisPopup}>
        <Pressable style={styles.popupOverlay} onPress={closeAnalysisPopup}>
          <Animated.View
            style={[
              styles.popupContainer,
              {
                opacity: popupAnim,
                transform: [
                  {scale: popupAnim.interpolate({inputRange: [0, 1], outputRange: [0.8, 1]})},
                  {translateY: popupAnim.interpolate({inputRange: [0, 1], outputRange: [20, 0]})},
                ],
              },
            ]}>
            <Pressable onPress={() => {}}>
              <View style={styles.popupHeader}>
                <View style={styles.popupTitleRow}>
                  <Text style={styles.popupIcon}>{'✨'}</Text>
                  <Text style={styles.popupTitle}>{'元宝说'}</Text>
                </View>
                <TouchableOpacity style={styles.popupCloseBtn} onPress={closeAnalysisPopup}>
                  <Text style={styles.popupCloseText}>{'✕'}</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.popupDuration}>{formatTime(elapsedSeconds)}</Text>
              <ScrollView ref={analysisScrollRef} style={styles.popupContentScroll} showsVerticalScrollIndicator={true}>
                {analysisText ? (
                  <View style={styles.analysisBubbleContainer}>
                    {analysisText.split('\n\n').filter(Boolean).map((paragraph, index) => (
                      <View key={index} style={styles.analysisBubble}>
                        <Text style={styles.analysisBubbleText}>{paragraph}</Text>
                      </View>
                    ))}
                  </View>
                ) : isGeneratingAnalysis ? (
                  <View style={styles.analysisBubbleContainer}>
                    <View style={styles.analysisBubble}>
                      <Text style={styles.analysisBubbleText}>{'正在分析中...'}</Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.analysisBubbleContainer}>
                    <View style={styles.analysisBubble}>
                      <Text style={styles.analysisBubbleText}>{'录音结束后自动生成分析'}</Text>
                    </View>
                  </View>
                )}
              </ScrollView>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>
    </View>
  );
};

const summaryMarkdownStyles = StyleSheet.create({
  body: {color: '#1A1A1A', fontSize: 15, lineHeight: 24},
  heading1: {color: '#000000', fontSize: 20, fontWeight: '700', marginVertical: 8},
  heading2: {color: '#1A1A1A', fontSize: 17, fontWeight: '700', marginVertical: 6},
  heading3: {color: '#333333', fontSize: 15, fontWeight: '600', marginVertical: 4},
  strong: {color: '#000000', fontWeight: '700'},
  paragraph: {color: '#1A1A1A', fontSize: 15, lineHeight: 24, marginVertical: 3},
  bullet_list: {color: '#1A1A1A'},
  list_item: {color: '#1A1A1A', fontSize: 15, lineHeight: 24},
  code_block: {backgroundColor: '#F5F5F5', color: '#1A1A1A', padding: 10, borderRadius: 8, fontSize: 13},
  code_inline: {backgroundColor: 'rgba(0,0,0,0.06)', color: '#1A1A1A', paddingHorizontal: 4, paddingVertical: 2, borderRadius: 4, fontSize: 13},
  blockquote: {backgroundColor: 'rgba(0,0,0,0.03)', borderLeftColor: '#CCC', borderLeftWidth: 3, paddingLeft: 10, marginVertical: 4},
});

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: COLORS.light.bg},
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingTop: Platform.OS === 'ios' ? 52 : 12, paddingBottom: 12, backgroundColor: COLORS.light.surface,
  },
  backBtn: {width: 40, height: 40, justifyContent: 'center', alignItems: 'center'},
  backArrow: {fontSize: 28, color: COLORS.text.white, fontWeight: '300'},
  headerTitle: {fontSize: 17, fontWeight: '600', color: COLORS.text.white, flex: 1, textAlign: 'center'},
  headerRight: {width: 40, height: 40, justifyContent: 'center', alignItems: 'center'},
  aiFloatingBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(124,106,239,0.2)',
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(124,106,239,0.4)',
  },
  aiFloatingBtnText: {fontSize: 18},
  recordingPanel: {
    marginHorizontal: 16, marginTop: 16, backgroundColor: COLORS.light.surfaceAlt,
    borderRadius: 20, padding: 24, minHeight: 180, justifyContent: 'center', alignItems: 'center',
  },
  waveArea: {height: 80, width: '100%', justifyContent: 'center', alignItems: 'center'},
  waveContainer: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 80, gap: 5},
  waveBar: {width: 4, height: 20, borderRadius: 2, backgroundColor: COLORS.text.lightFaint},
  centerLineWrap: {alignItems: 'center'},
  centerDotTop: {width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF4444'},
  centerLineBody: {width: 2, height: 50, backgroundColor: '#FF4444'},
  centerDotBottom: {width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF4444'},
  timer: {fontSize: 42, fontWeight: '300', color: COLORS.text.lightMuted, marginTop: 12, letterSpacing: 4},
  timerActive: {color: '#FF4444'},
  recordingHint: {fontSize: 13, color: COLORS.text.lightFaint, marginTop: 8},
  processingHint: {fontSize: 16, color: COLORS.text.lightMuted},
  tabRow: {
    flexDirection: 'row', marginHorizontal: 16, marginTop: 16,
    backgroundColor: COLORS.light.surface, borderRadius: 12, overflow: 'hidden',
  },
  tab: {flex: 1, paddingVertical: 12, alignItems: 'center', backgroundColor: 'transparent'},
  tabActive: {backgroundColor: COLORS.accent.primary},
  tabText: {fontSize: 14, fontWeight: '600', color: COLORS.text.lightPrimary},
  tabTextActive: {color: COLORS.text.white, fontWeight: '700'},
  contentArea: {flex: 1, marginHorizontal: 16, marginTop: 12},
  chatScroll: {flex: 1},
  chatContent: {paddingBottom: 12},
  summaryScroll: {flex: 1},
  illustrationArea: {alignItems: 'center', paddingTop: 60},
  illustrationEmoji: {fontSize: 80, marginBottom: 16},
  illustrationHint: {fontSize: 15, fontWeight: '600', color: COLORS.text.lightMuted, marginBottom: 4},
  illustrationSubHint: {fontSize: 13, color: COLORS.text.lightFaint},
  messageRow: {flexDirection: 'row', marginBottom: 14, alignItems: 'flex-start'},
  userRow: {justifyContent: 'flex-end'},
  aiRow: {justifyContent: 'flex-start'},
  aiAvatar: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.accent.primaryLight,
    justifyContent: 'center', alignItems: 'center', marginRight: 8,
  },
  aiAvatarText: {fontSize: 16},
  messageBubble: {maxWidth: '78%', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 9},
  userBubble: {backgroundColor: COLORS.accent.primary, borderBottomRightRadius: 4},
  aiBubble: {backgroundColor: COLORS.light.surface, borderWidth: 1, borderColor: COLORS.light.surfaceAlt, borderBottomLeftRadius: 4},
  userMessageText: {fontSize: 15, color: COLORS.text.white, lineHeight: 22},
  aiMessageText: {fontSize: 15, color: COLORS.text.lightSecondary, lineHeight: 22},
  typingIndicator: {flexDirection: 'row', gap: 4, paddingVertical: 4},
  typingDot: {fontSize: 12, color: COLORS.text.lightMuted},
  cursor: {fontSize: 15, color: COLORS.accent.primary, fontWeight: '700'},
  processingRow: {flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14},
  processingText: {fontSize: 14, color: COLORS.text.lightMuted},
  summaryContainer: {backgroundColor: COLORS.light.surfaceAlt, borderRadius: 12, padding: 16},
  bottomBar: {
    alignItems: 'center', paddingVertical: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16, backgroundColor: COLORS.light.bg,
  },
  recordBtn: {width: SCREEN_WIDTH - 80, paddingVertical: 18, borderRadius: 30, backgroundColor: COLORS.accent.primary, alignItems: 'center'},
  recordBtnActive: {backgroundColor: '#FF4444'},
  recordBtnDisabled: {opacity: 0.5},
  recordBtnText: {fontSize: 17, fontWeight: '700', color: COLORS.text.white},
  recordBtnTextActive: {color: COLORS.text.white},
  popupOverlay: {
    flex: 1, backgroundColor: COLORS.overlay.medium, justifyContent: 'flex-start',
    alignItems: 'flex-end', paddingTop: Platform.OS === 'ios' ? 100 : 80, paddingRight: 16,
  },
  popupContainer: {
    width: SCREEN_WIDTH * 0.85, maxHeight: SCREEN_HEIGHT * 0.6, backgroundColor: COLORS.text.white,
    borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
  },
  popupHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.light.border,
  },
  popupTitleRow: {flexDirection: 'row', alignItems: 'center', gap: 8},
  popupIcon: {fontSize: 20},
  popupTitle: {fontSize: 17, fontWeight: '600', color: COLORS.text.lightPrimary},
  popupCloseBtn: {width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.light.border, justifyContent: 'center', alignItems: 'center'},
  popupCloseText: {fontSize: 14, color: COLORS.text.lightMuted, fontWeight: '600'},
  popupDuration: {fontSize: 13, color: COLORS.text.lightFaint, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8},
  popupContentScroll: {maxHeight: SCREEN_HEIGHT * 0.45, paddingHorizontal: 16, paddingBottom: 16},
  analysisBubbleContainer: {gap: 12},
  analysisBubble: {backgroundColor: '#D4F5A0', borderRadius: 16, borderBottomLeftRadius: 4, paddingHorizontal: 14, paddingVertical: 12},
  analysisBubbleText: {fontSize: 15, color: COLORS.text.lightPrimary, lineHeight: 22},
});

export default RecordingScreen;
