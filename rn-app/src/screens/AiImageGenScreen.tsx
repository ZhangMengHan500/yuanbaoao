import React, {useCallback, useState, useRef} from 'react';
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
  Animated,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {resolveImageUrl, COLORS} from '../constants';
import {useAiImageGenStore} from '../stores/aiImageGenStore';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

const PROMPT_GROUPS = [
  [
    '一只由云朵构成的可爱小猫，银色线条轮廓',
    '宠物写真，布偶猫cos戴珍珠耳环的少女',
    '宠物写真，柴犬cos戴珍珠耳环的少女',
  ],
  [
    '赛博朋克少女，霓虹灯光，未来感机械臂装饰，科幻质感',
    '古风汉服写真，水墨画风格，山水背景，唯美国风',
    '星空氛围感人像，梦幻银河背景，柔光人像摄影',
  ],
  [
    '王者荣耀李白cos，少年侠客，白衣古风，高清写实',
    '王者荣耀大乔cos，温柔古风少女，水蓝仙气纱裙',
    '王者荣耀朵莉亚cos，人鱼少女，蓝白渐变长发',
  ],
];

const RATIO_OPTIONS = ['1:1', '9:16', '16:9', '4:3'];

const AiImageGenScreen = ({navigation}: any) => {
  const {
    prompt,
    referenceImage,
    aspectRatio,
    progress,
    resultUrl,
    status,
    errorMsg,
    setPrompt,
    setReferenceImage,
    setAspectRatio,
    generate,
    reset,
  } = useAiImageGenStore();

  const [promptGroupIndex, setPromptGroupIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    return () => reset();
  }, []);

  const handleSwitchGroup = useCallback(() => {
    // 淡出 → 切换 → 淡入
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setPromptGroupIndex(prev => (prev + 1) % PROMPT_GROUPS.length);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  }, [fadeAnim]);

  const handlePickImage = useCallback(async () => {
    const {status} = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('提示', '需要相册权限来选择图片');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setReferenceImage(result.assets[0].uri);
    }
  }, []);

  const handleDownload = useCallback(async () => {
    if (!resultUrl) return;
    const fullUrl = resolveImageUrl(resultUrl);
    try {
      await Linking.openURL(fullUrl);
    } catch {
      Alert.alert('提示', '长按图片可保存到相册');
    }
  }, [resultUrl]);

  const handleGenerate = useCallback(() => {
    if (!prompt.trim()) {
      Alert.alert('提示', '请输入提示词');
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

  const isGenerating = status === 'uploading' || status === 'generating';
  const isDone = status === 'done';
  const hasResult = !!resultUrl;

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
        <Text style={styles.headerTitle}>AI生图</Text>
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
              <Image
                source={{uri: resolveImageUrl(resultUrl)}}
                style={styles.resultImage}
                resizeMode="contain"
              />
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
                  onPress={() => {
                    reset();
                  }}
                  activeOpacity={0.7}>
                  <Text style={styles.resultBtnIcon}>↻</Text>
                  <Text style={styles.resultBtnText}>重新制作</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.placeholderArea}>
              <Text style={styles.placeholderIcon}>🎨</Text>
              <Text style={styles.placeholderText}>输入描述，生成你的AI画作</Text>
            </View>
          )}

          {/* 生成中遮罩 */}
          {isGenerating && (
            <View style={styles.generatingOverlay}>
              <View style={styles.progressRing}>
                <ActivityIndicator size="large" color={COLORS.light.surface} />
              </View>
              <Text style={styles.generatingText}>
                {status === 'uploading' ? '上传中...' : '生成中...'}
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
                  <Text style={styles.progressStep}>
                    步骤 {progress.step}/{progress.totalSteps}
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
                onPress={handleSwitchGroup}
                activeOpacity={0.7}>
                <Text style={styles.switchIcon}>↻</Text>
              </TouchableOpacity>
            </View>
            <Animated.View style={{opacity: fadeAnim}}>
              {PROMPT_GROUPS[promptGroupIndex].map((text, i) => (
                <TouchableOpacity
                  key={`${promptGroupIndex}-${i}`}
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
            </Animated.View>
          </View>
        )}

        {/* 比例选择 */}
        {!isDone && (
          <View style={styles.ratioSection}>
            <Text style={styles.ratioLabel}>画面比例</Text>
            <View style={styles.ratioRow}>
              {RATIO_OPTIONS.map(ratio => (
                <TouchableOpacity
                  key={ratio}
                  style={[
                    styles.ratioBtn,
                    aspectRatio === ratio && styles.ratioBtnActive,
                  ]}
                  onPress={() => setAspectRatio(ratio)}
                  activeOpacity={0.7}>
                  <Text
                    style={[
                      styles.ratioText,
                      aspectRatio === ratio && styles.ratioTextActive,
                    ]}>
                    {ratio}
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
          {/* 添加参考图按钮 */}
          <TouchableOpacity
            style={styles.addRefBtn}
            onPress={handlePickImage}
            activeOpacity={0.7}>
            {referenceImage ? (
              <Image
                source={{uri: referenceImage}}
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
              {referenceImage ? '换图' : '添加参考'}
            </Text>
          </TouchableOpacity>

          {/* 输入框 + 发送按钮 */}
          <View style={styles.inputSection}>
            <TextInput
              style={styles.textInput}
              value={prompt}
              onChangeText={setPrompt}
              placeholder="输入想象的画面直接生成"
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
    borderBottomColor: COLORS.light.borderSubtle,
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
    height: SCREEN_WIDTH - 32,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#EEEEEE',
  },
  previewAreaPlaceholder: {
    height: 140,
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
    color: COLORS.text.lightFaint,
  },

  // 结果展示
  resultContainer: {
    flex: 1,
  },
  resultImage: {
    width: '100%',
    height: '100%',
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
    color: COLORS.light.surface,
    fontSize: 16,
    fontWeight: '600',
  },
  generatingPercent: {
    color: COLORS.light.surface,
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
    backgroundColor: COLORS.light.surface,
    borderRadius: 2,
  },
  progressStep: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginTop: 8,
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
    backgroundColor: COLORS.light.border,
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
    borderColor: '#E8E8E8',
  },
  exampleCardActive: {
    borderColor: COLORS.accent.primary,
    backgroundColor: '#EFF6FF',
  },
  exampleText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  exampleTextActive: {
    color: COLORS.accent.primary,
    fontWeight: '500',
  },

  // 比例选择
  ratioSection: {
    marginTop: 16,
    marginHorizontal: 16,
  },
  ratioLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text.lightSecondary,
    marginBottom: 10,
  },
  ratioRow: {
    flexDirection: 'row',
    gap: 10,
  },
  ratioBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.light.surface,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E8E8E8',
  },
  ratioBtnActive: {
    borderColor: COLORS.accent.primary,
    backgroundColor: '#EFF6FF',
  },
  ratioText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text.lightMuted,
  },
  ratioTextActive: {
    color: COLORS.accent.primary,
    fontWeight: '600',
  },

  // 错误
  errorWrap: {
    marginTop: 12,
    marginHorizontal: 16,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    fontSize: 13,
    color: '#DC2626',
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
    borderTopColor: COLORS.light.borderSubtle,
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
    backgroundColor: COLORS.light.bg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
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
    borderColor: '#E0E0E0',
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
    color: COLORS.text.lightSecondary,
    lineHeight: 22,
    minHeight: 48,
    maxHeight: 120,
    backgroundColor: COLORS.light.bg,
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
    color: COLORS.light.surface,
    fontWeight: '700',
  },
});

export default AiImageGenScreen;
