import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useDocReaderStore } from './stores/useDocReaderStore';
import DocContentPanel from './DocContentPanel';
import DocChatPanel from './DocChatPanel';
import { COLORS } from '../../constants';

// 清理文档标题中的乱码字符，只保留中文、英文、数字、常见标点
const cleanTitle = (title: string): string => {
  let t = title;
  // 去掉所有非常规字符（乱码、特殊符号、控制字符），只保留中英文数字和常用标点
  t = t.replace(/[^一-龥a-zA-Z0-9\s\-_.()（）《》、，。！？：；""''【】\[\]]/g, '');
  // 去除首尾空白
  t = t.trim();
  // 如果清理后为空，显示默认标题
  if (!t) {
    const ext = title.match(/\.(pdf|txt)$/i);
    return ext ? `${ext[1].toUpperCase()}文档` : '未命名文档';
  }
  return t;
};

const DocReaderScreen = ({ navigation, route }: any) => {
  const { docId } = route.params || {};
  const [uploading, setUploading] = useState(false);
  const [parseTime, setParseTime] = useState(0);
  const parseTimerRef = useRef<NodeJS.Timeout | null>(null);

  const {
    document,
    activeTab,
    setActiveTab,
    uploadDocument,
    loadDocument,
    pollStatus,
    reset,
  } = useDocReaderStore();

  useEffect(() => {
    if (docId) {
      loadDocument(docId);
    }
    return () => reset();
  }, [docId]);

  useEffect(() => {
    if (document?.status === 'parsing' || document?.status === 'pending') {
      // Start timer for parsing duration
      if (!parseTimerRef.current) {
        setParseTime(0);
        parseTimerRef.current = setInterval(() => {
          setParseTime(prev => prev + 1);
        }, 1000);
      }
      pollStatus();
    } else {
      // Stop timer when parsing completes
      if (parseTimerRef.current) {
        clearInterval(parseTimerRef.current);
        parseTimerRef.current = null;
      }
    }

    return () => {
      if (parseTimerRef.current) {
        clearInterval(parseTimerRef.current);
        parseTimerRef.current = null;
      }
    };
  }, [document?.status]);

  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

  const handleUpload = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'text/plain'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const file = result.assets[0];

      // Check file extension
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext !== 'pdf' && ext !== 'txt') {
        Alert.alert('格式不支持', '仅支持 PDF 和 TXT 文件');
        return;
      }

      // Check file size
      if (file.size && file.size > MAX_FILE_SIZE) {
        Alert.alert('文件过大', `文件不能超过50MB，当前文件大小为${(file.size / 1024 / 1024).toFixed(1)}MB`);
        return;
      }

      setUploading(true);

      const formData = new FormData();
      if (Platform.OS === 'web') {
        const resp = await fetch(file.uri);
        const blob = await resp.blob();
        // Double check size on web
        if (blob.size > MAX_FILE_SIZE) {
          Alert.alert('文件过大', `文件不能超过50MB，当前文件大小为${(blob.size / 1024 / 1024).toFixed(1)}MB`);
          setUploading(false);
          return;
        }
        formData.append('file', blob, file.name);
      } else {
        formData.append('file', {
          uri: file.uri,
          name: file.name,
          type: file.mimeType || (ext === 'txt' ? 'text/plain' : 'application/pdf'),
        } as any);
      }

      await uploadDocument(formData);
    } catch (err: any) {
      Alert.alert('上传失败', err.message || '请重试');
    } finally {
      setUploading(false);
    }
  }, [uploadDocument]);

  if (!document) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}>
            <Text style={styles.backArrow}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>文档阅读</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.center}>
          {uploading ? (
            <>
              <ActivityIndicator size="large" color={COLORS.accent.primary} />
              <Text style={styles.loadingText}>正在上传文档...</Text>
            </>
          ) : (
            <>
              <Text style={styles.emptyIcon}>📄</Text>
              <Text style={styles.emptyText}>选择 PDF 或 TXT 文档开始阅读</Text>
              <TouchableOpacity
                style={styles.uploadBtn}
                onPress={handleUpload}>
                <Text style={styles.uploadBtnText}>+ 上传文档</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  }

  if (document.status === 'parsing' || document.status === 'pending') {
    const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return mins > 0 ? `${mins}分${secs}秒` : `${secs}秒`;
    };

    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}>
            <Text style={styles.backArrow}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {cleanTitle(document.title)}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.accent.primary} />
          <Text style={styles.loadingText}>正在解析文档...</Text>
          <Text style={styles.loadingHint}>已用时 {formatTime(parseTime)}</Text>
          <Text style={styles.loadingHint}>
            {document.fileSize > 10 * 1024 * 1024
              ? '大文件解析较慢，请耐心等待'
              : '请稍候...'}
          </Text>
          {parseTime > 60 && (
            <Text style={styles.loadingWarning}>
              解析时间较长，可能文件较大或内容复杂
            </Text>
          )}
        </View>
      </View>
    );
  }

  if (document.status === 'error') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}>
            <Text style={styles.backArrow}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>文档阅读</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.center}>
          <Text style={styles.emptyIcon}>❌</Text>
          <Text style={styles.emptyText}>文档解析失败</Text>
          <TouchableOpacity
            style={styles.uploadBtn}
            onPress={handleUpload}>
            <Text style={styles.uploadBtnText}>重新上传</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {cleanTitle(document.title)}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'summary' && styles.tabActive]}
          onPress={() => setActiveTab('summary')}>
          <Text style={[styles.tabText, activeTab === 'summary' && styles.tabTextActive]}>
            摘要
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'content' && styles.tabActive]}
          onPress={() => setActiveTab('content')}>
          <Text style={[styles.tabText, activeTab === 'content' && styles.tabTextActive]}>
            正文
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'chat' && styles.tabActive]}
          onPress={() => setActiveTab('chat')}>
          <Text style={[styles.tabText, activeTab === 'chat' && styles.tabTextActive]}>
            问答
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {activeTab === 'summary' || activeTab === 'content' ? (
          <DocContentPanel />
        ) : (
          <DocChatPanel />
        )}
      </View>
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
    paddingHorizontal: 12,
    paddingTop: Platform.OS === 'ios' ? 52 : 12,
    paddingBottom: 12,
    backgroundColor: COLORS.light.surface,
    borderBottomWidth: 1,
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
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.light.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.light.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.accent.primary,
  },
  tabText: {
    fontSize: 14,
    color: COLORS.text.lightMuted,
  },
  tabTextActive: {
    color: COLORS.accent.primary,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.text.lightSecondary,
    marginBottom: 24,
  },
  uploadBtn: {
    backgroundColor: COLORS.accent.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  uploadBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.white,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.text.lightSecondary,
    marginTop: 16,
  },
  loadingHint: {
    fontSize: 13,
    color: COLORS.text.lightMuted,
    marginTop: 8,
  },
  loadingWarning: {
    fontSize: 13,
    color: '#f59e0b',
    marginTop: 12,
    textAlign: 'center',
  },
});

export default DocReaderScreen;
