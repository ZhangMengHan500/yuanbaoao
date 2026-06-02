import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useDocReaderStore } from './stores/useDocReaderStore';
import { COLORS } from '../../constants';

// 清理文本中的 markdown 标记
const cleanText = (text: string): string => {
  return text
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/^\s*[-*•]\s+/gm, '• ')
    .trim();
};

// 去除分块 overlap 导致的重复内容
const deduplicateOverlap = (chunks: any[]): any[] => {
  if (chunks.length <= 1) return chunks;

  return chunks.map((chunk, index) => {
    if (index === 0) return chunk;

    const prevContent = chunks[index - 1].content;
    const curContent = chunk.content;

    // 找到当前块开头与前一块尾部的最大匹配长度
    let bestMatch = 0;
    const maxCheck = Math.min(prevContent.length, curContent.length, 200);
    for (let len = 20; len <= maxCheck; len++) {
      const prevTail = prevContent.substring(prevContent.length - len);
      const curPrefix = curContent.substring(0, len);
      if (prevTail === curPrefix) {
        bestMatch = len;
      }
    }

    if (bestMatch > 0) {
      return {
        ...chunk,
        content: curContent.substring(bestMatch),
      };
    }

    return chunk;
  });
};

const DocContentPanel = () => {
  const {
    activeTab,
    summaries,
    chunks,
    selectedChunkId,
  } = useDocReaderStore();

  // 去重 + 清理后的 chunks
  const cleanChunks = useMemo(() => {
    const deduped = deduplicateOverlap(chunks);
    return deduped.map(chunk => ({
      ...chunk,
      content: cleanText(chunk.content),
    }));
  }, [chunks]);

  // 合并所有 chunk 为连续文本
  const fullContent = useMemo(() => {
    return cleanChunks.map(c => c.content).join('\n\n');
  }, [cleanChunks]);

  const renderSummary = () => (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
      {summaries.executive && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>执行摘要</Text>
          <Text style={styles.summaryText}>{cleanText(summaries.executive)}</Text>
        </View>
      )}

      {summaries.key_points && Array.isArray(summaries.key_points) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>关键要点</Text>
          {summaries.key_points.map((point, index) => (
            <View key={index} style={styles.pointItem}>
              <View style={styles.pointNumberBadge}>
                <Text style={styles.pointNumber}>{index + 1}</Text>
              </View>
              <Text style={styles.pointText}>{point}</Text>
            </View>
          ))}
        </View>
      )}

      {!summaries.executive && !summaries.key_points && (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="small" color={COLORS.accent.primary} />
          <Text style={styles.emptyText}>正在生成摘要...</Text>
        </View>
      )}
    </ScrollView>
  );

  const renderContent = () => (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.bodyText}>{fullContent}</Text>
    </ScrollView>
  );

  return activeTab === 'summary' ? renderSummary() : renderContent();
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.lightPrimary,
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 15,
    color: COLORS.text.lightSecondary,
    lineHeight: 24,
  },

  // 关键要点
  pointItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  pointNumberBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.accent.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginTop: 1,
  },
  pointNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.accent.primary,
  },
  pointText: {
    fontSize: 15,
    color: COLORS.text.lightSecondary,
    flex: 1,
    lineHeight: 22,
  },

  // 空状态
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 40,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.text.lightMuted,
    marginTop: 12,
  },

  // 正文 — 连续文本，无卡片分隔
  bodyText: {
    fontSize: 15,
    color: COLORS.text.lightSecondary,
    lineHeight: 28,
    letterSpacing: 0.3,
  },
});

export default DocContentPanel;
