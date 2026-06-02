/**
 * 录音列表页（仿腾讯元宝APP）
 * 展示所有录音记录，支持收藏、跳转详情、去录音
 */

import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {mmkvStorage} from '../services/mmkv';
import {COLORS} from '../constants';
import dayjs from 'dayjs';

interface RecordingRecord {
  id: string;
  title: string;
  audioUri: string | null;
  duration: number;
  transcript: string;
  summary: string;
  analysis: string;
  createdAt: string;
  favorited: boolean;
}

const formatDuration = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const RecordingListScreen = ({navigation}: any) => {
  const [recordings, setRecordings] = useState<RecordingRecord[]>([]);

  useFocusEffect(
    useCallback(() => {
      const list = mmkvStorage.getRecordingList();
      // 按录制时间倒序
      list.sort((a: RecordingRecord, b: RecordingRecord) =>
        dayjs(b.createdAt).valueOf() - dayjs(a.createdAt).valueOf(),
      );
      setRecordings(list);
    }, []),
  );

  const handleToggleFavorite = useCallback((id: string) => {
    mmkvStorage.toggleRecordingFavorite(id);
    setRecordings(prev =>
      prev.map(r => (r.id === id ? {...r, favorited: !r.favorited} : r)),
    );
  }, []);

  const handlePressItem = useCallback(
    (item: RecordingRecord) => {
      navigation.navigate('RecordingDetail', {
        message: {
          id: item.id,
          role: 'user',
          content: item.title,
          audioUri: item.audioUri,
          audioDuration: item.duration,
          transcript: item.transcript,
          summary: item.summary,
          analysis: item.analysis,
          createdAt: item.createdAt,
        },
      });
    },
    [navigation],
  );

  const handleGoRecord = useCallback(() => {
    navigation.navigate('ChatRoom');
    // 延迟后触发录音面板（由 ChatScreen 的 + 号进入）
  }, [navigation]);

  const renderItem = useCallback(
    ({item}: {item: RecordingRecord}) => (
      <TouchableOpacity
        style={styles.item}
        onPress={() => handlePressItem(item)}
        activeOpacity={0.6}>
        <View style={styles.itemContent}>
          <Text style={styles.itemTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.itemDuration}>
            {formatDuration(item.duration)}
          </Text>
          <Text style={styles.itemDate}>
            {dayjs(item.createdAt).format('YYYY.MM.DD')}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.favoriteBtn}
          onPress={() => handleToggleFavorite(item.id)}
          activeOpacity={0.6}>
          <Text style={styles.favoriteIcon}>
            {item.favorited ? '⭐' : '☆'}
          </Text>
        </TouchableOpacity>
      </TouchableOpacity>
    ),
    [handlePressItem, handleToggleFavorite],
  );

  const keyExtractor = useCallback((item: RecordingRecord) => item.id, []);

  return (
    <View style={styles.container}>
      {/* 顶部导航栏 */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}>
          <Text style={styles.backArrow}>{'‹'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>录音</Text>
        <View style={styles.headerRight} />
      </View>

      {/* 录音列表 */}
      <FlatList
        data={recordings}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🎙</Text>
            <Text style={styles.emptyText}>暂无录音</Text>
            <Text style={styles.emptyHint}>点击下方按钮开始录音</Text>
          </View>
        }
      />

      {/* 底部「去录音」按钮 */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.recordBtn}
          onPress={handleGoRecord}
          activeOpacity={0.8}>
          <Text style={styles.recordBtnText}>去录音</Text>
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
    color: COLORS.text.lightPrimary,
    fontWeight: '300',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text.lightPrimary,
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 40,
    height: 40,
  },

  // 列表
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 100,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.light.surface,
    borderRadius: 12,
    padding: 16,
    marginTop: 10,
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.lightPrimary,
    lineHeight: 22,
    marginBottom: 6,
  },
  itemDuration: {
    fontSize: 14,
    color: COLORS.text.lightMuted,
    marginBottom: 4,
  },
  itemDate: {
    fontSize: 12,
    color: COLORS.text.lightFaint,
  },
  favoriteBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.light.bg,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  favoriteIcon: {
    fontSize: 20,
  },

  // 空状态
  emptyContainer: {
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
    color: COLORS.text.lightFaint,
    marginBottom: 6,
  },
  emptyHint: {
    fontSize: 13,
    color: COLORS.text.lightFaint,
  },

  // 底部按钮
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 32,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    paddingTop: 12,
    backgroundColor: COLORS.light.bg,
  },
  recordBtn: {
    backgroundColor: COLORS.text.lightPrimary,
    borderRadius: 28,
    paddingVertical: 16,
    alignItems: 'center',
  },
  recordBtnText: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.light.surface,
  },
});

export default RecordingListScreen;
