import React, {useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SectionList,
} from 'react-native';
import {useChatStore} from '../stores/chatStore';
import {Session} from '../types';
import {COLORS} from '../constants';
import dayjs from 'dayjs';

interface Section {
  title: string;
  data: Session[];
}

const HistoryScreen = ({navigation}: any) => {
  const {sessions, loadSessions, setCurrentSession} = useChatStore();

  useEffect(() => {
    loadSessions();
    const unsubscribe = navigation.addListener('focus', () => {
      loadSessions();
    });
    return unsubscribe;
  }, [navigation]);

  const getSections = useCallback((): Section[] => {
    const today: Session[] = [];
    const yesterday: Session[] = [];
    const earlier: Session[] = [];

    const now = dayjs();
    const yesterdayDate = now.subtract(1, 'day');

    sessions.forEach(session => {
      const sessionDate = dayjs(session.updatedAt);
      if (sessionDate.isSame(now, 'day')) {
        today.push(session);
      } else if (sessionDate.isSame(yesterdayDate, 'day')) {
        yesterday.push(session);
      } else {
        earlier.push(session);
      }
    });

    const sections: Section[] = [];
    if (today.length) sections.push({title: '今天', data: today});
    if (yesterday.length) sections.push({title: '昨天', data: yesterday});
    if (earlier.length) sections.push({title: '更早', data: earlier});
    return sections;
  }, [sessions]);

  const handlePressSession = useCallback(
    (session: Session) => {
      setCurrentSession(session.id);
      navigation.navigate('Chat', {
        screen: 'ChatRoom',
        params: {sessionId: session.id},
      });
    },
    [navigation],
  );

  const sections = getSections();

  const renderSectionHeader = ({section}: {section: Section}) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{section.title}</Text>
      <View style={styles.sectionLine} />
    </View>
  );

  const renderItem = ({item}: {item: Session}) => (
    <TouchableOpacity
      style={styles.sessionItem}
      onPress={() => handlePressSession(item)}
      activeOpacity={0.7}>
      <View style={styles.sessionIconWrap}>
        <Text style={styles.sessionIcon}>💬</Text>
      </View>
      <View style={styles.sessionInfo}>
        <Text style={styles.sessionTitle} numberOfLines={1}>
          {item.title || 'New Chat'}
        </Text>
        <Text style={styles.sessionTime}>
          {dayjs(item.updatedAt).format('HH:mm')}
        </Text>
      </View>
      <Text style={styles.arrow}>›</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>聊天历史</Text>
        <Text style={styles.headerCount}>{sessions.length} 条记录</Text>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        stickySectionHeadersEnabled={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconWrap}>
              <Text style={styles.emptyIcon}>📋</Text>
            </View>
            <Text style={styles.emptyText}>暂无聊天记录</Text>
            <Text style={styles.emptySubtext}>开始一段新对话吧</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.dark.bg,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    backgroundColor: COLORS.dark.bg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.dark.border,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text.darkPrimary,
    letterSpacing: 0.5,
  },
  headerCount: {
    fontSize: 13,
    color: COLORS.text.darkFaint,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 8,
  },
  sectionHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.accent.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginRight: 10,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.dark.border,
  },
  sessionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 12,
    marginVertical: 2,
    backgroundColor: COLORS.dark.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.dark.borderSubtle,
  },
  sessionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.accent.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sessionIcon: {
    fontSize: 16,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text.darkPrimary,
    marginBottom: 3,
  },
  sessionTime: {
    fontSize: 12,
    color: COLORS.text.darkFaint,
  },
  arrow: {
    fontSize: 22,
    color: COLORS.dark.border,
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.accent.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyIcon: {
    fontSize: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.darkPrimary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.text.darkFaint,
  },
});

export default HistoryScreen;
