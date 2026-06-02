import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import {Session} from '../types';
import dayjs from 'dayjs';
import {COLORS} from '../constants';

interface Props {
  session: Session;
  onPress: () => void;
  onDelete?: () => void;
}

const SessionCard: React.FC<Props> = ({session, onPress, onDelete}) => {
  const isToday = dayjs(session.updatedAt).isSame(dayjs(), 'day');
  const dateStr = isToday
    ? dayjs(session.updatedAt).format('HH:mm')
    : dayjs(session.updatedAt).format('MM-DD HH:mm');

  // 优先显示绑定角色的 emoji，否则用默认聊天图标
  const icon = session.persona?.avatar || '💬';

  const handleDelete = () => {
    console.log('[SessionCard] delete pressed for:', session.id, session.title);
    if (onDelete) {
      onDelete();
    }
  };

  return (
    <View style={styles.row}>
      <TouchableOpacity
        style={styles.card}
        onPress={onPress}
        activeOpacity={0.7}>
        <View style={styles.iconWrap}>
          <Text style={styles.icon}>{icon}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>
            {session.title || 'New Chat'}
          </Text>
          <Text style={styles.date}>{dateStr}</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={handleDelete}
        activeOpacity={0.6}>
        <Text style={styles.deleteTxt}>×</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginHorizontal: 12,
    marginVertical: 4,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: COLORS.dark.surface,
    borderWidth: 1,
    borderColor: COLORS.dark.borderSubtle,
  },
  card: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.accent.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 18,
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text.darkPrimary,
    marginBottom: 4,
  },
  date: {
    fontSize: 12,
    color: COLORS.text.darkFaint,
  },
  deleteBtn: {
    width: 50,
    backgroundColor: 'rgba(248,81,73,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteTxt: {
    color: COLORS.semantic.error,
    fontSize: 22,
    fontWeight: '700',
  },
});

export default SessionCard;
