import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { ReadingChunk } from '../../../services/docReaderApi';
import { COLORS } from '../../../constants';

interface Props {
  visible: boolean;
  chunk: ReadingChunk | null;
  onClose: () => void;
}

const CitationPopup = ({ visible, chunk, onClose }: Props) => {
  if (!chunk) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}>
        <View style={styles.container} onStartShouldSetResponder={() => true}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>引用原文</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.meta}>
            <Text style={styles.metaText}>
              第 {chunk.pageNumber || '?'} 页 · 段落 {chunk.paragraphNum || '?'}
            </Text>
            {chunk.title && (
              <Text style={styles.metaTitle}>{chunk.title}</Text>
            )}
          </View>

          <ScrollView style={styles.contentScroll}>
            <Text style={styles.contentText}>{chunk.content}</Text>
          </ScrollView>

          <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
            <Text style={styles.doneBtnText}>关闭</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: COLORS.light.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.light.border,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text.lightPrimary,
  },
  closeBtn: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 18,
    color: COLORS.text.lightMuted,
  },
  meta: {
    padding: 16,
    backgroundColor: COLORS.light.bg,
  },
  metaText: {
    fontSize: 13,
    color: COLORS.text.lightMuted,
  },
  metaTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text.lightSecondary,
    marginTop: 4,
  },
  contentScroll: {
    padding: 16,
    maxHeight: 400,
  },
  contentText: {
    fontSize: 15,
    lineHeight: 24,
    color: COLORS.text.lightPrimary,
  },
  doneBtn: {
    margin: 16,
    padding: 14,
    backgroundColor: COLORS.accent.primary,
    borderRadius: 12,
    alignItems: 'center',
  },
  doneBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.white,
  },
});

export default CitationPopup;
