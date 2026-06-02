/**
 * AI 生图页面
 *
 * 功能：用户输入描述 → 选择比例 → 生成图片
 * 支持从模板"做同款"自动带入风格 prompt
 */

import React, {useState, useEffect, useCallback, useRef} from 'react';
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
} from 'react-native';
import {createAPI} from '../services/api';
import {resolveImageUrl, COLORS} from '../constants';
import {ImageJob} from '../types';

// 图片比例选项
const ASPECT_RATIOS = [
  {label: '1:1', value: '1:1'},
  {label: '16:9', value: '16:9'},
  {label: '9:16', value: '9:16'},
  {label: '4:3', value: '4:3'},
];

const AiGenScreen = ({route, navigation}: any) => {
  const {templateId, stylePrompt} = route.params || {};

  const [userDescription, setUserDescription] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [showNegative, setShowNegative] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentJob, setCurrentJob] = useState<ImageJob | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 清理轮询定时器
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // 轮询任务状态
  const pollJobStatus = useCallback((jobId: string) => {
    pollRef.current = setInterval(async () => {
      try {
        const job = await createAPI.getJobStatus(jobId);
        setCurrentJob(job);
        if (job.status === 'completed') {
          setResultImage(job.resultImageUrl || null);
          setIsGenerating(false);
          if (pollRef.current) clearInterval(pollRef.current);
        } else if (job.status === 'failed') {
          setIsGenerating(false);
          if (pollRef.current) clearInterval(pollRef.current);
          Alert.alert('生成失败', job.errorMsg || '未知错误');
        }
      } catch (error) {
        console.error('轮询任务状态失败:', error);
      }
    }, 2000);
  }, []);

  // 点击生成
  const handleGenerate = useCallback(async () => {
    if (!userDescription.trim()) {
      Alert.alert('提示', '请输入图片描述');
      return;
    }

    setIsGenerating(true);
    setResultImage(null);

    try {
      const job = await createAPI.aiGen({
        templateId,
        userDescription: userDescription.trim(),
        aspectRatio,
        negativePrompt: negativePrompt.trim() || undefined,
      });
      setCurrentJob(job);
      pollJobStatus(job.id);
    } catch (error: any) {
      setIsGenerating(false);
      const msg = error?.response?.data?.message || '请求失败，请重试';
      Alert.alert('错误', msg);
    }
  }, [userDescription, aspectRatio, negativePrompt, templateId, pollJobStatus]);

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
        <Text style={styles.headerTitle}>AI 生图</Text>
        <View style={{width: 40}} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">

        {/* 模板风格提示（如果有） */}
        {stylePrompt && (
          <View style={styles.templateChip}>
            <Text style={styles.templateChipIcon}>🎨</Text>
            <Text style={styles.templateChipText} numberOfLines={2}>
              风格：{stylePrompt}
            </Text>
          </View>
        )}

        {/* 图片描述输入 */}
        <Text style={styles.label}>描述你想要的图片</Text>
        <TextInput
          style={styles.textInput}
          placeholder="例如：一只穿着宇航服的猫在月球上漫步..."
          placeholderTextColor={COLORS.text.darkFaint}
          value={userDescription}
          onChangeText={setUserDescription}
          multiline
          maxLength={500}
          textAlignVertical="top"
        />

        {/* 比例选择 */}
        <Text style={styles.label}>图片比例</Text>
        <View style={styles.ratioRow}>
          {ASPECT_RATIOS.map(r => (
            <TouchableOpacity
              key={r.value}
              style={[
                styles.ratioBtn,
                aspectRatio === r.value && styles.ratioBtnActive,
              ]}
              onPress={() => setAspectRatio(r.value)}
              activeOpacity={0.7}>
              <Text
                style={[
                  styles.ratioBtnText,
                  aspectRatio === r.value && styles.ratioBtnTextActive,
                ]}>
                {r.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 反向提示词（可展开） */}
        <TouchableOpacity
          style={styles.negativeToggle}
          onPress={() => setShowNegative(!showNegative)}
          activeOpacity={0.7}>
          <Text style={styles.negativeToggleText}>
            {showNegative ? '▼' : '▶'} 反向提示词（可选）
          </Text>
        </TouchableOpacity>
        {showNegative && (
          <TextInput
            style={[styles.textInput, {height: 60}]}
            placeholder="不希望出现的元素，如：模糊、低质量、变形..."
            placeholderTextColor={COLORS.text.darkFaint}
            value={negativePrompt}
            onChangeText={setNegativePrompt}
            maxLength={200}
          />
        )}

        {/* 生成按钮 */}
        <TouchableOpacity
          style={[styles.genBtn, isGenerating && styles.genBtnDisabled]}
          onPress={handleGenerate}
          disabled={isGenerating}
          activeOpacity={0.7}>
          {isGenerating ? (
            <ActivityIndicator color={COLORS.text.white} size="small" />
          ) : (
            <Text style={styles.genBtnText}>生成图片</Text>
          )}
        </TouchableOpacity>

        {/* 生成中状态 */}
        {isGenerating && currentJob && (
          <View style={styles.loadingArea}>
            <ActivityIndicator color={COLORS.accent.primary} size="large" />
            <Text style={styles.loadingText}>AI 正在创作中...</Text>
            <Text style={styles.loadingSubText}>
              任务 ID：{currentJob.id.substring(0, 8)}...
            </Text>
          </View>
        )}

        {/* 结果展示 */}
        {resultImage && (
          <View style={styles.resultArea}>
            <Text style={styles.resultTitle}>生成结果</Text>
            <Image
              source={{uri: resolveImageUrl(resultImage)}}
              style={styles.resultImage}
              resizeMode="contain"
            />
            <View style={styles.resultActions}>
              <TouchableOpacity
                style={styles.resultBtn}
                onPress={() => {
                  setUserDescription('');
                  setResultImage(null);
                  setCurrentJob(null);
                }}
                activeOpacity={0.7}>
                <Text style={styles.resultBtnText}>重新生成</Text>
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

  templateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent.primaryMuted,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(124,106,239,0.2)',
  },
  templateChipIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  templateChipText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.accent.primary,
    lineHeight: 18,
  },

  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.darkPrimary,
    marginBottom: 8,
    marginTop: 12,
  },

  textInput: {
    backgroundColor: COLORS.dark.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.dark.border,
    padding: 14,
    fontSize: 15,
    color: COLORS.text.darkPrimary,
    minHeight: 56,
    maxHeight: 100,
    lineHeight: 22,
  },

  ratioRow: {
    flexDirection: 'row',
    gap: 10,
  },
  ratioBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.dark.surface,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.dark.border,
  },
  ratioBtnActive: {
    backgroundColor: COLORS.accent.primaryLight,
    borderColor: 'rgba(124,106,239,0.4)',
  },
  ratioBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.darkMuted,
  },
  ratioBtnTextActive: {
    color: COLORS.accent.primary,
  },

  negativeToggle: {
    marginTop: 12,
    marginBottom: 8,
  },
  negativeToggleText: {
    fontSize: 13,
    color: COLORS.text.darkMuted,
  },

  genBtn: {
    marginTop: 20,
    backgroundColor: COLORS.accent.primary,
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
  loadingSubText: {
    fontSize: 12,
    color: COLORS.text.darkFaint,
    marginTop: 6,
  },

  resultArea: {
    marginTop: 24,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text.darkPrimary,
    marginBottom: 12,
  },
  resultImage: {
    width: '100%',
    height: 350,
    borderRadius: 14,
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
    backgroundColor: COLORS.accent.primaryLight,
    borderWidth: 1,
    borderColor: 'rgba(124,106,239,0.3)',
  },
  resultBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.accent.primary,
  },
});

export default AiGenScreen;
