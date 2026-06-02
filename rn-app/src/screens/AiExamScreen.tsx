/**
 * AI出卷页面
 * 三种模式：相似卷、错题巩固卷、自定义试卷
 * 支持拍照/相册上传题目图片，SSE流式生成试卷
 */

import React, {useState, useCallback, useRef, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {mmkvStorage} from '../services/mmkv';
import {API_BASE_URL, COLORS} from '../constants';

// ── 类型定义 ──────────────────────────────────────────

type ExamMode = 'similar' | 'review' | 'custom';

interface ModeConfig {
  key: ExamMode;
  icon: string;
  label: string;
  desc: string;
  endpoint: string;
}

// ── 模式配置 ──────────────────────────────────────────

const MODES: ModeConfig[] = [
  {
    key: 'similar',
    icon: '📄',
    label: '相似卷',
    desc: '基于题目生成相似试卷',
    endpoint: '/exam/generate/similar',
  },
  {
    key: 'review',
    icon: '🔁',
    label: '错题巩固卷',
    desc: '针对错题生成巩固练习',
    endpoint: '/exam/generate/review',
  },
  {
    key: 'custom',
    icon: '✏️',
    label: '自定义试卷',
    desc: '自由描述生成试卷内容',
    endpoint: '/exam/generate/custom',
  },
];

// ── 自定义预设描述 ────────────────────────────────────

const CUSTOM_PRESETS = [
  '初中数学期末考试',
  '高中英语阅读理解',
  '小学语文古诗词默写',
  '高考物理力学专题',
  '中考化学实验题',
  '高中历史材料分析题',
];

// ── 组件 ──────────────────────────────────────────────

const AiExamScreen = ({navigation}: any) => {
  const [mode, setMode] = useState<ExamMode>('similar');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [customText, setCustomText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultText, setResultText] = useState('');
  const [error, setError] = useState('');

  const cancelSSERef = useRef<(() => void) | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const autoScrollRef = useRef(true);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 生成内容变化时自动滚动到底部
  useEffect(() => {
    if (autoScrollRef.current && resultText) {
      scrollRef.current?.scrollToEnd({animated: true});
    }
  }, [resultText]);

  // 组件卸载时取消 SSE
  useEffect(() => {
    return () => {
      cancelSSERef.current?.();
    };
  }, []);

  // 防抖 onScroll：检测用户是否手动滚动离开底部
  const handleScroll = useCallback((e: any) => {
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = setTimeout(() => {
      const {contentOffset, contentSize, layoutMeasurement} = e.nativeEvent;
      const distanceFromBottom =
        contentSize.height - layoutMeasurement.height - contentOffset.y;
      autoScrollRef.current = distanceFromBottom <= 10;
    }, 80);
  }, []);

  const handleGoBack = useCallback(() => {
    cancelSSERef.current?.();
    navigation.goBack();
  }, [navigation]);

  // ── 拍照 / 选图 ─────────────────────────────────────

  const pickImage = useCallback(async (fromCamera: boolean) => {
    const method = fromCamera
      ? ImagePicker.requestCameraPermissionsAsync
      : ImagePicker.requestMediaLibraryPermissionsAsync;
    const {status} = await method();
    if (status !== 'granted') {
      Alert.alert(
        '提示',
        fromCamera ? '需要相机权限才能拍照' : '需要相册权限才能选择图片',
        [{text: '好的'}],
      );
      return;
    }

    const launcher = fromCamera
      ? ImagePicker.launchCameraAsync
      : ImagePicker.launchImageLibraryAsync;

    const r = await launcher({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });

    if (!r.canceled && r.assets?.[0]) {
      setImageUri(r.assets[0].uri);
      setError('');
      setResultText('');
    }
  }, []);

  // ── 上传图片 ─────────────────────────────────────────

  const uploadImage = useCallback(async (uri: string): Promise<string> => {
    const formData = new FormData();
    if (Platform.OS === 'web') {
      const resp = await fetch(uri);
      const blob = await resp.blob();
      formData.append('file', blob, 'exam.jpg');
    } else {
      formData.append('file', {
        uri,
        name: 'exam.jpg',
        type: 'image/jpeg',
      } as any);
    }

    const token = mmkvStorage.getToken();
    const res = await fetch(`${API_BASE_URL}/exam/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!res.ok) throw new Error(`上传失败 HTTP ${res.status}`);
    const json = await res.json();
    const url = json.data?.url || json.url;
    if (!url) throw new Error('上传返回URL为空');
    // 转为完整地址
    return url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
  }, []);

  // ── 生成试卷（SSE流式） ──────────────────────────────

  const handleGenerate = useCallback(async () => {
    // 校验
    if (mode !== 'custom' && !imageUri) {
      Alert.alert('提示', '请先上传题目图片', [{text: '好的'}]);
      return;
    }
    if (mode === 'custom' && !customText.trim()) {
      Alert.alert('提示', '请输入试卷描述', [{text: '好的'}]);
      return;
    }

    const token = mmkvStorage.getToken();
    if (!token) {
      Alert.alert('提示', '请先登录', [{text: '好的'}]);
      return;
    }

    setIsGenerating(true);
    setResultText('');
    setError('');

    try {
      let imageUrl: string | undefined;
      if (imageUri && mode !== 'custom') {
        imageUrl = await uploadImage(imageUri);
      }

      const modeConfig = MODES.find(m => m.key === mode)!;
      const body: Record<string, any> = {};
      if (imageUrl) body.imageUrl = imageUrl;
      if (mode === 'custom') body.description = customText.trim();

      const controller = new AbortController();
      cancelSSERef.current = () => controller.abort();

      const response = await fetch(`${API_BASE_URL}${modeConfig.endpoint}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader');

      const decoder = new TextDecoder();
      let buffer = '';
      let fullText = '';

      const readLoop = async (): Promise<void> => {
        const {done, value} = await reader.read();
        if (done) {
          setIsGenerating(false);
          return;
        }

        buffer += decoder.decode(value, {stream: true});
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (dataStr === '[DONE]') {
              setIsGenerating(false);
              return;
            }
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.done) {
                setIsGenerating(false);
                return;
              }
              if (parsed.error) {
                setError(parsed.error);
                setIsGenerating(false);
                return;
              }
              if (parsed.token) {
                fullText += parsed.token;
                setResultText(fullText);
              } else if (parsed.content) {
                fullText += parsed.content;
                setResultText(fullText);
              }
            } catch {
              // 非JSON，直接追加
              if (dataStr) {
                fullText += dataStr;
                setResultText(fullText);
              }
            }
          }
        }

        return readLoop();
      };

      await readLoop();
      setIsGenerating(false);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err.message || '生成失败，请重试');
        setIsGenerating(false);
      }
    }
  }, [mode, imageUri, customText, uploadImage]);

  // ── 重置 ─────────────────────────────────────────────

  const handleReset = useCallback(() => {
    cancelSSERef.current?.();
    setResultText('');
    setError('');
    setImageUri(null);
    setCustomText('');
    setIsGenerating(false);
  }, []);

  // ── 预设描述点击 ─────────────────────────────────────

  const handlePresetPress = useCallback((preset: string) => {
    setCustomText(preset);
  }, []);

  // ── 渲染 ─────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* 顶部导航栏 */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={handleGoBack}
          activeOpacity={0.7}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>AI出卷</Text>
          <Text style={styles.headerSubtitle}>智能生成试卷</Text>
        </View>
        <View style={{width: 40}} />
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        onScroll={handleScroll}
        scrollEventThrottle={100}>
        {/* 模式选择 */}
        {!resultText && !isGenerating && (
          <>
            <Text style={styles.sectionTitle}>选择出卷模式</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.modeScroll}>
              {MODES.map(item => (
                <TouchableOpacity
                  key={item.key}
                  style={[
                    styles.modeCard,
                    mode === item.key && styles.modeCardActive,
                  ]}
                  onPress={() => {
                    setMode(item.key);
                    setError('');
                    setResultText('');
                  }}
                  activeOpacity={0.7}>
                  <Text style={styles.modeIcon}>{item.icon}</Text>
                  <Text
                    style={[
                      styles.modeLabel,
                      mode === item.key && styles.modeLabelActive,
                    ]}>
                    {item.label}
                  </Text>
                  <Text style={styles.modeDesc}>{item.desc}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* 上传区域（相似卷 / 错题巩固卷） */}
            {mode !== 'custom' && (
              <>
                <Text style={styles.sectionTitle}>
                  {mode === 'similar' ? '上传题目图片' : '上传错题图片'}
                </Text>
                {imageUri ? (
                  <View style={styles.imageContainer}>
                    <Image
                      source={{uri: imageUri}}
                      style={styles.previewImage}
                    />
                    <TouchableOpacity
                      style={styles.removeImageBtn}
                      onPress={() => setImageUri(null)}
                      activeOpacity={0.7}>
                      <Text style={styles.removeImageText}>✕</Text>
                    </TouchableOpacity>
                    <View style={styles.imageHint}>
                      <Text style={styles.imageHintText}>
                        已选择图片，点击 ✕ 可重新选择
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.uploadArea}>
                    <TouchableOpacity
                      style={styles.uploadBtn}
                      onPress={() => pickImage(true)}
                      activeOpacity={0.7}>
                      <View style={styles.uploadIconWrap}>
                        <Text style={styles.uploadIcon}>📷</Text>
                      </View>
                      <Text style={styles.uploadTitle}>拍照</Text>
                      <Text style={styles.uploadDesc}>拍摄题目照片</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.uploadBtn}
                      onPress={() => pickImage(false)}
                      activeOpacity={0.7}>
                      <View style={styles.uploadIconWrap}>
                        <Text style={styles.uploadIcon}>🖼️</Text>
                      </View>
                      <Text style={styles.uploadTitle}>相册</Text>
                      <Text style={styles.uploadDesc}>从相册选择</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}

            {/* 自定义输入 */}
            {mode === 'custom' && (
              <>
                <Text style={styles.sectionTitle}>预设描述</Text>
                <View style={styles.presetWrap}>
                  {CUSTOM_PRESETS.map(preset => (
                    <TouchableOpacity
                      key={preset}
                      style={[
                        styles.presetChip,
                        customText === preset && styles.presetChipActive,
                      ]}
                      onPress={() => handlePresetPress(preset)}
                      activeOpacity={0.7}>
                      <Text
                        style={[
                          styles.presetChipText,
                          customText === preset && styles.presetChipTextActive,
                        ]}>
                        {preset}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.sectionTitle}>试卷描述</Text>
                <TextInput
                  style={styles.customInput}
                  value={customText}
                  onChangeText={setCustomText}
                  placeholder="例如：高一数学必修一期末模拟卷，包含选择题10道、填空题5道、解答题4道"
                  placeholderTextColor={COLORS.text.darkFaint}
                  multiline
                  maxLength={500}
                  textAlignVertical="top"
                  editable={!isGenerating}
                />
                {customText.length > 0 && (
                  <Text style={styles.charCount}>
                    {customText.length}/500
                  </Text>
                )}
              </>
            )}

            {/* 生成按钮 */}
            <TouchableOpacity
              style={[
                styles.generateBtn,
                isGenerating && styles.generateBtnDisabled,
              ]}
              onPress={handleGenerate}
              disabled={isGenerating}
              activeOpacity={0.7}>
              {isGenerating ? (
                <View style={styles.generateBtnRow}>
                  <ActivityIndicator
                    size="small"
                    color={COLORS.text.white}
                  />
                  <Text style={styles.generateBtnText}> 生成中...</Text>
                </View>
              ) : (
                <Text style={styles.generateBtnText}>🚀 生成试卷</Text>
              )}
            </TouchableOpacity>
          </>
        )}

        {/* 加载动画（无结果时） */}
        {isGenerating && !resultText && (
          <View style={styles.loadingContainer}>
            <View style={styles.loadingAnim}>
              <ActivityIndicator
                size="large"
                color={COLORS.accent.primary}
              />
            </View>
            <Text style={styles.loadingTitle}>AI正在出卷中</Text>
            <Text style={styles.loadingDesc}>
              正在分析题目、生成试卷内容...
            </Text>
          </View>
        )}

        {/* 错误提示 */}
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => {
                setError('');
                setIsGenerating(false);
              }}
              activeOpacity={0.7}>
              <Text style={styles.retryBtnText}>重试</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* 结果区域 */}
        {resultText ? (
          <View style={styles.resultSection}>
            <View style={styles.resultHeader}>
              <Text style={styles.resultHeaderText}>📋 生成结果</Text>
            </View>
            <View style={styles.resultContainer}>
              <Text style={styles.resultText}>
                {resultText}
                {isGenerating ? '▍' : ''}
              </Text>
            </View>
          </View>
        ) : null}
      </ScrollView>

      {/* 底部操作栏 */}
      {(resultText || error) && (
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.resetBtn}
            onPress={handleReset}
            activeOpacity={0.7}>
            <Text style={styles.resetBtnText}>📝 重新出卷</Text>
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

// ── 样式 ──────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.light.bg,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: COLORS.light.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.light.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.light.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backBtnText: {
    color: COLORS.text.lightSecondary,
    fontSize: 20,
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text.lightPrimary,
  },
  headerSubtitle: {
    fontSize: 11,
    color: COLORS.accent.primary,
    marginTop: 2,
  },

  // Scroll
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },

  // Section title
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.lightSecondary,
    marginBottom: 10,
    marginTop: 16,
  },

  // Mode cards
  modeScroll: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  modeCard: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: COLORS.light.surface,
    marginRight: 12,
    minWidth: 110,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  modeCardActive: {
    borderColor: COLORS.accent.primary,
    backgroundColor: COLORS.accent.primaryMuted,
  },
  modeIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  modeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.lightSecondary,
    marginBottom: 4,
  },
  modeLabelActive: {
    color: COLORS.accent.primary,
  },
  modeDesc: {
    fontSize: 11,
    color: COLORS.text.lightMuted,
    textAlign: 'center',
  },

  // Upload
  uploadArea: {
    flexDirection: 'row',
    gap: 12,
  },
  uploadBtn: {
    flex: 1,
    backgroundColor: COLORS.light.surface,
    borderWidth: 1.5,
    borderColor: 'rgba(124,106,239,0.2)',
    borderStyle: 'dashed',
    borderRadius: 16,
    paddingVertical: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.accent.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  uploadIcon: {
    fontSize: 26,
  },
  uploadTitle: {
    fontSize: 15,
    color: COLORS.text.lightPrimary,
    fontWeight: '700',
    marginTop: 4,
  },
  uploadDesc: {
    fontSize: 12,
    color: COLORS.text.lightMuted,
    marginTop: 4,
  },

  // Image preview
  imageContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: COLORS.light.surface,
    borderWidth: 1,
    borderColor: 'rgba(124,106,239,0.2)',
  },
  previewImage: {
    width: '100%',
    height: 220,
  },
  removeImageBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeImageText: {
    color: COLORS.text.white,
    fontSize: 14,
    fontWeight: '700',
  },
  imageHint: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: COLORS.accent.primaryHover,
  },
  imageHintText: {
    fontSize: 12,
    color: COLORS.accent.primary,
    fontWeight: '600',
  },

  // Preset chips
  presetWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  presetChip: {
    backgroundColor: COLORS.light.surface,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.light.border,
  },
  presetChipActive: {
    borderColor: COLORS.accent.primary,
    backgroundColor: COLORS.accent.primaryMuted,
  },
  presetChipText: {
    fontSize: 13,
    color: COLORS.text.lightSecondary,
    fontWeight: '500',
  },
  presetChipTextActive: {
    color: COLORS.accent.primary,
    fontWeight: '600',
  },

  // Custom input
  customInput: {
    backgroundColor: COLORS.light.surface,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 14,
    color: COLORS.text.lightSecondary,
    fontSize: 14,
    minHeight: 80,
    maxHeight: 120,
    lineHeight: 20,
  },
  charCount: {
    fontSize: 11,
    color: COLORS.text.darkFaint,
    textAlign: 'right',
    marginTop: 4,
  },

  // Generate button
  generateBtn: {
    backgroundColor: '#3B82F6',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
    shadowColor: '#3B82F6',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  generateBtnDisabled: {
    opacity: 0.6,
    shadowOpacity: 0,
  },
  generateBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  generateBtnText: {
    color: COLORS.text.white,
    fontSize: 17,
    fontWeight: '700',
  },

  // Loading
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingAnim: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.accent.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  loadingTitle: {
    color: COLORS.text.lightPrimary,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 8,
  },
  loadingDesc: {
    color: COLORS.text.lightMuted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Error
  errorContainer: {
    backgroundColor: 'rgba(248,81,73,0.08)',
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(248,81,73,0.15)',
    alignItems: 'center',
    marginTop: 16,
  },
  errorIcon: {
    fontSize: 36,
    marginBottom: 10,
  },
  errorText: {
    color: '#f85149',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 14,
  },
  retryBtn: {
    backgroundColor: 'rgba(248,81,73,0.12)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryBtnText: {
    color: '#f85149',
    fontSize: 14,
    fontWeight: '600',
  },

  // Result
  resultSection: {
    marginTop: 16,
    marginBottom: 20,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  resultHeaderText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.accent.primary,
  },
  resultContainer: {
    backgroundColor: COLORS.light.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.light.border,
  },
  resultText: {
    fontSize: 15,
    color: COLORS.text.lightSecondary,
    lineHeight: 24,
  },

  // Bottom bar
  bottomBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.light.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.light.border,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
  },
  resetBtn: {
    backgroundColor: COLORS.accent.primaryMuted,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(124,106,239,0.25)',
  },
  resetBtnText: {
    color: COLORS.accent.primary,
    fontSize: 15,
    fontWeight: '600',
  },
});

export default AiExamScreen;
