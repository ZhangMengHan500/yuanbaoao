import React, {useCallback, useEffect} from 'react';
import {
  View,
  Text,
  Image,
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
import {useCosStore} from '../stores/cosStore';

const {width: SCREEN_WIDTH} = Dimensions.get('window');
const HERO_AVATAR_SIZE = 56;
const HERO_ITEM_WIDTH = 70;

const CosScreen = ({navigation}: any) => {
  const {
    heroes,
    selectedHero,
    heroPreviewUrl,
    previewLoading,
    userImage,
    progress,
    resultUrl,
    status,
    errorMsg,
    fetchHeroes,
    setHero,
    setUserImage,
    generate,
    reset,
  } = useCosStore();

  useEffect(() => {
    fetchHeroes();
    return () => reset();
  }, []);

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
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setUserImage(result.assets[0].uri);
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
    generate();
  }, []);

  const isGenerating = status === 'uploading' || status === 'generating';
  const isDone = status === 'done';
  const hasResult = !!resultUrl;

  const displayPreview = hasResult
    ? resolveImageUrl(resultUrl)
    : heroPreviewUrl || null;

  // ── 预览区域 ──────────────────────────────────────────
  const renderPreview = () => (
    <View style={styles.previewSection}>
      <View style={styles.previewImageWrap}>
        {displayPreview ? (
          <Image source={{uri: displayPreview}} style={styles.previewImage} resizeMode="cover" />
        ) : (
          <View style={[styles.previewImage, styles.previewPlaceholder, {backgroundColor: selectedHero.color + '20'}]}>
            <Text style={styles.previewPlaceholderText}>{selectedHero.name.charAt(0)}</Text>
          </View>
        )}

        {/* 返回按钮 */}
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.backBtnText}>‹</Text>
        </TouchableOpacity>

        {/* 英雄名标签 */}
        <View style={styles.heroTag}>
          <Text style={styles.heroTagText}>{selectedHero.name}</Text>
        </View>

        {/* 预览加载中 */}
        {previewLoading && !displayPreview && (
          <View style={styles.loadingBadge}>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={styles.loadingBadgeText}>AI预览中...</Text>
          </View>
        )}

        {/* 生成中遮罩 */}
        {isGenerating && (
          <View style={styles.generatingOverlay}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.generatingTitle}>
              {status === 'uploading' ? '上传中...' : 'COS生成中...'}
            </Text>
            {status === 'generating' && (
              <>
                <Text style={styles.generatingPercent}>{progress.percent}%</Text>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, {width: `${progress.percent}%`}]} />
                </View>
                <Text style={styles.generatingStep}>步骤 {progress.step}/{progress.totalSteps}</Text>
              </>
            )}
          </View>
        )}

        {/* 结果操作 */}
        {isDone && hasResult && (
          <View style={styles.resultActions}>
            <TouchableOpacity style={styles.resultBtn} onPress={handleDownload} activeOpacity={0.7}>
              <Text style={styles.resultBtnText}>↓ 下载</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.resultBtn, styles.resultBtnOutline]} onPress={() => reset()} activeOpacity={0.7}>
              <Text style={styles.resultBtnOutlineText}>↻ 重新制作</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );

  // ── 融合卡片区域 ──────────────────────────────────────
  const renderFusionCard = () => (
    <View style={styles.fusionSection}>
      <View style={styles.fusionCard}>
        {/* 左侧：用户人脸 */}
        <View style={styles.fusionSlot}>
          {userImage ? (
            <Image source={{uri: userImage}} style={styles.fusionImage} resizeMode="cover" />
          ) : (
            <TouchableOpacity style={styles.fusionPlaceholder} onPress={handlePickImage} activeOpacity={0.7}>
              <Text style={styles.fusionPlaceholderIcon}>👤</Text>
              <Text style={styles.fusionPlaceholderText}>上传人脸</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 中间加号 */}
        <View style={styles.fusionPlus}>
          <Text style={styles.fusionPlusText}>+</Text>
        </View>

        {/* 右侧：英雄模板 */}
        <View style={styles.fusionSlot}>
          {displayPreview ? (
            <Image source={{uri: displayPreview}} style={styles.fusionImage} resizeMode="cover" />
          ) : (
            <View style={[styles.fusionSlotBg, {backgroundColor: selectedHero.color + '30'}]}>
              {previewLoading ? (
                <ActivityIndicator size="small" color={COLORS.accent.primary} />
              ) : (
                <Text style={[styles.fusionSlotLetter, {color: selectedHero.color}]}>{selectedHero.name.charAt(0)}</Text>
              )}
            </View>
          )}
        </View>
      </View>
    </View>
  );

  // ── 底部操作面板 ──────────────────────────────────────
  const renderBottomPanel = () => (
    <View style={styles.bottomPanel}>
      {/* 标题 */}
      <Text style={styles.panelTitle}>选择喜欢的英雄并上传照片吧</Text>

      {/* 英雄选择 */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.heroScroll}>
        {heroes.map(hero => {
          const isActive = selectedHero.name === hero.name;
          return (
            <TouchableOpacity
              key={hero.name}
              style={styles.heroItem}
              onPress={() => setHero(hero)}
              activeOpacity={0.7}>
              <View style={[
                styles.heroAvatar,
                isActive && styles.heroAvatarActive,
              ]}>
                {hero.imageUrl ? (
                  <Image source={{uri: hero.imageUrl}} style={styles.heroAvatarImg} resizeMode="cover" />
                ) : (
                  <View style={[styles.heroAvatarFallback, {backgroundColor: hero.color + '20'}]}>
                    <Text style={[styles.heroAvatarLetter, {color: hero.color}]}>{hero.name.charAt(0)}</Text>
                  </View>
                )}
                {isActive && (
                  <View style={styles.heroCheck}>
                    <Text style={styles.heroCheckText}>✓</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.heroName, isActive && styles.heroNameActive]} numberOfLines={1}>
                {hero.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* 生成按钮 */}
      <TouchableOpacity
        style={[styles.generateBtn, isGenerating && styles.generateBtnDisabled]}
        onPress={handleGenerate}
        disabled={isGenerating}
        activeOpacity={0.8}>
        {isGenerating ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.generateBtnText}>开始生成</Text>
        )}
      </TouchableOpacity>

      {/* 错误 */}
      {status === 'error' && (
        <View style={styles.errorWrap}>
          <Text style={styles.errorText}>{errorMsg || '生成失败，请重试'}</Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {renderPreview()}
      {!isDone && renderFusionCard()}
      {!isDone && renderBottomPanel()}
    </View>
  );
};

// ── 样式 ──────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.light.bg,
  },

  // ── 预览区域 ──────────────────────────────────────────
  previewSection: {
    width: '100%',
  },
  previewImageWrap: {
    width: '100%',
    height: SCREEN_WIDTH * 0.72,
    position: 'relative',
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewPlaceholderText: {
    fontSize: 64,
    fontWeight: '800',
    color: 'rgba(0,0,0,0.08)',
  },
  backBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 52 : 12,
    left: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backBtnText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: '300',
  },
  heroTag: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 52 : 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  heroTagText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  loadingBadge: {
    position: 'absolute',
    bottom: 16,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  loadingBadgeText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    fontWeight: '500',
  },
  generatingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  generatingTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  generatingPercent: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
    marginTop: 8,
  },
  progressBarBg: {
    width: '50%',
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 2,
  },
  generatingStep: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    marginTop: 8,
  },
  resultActions: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  resultBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  resultBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  resultBtnOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  resultBtnOutlineText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },

  // ── 融合卡片 ──────────────────────────────────────────
  fusionSection: {
    alignItems: 'center',
    marginTop: -36,
    zIndex: 10,
    paddingHorizontal: 20,
  },
  fusionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.light.surface,
    borderRadius: 20,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  fusionSlot: {
    width: 100,
    height: 100,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: COLORS.light.bg,
    borderWidth: 1.5,
    borderColor: COLORS.light.border,
  },
  fusionImage: {
    width: '100%',
    height: '100%',
  },
  fusionPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fusionPlaceholderIcon: {
    fontSize: 28,
    marginBottom: 4,
  },
  fusionPlaceholderText: {
    fontSize: 11,
    color: COLORS.text.lightMuted,
    fontWeight: '500',
  },
  fusionPlus: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.light.bg,
    borderWidth: 1.5,
    borderColor: COLORS.light.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fusionPlusText: {
    fontSize: 18,
    color: COLORS.text.lightMuted,
    fontWeight: '600',
  },
  fusionSlotBg: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fusionSlotLetter: {
    fontSize: 32,
    fontWeight: '800',
  },

  // ── 底部面板 ──────────────────────────────────────────
  bottomPanel: {
    flex: 1,
    backgroundColor: COLORS.light.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: 12,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  panelTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text.lightSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },

  // ── 英雄选择 ──────────────────────────────────────────
  heroScroll: {
    gap: 10,
    paddingBottom: 4,
  },
  heroItem: {
    alignItems: 'center',
    width: HERO_ITEM_WIDTH,
  },
  heroAvatar: {
    width: HERO_AVATAR_SIZE,
    height: HERO_AVATAR_SIZE,
    borderRadius: HERO_AVATAR_SIZE / 2,
    borderWidth: 2.5,
    borderColor: 'transparent',
    overflow: 'hidden',
    position: 'relative',
  },
  heroAvatarActive: {
    borderColor: COLORS.accent.primary,
  },
  heroAvatarImg: {
    width: '100%',
    height: '100%',
  },
  heroAvatarFallback: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroAvatarLetter: {
    fontSize: 20,
    fontWeight: '700',
  },
  heroCheck: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.accent.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroCheckText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '700',
  },
  heroName: {
    fontSize: 11,
    color: COLORS.text.lightMuted,
    marginTop: 6,
    fontWeight: '500',
    textAlign: 'center',
  },
  heroNameActive: {
    color: COLORS.accent.primary,
    fontWeight: '600',
  },

  // ── 生成按钮 ──────────────────────────────────────────
  generateBtn: {
    marginTop: 12,
    backgroundColor: COLORS.accent.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  generateBtnDisabled: {
    opacity: 0.5,
  },
  generateBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },

  // ── 错误 ──────────────────────────────────────────────
  errorWrap: {
    marginTop: 12,
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    fontSize: 13,
    color: '#DC2626',
    textAlign: 'center',
  },
});

export default CosScreen;
