import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useDocReaderStore } from './stores/useDocReaderStore';
import ChatMessage from './components/ChatMessage';
import CitationPopup from './components/CitationPopup';
import { COLORS } from '../../constants';

const DocChatPanel = () => {
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const {
    messages,
    isStreaming,
    streamingContent,
    showCitationPopup,
    citationChunk,
    sendMessage,
    showCitation,
    hideCitation,
  } = useDocReaderStore();

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages, streamingContent]);

  const handleSend = () => {
    const text = inputText.trim();
    if (!text || isStreaming) return;

    setInputText('');
    sendMessage(text);
  };

  const handleCitationPress = (chunkId: string) => {
    showCitation(chunkId);
  };

  const renderMessage = ({ item }: { item: any }) => (
    <ChatMessage message={item} onCitationPress={handleCitationPress} />
  );

  const renderStreamingMessage = () => {
    if (!isStreaming) return null;

    return (
      <View style={styles.messageContainer}>
        <View style={styles.streamingBubble}>
          {streamingContent ? (
            <Text style={styles.streamingText}>{streamingContent}</Text>
          ) : null}
          <ActivityIndicator
            size="small"
            color={COLORS.accent.primary}
            style={styles.typingIndicator}
          />
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.messageList}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>💬</Text>
            <Text style={styles.emptyText}>基于文档内容进行问答</Text>
            <Text style={styles.emptyHint}>AI会引用原文回答你的问题</Text>
          </View>
        }
      />

      {renderStreamingMessage()}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="输入问题..."
            placeholderTextColor={COLORS.text.lightMuted}
            multiline
            maxLength={1000}
            editable={!isStreaming}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!inputText.trim() || isStreaming) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim() || isStreaming}>
            <Text style={styles.sendBtnText}>发送</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <CitationPopup
        visible={showCitationPopup}
        chunk={citationChunk}
        onClose={hideCitation}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.light.bg,
  },
  messageList: {
    padding: 16,
    paddingBottom: 8,
  },
  messageContainer: {
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  streamingBubble: {
    backgroundColor: COLORS.light.surface,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    padding: 12,
    maxWidth: '85%',
  },
  streamingText: {
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.text.lightPrimary,
  },
  typingIndicator: {
    marginTop: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.lightSecondary,
    marginBottom: 8,
  },
  emptyHint: {
    fontSize: 13,
    color: COLORS.text.lightMuted,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    backgroundColor: COLORS.light.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.light.border,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: COLORS.light.bg,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.text.lightPrimary,
    borderWidth: 1,
    borderColor: COLORS.light.border,
  },
  sendBtn: {
    marginLeft: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.accent.primary,
    borderRadius: 20,
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
  sendBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text.white,
  },
});

export default DocChatPanel;
