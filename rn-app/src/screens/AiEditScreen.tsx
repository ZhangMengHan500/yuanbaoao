/**
 * 智能 P 图页面
 *
 * 功能：上传图片 → 输入编辑指令 → AI 编辑图片
 */

import React, {useState, useCallback, useRef} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {resolveImageUrl, COLORS} from '../constants';
import {createAPI} from '../services/api';
import {API_BASE_URL} from '../constants';

const AiEditScreen = ({navigation}: any) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [editInstruction, setEditInstruction] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 选择图片
  const pickImage = useCallback(async () => {
    const {status} = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('权限不足', '需要相册权限才能选择图片');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: false,
    });

    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setSelectedImage(uri);

      // 上传到后端
      try {
        const formData = new FormData();
        if (Platform.OS === 'web') {
          const response = await fetch(uri);
          const blob = await response.blob();
          formData.append('file', blob);
        } else {
          formData.append('file', {
            uri,
            name: 'image.jpg',
            type: 'image/jpeg',
          } as any);
        }

        const res: any = await createAPI.uploadImage(formData);
        const fullUrl = `${API_BASE_URL}${res.url}`;
        setUploadedUrl(fullUrl);
      } catch (error) {
        console.error('上传图片失败:', error);
        Alert.alert('错误', '上传图片失败，请重试');
      }
    }
  }, []);

  // 轮询任务状态
  const pollJobStatus = useCallback((jobId: string) => {
    pollRef.current = setInterval(async () => {
      try {
        const job = await createAPI.getJobStatus(jobId);
        if (job.status === 'completed') {
          setResultImage(job.resultImageUrl || null);
          setIsGenerating(false);
          if (pollRef.current) clearInterval(pollRef.current);
        } else if (job.status === 'failed') {
          setIsGenerating(false);
          if (pollRef.current) clearInterval(pollRef.current);
          Alert.alert('P图失败', job.errorMsg || '未知错误');
        }
      } catch (error) {
        console.error('轮询任务状态失败:', error);
      }
    }, 2000);
  }, []);

  // 开始 P 图
  const handleGenerate = useCallback(async () => {
    if (!uploadedUrl) {
      Alert.alert('提示', '请先上传图片');
      return;
    }
    if (!editInstruction.trim()) {
      Alert.alert('提示', '请输入编辑指令');
      return;
    }

    setIsGenerating(true);
    setResultImage(null);

    try {
      const job = await createAPI.aiEdit({
        editInstruction: editInstruction.trim(),
        referenceImageUrl: uploadedUrl,
      });
      pollJobStatus(job.id);
    } catch (error: any) {
      setIsGenerating(false);
      const msg = error?.response?.data?.message || '请求失败，请重试';
      Alert.alert('错误', msg);
    }
  }, [uploadedUrl, editInstruction, pollJobStatus]);

  return (
    <View style={styles.container}>
      {/* 顶部导航栏 */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>智能 P 图</Text>
        <View style={{width: 40}} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">

        {/* 图片上传区域 */}
        <Text style={styles.label}>上传原图</Text>
        <TouchableOpacity
          style={styles.uploadArea}
          onPress={pickImage}
          activeOpacity={0.7}>
          {selectedImage ? (
            <Image
              source={{uri: selectedImage}}
              style={styles.previewImage}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.uploadPlaceholder}>
              <Text style={styles.uploadIcon}>📷</Text>
              <Text style={styles.uploadText}>点击上传图片</Text>
              <Text style={styles.uploadHint}>支持 JPG/PNG/WEBP，最大 10MB</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* 编辑指令输入 */}
        <Text style={styles.label}>编辑指令</Text>
        <TextInput
          style={styles.textInput}
          placeholder="例如：把背景换成海滩 / 添加一顶帽子 / 换成油画风格..."
          placeholderTextColor={COLORS.text.darkFaint}
          value={editInstruction}
          onChangeText={setEditInstruction}
          multiline
          maxLength={500}
          textAlignVertical="top"
        />

        {/* 生成按钮 */}
        <TouchableOpacity
          style={[styles.genBtn, isGenerating && styles.genBtnDisabled]}
          onPress={handleGenerate}
          disabled={isGenerating}
          activeOpacity={0.7}>
          {isGenerating ? (
            <ActivityIndicator color={COLORS.text.white} size="small" />
          ) : (
            <Text style={styles.genBtnText}>开始 P 图</Text>
          )}
        </TouchableOpacity>

        {/* 加载状态 */}
        {isGenerating && (
          <View style={styles.loadingArea}>
            <ActivityIndicator color="#f97316" size="large" />
            <Text style={styles.loadingText}>AI 正在编辑中...</Text>
          </View>
        )}

        {/* 结果对比 */}
        {resultImage && (
          <View style={styles.resultArea}>
            <Text style={styles.resultTitle}>编辑结果</Text>
            <View style={styles.compareRow}>
              <View style={styles.compareItem}>
                <Text style={styles.compareLabel}>原图</Text>
                <Image
                  source={{uri: selectedImage!}}
                  style={styles.compareImage}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.compareItem}>
                <Text style={styles.compareLabel}>效果图</Text>
                <Image
                  source={{uri: resolveImageUrl(resultImage)}}
                  style={styles.compareImage}
                  resizeMode="contain"
                />
              </View>
            </View>
            <View style={styles.resultActions}>
              <TouchableOpacity
                style={styles.resultBtn}
                onPress={() => {
                  setResultImage(null);
                  setEditInstruction('');
                }}
                activeOpacity={0.7}>
                <Text style={styles.resultBtnText}>继续编辑</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.dark.bg,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.dark.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 22,
    color: COLORS.text.darkPrimary,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.darkPrimary,
  },

  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },

  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.darkPrimary,
    marginBottom: 8,
    marginTop: 12,
  },

  // 上传区域
  uploadArea: {
    backgroundColor: COLORS.dark.surface,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: COLORS.dark.border,
    borderStyle: 'dashed',
    minHeight: 200,
    overflow: 'hidden',
  },
  uploadPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  uploadIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  uploadText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text.darkMuted,
    marginBottom: 6,
  },
  uploadHint: {
    fontSize: 12,
    color: COLORS.text.darkFaint,
  },
  previewImage: {
    width: '100%',
    height: 250,
  },

  // 文本输入
  textInput: {
    backgroundColor: COLORS.dark.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.dark.border,
    padding: 14,
    fontSize: 15,
    color: COLORS.text.darkPrimary,
    minHeight: 80,
    lineHeight: 22,
  },

  // 生成按钮
  genBtn: {
    marginTop: 20,
    backgroundColor: '#f97316',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  genBtnDisabled: {
    opacity: 0.6,
  },
  genBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text.white,
  },

  // 加载状态
  loadingArea: {
    alignItems: 'center',
    marginTop: 30,
    paddingVertical: 20,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text.darkPrimary,
    marginTop: 12,
  },

  // 结果对比
  resultArea: {
    marginTop: 24,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text.darkPrimary,
    marginBottom: 12,
  },
  compareRow: {
    flexDirection: 'row',
    gap: 10,
  },
  compareItem: {
    flex: 1,
  },
  compareLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text.darkMuted,
    textAlign: 'center',
    marginBottom: 6,
  },
  compareImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: COLORS.dark.surface,
  },
  resultActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
    gap: 12,
  },
  resultBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(249,115,22,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(249,115,22,0.3)',
  },
  resultBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f97316',
  },
});

export default AiEditScreen;
