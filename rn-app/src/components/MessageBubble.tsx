import React, {useMemo} from 'react';
import {View, Text, Image, ActivityIndicator, StyleSheet} from 'react-native';
import Markdown from 'react-native-markdown-display';
import {Message} from '../types';
import {resolveImageUrl, COLORS} from '../constants';
import {mmkvStorage} from '../services/mmkv';
import dayjs from 'dayjs';
import RecordingCard from './RecordingCard';

// 主题色映射表
const THEME_COLOR_MAP: Record<string, string> = {
  '蓝色': COLORS.semantic.info,
  '绿色': COLORS.semantic.success,
  '红色': COLORS.semantic.error,
  '紫色': COLORS.accent.primary,
};

interface Props {
  message: Message;
  navigation?: any;
  isThinking?: boolean;
}

const MessageBubble: React.FC<Props> = ({message, navigation, isThinking}) => {
  const isUser = message.role === 'user';
  const isEmptyAssistant = !isUser && !message.content;

  // 获取用户选择的主题色
  const themeColorName = mmkvStorage.getThemeColor();
  const userBubbleColor = THEME_COLOR_MAP[themeColorName] || COLORS.accent.primary;

  // 录音消息卡片
  if (message.mediaType === 'recording') {
    return (
      <View style={[styles.container, styles.userContainer]}>
        <View style={[styles.bubble, styles.userBubble, {backgroundColor: userBubbleColor, maxWidth: '80%'}]}>
          <RecordingCard message={message} navigation={navigation} />
          <Text style={[styles.timeText, styles.userTimeText]}>
            {dayjs(message.createdAt).format('HH:mm')}
          </Text>
        </View>
        <View style={[styles.userAvatar, {backgroundColor: userBubbleColor + '30'}]}>
          <Text style={[styles.userAvatarText, {color: userBubbleColor}]}>我</Text>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        isUser ? styles.userContainer : styles.aiContainer,
      ]}>
      {!isUser && (
        <View style={styles.aiAvatar}>
          <Text style={styles.aiAvatarText}>🤖</Text>
        </View>
      )}
      <View style={[styles.bubble, isUser ? [styles.userBubble, {backgroundColor: userBubbleColor}] : styles.aiBubble, isThinking && styles.thinkingBubble]}>
        {/* 联网搜索标注 - 仅 AI 消息且使用了联网搜索时显示 */}
        {!isUser && message.webSearch && (
          <View style={styles.webSearchBadge}>
            <Text style={styles.webSearchBadgeText}>🌐 已联网检索</Text>
          </View>
        )}
        {message.imageUrl ? (
          <Image
            source={{uri: resolveImageUrl(message.imageUrl)}}
            style={styles.messageImage}
            resizeMode="cover"
          />
        ) : null}
        {isThinking ? (
          <View>
            <View style={styles.thinkingHeader}>
              <ActivityIndicator size="small" color="#d97706" />
              <Text style={styles.thinkingHeaderText}>深度思考分析</Text>
            </View>
            {message.content ? (
              <Markdown style={thinkingMarkdownStyles}>{message.content}</Markdown>
            ) : (
              <Text style={styles.thinkingText}>正在分析问题...</Text>
            )}
          </View>
        ) : isEmptyAssistant ? (
          <View style={styles.typingIndicator}>
            <ActivityIndicator size="small" color={userBubbleColor} />
          </View>
        ) : message.content ? (
          isUser ? (
            <Text style={[styles.messageText, styles.userText]} selectable>
              {message.content}
            </Text>
          ) : (
            <Markdown style={markdownStyles}>{message.content}</Markdown>
          )
        ) : null}
        <Text style={[styles.timeText, isUser && styles.userTimeText]}>
          {dayjs(message.createdAt).format('HH:mm')}
        </Text>
      </View>
      {isUser && (
        <View style={[styles.userAvatar, {backgroundColor: userBubbleColor + '30'}]}>
          <Text style={[styles.userAvatarText, {color: userBubbleColor}]}>我</Text>
        </View>
      )}
    </View>
  );
};

const thinkingMarkdownStyles = StyleSheet.create({
  body: {
    color: '#92400e',
    fontSize: 14,
    lineHeight: 21,
  },
  heading1: {color: '#92400e', fontSize: 18, fontWeight: '700', marginVertical: 6},
  heading2: {color: '#92400e', fontSize: 16, fontWeight: '700', marginVertical: 5},
  heading3: {color: '#92400e', fontSize: 14, fontWeight: '600', marginVertical: 4},
  strong: {color: '#92400e', fontWeight: '700'},
  paragraph: {color: '#92400e', fontSize: 14, lineHeight: 21, marginVertical: 3},
  list_item: {color: '#92400e', fontSize: 14, lineHeight: 21},
  code_block: {backgroundColor: '#451a03', color: '#fde68a', padding: 8, borderRadius: 6, fontSize: 12, fontFamily: 'monospace'},
  code_inline: {backgroundColor: 'rgba(217,119,6,0.15)', color: '#92400e', paddingHorizontal: 3, paddingVertical: 1, borderRadius: 3, fontSize: 12, fontFamily: 'monospace'},
});

const markdownStyles = StyleSheet.create({
  body: {
    color: COLORS.text.darkSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  heading1: {
    color: COLORS.text.darkPrimary,
    fontSize: 20,
    fontWeight: '700',
    marginVertical: 8,
  },
  heading2: {
    color: COLORS.text.darkPrimary,
    fontSize: 17,
    fontWeight: '700',
    marginVertical: 6,
  },
  heading3: {
    color: COLORS.text.darkPrimary,
    fontSize: 15,
    fontWeight: '600',
    marginVertical: 4,
  },
  strong: {
    color: COLORS.text.darkPrimary,
    fontWeight: '700',
  },
  em: {
    fontStyle: 'italic',
  },
  code_block: {
    backgroundColor: '#1e293b',
    color: '#e2e8f0',
    padding: 12,
    borderRadius: 8,
    fontSize: 13,
    fontFamily: 'monospace',
    lineHeight: 20,
  },
  fence: {
    backgroundColor: '#1e293b',
    color: '#e2e8f0',
    padding: 12,
    borderRadius: 8,
    fontSize: 13,
    fontFamily: 'monospace',
    lineHeight: 20,
  },
  code_inline: {
    backgroundColor: 'rgba(110,118,129,0.25)',
    color: '#e2e8f0',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 13,
    fontFamily: 'monospace',
  },
  list_item: {
    color: COLORS.text.darkSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  paragraph: {
    color: COLORS.text.darkSecondary,
    fontSize: 15,
    lineHeight: 22,
    marginVertical: 4,
  },
  hr: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    height: 1,
    marginVertical: 8,
  },
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginVertical: 4,
    marginHorizontal: 12,
    alignItems: 'flex-end',
  },
  userContainer: {
    justifyContent: 'flex-end',
  },
  aiContainer: {
    justifyContent: 'flex-start',
  },
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(63,185,80,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  aiAvatarText: {
    fontSize: 16,
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: COLORS.accent.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  userAvatarText: {
    color: COLORS.accent.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  bubble: {
    maxWidth: '72%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  userBubble: {
    backgroundColor: COLORS.accent.primary,
    borderBottomRightRadius: 6,
  },
  aiBubble: {
    backgroundColor: COLORS.dark.surface,
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.dark.border,
  },
  thinkingBubble: {
    backgroundColor: '#fffbeb',
    borderColor: 'rgba(217,119,6,0.3)',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userText: {
    color: COLORS.text.white,
  },
  aiText: {
    color: COLORS.text.darkSecondary,
  },
  timeText: {
    fontSize: 10,
    color: COLORS.text.darkFaint,
    marginTop: 6,
    textAlign: 'right',
  },
  userTimeText: {
    color: COLORS.text.darkMuted,
  },
  messageImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 8,
  },
  typingIndicator: {
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  thinkingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 4,
    gap: 8,
  },
  thinkingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6,
  },
  thinkingHeaderText: {
    fontSize: 13,
    color: '#d97706',
    fontWeight: '700',
  },
  thinkingText: {
    fontSize: 13,
    color: '#d97706',
    fontWeight: '500',
  },
  webSearchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59,130,246,0.08)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 6,
    alignSelf: 'flex-start',
  },
  webSearchBadgeText: {
    fontSize: 11,
    color: '#2563eb',
    fontWeight: '500',
  },
});

export default React.memo(MessageBubble);
