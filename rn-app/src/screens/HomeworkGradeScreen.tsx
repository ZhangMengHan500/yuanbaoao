import React, {useState, useCallback} from 'react';
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
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Markdown from 'react-native-markdown-display';
import {createAPI} from '../services/api';
import {mmkvStorage} from '../services/mmkv';
import {API_BASE_URL, COLORS} from '../constants';

const HomeworkGradeScreen = ({navigation}: any) => {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [textInput, setTextInput] = useState('');
  const [grading, setGrading] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  const pickImage = useCallback(async (fromCamera: boolean) => {
    const method = fromCamera
      ? ImagePicker.requestCameraPermissionsAsync
      : ImagePicker.requestMediaLibraryPermissionsAsync;
    const {status} = await method();
    if (status !== 'granted') {
      Alert.alert('提示', fromCamera ? '需要相机权限才能拍照' : '需要相册权限才能选择图片', [{text: '好的'}]);
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
      setResult('');
      setError('');
    }
  }, []);

  const handleGrade = useCallback(async () => {
    if (!imageUri) {
      Alert.alert('提示', '请先上传作业图片', [{text: '好的'}]);
      return;
    }

    const token = mmkvStorage.getToken();
    if (!token) {
      Alert.alert('提示', '请先登录', [{text: '好的'}]);
      return;
    }

    setGrading(true);
    setResult('');
    setError('');

    try {
      // 1. 上传图片到服务器
      const formData = new FormData();
      if (Platform.OS === 'web') {
        const resp = await fetch(imageUri);
        const blob = await resp.blob();
        formData.append('file', blob, 'homework.jpg');
      } else {
        formData.append('file', {
          uri: imageUri,
          name: 'homework.jpg',
          type: 'image/jpeg',
        } as any);
      }

      const uploadRes: any = await createAPI.uploadImage(formData);
      const uploadUrl = uploadRes.data?.url || uploadRes.url;

      if (!uploadUrl) {
        setError('图片上传失败，请重试');
        setGrading(false);
        return;
      }

      // 2. SSE 流式获取批改结果
      const fullUrl = uploadUrl.startsWith('http')
        ? uploadUrl
        : `${API_BASE_URL}${uploadUrl}`;

      const controller = new AbortController();

      const response = await fetch(`${API_BASE_URL}/homework/grade`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify({
          imageUrl: fullUrl,
          text: textInput.trim() || undefined,
        }),
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
          setGrading(false);
          return;
        }

        buffer += decoder.decode(value, {stream: true});
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.done) {
                setGrading(false);
                return;
              }
              if (parsed.error) {
                setError(parsed.error);
                setGrading(false);
                return;
              }
              if (parsed.token) {
                fullText += parsed.token;
                setResult(fullText);
              }
            } catch {
              // 非JSON数据
            }
          }
        }

        return readLoop();
      };

      await readLoop();
      setGrading(false);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err.message || '批改失败，请重试');
        setGrading(false);
      }
    }
  }, [imageUri, textInput]);

  const handleReset = useCallback(() => {
    setResult('');
    setError('');
    setImageUri(null);
    setTextInput('');
  }, []);

  return (
    <View style={styles.container}>
      {/* 顶部导航栏 */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>作业批改</Text>
          <Text style={styles.headerSubtitle}>AI老师智能批改</Text>
        </View>
        <View style={{width: 40}} />
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">

        {/* 未开始批改时显示上传区域 */}
        {!result && !grading && (
          <>
            {/* 图片上传区 */}
            {imageUri ? (
              <View style={styles.imageContainer}>
                <Image source={{uri: imageUri}} style={styles.previewImage} />
                <TouchableOpacity
                  style={styles.removeImageBtn}
                  onPress={() => setImageUri(null)}>
                  <Text style={styles.removeImageText}>✕</Text>
                </TouchableOpacity>
                <View style={styles.imageHint}>
                  <Text style={styles.imageHintText}>已选择作业图片</Text>
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
                  <Text style={styles.uploadDesc}>拍摄作业照片</Text>
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

            {/* 文字输入 */}
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>补充说明（可选）</Text>
              <TextInput
                style={styles.textInput}
                value={textInput}
                onChangeText={setTextInput}
                placeholder="例如：第3题不会做，请重点讲解..."
                placeholderTextColor="#555"
                multiline
                maxLength={500}
                textAlignVertical="top"
              />
              {textInput.length > 0 && (
                <Text style={styles.charCount}>{textInput.length}/500</Text>
              )}
            </View>

            {/* 批改按钮 */}
            <TouchableOpacity
              style={[styles.gradeBtn, (!imageUri || grading) && styles.gradeBtnDisabled]}
              onPress={handleGrade}
              disabled={!imageUri || grading}
              activeOpacity={0.7}>
              <Text style={styles.gradeBtnText}>🔍 开始批改</Text>
            </TouchableOpacity>
          </>
        )}

        {/* 加载动画 */}
        {grading && !result && (
          <View style={styles.loadingContainer}>
            <View style={styles.loadingAnim}>
              <ActivityIndicator size="large" color={COLORS.accent.primary} />
            </View>
            <Text style={styles.loadingTitle}>AI老师正在批改中</Text>
            <Text style={styles.loadingDesc}>正在识别题目、分析答案、评判对错...</Text>
          </View>
        )}

        {/* 错误提示 */}
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => { setError(''); setGrading(false); }}>
              <Text style={styles.retryBtnText}>重新上传</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* 批改结果 */}
        {result ? (
          <View style={styles.resultSection}>
            <View style={styles.resultHeader}>
              <Text style={styles.resultHeaderText}>📋 批改结果</Text>
            </View>
            <View style={styles.resultContainer}>
              <Markdown style={markdownStyles}>{result}</Markdown>
            </View>
          </View>
        ) : null}
      </ScrollView>

      {/* 底部操作栏 */}
      {(result || error) && (
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.newGradeBtn}
            onPress={handleReset}
            activeOpacity={0.7}>
            <Text style={styles.newGradeBtnText}>📝 重新批改</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const markdownStyles = StyleSheet.create({
  body: {color: COLORS.text.lightSecondary, fontSize: 15, lineHeight: 22},
  heading1: {color: COLORS.text.lightPrimary, fontSize: 20, fontWeight: '700', marginVertical: 10},
  heading2: {color: COLORS.text.lightPrimary, fontSize: 17, fontWeight: '700', marginVertical: 8},
  heading3: {color: '#c9d1d9', fontSize: 15, fontWeight: '600', marginVertical: 6},
  heading4: {color: '#c9d1d9', fontSize: 14, fontWeight: '600', marginVertical: 4},
  strong: {color: COLORS.text.lightPrimary, fontWeight: '700'},
  em: {fontStyle: 'italic', color: COLORS.text.lightMuted},
  code_block: {
    backgroundColor: COLORS.light.bg,
    color: COLORS.text.lightSecondary,
    padding: 12,
    borderRadius: 8,
    fontSize: 13,
    fontFamily: 'monospace',
  },
  code_inline: {
    backgroundColor: 'rgba(110,118,129,0.2)',
    color: COLORS.text.lightSecondary,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 13,
    fontFamily: 'monospace',
  },
  list_item: {color: COLORS.text.lightSecondary, fontSize: 15, lineHeight: 22},
  paragraph: {color: COLORS.text.lightSecondary, fontSize: 15, lineHeight: 22, marginVertical: 4},
  hr: {backgroundColor: 'rgba(255,255,255,0.08)', height: 1, marginVertical: 10},
  fence: {
    backgroundColor: COLORS.light.bg,
    color: COLORS.text.lightSecondary,
    padding: 12,
    borderRadius: 8,
  },
  blockquote: {
    backgroundColor: 'rgba(124,106,239,0.06)',
    borderLeftColor: COLORS.accent.primary,
    borderLeftWidth: 3,
    paddingLeft: 12,
    marginVertical: 6,
  },
  link: {color: COLORS.accent.primary},
});

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: COLORS.light.bg},

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
  backBtnText: {color: COLORS.text.lightSecondary, fontSize: 20},
  headerCenter: {alignItems: 'center'},
  headerTitle: {fontSize: 17, fontWeight: '700', color: COLORS.text.lightPrimary},
  headerSubtitle: {fontSize: 11, color: COLORS.accent.primary, marginTop: 2},

  scrollArea: {flex: 1},
  scrollContent: {padding: 16, paddingBottom: 40},

  // Upload
  uploadArea: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
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
  uploadIcon: {fontSize: 26},
  uploadTitle: {fontSize: 15, color: COLORS.text.lightPrimary, fontWeight: '700', marginTop: 4},
  uploadDesc: {fontSize: 12, color: COLORS.text.lightMuted, marginTop: 4},

  // Image preview
  imageContainer: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: COLORS.light.surface,
    borderWidth: 1,
    borderColor: 'rgba(124,106,239,0.2)',
  },
  previewImage: {
    width: '100%',
    height: 240,
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
  removeImageText: {color: COLORS.text.white, fontSize: 14, fontWeight: '700'},
  imageHint: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: COLORS.accent.primaryHover,
  },
  imageHintText: {fontSize: 12, color: COLORS.accent.primary, fontWeight: '600'},

  // Text input
  inputSection: {marginBottom: 20},
  inputLabel: {
    fontSize: 13,
    color: COLORS.text.lightMuted,
    marginBottom: 8,
    fontWeight: '600',
  },
  textInput: {
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
    color: COLORS.text.lightFaint,
    textAlign: 'right',
    marginTop: 4,
  },

  // Grade button
  gradeBtn: {
    backgroundColor: COLORS.accent.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: COLORS.accent.primary,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  gradeBtnDisabled: {opacity: 0.4, shadowOpacity: 0},
  gradeBtnText: {color: COLORS.text.white, fontSize: 17, fontWeight: '700'},

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
  },
  errorIcon: {fontSize: 36, marginBottom: 10},
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
  retryBtnText: {color: '#f85149', fontSize: 14, fontWeight: '600'},

  // Result
  resultSection: {marginBottom: 20},
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

  // Bottom bar
  bottomBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.light.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.light.border,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
  },
  newGradeBtn: {
    backgroundColor: COLORS.accent.primaryMuted,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(124,106,239,0.25)',
  },
  newGradeBtnText: {color: COLORS.accent.primary, fontSize: 15, fontWeight: '600'},
});

export default HomeworkGradeScreen;
