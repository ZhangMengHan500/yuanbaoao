import React, {useEffect, useCallback, useState} from 'react';
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
  Modal,
  Pressable,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import {resolveImageUrl, COLORS} from '../constants';
import {useSmartEditStore} from '../stores/smartEditStore';
import {useCreateStore} from '../stores/createStore';

const {width: SCREEN_WIDTH} = Dimensions.get('window');
const STYLE_CARD_WIDTH = (SCREEN_WIDTH - 16 * 2 - 12 * 2) / 3;
const STYLE_CARD_HEIGHT = STYLE_CARD_WIDTH * 1.35;

const RATIOS = ['1:1', '4:3', '3:4', '16:9', '9:16'];

const TOOL_COMMANDS: Record<string, string> = {
  expand: '一键扩图',
  enhance: '把图片变清晰',
  beauty: '把图片中的人物美颜',
  remove: '去除图片中的杂物',
  beautify: '一键图片美化',
};

const SmartEditScreen = ({route, navigation}: any) => {
  const {
    image,
    prompt,
    selectedTool,
    progress,
    resultUrl,
    status,
    errorMsg,
    setImage,
    setPrompt,
    setSelectedTool,
    startProcess,
    submitWithPrompt,
    reset,
  } = useSmartEditStore();

  const {templates, fetchCategories} = useCreateStore();

  const [selectedRatio, setSelectedRatio] = useState('3:4');
  const [showRatioDropdown, setShowRatioDropdown] = useState(false);
  const [showStyleModal, setShowStyleModal] = useState(false);

  useEffect(() => {
    fetchCategories();
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
      aspect: [3, 4],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setImage(result.assets[0].uri);
    }
  }, []);

  const handleToolPress = useCallback((tool: string) => {
    if (tool === 'style') {
      setShowStyleModal(true);
      return;
    }
    if (tool === 'ratio') {
      setShowRatioDropdown(v => !v);
      return;
    }
    if (!image) {
      Alert.alert('提示', '请先添加创作素材');
      return;
    }
    // 选中工具，将工具指令填入输入框，不自动触发生成
    setSelectedTool(tool);
    setPrompt(TOOL_COMMANDS[tool] || tool);
  }, [image, setPrompt]);

  const handleRatioSelect = useCallback((ratio: string) => {
    setSelectedRatio(ratio);
    setShowRatioDropdown(false);
  }, []);

  const handleStyleSelect = useCallback((style: {id: string; name: string; prompt?: string}) => {
    setShowStyleModal(false);
    if (!image) {
      Alert.alert('提示', '请先添加创作素材');
      return;
    }
    // 选中风格，将风格指令填入输入框，不自动触发生成
    const stylePrompt = style.prompt || `${style.name}风格`;
    setPrompt(stylePrompt);
  }, [image, setPrompt]);

  const handleSend = useCallback(() => {
    if (!image) {
      Alert.alert('提示', '请先添加创作素材');
      return;
    }
    if (!prompt.trim()) {
      Alert.alert('提示', '请输入P图指令或选择工具');
      return;
    }
    // 如果有选中工具则传入工具名，否则作为自定义指令
    submitWithPrompt(selectedTool || undefined);
  }, [image, prompt, selectedTool]);

  const handleDownload = useCallback(async () => {
    if (!resultUrl) return;
    const fullUrl = resolveImageUrl(resultUrl);
    try {
      if (Platform.OS === 'web') {
        const response = await fetch(fullUrl);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `smart-edit-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        Alert.alert('提示', '图片已开始下载');
      } else {
        const {status} = await MediaLibrary.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('提示', '需要相册权限来保存图片');
          return;
        }
        const fileUri = `${FileSystem.cacheDirectory || ''}smart-edit-${Date.now()}.png`;
        const downloadRes = await FileSystem.downloadAsync(fullUrl, fileUri);
        await MediaLibrary.saveToLibraryAsync(downloadRes.uri);
        Alert.alert('成功', '图片已保存到相册');
      }
    } catch (error: any) {
      console.error('[SmartEdit] download error:', error);
      Alert.alert('下载失败', error.message || '请重试');
    }
  }, [resultUrl]);

  const handleRetry = useCallback(() => {
    reset();
  }, [reset]);

  const isProcessing = status === 'uploading' || status === 'processing';
  const hasImage = !!image;
  const hasResult = !!resultUrl;

  const renderRatioDropdown = () => {
    if (!showRatioDropdown) return null;
    return (
      <View style={styles.ratioDropdown}>
        {RATIOS.map(ratio => (
          <TouchableOpacity
            key={ratio}
            style={styles.ratioOption}
            onPress={() => handleRatioSelect(ratio)}
            activeOpacity={0.7}>
            <View style={[
              styles.ratioRadio,
              selectedRatio === ratio && styles.ratioRadioActive,
            ]} />
            <Text style={styles.ratioText}>{ratio}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderStyleModal = () => {
    const rows: typeof templates[] = [];
    for (let i = 0; i < templates.length; i += 3) {
      rows.push(templates.slice(i, i + 3));
    }
    return (
      <Modal
        visible={showStyleModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowStyleModal(false)}>
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowStyleModal(false)}>
          <Pressable style={styles.styleModalContent} onPress={e => e.stopPropagation()}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>全部风格</Text>
            <ScrollView contentContainerStyle={styles.styleGrid}>
              {rows.map((row, ri) => (
                <View key={ri} style={styles.styleRow}>
                  {row.map(item => (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.styleCard}
                      onPress={() => handleStyleSelect({id: item.id, name: item.name, prompt: item.prompt})}
                      activeOpacity={0.7}>
                      {item.coverImg ? (
                        <Image
                          source={{uri: resolveImageUrl(item.coverImg)}}
                          style={styles.styleCardImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.styleCardImage}>
                          <Text style={styles.styleCardPlaceholder}>🎨</Text>
                        </View>
                      )}
                      <Text style={styles.styleCardName} numberOfLines={1}>
                        {item.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    );
  };

  const renderCanvas = () => {
    if (hasResult) {
      return (
        <View style={styles.resultContainer}>
          <Image
            source={{uri: resolveImageUrl(resultUrl)}}
            style={styles.resultImage}
            resizeMode="contain"
          />
          <View style={styles.resultActions}>
            <TouchableOpacity
              style={styles.resultBtn}
              onPress={handleDownload}
              activeOpacity={0.7}>
              <Text style={styles.resultBtnIcon}>↓</Text>
              <Text style={styles.resultBtnText}>下载图片</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.resultBtn, styles.resultBtnSecondary]}
              onPress={handleRetry}
              activeOpacity={0.7}>
              <Text style={[styles.resultBtnIcon, styles.resultBtnTextSecondary]}>↻</Text>
              <Text style={[styles.resultBtnText, styles.resultBtnTextSecondary]}>重新制作</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    if (hasImage) {
      return (
        <View style={styles.canvasCard}>
          <Image
            source={{uri: image}}
            style={styles.canvasImage}
            resizeMode="cover"
          />
          {isProcessing && (
            <View style={styles.processingOverlay}>
              <ActivityIndicator size="large" color={COLORS.light.surface} />
              <Text style={styles.processingText}>
                AI处理中... {progress.percent}%
              </Text>
              <View style={styles.progressBarBg}>
                <View
                  style={[styles.progressBarFill, {width: `${progress.percent}%`}]}
                />
              </View>
            </View>
          )}
        </View>
      );
    }

    return (
      <View style={styles.canvasCard}>
        <View style={styles.canvasEmpty}>
          <View style={styles.folderIconWrap}>
            <View style={styles.folderIcon}>
              <View style={styles.folderTab} />
              <View style={styles.folderBody}>
                <View style={styles.miniCard1} />
                <View style={styles.miniCard2} />
              </View>
            </View>
            <Text style={styles.sparkle}>✨</Text>
          </View>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={handlePickImage}
            activeOpacity={0.7}>
            <Text style={styles.addBtnText}>点击添加创作素材</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          activeOpacity={0.7}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>智能P图</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        bounces={false}>
        {renderCanvas()}

        {!hasResult && (
          <View style={styles.toolsRow}>
            <TouchableOpacity
              style={styles.toolBtn}
              onPress={() => handleToolPress('style')}
              disabled={isProcessing}
              activeOpacity={0.7}>
              <Text style={styles.toolIcon}>▾</Text>
              <Text style={styles.toolBtnText}>风格</Text>
            </TouchableOpacity>

            <View>
              <TouchableOpacity
                style={[styles.toolBtn, showRatioDropdown && styles.toolBtnActive]}
                onPress={() => handleToolPress('ratio')}
                disabled={isProcessing}
                activeOpacity={0.7}>
                <Text style={styles.toolIcon}>⊞</Text>
                <Text style={[styles.toolBtnText, showRatioDropdown && styles.toolBtnTextActive]}>
                  {selectedRatio}
                </Text>
                <Text style={[styles.toolIcon, showRatioDropdown && styles.toolIconUp]}>
                  {showRatioDropdown ? '▴' : '▾'}
                </Text>
              </TouchableOpacity>
              {renderRatioDropdown()}
            </View>

            {[
              {key: 'expand', label: '扩图', icon: '↗'},
              {key: 'enhance', label: '变清晰', icon: '↗'},
              {key: 'beauty', label: '人像美颜', icon: '↘'},
              {key: 'remove', label: '去除杂物', icon: '↘'},
              {key: 'beautify', label: '图片美化', icon: '↘'},
            ].map(tool => (
              <TouchableOpacity
                key={tool.key}
                style={[styles.toolBtn, selectedTool === tool.key && styles.toolBtnActive]}
                onPress={() => handleToolPress(tool.key)}
                disabled={isProcessing}
                activeOpacity={0.7}>
                <Text style={[styles.toolIcon, selectedTool === tool.key && styles.toolIconActive]}>{tool.icon}</Text>
                <Text style={[styles.toolBtnText, selectedTool === tool.key && styles.toolBtnTextActive]}>{tool.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {!hasResult && (
          <View style={styles.inputRow}>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={prompt}
                onChangeText={setPrompt}
                placeholder=""
                placeholderTextColor="transparent"
                multiline
                maxLength={500}
              />
              {!prompt && (
                <Text style={styles.inputPlaceholder}>选择素材或描述想法...</Text>
              )}
            </View>
            {prompt.trim() && hasImage && (
              <TouchableOpacity
                style={styles.sendBtn}
                onPress={handleSend}
                disabled={isProcessing}
                activeOpacity={0.7}>
                <Text style={styles.sendIcon}>↑</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {status === 'error' && (
          <View style={styles.errorWrap}>
            <Text style={styles.errorText}>{errorMsg || '处理失败，请重试'}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={handleRetry}>
              <Text style={styles.retryBtnText}>重新开始</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {renderStyleModal()}
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
    paddingTop: Platform.OS === 'ios' ? 56 : 16,
    paddingBottom: 14,
    backgroundColor: COLORS.light.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E8E8E8',
  },
  backBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrow: {
    fontSize: 26,
    color: COLORS.text.lightPrimary,
    fontWeight: '300',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text.lightPrimary,
    flex: 1,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  headerSpacer: {
    width: 36,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  canvasCard: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 20,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#CDCDCD',
    backgroundColor: COLORS.light.bg,
    overflow: 'hidden',
    position: 'relative',
  },
  canvasImage: {
    width: '100%',
    height: '100%',
  },
  canvasEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 20,
  },
  folderIconWrap: {
    alignItems: 'center',
    marginBottom: 20,
  },
  folderIcon: {
    width: 72,
    height: 58,
    position: 'relative',
  },
  folderTab: {
    width: 28,
    height: 10,
    backgroundColor: '#E0E0E0',
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
    position: 'absolute',
    top: 0,
    left: 8,
  },
  folderBody: {
    width: 72,
    height: 48,
    backgroundColor: '#E0E0E0',
    borderRadius: 8,
    position: 'absolute',
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  miniCard1: {
    width: 24,
    height: 32,
    borderRadius: 4,
    backgroundColor: '#C9956B',
    marginRight: 5,
  },
  miniCard2: {
    width: 24,
    height: 32,
    borderRadius: 4,
    backgroundColor: '#4285D4',
  },
  sparkle: {
    fontSize: 14,
    position: 'absolute',
    top: -4,
    right: -6,
  },
  addBtn: {
    backgroundColor: COLORS.light.surface,
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  addBtnText: {
    fontSize: 15,
    color: COLORS.text.lightSecondary,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.overlay.medium,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  processingText: {
    color: COLORS.light.surface,
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    letterSpacing: 0.3,
  },
  progressBarBg: {
    width: '55%',
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    marginTop: 16,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.light.surface,
    borderRadius: 2,
  },
  toolsRow: {
    flexDirection: 'row',
    marginTop: 16,
    flexWrap: 'wrap',
    justifyContent: 'center',
    position: 'relative',
  },
  toolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.light.surface,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 22,
    marginLeft: 5,
    marginRight: 5,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  toolBtnActive: {
    backgroundColor: '#EBF5FF',
    borderColor: COLORS.accent.primary,
    borderWidth: 1,
  },
  toolIcon: {
    fontSize: 13,
    color: '#888888',
    marginRight: 5,
  },
  toolIconUp: {
    color: COLORS.accent.primary,
  },
  toolIconActive: {
    color: COLORS.accent.primary,
  },
  toolBtnText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text.lightSecondary,
    letterSpacing: 0.2,
  },
  toolBtnTextActive: {
    color: COLORS.accent.primary,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.light.surface,
    borderRadius: 28,
    marginTop: 16,
    paddingHorizontal: 22,
    paddingVertical: 15,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  inputContainer: {
    flex: 1,
    position: 'relative',
  },
  input: {
    fontSize: 15,
    color: COLORS.text.lightSecondary,
    minHeight: 20,
    maxHeight: 100,
    padding: 0,
  },
  inputPlaceholder: {
    position: 'absolute',
    fontSize: 15,
    color: COLORS.text.lightFaint,
    left: 0,
    top: 0,
  },
  sendBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.text.lightPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  sendIcon: {
    fontSize: 15,
    color: COLORS.light.surface,
    fontWeight: '600',
  },
  errorWrap: {
    marginTop: 12,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 13,
    color: '#DC2626',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 10,
  },
  retryBtn: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 16,
  },
  retryBtnText: {
    color: COLORS.light.surface,
    fontSize: 13,
    fontWeight: '600',
  },
  // Result display
  resultContainer: {
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#000000',
  },
  resultImage: {
    width: '100%',
    aspectRatio: 3 / 4,
  },
  resultActions: {
    flexDirection: 'row',
    padding: 16,
  },
  resultBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.light.surface,
    paddingVertical: 14,
    borderRadius: 16,
  },
  resultBtnSecondary: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    marginLeft: 12,
  },
  resultBtnIcon: {
    fontSize: 16,
    color: COLORS.text.lightPrimary,
    fontWeight: '700',
    marginRight: 6,
  },
  resultBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.lightPrimary,
  },
  resultBtnTextSecondary: {
    color: COLORS.light.surface,
  },
  // Ratio dropdown
  ratioDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    marginTop: 8,
    backgroundColor: COLORS.light.surface,
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 100,
    minWidth: 140,
  },
  ratioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  ratioRadio: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#CCCCCC',
    marginRight: 12,
  },
  ratioRadioActive: {
    borderColor: COLORS.text.lightSecondary,
    backgroundColor: COLORS.text.lightSecondary,
  },
  ratioText: {
    fontSize: 15,
    color: COLORS.text.lightSecondary,
    fontWeight: '500',
  },
  // Style modal
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay.light,
    justifyContent: 'flex-end',
  },
  styleModalContent: {
    backgroundColor: COLORS.light.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 34,
    maxHeight: '75%',
  },
  modalHandle: {
    width: 36,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.lightPrimary,
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  styleGrid: {
    paddingHorizontal: 16,
  },
  styleRow: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  styleCard: {
    width: STYLE_CARD_WIDTH,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: COLORS.light.bg,
  },
  styleCardImage: {
    width: '100%',
    height: STYLE_CARD_HEIGHT,
    backgroundColor: '#E8E4DF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  styleCardPlaceholder: {
    fontSize: 28,
    opacity: 0.4,
  },
  styleCardName: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.text.lightSecondary,
    textAlign: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
});

export default SmartEditScreen;
