import React, {useEffect, useState, useCallback} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import {knowledgeAPI} from '../services/api';
import {COLORS} from '../constants';

interface KnowledgeDoc {
  id: string;
  title: string;
  content: string;
  docType: string;
  source?: string;
  createdAt: string;
}

const KnowledgeScreen = ({navigation}: any) => {
  const [docs, setDocs] = useState<KnowledgeDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const fetchDocs = useCallback(async () => {
    try {
      setLoading(true);
      const res: any = await knowledgeAPI.list();
      setDocs(res.data || res || []);
    } catch (err) {
      console.error('Failed to load knowledge docs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocs();
  }, []);

  const handleUpload = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/plain', 'application/pdf'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const file = result.assets[0];
      setUploading(true);

      const formData = new FormData();
      if (Platform.OS === 'web') {
        const resp = await fetch(file.uri);
        const blob = await resp.blob();
        formData.append('file', blob, file.name);
      } else {
        formData.append('file', {
          uri: file.uri,
          name: file.name,
          type: file.mimeType || 'text/plain',
        } as any);
      }

      await knowledgeAPI.uploadFile(formData);
      Alert.alert('成功', `文档「${file.name}」已上传并加入知识库`);
      fetchDocs();
    } catch (err: any) {
      Alert.alert('上传失败', err.message || '请重试');
    } finally {
      setUploading(false);
    }
  }, [fetchDocs]);

  const handleDelete = useCallback(
    (doc: KnowledgeDoc) => {
      const doDelete = async () => {
        try {
          console.log('[Knowledge] Deleting doc:', doc.id, doc.title);
          const res = await knowledgeAPI.delete(doc.id);
          console.log('[Knowledge] Delete response:', res);
          setDocs(prev => prev.filter(d => d.id !== doc.id));
        } catch (err: any) {
          console.error('[Knowledge] Delete failed:', err);
          Alert.alert('删除失败', err.message || '请重试');
        }
      };

      if (Platform.OS === 'web') {
        if (window.confirm(`确定删除文档「${doc.title}」？`)) {
          doDelete();
        }
      } else {
        Alert.alert('确认删除', `确定删除文档「${doc.title}」？`, [
          {text: '取消', style: 'cancel'},
          {text: '删除', style: 'destructive', onPress: doDelete},
        ]);
      }
    },
    [],
  );

  const renderItem = ({item}: {item: KnowledgeDoc}) => (
    <View style={styles.docCard}>
      <View style={styles.docInfo}>
        <Text style={styles.docTitle} numberOfLines={1}>
          {item.docType === 'pdf' ? '📄' : '📝'} {item.title}
        </Text>
        <Text style={styles.docMeta} numberOfLines={1}>
          {item.docType.toUpperCase()} · {item.content.length} 字
          {item.source ? ` · ${item.source}` : ''}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={() => handleDelete(item)}
        activeOpacity={0.7}>
        <Text style={styles.deleteBtnText}>删除</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* 顶部导航 */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          activeOpacity={0.7}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>知识库</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* 说明 */}
      <View style={styles.infoBar}>
        <Text style={styles.infoText}>
          上传 .txt 或 .pdf 文档，聊天时开启「引用知识库」即可基于文档内容回答
        </Text>
      </View>

      {/* 文档列表 */}
      {loading ? (
        <ActivityIndicator style={styles.center} color={COLORS.accent.primary} />
      ) : (
        <FlatList
          data={docs}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📚</Text>
              <Text style={styles.emptyText}>暂无文档</Text>
              <Text style={styles.emptyHint}>点击下方按钮上传文档</Text>
            </View>
          }
        />
      )}

      {/* 上传按钮 */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.uploadBtn, uploading && styles.uploadBtnDisabled]}
          onPress={handleUpload}
          disabled={uploading}
          activeOpacity={0.8}>
          {uploading ? (
            <ActivityIndicator size="small" color={COLORS.text.white} />
          ) : (
            <Text style={styles.uploadBtnText}>+ 上传文档</Text>
          )}
        </TouchableOpacity>
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
  infoBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.accent.primaryMuted,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(124,106,239,0.15)',
  },
  infoText: {
    fontSize: 13,
    color: COLORS.accent.primary,
    lineHeight: 18,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  docCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.light.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.light.border,
  },
  docInfo: {
    flex: 1,
  },
  docTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text.lightPrimary,
    marginBottom: 4,
  },
  docMeta: {
    fontSize: 12,
    color: COLORS.text.lightMuted,
  },
  deleteBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(239,68,68,0.08)',
  },
  deleteBtnText: {
    fontSize: 13,
    color: COLORS.semantic.error,
    fontWeight: '500',
  },
  empty: {
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.lightSecondary,
    marginBottom: 6,
  },
  emptyHint: {
    fontSize: 13,
    color: COLORS.text.lightMuted,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    backgroundColor: COLORS.light.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.light.border,
  },
  uploadBtn: {
    backgroundColor: COLORS.accent.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  uploadBtnDisabled: {
    opacity: 0.6,
  },
  uploadBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text.white,
  },
});

export default KnowledgeScreen;
