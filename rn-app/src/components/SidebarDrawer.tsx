/**
 * 仿腾讯元宝APP侧边栏会话列表
 *
 * 从左侧滑出，展示按时间分组的历史会话
 * 支持新建对话、切换会话、删除会话
 */

import React, {useEffect, useRef, useCallback, useMemo} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  FlatList,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
  Alert,
} from 'react-native';
import dayjs from 'dayjs';
import {useChatStore} from '../stores/chatStore';
import {COLORS} from '../constants';
import {Session} from '../types';

const {width: SCREEN_WIDTH} = Dimensions.get('window');
const DRAWER_WIDTH = SCREEN_WIDTH * 0.82;

interface SidebarDrawerProps {
  visible: boolean;
  onClose: () => void;
  navigation: any;
}

// 按时间分组
function groupSessions(sessions: Session[]) {
  const sorted = [...sessions].sort(
    (a, b) => dayjs(b.updatedAt).valueOf() - dayjs(a.updatedAt).valueOf(),
  );

  const now = dayjs();
  const todayStart = now.startOf('day');
  const weekStart = now.subtract(6, 'day').startOf('day');
  const monthStart = now.startOf('month');

  const groups: {title: string; data: Session[]}[] = [];
  const today: Session[] = [];
  const thisWeek: Session[] = [];
  const thisMonth: Session[] = [];
  const earlier: Session[] = [];

  for (const s of sorted) {
    const d = dayjs(s.updatedAt);
    if (d.isAfter(todayStart) || d.isSame(todayStart, 'day')) {
      today.push(s);
    } else if (d.isAfter(weekStart)) {
      thisWeek.push(s);
    } else if (d.isAfter(monthStart) || d.isSame(monthStart, 'day')) {
      thisMonth.push(s);
    } else {
      earlier.push(s);
    }
  }

  if (today.length) groups.push({title: '今天', data: today});
  if (thisWeek.length) groups.push({title: '本周', data: thisWeek});
  if (thisMonth.length) groups.push({title: '本月', data: thisMonth});
  if (earlier.length) groups.push({title: '更早', data: earlier});

  return groups;
}

const SidebarDrawer = ({visible, onClose, navigation}: SidebarDrawerProps) => {
  const {
    sessions,
    currentSessionId,
    setCurrentSession,
    createSession,
    deleteSession,
    loadSessions,
  } = useChatStore();

  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const isAnimating = useRef(false);

  // 打开/关闭动画
  useEffect(() => {
    if (visible) {
      loadSessions();
    }
    if (isAnimating.current) return;
    isAnimating.current = true;

    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: visible ? 0 : -DRAWER_WIDTH,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.timing(overlayAnim, {
        toValue: visible ? 1 : 0,
        duration: 280,
        useNativeDriver: true,
      }),
    ]).start(() => {
      isAnimating.current = false;
    });
  }, [visible]);

  const handleNewChat = useCallback(async () => {
    try {
      const session = await createSession('新建对话');
      setCurrentSession(session.id);
      onClose();
      setTimeout(() => {
        navigation.navigate('ChatRoom', {sessionId: session.id});
      }, 300);
    } catch {
      // ignore
    }
  }, [createSession, setCurrentSession, onClose, navigation]);

  const handlePressSession = useCallback(
    (session: Session) => {
      setCurrentSession(session.id);
      onClose();
      setTimeout(() => {
        navigation.navigate('ChatRoom', {sessionId: session.id});
      }, 300);
    },
    [setCurrentSession, onClose, navigation],
  );

  const handleDeleteSession = useCallback(
    (session: Session) => {
      const doDelete = () => deleteSession(session.id);
      if (Platform.OS === 'web') {
        if (window.confirm(`确定删除会话「${session.title}」？`)) {
          doDelete();
        }
      } else {
        Alert.alert('删除会话', `确定删除「${session.title}」？`, [
          {text: '取消', style: 'cancel'},
          {text: '删除', style: 'destructive', onPress: doDelete},
        ]);
      }
    },
    [deleteSession],
  );

  const groups = useMemo(() => groupSessions(sessions), [sessions]);

  // 扁平化为列表数据：{type: 'header'|'session', ...}
  type ListItem =
    | {type: 'header'; title: string; key: string}
    | {type: 'session'; session: Session; key: string};

  const flatData: ListItem[] = useMemo(() => {
    const items: ListItem[] = [];
    for (const g of groups) {
      items.push({type: 'header', title: g.title, key: `h_${g.title}`});
      for (const s of g.data) {
        items.push({type: 'session', session: s, key: s.id});
      }
    }
    return items;
  }, [groups]);

  const renderItem = useCallback(
    ({item}: {item: ListItem}) => {
      if (item.type === 'header') {
        return (
          <View style={styles.groupHeader}>
            <Text style={styles.groupTitle}>{item.title}</Text>
          </View>
        );
      }

      const s = item.session;
      const isActive = s.id === currentSessionId;
      const updatedDate = dayjs(s.updatedAt);
      const isToday = updatedDate.isAfter(dayjs().startOf('day')) || updatedDate.isSame(dayjs().startOf('day'), 'day');
      const timeStr = isToday
        ? updatedDate.format('HH:mm')
        : updatedDate.format('MM-DD HH:mm');

      return (
        <View style={[styles.sessionItem, isActive && styles.sessionItemActive]}>
          <TouchableOpacity
            style={styles.sessionContent}
            onPress={() => handlePressSession(s)}
            activeOpacity={0.6}>
            <Text
              style={[styles.sessionTitle, isActive && styles.sessionTitleActive]}
              numberOfLines={1}>
              {s.title || '新建对话'}
            </Text>
            <Text style={styles.sessionTime}>{timeStr}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => handleDeleteSession(s)}
            activeOpacity={0.6}>
            <Text style={styles.deleteBtnText}>✕</Text>
          </TouchableOpacity>
        </View>
      );
    },
    [currentSessionId, handlePressSession, handleDeleteSession],
  );

  const keyExtractor = useCallback((item: ListItem) => item.key, []);

  return (
    <View style={styles.container} pointerEvents={visible ? 'auto' : 'none'}>
      {/* 遮罩层 — 点击关闭侧边栏 */}
      <Animated.View style={[styles.overlay, {opacity: overlayAnim}]}>
        <Pressable style={{flex: 1}} onPress={onClose} />
      </Animated.View>

      {/* 侧边栏面板 */}
      <Animated.View
        style={[
          styles.panel,
          {transform: [{translateX: slideAnim}]},
        ]}>
        {/* 顶部区域 */}
        <View style={styles.topSection}>
          <View style={styles.brandRow}>
            <Text style={styles.brandTitle}>元宝</Text>
            <View style={styles.brandIcons}>
              <TouchableOpacity style={styles.iconBtn} activeOpacity={0.6}>
                <Text style={styles.iconText}>🔍</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn} activeOpacity={0.6}>
                <Text style={styles.iconText}>⚙</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 新建对话按钮 */}
          <TouchableOpacity
            style={styles.newChatBtn}
            onPress={handleNewChat}
            activeOpacity={0.7}>
            <Text style={styles.newChatIcon}>✏</Text>
            <Text style={styles.newChatText}>新建对话</Text>
          </TouchableOpacity>
        </View>

        {/* 会话列表 */}
        <FlatList
          data={flatData}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>💬</Text>
              <Text style={styles.emptyText}>暂无会话</Text>
              <Text style={styles.emptyHint}>点击上方「新建对话」开始聊天</Text>
            </View>
          }
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.overlay.light,
  },
  panel: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: COLORS.light.surface,
    shadowColor: '#000',
    shadowOffset: {width: 2, height: 0},
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },

  // 顶部
  topSection: {
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.light.border,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text.lightPrimary,
  },
  brandIcons: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.light.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 16,
  },

  // 新建对话
  newChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.light.borderSubtle,
    backgroundColor: COLORS.light.surfaceAlt,
  },
  newChatIcon: {
    fontSize: 15,
    marginRight: 8,
  },
  newChatText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text.lightPrimary,
  },

  // 会话列表
  list: {
    flex: 1,
  },
  listContent: {
    paddingTop: 8,
    paddingBottom: 40,
  },

  // 分组标题
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 8,
  },
  groupTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text.lightFaint,
  },

  // 会话项
  sessionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  sessionItemActive: {
    backgroundColor: COLORS.light.bg,
  },
  sessionContent: {
    flex: 1,
  },
  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.light.bg,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  deleteBtnText: {
    fontSize: 13,
    color: COLORS.text.lightFaint,
    fontWeight: '600',
  },
  sessionTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text.lightPrimary,
    lineHeight: 22,
  },
  sessionTitleActive: {
    color: COLORS.accent.primary,
    fontWeight: '600',
  },
  sessionTime: {
    fontSize: 12,
    color: COLORS.text.lightFaint,
    marginTop: 4,
  },

  // 空状态
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text.lightFaint,
    marginBottom: 6,
  },
  emptyHint: {
    fontSize: 13,
    color: COLORS.text.lightFaint,
  },
});

export default SidebarDrawer;
