import React, {useEffect, useCallback} from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import {useChatStore} from '../stores/chatStore';
import {Session} from '../types';
import {COLORS} from '../constants';
import SessionCard from '../components/SessionCard';

const SessionListScreen = ({navigation}: any) => {
  const {sessions, loadSessions, createSession, deleteSession, setCurrentSession} =
    useChatStore();

  useEffect(() => {
    loadSessions();
    const unsubscribe = navigation.addListener('focus', () => {
      loadSessions();
    });
    return unsubscribe;
  }, [navigation]);

  const handleNewChat = useCallback(async () => {
    try {
      const session = await createSession();
      setCurrentSession(session.id);
      navigation.navigate('ChatRoom', {sessionId: session.id});
    } catch (err) {
      Alert.alert('错误', '创建会话失败，请检查网络连接');
    }
  }, []);

  const handlePressSession = useCallback(
    (session: Session) => {
      setCurrentSession(session.id);
      navigation.navigate('ChatRoom', {sessionId: session.id});
    },
    [navigation],
  );

  const handleDeleteSession = useCallback(
    (session: Session) => {
      const title = session.title || 'New Chat';
      // web 端 Alert.alert 的多按钮回调不生效，用 window.confirm 替代
      if (Platform.OS === 'web') {
        const confirmed = window.confirm(`确定删除「${title}」？`);
        if (confirmed) {
          deleteSession(session.id);
        }
      } else {
        Alert.alert('删除会话', `确定删除「${title}」？`, [
          {text: '取消', style: 'cancel'},
          {
            text: '删除',
            style: 'destructive',
            onPress: () => deleteSession(session.id),
          },
        ]);
      }
    },
    [deleteSession],
  );

  const renderItem = useCallback(
    ({item}: {item: Session}) => (
      <SessionCard
        session={item}
        onPress={() => handlePressSession(item)}
        onDelete={() => handleDeleteSession(item)}
      />
    ),
    [handlePressSession, handleDeleteSession],
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>会话列表</Text>
        <Text style={styles.headerCount}>{sessions.length} 个会话</Text>
      </View>

      <FlatList
        data={sessions}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconWrap}>
              <Text style={styles.emptyIcon}>💬</Text>
            </View>
            <Text style={styles.emptyText}>还没有会话</Text>
            <Text style={styles.emptySubtext}>点击右下角按钮开始新对话</Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={handleNewChat} activeOpacity={0.8}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
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
    paddingVertical: 8,
    paddingBottom: 80,
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
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.accent.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.accent.primary,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  fabText: {
    fontSize: 28,
    color: COLORS.text.white,
    lineHeight: 30,
    fontWeight: '300',
  },
});

export default SessionListScreen;
