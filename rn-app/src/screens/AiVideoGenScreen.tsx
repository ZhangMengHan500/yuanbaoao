import React, {useCallback, useState, useRef, useEffect} from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  Linking,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {resolveImageUrl, COLORS} from '../constants';
import {useAiVideoGenStore} from '../stores/aiVideoGenStore';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

// Web 端视频播放器组件（直接操作 DOM）
function WebVideoPlayer({url}: {url: string}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !url) return;

    // 清空容器
    containerRef.current.innerHTML = '';

    // 创建 video 元素
    const video = document.createElement('video');
    video.src = url;
    video.controls = true;
    video.autoplay = true;
    video.style.width = '100%';
    video.style.height = '100%';
    video.style.objectFit = 'contain';
    video.style.borderRadius = '16px';

    containerRef.current.appendChild(video);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [url]);

  return (
    <div
      ref={containerRef as any}
      style={{width: '100%', height: '100%'} as any}
    />
  );
}

const RESOLUTION_OPTIONS = [
  {label: '横屏 16:9', value: '1280x720'},
  {label: '竖屏 9:16', value: '720x1280'},
  {label: '方形 1:1', value: '960x960'},
];

const EXAMPLE_PROMPTS = [
  '一只金色猫咪在阳光下的草地上奔跑，毛发随风飘动',
  '赛博朋克城市夜景，霓虹灯闪烁，飞行汽车穿梭',
  '古风少女在樱花树下翩翩起舞，花瓣纷飞',
  '海浪拍打礁石，日落余晖洒在海面上',
];

const AiVideoGenScreen = ({navigation}: any) => {
  const {
    prompt,
    inputImage,
    resolution,
    mode,
    progress,
    resultVideoUrl,
    status,
    errorMsg,
    setPrompt,
    setInputImage,
    setResolution,
    generate,
    reset,
  } = useAiVideoGenStore();

  const [exampleIndex, setExampleIndex] = useState(0);

  React.useEffect(() => {
    return () => reset();
  }, []);

  const handlePickImage = useCallback(async () => {
    const {status: permStatus} = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permStatus !== 'granted') {
      Alert.alert('提示', '需要相册权限来选择图片');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setInputImage(result.assets[0].uri);
    }
  }, []);

  const handleDownload = useCallback(async () => {
    if (!resultVideoUrl) return;
    const fullUrl = resolveImageUrl(resultVideoUrl);
    try {
      await Linking.openURL(fullUrl);
    } catch {
      Alert.alert('提示', '无法打开下载链接');
    }
  }, [resultVideoUrl]);

  const handleGenerate = useCallback(() => {
    if (!prompt.trim()) {
      Alert.alert('提示', '请输入视频描述');
      return;
    }
    generate();
  }, [prompt]);

  const handleExamplePress = useCallback(
    (text: string) => {
      setPrompt(text);
    },
    [setPrompt],
  );

  const handleNextExample = useCallback(() => {
    setExampleIndex(prev => (prev + 1) % EXAMPLE_PROMPTS.length);
  }, []);

  const isGenerating = status === 'uploading' || status === 'generating';
  const isDone = status === 'done';
  const hasResult = !!resultVideoUrl;

  return (
    <View style={styles.container}>
      {/* 顶部导航栏 */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          activeOpacity={0.7}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AI生视频</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        bounces={false}>
        {/* 生成结果 / 预览区域 */}
        <View style={[styles.previewArea, !hasResult && styles.previewAreaPlaceholder]}>
          {hasResult ? (
            <View style={styles.resultContainer}>
              {Platform.OS === 'web' ? (
                <WebVideoPlayer url={resolveImageUrl(resultVideoUrl)} />
              ) : (
                // React Native 端显示占位
                <View style={styles.videoPlaceholder}>
                  <Text style={styles.videoPlaceholderIcon}>🎬</Text>
                  <Text style={styles.videoPlaceholderText}>视频已生成</Text>
                </View>
              )}
              {/* 操作按钮 */}
              <View style={styles.resultActions}>
                <TouchableOpacity
                  style={styles.resultBtn}
                  onPress={handleDownload}
                  activeOpacity={0.7}>
                  <Text style={styles.resultBtnIcon}>↓</Text>
                  <Text style={styles.resultBtnText}>下载</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.resultBtn}
                  onPress={reset}
                  activeOpacity={0.7}>
                  <Text style={styles.resultBtnIcon}>↻</Text>
                  <Text style={styles.resultBtnText}>重新制作</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.placeholderArea}>
              <Text style={styles.placeholderIcon}>🎬</Text>
              <Text style={styles.placeholderText}>输入描述，生成AI视频</Text>
            </View>
          )}

          {/* 生成中遮罩 */}
          {isGenerating && (
            <View style={styles.generatingOverlay}>
              <View style={styles.progressRing}>
                <ActivityIndicator size="large" color={COLORS.light.surface} />
              </View>
              <Text style={styles.generatingText}>
                {status === 'uploading' ? '上传中...' : '视频生成中...'}
              </Text>
              {status === 'generating' && (
                <>
                  <Text style={styles.generatingPercent}>
                    {progress.percent}%
                  </Text>
                  <View style={styles.progressBarBg}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {width: `${progress.percent}%`},
                      ]}
                    />
                  </View>
                  <Text style={styles.progressHint}>
                    已用时 {progress.elapsed}秒 · 预计还需 {Math.max(0, progress.estimated - progress.elapsed)}秒
                  </Text>
                </>
              )}
            </View>
          )}
        </View>

        {/* 示例提示词 */}
        {!isDone && (
          <View style={styles.examplesSection}>
            <View style={styles.examplesHeader}>
              <Text style={styles.examplesTitle}>试试这些</Text>
              <TouchableOpacity
                style={styles.switchBtn}
                onPress={handleNextExample}
                activeOpacity={0.7}>
                <Text style={styles.switchIcon}>↻</Text>
              </TouchableOpacity>
            </View>
            {EXAMPLE_PROMPTS.slice(exampleIndex, exampleIndex + 3).concat(
              EXAMPLE_PROMPTS.slice(0, Math.max(0, exampleIndex + 3 - EXAMPLE_PROMPTS.length)),
            ).map((text, i) => (
              <TouchableOpacity
                key={`${exampleIndex}-${i}`}
                style={[
                  styles.exampleCard,
                  prompt === text && styles.exampleCardActive,
                ]}
                onPress={() => handleExamplePress(text)}
                activeOpacity={0.7}>
                <Text
                  style={[
                    styles.exampleText,
                    prompt === text && styles.exampleTextActive,
                  ]}
                  numberOfLines={2}>
                  {text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* 分辨率选择 */}
        {!isDone && (
          <View style={styles.resolutionSection}>
            <Text style={styles.resolutionLabel}>视频尺寸</Text>
            <View style={styles.resolutionRow}>
              {RESOLUTION_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.resolutionBtn,
                    resolution === opt.value && styles.resolutionBtnActive,
                  ]}
                  onPress={() => setResolution(opt.value)}
                  activeOpacity={0.7}>
                  <Text
                    style={[
                      styles.resolutionText,
                      resolution === opt.value && styles.resolutionTextActive,
                    ]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* 错误提示 */}
        {status === 'error' && (
          <View style={styles.errorWrap}>
            <Text style={styles.errorText}>{errorMsg || '生成失败，请重试'}</Text>
          </View>
        )}
      </ScrollView>

      {/* 底部输入区域 */}
      {!isDone && (
        <View style={styles.bottomBar}>
          {/* 添加参考图按钮（I2V 模式） */}
          <TouchableOpacity
            style={styles.addRefBtn}
            onPress={handlePickImage}
            activeOpacity={0.7}>
            {inputImage ? (
              <Image
                source={{uri: inputImage}}
                style={styles.refThumb}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.addRefIconWrap}>
                <Text style={styles.addRefIcon}>🖼</Text>
                <Text style={styles.addRefPlus}>+</Text>
              </View>
            )}
            <Text style={styles.addRefText}>
              {inputImage ? '换图' : '图生视频'}
            </Text>
          </TouchableOpacity>

          {/* 输入框 + 发送按钮 */}
          <View style={styles.inputSection}>
            <TextInput
              style={styles.textInput}
              value={prompt}
              onChangeText={setPrompt}
              placeholder="描述你想生成的视频内容..."
              placeholderTextColor={COLORS.text.lightFaint}
              multiline
              maxLength={1000}
              textAlignVertical="top"
            />
            <TouchableOpacity
              style={[
                styles.sendBtn,
                (!prompt.trim() || isGenerating) && styles.sendBtnDisabled,
              ]}
              onPress={handleGenerate}
              disabled={!prompt.trim() || isGenerating}
              activeOpacity={0.8}>
              {isGenerating ? (
                <ActivityIndicator size="small" color={COLORS.text.white} />
              ) : (
                <Text style={styles.sendArrow}>↑</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.light.bg,
  },

  // 顶部导航
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: Platform.OS === 'ios' ? 52 : 12,
    paddingBottom: 12,
    backgroundColor: COLORS.light.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.light.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrow: {
    fontSize: 28,
    color: COLORS.text.lightSecondary,
    fontWeight: '300',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text.lightPrimary,
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },

  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },

  // 预览/结果区域
  previewArea: {
    marginHorizontal: 16,
    marginTop: 16,
    height: (SCREEN_WIDTH - 32) * 9 / 16, // 16:9 比例
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: COLORS.light.surfaceAlt,
  },
  previewAreaPlaceholder: {
    height: 120,
  },
  placeholderArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  placeholderText: {
    fontSize: 15,
    color: COLORS.text.lightMuted,
  },

  // 结果展示
  resultContainer: {
    flex: 1,
  },
  videoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPlaceholderIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  videoPlaceholderText: {
    fontSize: 14,
    color: COLORS.text.lightMuted,
  },
  resultActions: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  resultBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  resultBtnIcon: {
    fontSize: 16,
    color: COLORS.text.lightSecondary,
    marginRight: 6,
  },
  resultBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.lightSecondary,
  },

  // 生成中遮罩
  generatingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.overlay.medium,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressRing: {
    marginBottom: 16,
  },
  generatingText: {
    color: COLORS.text.white,
    fontSize: 16,
    fontWeight: '600',
  },
  generatingPercent: {
    color: COLORS.text.white,
    fontSize: 28,
    fontWeight: '700',
    marginTop: 8,
  },
  progressBarBg: {
    width: '50%',
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 2,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.text.white,
    borderRadius: 2,
  },
  progressHint: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    marginTop: 12,
  },

  // 示例提示词
  examplesSection: {
    marginTop: 20,
    marginHorizontal: 16,
  },
  examplesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  examplesTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text.lightSecondary,
  },
  switchBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.light.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  switchIcon: {
    fontSize: 16,
    color: COLORS.text.lightMuted,
  },
  exampleCard: {
    backgroundColor: COLORS.light.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: COLORS.light.border,
  },
  exampleCardActive: {
    borderColor: COLORS.accent.primary,
    backgroundColor: COLORS.accent.primaryMuted,
  },
  exampleText: {
    fontSize: 14,
    color: COLORS.text.lightSecondary,
    lineHeight: 20,
  },
  exampleTextActive: {
    color: COLORS.accent.primary,
    fontWeight: '500',
  },

  // 分辨率选择
  resolutionSection: {
    marginTop: 16,
    marginHorizontal: 16,
  },
  resolutionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text.lightSecondary,
    marginBottom: 10,
  },
  resolutionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  resolutionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.light.surface,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.light.border,
  },
  resolutionBtnActive: {
    borderColor: COLORS.accent.primary,
    backgroundColor: COLORS.accent.primaryMuted,
  },
  resolutionText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.text.lightMuted,
  },
  resolutionTextActive: {
    color: COLORS.accent.primary,
    fontWeight: '600',
  },

  // 错误
  errorWrap: {
    marginTop: 12,
    marginHorizontal: 16,
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
  },
  errorText: {
    fontSize: 13,
    color: COLORS.semantic.error,
    textAlign: 'center',
  },

  // 底部输入栏
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 34 : 12,
    backgroundColor: COLORS.light.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.light.border,
  },

  // 添加参考按钮
  addRefBtn: {
    width: 64,
    alignItems: 'center',
    marginRight: 10,
    paddingBottom: 4,
  },
  addRefIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: COLORS.light.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.light.border,
  },
  addRefIcon: {
    fontSize: 20,
  },
  addRefPlus: {
    fontSize: 10,
    color: COLORS.text.lightFaint,
    position: 'absolute',
    bottom: 6,
    right: 8,
    fontWeight: '600',
  },
  refThumb: {
    width: 48,
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.light.border,
  },
  addRefText: {
    fontSize: 11,
    color: COLORS.text.lightFaint,
    marginTop: 4,
  },

  // 输入区域
  inputSection: {
    flex: 1,
    position: 'relative',
  },
  textInput: {
    fontSize: 15,
    color: COLORS.text.lightPrimary,
    lineHeight: 22,
    minHeight: 48,
    maxHeight: 120,
    backgroundColor: COLORS.light.surfaceAlt,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingRight: 56,
    paddingTop: 12,
    paddingBottom: 12,
  },
  sendBtn: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.accent.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: COLORS.text.lightFaint,
  },
  sendArrow: {
    fontSize: 20,
    color: COLORS.text.white,
    fontWeight: '700',
  },
});

export default AiVideoGenScreen;
