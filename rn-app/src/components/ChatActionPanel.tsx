import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  Platform,
} from 'react-native';
import {COLORS} from '../constants';

interface Props {
  visible: boolean;
  onClose: () => void;
  onAction: (id: string) => void;
}

const SCREEN_HEIGHT = Dimensions.get('window').height;
const PANEL_HEIGHT = SCREEN_HEIGHT * 0.6;

const MENU_ITEMS = [
  {
    id: 'persona',
    icon: '🎭',
    iconBg: COLORS.accent.primary,
    title: '角色人设',
    desc: '选择一个角色，AI将以对应的风格回复你',
  },
  {
    id: 'ai_edit',
    icon: '✂️',
    iconBg: '#FF6B6B',
    title: '智能P图',
    desc: '智能修图多种模版，轻松打造创意大片',
  },
  {
    id: 'photo_solve',
    icon: '📷',
    iconBg: '#4ECDC4',
    title: '拍题答疑',
    desc: '全学科解题大师，AI互动讲解难题',
  },
  {
    id: 'homework_check',
    icon: '✅',
    iconBg: '#45B7D1',
    title: '作业批改',
    desc: '支持全学段各学科作业,拍照速得批改结果',
  },
  {
    id: 'ai_gen',
    icon: '🎨',
    iconBg: '#A78BFA',
    title: 'AI生图',
    desc: '一句话生成优质画作，多样玩法灵感不断',
  },
  {
    id: 'gaokao',
    icon: '🎓',
    iconBg: '#F59E0B',
    title: '元宝高考通',
    desc: '支持全国志愿填报推荐，即将上线',
  },
  {
    id: 'ai_recorder',
    icon: '🎙',
    iconBg: '#10B981',
    title: 'AI录音笔',
    desc: '实时转写与总结，学习开会更高效',
  },
  {
    id: 'ai_write',
    icon: '✏️',
    iconBg: '#6366F1',
    title: 'AI写作',
    desc: '作文周报朋友圈文案，全体裁写作帮手',
  },
  {
    id: 'cos',
    icon: '👑',
    iconBg: '#EC4899',
    title: '王者英雄COS照',
    desc: '化身王者英雄，解锁专属COS照',
  },
  {
    id: 'phone_call',
    icon: '📞',
    iconBg: '#14B8A6',
    title: '打电话',
    desc: '沉浸式语音对话，元宝实时陪伴',
  },
  {
    id: 'ai_video',
    icon: '🎬',
    iconBg: '#F97316',
    title: 'AI生视频',
    desc: '一键生成视频，玩转百变风格',
  },
  {
    id: 'doc_read',
    icon: '📄',
    iconBg: '#8B5CF6',
    title: '文档阅读',
    desc: '提炼重点内容，长文速读一目了然',
  },
  {
    id: 'ai_exam',
    icon: '📝',
    iconBg: '#EF4444',
    title: 'AI出卷',
    desc: '薄弱点举一反三，复习试卷一键生成',
  },
  {
    id: 'knowledge',
    icon: '📚',
    iconBg: '#059669',
    title: '知识库',
    desc: '上传文档建立专属知识库，聊天时引用回答',
  },
];

const ChatActionPanel: React.FC<Props> = ({visible, onClose, onAction}) => {
  const handlePress = (id: string) => {
    onClose();
    onAction(id);
  };

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
        <TouchableOpacity activeOpacity={1} style={styles.panel}>
          {/* 顶部标题栏 */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>功能菜单</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}>
            <View style={styles.grid}>
              {MENU_ITEMS.map((item, index) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.gridItem}
                  activeOpacity={0.7}
                  onPress={() => handlePress(item.id)}>
                  <View style={styles.itemCard}>
                    <View style={styles.itemRow}>
                      <View
                        style={[
                          styles.iconWrap,
                          {backgroundColor: item.iconBg + '18'},
                        ]}>
                        <Text style={styles.iconText}>{item.icon}</Text>
                      </View>
                      <View style={styles.textWrap}>
                        <Text style={styles.itemTitle} numberOfLines={1}>
                          {item.title}
                        </Text>
                        <Text style={styles.itemDesc} numberOfLines={1}>
                          {item.desc}
                        </Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: COLORS.overlay.light,
    justifyContent: 'flex-end',
  },
  panel: {
    height: PANEL_HEIGHT,
    backgroundColor: COLORS.light.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.light.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.light.border,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text.lightPrimary,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.light.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    fontSize: 14,
    color: COLORS.text.lightFaint,
    fontWeight: '600',
  },
  scrollContent: {
    flex: 1,
  },
  grid: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  gridItem: {
    marginBottom: 2,
  },
  itemCard: {
    backgroundColor: COLORS.light.surface,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.light.border,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  iconText: {
    fontSize: 22,
  },
  textWrap: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text.lightPrimary,
    marginBottom: 3,
  },
  itemDesc: {
    fontSize: 12,
    color: COLORS.text.lightFaint,
  },
});

export default ChatActionPanel;
