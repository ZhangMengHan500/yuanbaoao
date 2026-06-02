import React, {useEffect, useCallback} from 'react';
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
import {useImg2ImgStore} from '../stores/img2imgStore';

const {width: SCREEN_WIDTH} = Dimensions.get('window');
const CARD_MARGIN = 16;
const CARD_WIDTH = SCREEN_WIDTH - CARD_MARGIN * 2;
const CARD_HEIGHT = CARD_WIDTH * 1.25;

const Img2ImgScreen = ({route, navigation}: any) => {
  const {
    referenceImage,
    prompt,
    progress,
    resultUrl,
    status,
    errorMsg,
    styleName,
    setReferenceImage,
    setPrompt,
    setStyleName,
    startGenerate,
    reset,
  } = useImg2ImgStore();

  // 进入页面自动填充模板数据
  useEffect(() => {
    const {stylePrompt, coverImage, styleName: name} = route.params || {};
    if (stylePrompt) setPrompt(stylePrompt);
    if (coverImage) setReferenceImage(coverImage);
    if (name) setStyleName(name);
    return () => reset();
  }, []);

  // 选择参考图
  const handlePickImage = useCallback(async () => {
    const {status} = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('提示', '需要相册权限来选择图片');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setReferenceImage(result.assets[0].uri);
    }
  }, []);

  // 下载图片
  const handleDownload = useCallback(async () => {
    if (!resultUrl) return;
    const fullUrl = resolveImageUrl(resultUrl);
    try {
      await Linking.openURL(fullUrl);
    } catch {
      Alert.alert('提示', '长按图片可保存到相册');
    }
  }, [resultUrl]);

  // 生成
  const handleGenerate = useCallback(() => {
    if (!referenceImage) {
      Alert.alert('提示', '请先添加参考图');
      return;
    }
    if (!prompt.trim()) {
      Alert.alert('提示', '请输入提示词');
      return;
    }
    startGenerate();
  }, [referenceImage, prompt]);

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
        <Text style={styles.headerTitle} numberOfLines={1}>
          {styleName || '做同款'}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        bounces={false}>
        {/* 生成预览卡片 */}
        <View style={styles.previewCard}>
          {hasResult ? (
            <Image
              source={{uri: resolveImageUrl(resultUrl)}}
              style={styles.previewImage}
              resizeMode="cover"
            />
          ) : referenceImage ? (
            <Image
              source={{uri: referenceImage}}
              style={styles.previewImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.previewPlaceholder}>
              <Text style={styles.placeholderText}>添加参考图开始创作</Text>
            </View>
          )}

          {/* 左上角原图缩略图 */}
          {referenceImage && hasResult && (
            <View style={styles.thumbnailWrap}>
              <Image
                source={{uri: referenceImage}}
                style={styles.thumbnailImage}
                resizeMode="cover"
              />
              <Text style={styles.thumbnailLabel}>原图</Text>
            </View>
          )}

          {/* 右下角下载按钮 */}
          {hasResult && (
            <TouchableOpacity
              style={styles.downloadBtn}
              onPress={handleDownload}
              activeOpacity={0.7}>
              <Text style={styles.downloadIcon}>↓</Text>
            </TouchableOpacity>
          )}

          {/* 生成中遮罩 */}
          {isGenerating && (
            <View style={styles.generatingOverlay}>
              <ActivityIndicator size="large" color={COLORS.accent.primary} />
              <Text style={styles.generatingText}>
                生成中... {progress.percent}%
              </Text>
              <View style={styles.progressBarBg}>
                <View
                  style={[styles.progressBarFill, {width: `${progress.percent}%`}]}
                />
              </View>
              <Text style={styles.progressStep}>
                步骤 {progress.step}/{progress.totalSteps}
              </Text>
            </View>
          )}
        </View>

        {/* 底部功能区 */}
        <View style={styles.bottomArea}>
          {/* 添加参考按钮 */}
          <TouchableOpacity
            style={styles.addRefBtn}
            onPress={handlePickImage}
            activeOpacity={0.7}>
            <View style={styles.addRefIconWrap}>
              <Text style={styles.addRefIcon}>👤</Text>
              <Text style={styles.addRefPlus}>+</Text>
            </View>
            <Text style={styles.addRefText}>添加参考</Text>
          </TouchableOpacity>

          {/* 提示词输入框 + 生成按钮 */}
          <View style={styles.promptSection}>
            <TextInput
              style={styles.promptInput}
              value={prompt}
              onChangeText={setPrompt}
              placeholder="描述你想要的画面风格..."
              placeholderTextColor={COLORS.text.lightFaint}
              multiline
              maxLength={1000}
              textAlignVertical="top"
            />

            {/* 右下角生成按钮 */}
            <TouchableOpacity
              style={[styles.generateBtn, isGenerating && styles.generateBtnDisabled]}
              onPress={handleGenerate}
              disabled={isGenerating}
              activeOpacity={0.8}>
              {isGenerating ? (
                <ActivityIndicator size="small" color={COLORS.text.white} />
              ) : (
                <Text style={styles.generateArrow}>↑</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* 错误提示 */}
          {status === 'error' && (
            <View style={styles.errorWrap}>
              <Text style={styles.errorText}>{errorMsg || '生成失败，请重试'}</Text>
            </View>
          )}
        </View>
      </ScrollView>
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
    paddingBottom: 40,
  },

  // 预览卡片
  previewCard: {
    marginHorizontal: CARD_MARGIN,
    marginTop: 16,
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#EEEEEE',
    // 阴影
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 15,
    color: COLORS.text.lightFaint,
  },

  // 左上角原图缩略图
  thumbnailWrap: {
    position: 'absolute',
    top: 12,
    left: 12,
    alignItems: 'center',
  },
  thumbnailImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: COLORS.light.surface,
  },
  thumbnailLabel: {
    fontSize: 11,
    color: COLORS.light.surface,
    marginTop: 3,
    backgroundColor: COLORS.overlay.light,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
    fontWeight: '500',
  },

  // 右下角下载按钮
  downloadBtn: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  downloadIcon: {
    fontSize: 18,
    color: COLORS.text.lightSecondary,
    fontWeight: '600',
  },

  // 生成中遮罩
  generatingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  generatingText: {
    color: COLORS.light.surface,
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
  },
  progressBarBg: {
    width: '60%',
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 2,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.accent.primary,
    borderRadius: 2,
  },
  progressStep: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginTop: 8,
  },

  // 底部功能区
  bottomArea: {
    marginTop: 16,
    marginHorizontal: CARD_MARGIN,
    backgroundColor: COLORS.light.surface,
    borderRadius: 16,
    padding: 14,
    // 阴影
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  // 添加参考按钮
  addRefBtn: {
    width: 80,
    alignItems: 'center',
    paddingVertical: 10,
    marginBottom: 10,
  },
  addRefIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: COLORS.light.bg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8E8E8',
    marginBottom: 4,
  },
  addRefIcon: {
    fontSize: 22,
  },
  addRefPlus: {
    fontSize: 10,
    color: COLORS.text.lightFaint,
    position: 'absolute',
    bottom: 6,
    right: 8,
    fontWeight: '600',
  },
  addRefText: {
    fontSize: 11,
    color: COLORS.text.lightFaint,
  },

  // 提示词区域
  promptSection: {
    position: 'relative',
  },
  promptInput: {
    fontSize: 15,
    color: COLORS.text.lightSecondary,
    lineHeight: 22,
    minHeight: 120,
    maxHeight: 240,
    padding: 0,
    paddingRight: 50,
  },

  // 生成按钮（蓝色圆形）
  generateBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.accent.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.accent.primary,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  generateBtnDisabled: {
    backgroundColor: '#93C5FD',
    shadowOpacity: 0.1,
  },
  generateArrow: {
    fontSize: 22,
    color: COLORS.light.surface,
    fontWeight: '700',
  },

  // 错误
  errorWrap: {
    marginTop: 10,
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
});

export default Img2ImgScreen;
