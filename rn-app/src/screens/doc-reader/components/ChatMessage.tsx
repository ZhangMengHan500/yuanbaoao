import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { DocMessage, Citation } from '../../../services/docReaderApi';
import { COLORS } from '../../../constants';

interface Props {
  message: DocMessage;
  onCitationPress: (chunkId: string) => void;
}

const ChatMessage = ({ message, onCitationPress }: Props) => {
  const isUser = message.role === 'user';

  const renderContent = () => {
    if (isUser || !message.citations?.length) {
      return <Text style={styles.messageText}>{message.content}</Text>;
    }

    const parts = message.content.split(/(\[\d+\])/g);

    return (
      <Text style={styles.messageText}>
        {parts.map((part, index) => {
          const citationMatch = part.match(/\[(\d+)\]/);
          if (citationMatch) {
            const citationIndex = parseInt(citationMatch[1], 10);
            const citation = message.citations?.find(c => c.index === citationIndex);

            if (citation) {
              return (
                <TouchableOpacity
                  key={index}
                  onPress={() => onCitationPress(citation.chunkId)}>
                  <Text style={styles.citationMark}>[{citationIndex}]</Text>
                </TouchableOpacity>
              );
            }
          }
          return <Text key={index}>{part}</Text>;
        })}
      </Text>
    );
  };

  return (
    <View style={[styles.container, isUser && styles.containerUser]}>
      <View style={[styles.bubble, isUser && styles.bubbleUser]}>
        {renderContent()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  containerUser: {
    alignItems: 'flex-end',
  },
  bubble: {
    backgroundColor: COLORS.light.surface,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    padding: 12,
    maxWidth: '85%',
  },
  bubbleUser: {
    backgroundColor: COLORS.accent.primary,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.text.lightPrimary,
  },
  citationMark: {
    color: COLORS.accent.primary,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});

export default ChatMessage;
