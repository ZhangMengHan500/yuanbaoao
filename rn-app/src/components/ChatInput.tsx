import React, {useState, useRef, useCallback, useEffect} from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Text,
  Platform,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {COLORS, API_BASE_URL} from '../constants';
import {mmkvStorage} from '../services/mmkv';

// 主题色映射表
const THEME_COLOR_MAP: Record<string, string> = {
  '蓝色': COLORS.semantic.info,
  '绿色': COLORS.semantic.success,
  '红色': COLORS.semantic.error,
  '紫色': COLORS.accent.primary,
};

interface Props {
  onSend: (text: string, imageUri?: string) => void;
  onCameraPress?: () => void;
  onVoicePress?: () => void;
  onPlusPress?: () => void;
  disabled?: boolean;
  selectedImage?: string | null;
  onClearImage?: () => void;
}

const ChatInput: React.FC<Props> = ({
  onSend,
  onCameraPress,
  onVoicePress,
  onPlusPress,
  disabled,
  selectedImage,
  onClearImage,
}) => {
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [themeColor, setThemeColor] = useState(COLORS.accent.primary);
  const inputRef = useRef<TextInput>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);

  // 初始化主题色
  useEffect(() => {
    const colorName = mmkvStorage.getThemeColor();
    setThemeColor(THEME_COLOR_MAP[colorName] || COLORS.accent.primary);
  }, []);

  // 清理
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const handleSend = () => {
    const trimmed = text.trim();
    if ((trimmed || selectedImage) && !disabled) {
      onSend(trimmed || '请解答这道题目', selectedImage || undefined);
      setText('');
    }
  };

  // 将 Blob 转为 base64
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // 使用 Web Speech API 进行语音识别（Web平台）
  const startWebSpeechRecognition = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      Alert.alert('提示', '您的浏览器不支持语音识别，请使用Chrome浏览器');
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    recognition.lang = 'zh-CN'; // 中文
    recognition.interimResults = true; // 允许中间结果
    recognition.continuous = true; // 持续识别
    recognition.maxAlternatives = 1;

    let finalTranscript = '';

    recognition.onstart = () => {
      console.log('语音识别已开始');
      setIsRecording(true);
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      // 显示中间结果和最终结果
      setText(finalTranscript + interimTranscript);
    };

    recognition.onerror = (event: any) => {
      console.error('语音识别错误:', event.error);
      setIsRecording(false);
      if (event.error === 'not-allowed') {
        Alert.alert('提示', '请允许麦克风权限后重试');
      } else if (event.error === 'no-speech') {
        Alert.alert('提示', '未检测到语音，请重试');
      } else {
        Alert.alert('语音识别错误', event.error || '请重试');
      }
    };

    recognition.onend = () => {
      console.log('语音识别已结束');
      setIsRecording(false);
      // 如果有识别结果，自动发送
      if (finalTranscript.trim()) {
        setText(finalTranscript);
      }
    };

    recognition.start();
  }, []);

  // 停止 Web Speech 识别
  const stopWebSpeechRecognition = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsRecording(false);
  }, []);

  // 开始录音（Web平台使用 Web Speech API，其他平台使用 MediaRecorder）
  const startRecording = useCallback(async () => {
    // Web 平台优先使用 Web Speech API
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        startWebSpeechRecognition();
        return;
      }
    }

    // 降级到 MediaRecorder（需要后端 ASR 支持）
    try {
      const stream = await navigator.mediaDevices.getUserMedia({audio: true});
      streamRef.current = stream;
      audioChunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm',
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // 停止麦克风
        stream.getTracks().forEach(t => t.stop());
        streamRef.current = null;

        // 转为 base64 并发送到 ASR
        setIsRecognizing(true);
        try {
          const audioBlob = new Blob(audioChunksRef.current, {type: 'audio/webm'});
          const audioBase64 = await blobToBase64(audioBlob);

          const token = mmkvStorage.getToken();
          const response = await fetch(`${API_BASE_URL}/recording/process`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({audioBase64, format: 'webm'}),
          });

          if (!response.ok) throw new Error(`HTTP ${response.status}`);

          // 解析 SSE 响应
          const reader = response.body?.getReader();
          if (!reader) throw new Error('No reader');

          const decoder = new TextDecoder();
          let buffer = '';

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
                  const data = JSON.parse(dataStr);
                  if (data.type === 'transcript' && data.text) {
                    setText(prev => prev + data.text);
                  } else if (data.type === 'error') {
                    Alert.alert('语音识别', data.message || '未能识别到语音内容');
                  }
                } catch {}
              }
            }
          }
        } catch (err: any) {
          console.error('ASR failed:', err);
          Alert.alert('语音识别失败', err.message || '请重试');
        } finally {
          setIsRecognizing(false);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000); // 每秒收集一次数据
      setIsRecording(true);
    } catch (err: any) {
      console.error('麦克风权限获取失败:', err);
      if (err.name === 'NotAllowedError') {
        Alert.alert('提示', '请允许麦克风权限后重试');
      } else {
        Alert.alert('语音输入失败', err.message || '请重试');
      }
    }
  }, [startWebSpeechRecognition]);

  // 停止录音
  const stopRecording = useCallback(() => {
    // 如果正在使用 Web Speech API
    if (recognitionRef.current) {
      stopWebSpeechRecognition();
      return;
    }

    // 否则使用 MediaRecorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  }, [stopWebSpeechRecognition]);

  // 处理话筒按钮点击
  const handleVoiceButtonPress = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  return (
    <View style={styles.container}>
      {selectedImage ? (
        <View style={styles.imagePreviewContainer}>
          <Image source={{uri: selectedImage}} style={styles.imagePreview} />
          {onClearImage && (
            <TouchableOpacity style={styles.clearImageBtn} onPress={onClearImage}>
              <Text style={styles.clearImageText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : null}

      {/* 录音/识别中提示 */}
      {(isRecording || isRecognizing) && (
        <View style={[styles.recordingBar, {backgroundColor: themeColor + '10', borderColor: themeColor + '30'}]}>
          <View style={styles.recordingIndicator}>
            {isRecording ? (
              <View style={[styles.recordingDot, {backgroundColor: themeColor}]} />
            ) : (
              <ActivityIndicator size="small" color={themeColor} />
            )}
            <Text style={[styles.recordingLabel, {color: themeColor}]}>
              {isRecording ? '录音中...点击停止' : '识别中...'}
            </Text>
          </View>
        </View>
      )}

      <View style={styles.inputBox}>
        {/* 左侧相机图标 */}
        {onCameraPress && (
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={onCameraPress}
            disabled={disabled || isRecording || isRecognizing}
            activeOpacity={0.7}>
            <Text style={styles.iconText}>📷</Text>
          </TouchableOpacity>
        )}

        {/* 中间输入框 */}
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder={isRecording ? '请说话...' : isRecognizing ? '识别中...' : '发消息或按住说话...'}
          placeholderTextColor={COLORS.text.lightFaint}
          multiline
          maxLength={2000}
          editable={!disabled && !isRecording && !isRecognizing}
          returnKeyType="send"
          blurOnSubmit={false}
          onSubmitEditing={handleSend}
        />

        {/* 右侧图标组 */}
        <View style={styles.rightIcons}>
          {text.trim() || selectedImage ? (
            <TouchableOpacity
              style={[styles.sendBtn, {backgroundColor: themeColor}]}
              onPress={handleSend}
              disabled={disabled}
              activeOpacity={0.7}>
              <Text style={styles.sendBtnText}>↑</Text>
            </TouchableOpacity>
          ) : (
            <>
              {/* 话筒按钮 */}
              <TouchableOpacity
                style={[styles.iconBtn, (isRecording || isRecognizing) && {backgroundColor: themeColor + '15'}]}
                onPress={handleVoiceButtonPress}
                disabled={disabled || isRecognizing}
                activeOpacity={0.7}>
                {isRecognizing ? (
                  <ActivityIndicator size="small" color={themeColor} />
                ) : isRecording ? (
                  <View style={styles.recordingIconDot} />
                ) : (
                  <Text style={styles.iconText}>🎙</Text>
                )}
              </TouchableOpacity>
              {onPlusPress && (
                <TouchableOpacity
                  style={styles.iconBtn}
                  onPress={onPlusPress}
                  disabled={disabled || isRecording || isRecognizing}
                  activeOpacity={0.7}>
                  <Text style={styles.iconText}>＋</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: COLORS.light.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.light.borderSubtle,
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.light.bg,
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 8 : 6,
    minHeight: 48,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text.lightSecondary,
    maxHeight: 100,
    paddingTop: 0,
    paddingBottom: 0,
    lineHeight: 20,
    marginHorizontal: 8,
  },
  rightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 20,
  },
  voiceBtnActive: {
    backgroundColor: 'rgba(124,58,237,0.1)',
    borderRadius: 18,
  },
  recordingIconDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#EF4444',
  },
  recordingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F3FF',
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    marginRight: 8,
  },
  recordingLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7C3AED',
  },
  imagePreviewContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  imagePreview: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  clearImageBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearImageText: {
    color: COLORS.text.white,
    fontSize: 12,
    fontWeight: '700',
  },
  sendBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.accent.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnText: {
    color: COLORS.text.white,
    fontSize: 18,
    fontWeight: '700',
    marginTop: -1,
  },
});

export default ChatInput;
