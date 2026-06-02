import React, {useRef, useCallback, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  FlatList,
  Switch,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {useTranslateStore, LANGUAGES, TabType} from '../stores/translateStore';
import {TranslateSocket, TranslateEvent} from '../services/translateSocket';
import {COLORS} from '../constants';

const translateSocket = new TranslateSocket();

const TranslateScreen = ({navigation}: any) => {
  const {
    activeTab,
    setActiveTab,
    // 文字翻译
    sourceText,
    translatedText,
    sourceLang,
    targetLang,
    isTranslating,
    setSourceText,
    setSourceLang,
    setTargetLang,
    swapLanguages,
    startTextTranslation,
    // 拍照翻译
    photoImageUri,
    photoOcrText,
    photoTranslatedText,
    isPhotoTranslating,
    setPhotoImageUri,
    startPhotoTranslation,
    // 同传翻译
    isSimulRecording,
    simulTranslationPairs,
    simulSourceLang,
    simulTargetLang,
    enableTts,
    setSimulSourceLang,
    setSimulTargetLang,
    swapSimulLanguages,
    setEnableTts,
    setSimulRecording,
    addSimulTranslationPair,
    reset,
  } = useTranslateStore();

  const socketConnectedRef = useRef(false);
  const audioContextRef = useRef<any>(null);
  const scriptProcessorRef = useRef<any>(null);
  const mediaStreamRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      cleanupSimulRecording();
      translateSocket.disconnect();
    };
  }, []);

  const cleanupSimulRecording = useCallback(() => {
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t: any) => t.stop());
      mediaStreamRef.current = null;
    }
  }, []);

  const handleSimulStart = useCallback(async () => {
    if (isSimulRecording) {
      // 停止录音
      setSimulRecording(false);
      translateSocket.emitStopTranslation();
      cleanupSimulRecording();
      return;
    }

    // 连接 WebSocket
    if (!socketConnectedRef.current) {
      const connected = await translateSocket.connect();
      if (!connected) {
        Alert.alert('连接失败', '无法连接到翻译服务');
        return;
      }
      socketConnectedRef.current = true;

      translateSocket.on('translation-result', (data: any) => {
        addSimulTranslationPair(data.sourceText, data.translatedText);
      });

      translateSocket.on('translation-error', (data: any) => {
        console.error('翻译错误:', data.message);
      });

      translateSocket.on('translation-complete', () => {
        setSimulRecording(false);
        cleanupSimulRecording();
      });

      translateSocket.on('audio-chunk', (data: any) => {
        // 播放 TTS 音频
        if (data.audioBase64) {
          playAudioBase64(data.audioBase64);
        }
      });
    }

    // 开始翻译
    translateSocket.emitStartTranslation(simulSourceLang, simulTargetLang, enableTts);

    // 开始录音
    try {
      const stream = await navigator.mediaDevices.getUserMedia({audio: true});
      mediaStreamRef.current = stream;

      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      scriptProcessorRef.current = processor;

      processor.onaudioprocess = (e: any) => {
        const inputData = e.inputBuffer.getChannelData(0);
        // Float32 -> Int16
        const int16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }
        // Int16 -> base64
        const bytes = new Uint8Array(int16.buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64 = btoa(binary);
        translateSocket.emitAudioData(base64);
      };

      source.connect(processor);
      processor.connect(audioContext.destination);
      setSimulRecording(true);
    } catch (err) {
      console.error('录音失败:', err);
      Alert.alert('录音失败', '请允许麦克风权限');
    }
  }, [
    isSimulRecording,
    simulSourceLang,
    simulTargetLang,
    enableTts,
    setSimulRecording,
    addSimulTranslationPair,
    cleanupSimulRecording,
  ]);

  const playAudioBase64 = async (base64: string) => {
    try {
      if (Platform.OS === 'web') {
        const audio = new Audio(`data:audio/wav;base64,${base64}`);
        audio.play();
      } else {
        // Native: 使用 expo-av
        const {Audio} = await import('expo-av');
        const sound = new Audio.Sound();
        await sound.loadAsync({uri: `data:audio/wav;base64,${base64}`});
        await sound.playAsync();
      }
    } catch (err) {
      console.error('音频播放失败:', err);
    }
  };

  const handlePickImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      base64: false,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoImageUri(result.assets[0].uri);
    }
  }, [setPhotoImageUri]);

  const handleTakePhoto = useCallback(async () => {
    const {status} = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('权限不足', '需要相机权限才能拍照翻译');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      base64: false,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoImageUri(result.assets[0].uri);
    }
  }, [setPhotoImageUri]);

  const renderLanguageSelector = (
    source: string,
    target: string,
    onSourceChange: (lang: string) => void,
    onTargetChange: (lang: string) => void,
    onSwap: () => void,
  ) => {
    const sourceLangItem = LANGUAGES.find(l => l.code === source);
    const targetLangItem = LANGUAGES.find(l => l.code === target);

    return (
      <View style={styles.langRow}>
        <TouchableOpacity
          style={styles.langBtn}
          onPress={() => {
            const idx = LANGUAGES.findIndex(l => l.code === source);
            const next = (idx + 1) % LANGUAGES.length;
            onSourceChange(LANGUAGES[next].code);
          }}
          activeOpacity={0.7}>
          <Text style={styles.langBtnText}>
            {sourceLangItem?.flag} {sourceLangItem?.label}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.swapBtn} onPress={onSwap} activeOpacity={0.7}>
          <Text style={styles.swapBtnText}>⇄</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.langBtn}
          onPress={() => {
            const idx = LANGUAGES.findIndex(l => l.code === target);
            const next = (idx + 1) % LANGUAGES.length;
            onTargetChange(LANGUAGES[next].code);
          }}
          activeOpacity={0.7}>
          <Text style={styles.langBtnText}>
            {targetLangItem?.flag} {targetLangItem?.label}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  // ========== 文字翻译面板 ==========
  const renderTextPanel = () => (
    <View style={styles.panel}>
      {renderLanguageSelector(
        sourceLang,
        targetLang,
        setSourceLang,
        setTargetLang,
        swapLanguages,
      )}

      <TextInput
        style={styles.textInput}
        value={sourceText}
        onChangeText={setSourceText}
        placeholder="请输入要翻译的文本"
        placeholderTextColor={COLORS.text.lightMuted}
        multiline
        textAlignVertical="top"
      />

      <TouchableOpacity
        style={[styles.translateBtn, (!sourceText.trim() || isTranslating) && styles.translateBtnDisabled]}
        onPress={startTextTranslation}
        disabled={!sourceText.trim() || isTranslating}
        activeOpacity={0.7}>
        {isTranslating ? (
          <ActivityIndicator size="small" color={COLORS.text.white} />
        ) : (
          <Text style={styles.translateBtnText}>翻译</Text>
        )}
      </TouchableOpacity>

      {translatedText ? (
        <View style={styles.resultBox}>
          <Text style={styles.resultText}>{translatedText}</Text>
          <TouchableOpacity
            style={styles.copyBtn}
            onPress={() => {
              if (Platform.OS === 'web') {
                navigator.clipboard.writeText(translatedText);
              }
            }}
            activeOpacity={0.7}>
            <Text style={styles.copyBtnText}>复制</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );

  // ========== 拍照翻译面板 ==========
  const renderPhotoPanel = () => (
    <View style={styles.panel}>
      {renderLanguageSelector(
        sourceLang,
        targetLang,
        setSourceLang,
        setTargetLang,
        swapLanguages,
      )}

      <View style={styles.photoActions}>
        <TouchableOpacity style={styles.photoBtn} onPress={handleTakePhoto} activeOpacity={0.7}>
          <Text style={styles.photoBtnIcon}>📷</Text>
          <Text style={styles.photoBtnText}>拍照</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.photoBtn} onPress={handlePickImage} activeOpacity={0.7}>
          <Text style={styles.photoBtnIcon}>🖼️</Text>
          <Text style={styles.photoBtnText}>相册</Text>
        </TouchableOpacity>
      </View>

      {photoImageUri && (
        <View style={styles.imagePreview}>
          <Text style={styles.imagePreviewText}>已选择图片</Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.translateBtn, (!photoImageUri || isPhotoTranslating) && styles.translateBtnDisabled]}
        onPress={startPhotoTranslation}
        disabled={!photoImageUri || isPhotoTranslating}
        activeOpacity={0.7}>
        {isPhotoTranslating ? (
          <ActivityIndicator size="small" color={COLORS.text.white} />
        ) : (
          <Text style={styles.translateBtnText}>翻译</Text>
        )}
      </TouchableOpacity>

      {photoOcrText ? (
        <View style={styles.resultBox}>
          <Text style={styles.resultLabel}>识别文字：</Text>
          <Text style={styles.resultText}>{photoOcrText}</Text>
        </View>
      ) : null}

      {photoTranslatedText ? (
        <View style={styles.resultBox}>
          <Text style={styles.resultLabel}>翻译结果：</Text>
          <Text style={styles.resultText}>{photoTranslatedText}</Text>
          <TouchableOpacity
            style={styles.copyBtn}
            onPress={() => {
              if (Platform.OS === 'web') {
                navigator.clipboard.writeText(photoTranslatedText);
              }
            }}
            activeOpacity={0.7}>
            <Text style={styles.copyBtnText}>复制</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );

  // ========== 同传翻译面板 ==========
  const renderSimultaneousPanel = () => (
    <View style={styles.panel}>
      {renderLanguageSelector(
        simulSourceLang,
        simulTargetLang,
        setSimulSourceLang,
        setSimulTargetLang,
        swapSimulLanguages,
      )}

      <View style={styles.ttsRow}>
        <Text style={styles.ttsLabel}>译文语音播报</Text>
        <Switch
          value={enableTts}
          onValueChange={setEnableTts}
          trackColor={{false: COLORS.light.border, true: COLORS.accent.primary + '60'}}
          thumbColor={enableTts ? COLORS.accent.primary : COLORS.text.lightMuted}
        />
      </View>

      <TouchableOpacity
        style={[styles.recordBtn, isSimulRecording && styles.recordBtnActive]}
        onPress={handleSimulStart}
        activeOpacity={0.7}>
        <Text style={[styles.recordBtnText, isSimulRecording && styles.recordBtnTextActive]}>
          {isSimulRecording ? '松开结束' : '按住 说话'}
        </Text>
      </TouchableOpacity>

      {isSimulRecording && (
        <Text style={styles.recordingHint}>正在录音并翻译...</Text>
      )}

      <FlatList
        data={simulTranslationPairs}
        keyExtractor={(_, idx) => String(idx)}
        style={styles.translationList}
        renderItem={({item}) => (
          <View style={styles.translationPair}>
            <Text style={styles.pairSource}>{item.source}</Text>
            <Text style={styles.pairArrow}>→</Text>
            <Text style={styles.pairTranslated}>{item.translated}</Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyHint}>按住按钮开始同传翻译</Text>
        }
      />
    </View>
  );

  return (
    <View style={styles.container}>
      {/* 顶部导航栏 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>翻译</Text>
        <View style={styles.backBtn} />
      </View>

      {/* Tab 栏 */}
      <View style={styles.tabBar}>
        {(['text', 'photo', 'simultaneous'] as TabType[]).map(tab => {
          const labels: Record<TabType, string> = {
            text: '文字翻译',
            photo: '拍照翻译',
            simultaneous: '同传翻译',
          };
          const icons: Record<TabType, string> = {
            text: 'T',
            photo: '📷',
            simultaneous: '🎙',
          };
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.7}>
              <Text style={[styles.tabIcon, activeTab === tab && styles.tabIconActive]}>
                {icons[tab]}
              </Text>
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {labels[tab]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Tab 内容 */}
      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        {activeTab === 'text' && renderTextPanel()}
        {activeTab === 'photo' && renderPhotoPanel()}
        {activeTab === 'simultaneous' && renderSimultaneousPanel()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.light.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    paddingBottom: 12,
    backgroundColor: COLORS.light.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.light.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: {
    fontSize: 22,
    color: COLORS.text.lightPrimary,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.lightPrimary,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.light.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.light.border,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: COLORS.accent.primary,
  },
  tabIcon: {
    fontSize: 16,
    color: COLORS.text.lightMuted,
    marginBottom: 2,
  },
  tabIconActive: {
    color: COLORS.accent.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text.lightMuted,
  },
  tabTextActive: {
    color: COLORS.accent.primary,
  },
  content: {
    flex: 1,
  },
  panel: {
    padding: 16,
  },
  // 语言选择器
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 12,
  },
  langBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: COLORS.light.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.light.border,
  },
  langBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.lightPrimary,
  },
  swapBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.accent.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swapBtnText: {
    fontSize: 18,
    color: COLORS.text.white,
    fontWeight: '700',
  },
  // 文字输入
  textInput: {
    backgroundColor: COLORS.light.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.light.border,
    padding: 14,
    fontSize: 15,
    color: COLORS.text.lightPrimary,
    minHeight: 140,
    maxHeight: 300,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  // 翻译按钮
  translateBtn: {
    backgroundColor: COLORS.accent.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  translateBtnDisabled: {
    opacity: 0.5,
  },
  translateBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text.white,
  },
  // 结果区域
  resultBox: {
    backgroundColor: COLORS.light.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.light.border,
    padding: 14,
    marginBottom: 12,
  },
  resultLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text.lightMuted,
    marginBottom: 8,
  },
  resultText: {
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.text.lightPrimary,
  },
  copyBtn: {
    marginTop: 10,
    alignSelf: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.accent.primary + '15',
    borderRadius: 8,
  },
  copyBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.accent.primary,
  },
  // 拍照翻译
  photoActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 16,
  },
  photoBtn: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: COLORS.light.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.light.border,
  },
  photoBtnIcon: {
    fontSize: 28,
    marginBottom: 6,
  },
  photoBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text.lightSecondary,
  },
  imagePreview: {
    backgroundColor: COLORS.light.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.light.border,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  imagePreviewText: {
    fontSize: 14,
    color: COLORS.text.lightSecondary,
  },
  // 同传翻译
  ttsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  ttsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.lightSecondary,
  },
  recordBtn: {
    backgroundColor: COLORS.light.surface,
    borderRadius: 50,
    paddingVertical: 20,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: COLORS.light.border,
  },
  recordBtnActive: {
    backgroundColor: COLORS.accent.primary,
    borderColor: COLORS.accent.primary,
  },
  recordBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text.lightPrimary,
  },
  recordBtnTextActive: {
    color: COLORS.text.white,
  },
  recordingHint: {
    textAlign: 'center',
    fontSize: 13,
    color: COLORS.accent.primary,
    marginBottom: 12,
  },
  translationList: {
    flex: 1,
    maxHeight: 300,
  },
  translationPair: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.light.surface,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.light.border,
  },
  pairSource: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text.lightSecondary,
    marginRight: 8,
  },
  pairArrow: {
    fontSize: 14,
    color: COLORS.accent.primary,
    marginHorizontal: 4,
  },
  pairTranslated: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.lightPrimary,
    marginLeft: 8,
  },
  emptyHint: {
    textAlign: 'center',
    fontSize: 14,
    color: COLORS.text.lightMuted,
    marginTop: 40,
  },
});

export default TranslateScreen;
