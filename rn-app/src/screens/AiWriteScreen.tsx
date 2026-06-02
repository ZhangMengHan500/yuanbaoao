/**
 * AI写作页面（仿腾讯元宝APP）
 * 动态筛选标签栏：根据写作类型自动切换筛选项
 */

import React, {useState, useRef, useCallback, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import {startWritingStream} from '../services/sse';
import {COLORS} from '../constants';

// ── 类型定义 ──────────────────────────────────────────

type FilterType =
  | 'novelGenre'
  | 'eduStage'
  | 'genre'
  | 'language'
  | 'goldenQuote'
  | 'marketingType'
  | 'marketingStyle'
  | 'target'
  | 'length'
  | 'docCategory'
  | 'docFormat'
  | 'circleFormat'
  | 'circleStyle'
  | 'platform'
  | 'style'
  | 'wordCount';

interface FilterConfig {
  key: FilterType;
  label: string;
  options: string[];
}

interface WritingTypeConfig {
  key: string;
  icon: string;
  filters: FilterConfig[];
}

// ── 写作类型配置 ──────────────────────────────────────

const WRITING_TYPES: WritingTypeConfig[] = [
  {
    key: '通用',
    icon: '📝',
    filters: [
      {key: 'platform', label: '发布平台', options: ['公众号', '知乎', '头条号', '百家号']},
      {key: 'style', label: '写作风格', options: ['正式', '口语化', '幽默', '夸张', '简洁', '古风', '抒情', '讽刺']},
      {key: 'wordCount', label: '字数', options: ['500', '1000', '2000', '3000', '5000']},
    ],
  },
  {
    key: '小说',
    icon: '📖',
    filters: [
      {key: 'novelGenre', label: '分类', options: ['不限', '玄幻', '武侠', '都市', '现实', '历史', '言情']},
    ],
  },
  {
    key: '作文',
    icon: '📄',
    filters: [
      {key: 'eduStage', label: '教育阶段', options: ['小学', '初中', '高中', '大学', '研究生']},
      {key: 'genre', label: '文体', options: ['记叙文', '议论文', '说明文', '散文', '诗歌', '小说', '书信']},
      {key: 'language', label: '语种', options: ['中文', '英文', '日文']},
      {key: 'goldenQuote', label: '金句模式', options: ['关闭', '开头引用', '结尾引用', '文中穿插']},
    ],
  },
  {
    key: '作文素材',
    icon: '📋',
    filters: [
      {key: 'genre', label: '文体', options: ['记叙文', '议论文', '说明文', '散文', '诗歌']},
      {key: 'language', label: '语种', options: ['中文', '英文']},
    ],
  },
  {
    key: '营销文案',
    icon: '💡',
    filters: [
      {key: 'marketingType', label: '类型', options: ['种草文', '推广文', '品牌故事', '活动文案', '产品介绍']},
      {key: 'marketingStyle', label: '风格', options: ['活泼', '专业', '走心', '搞笑', '高级']},
      {key: 'target', label: '对象', options: ['年轻人', '宝妈', '白领', '学生', '老年人', '通用']},
      {key: 'length', label: '长度', options: ['短文案', '中等', '长文案', '超长文案']},
    ],
  },
  {
    key: '公文',
    icon: '📑',
    filters: [
      {key: 'docCategory', label: '分类', options: ['通知', '报告', '请示', '批复', '纪要', '函', '意见']},
      {key: 'docFormat', label: '格式', options: ['正式公文', '工作简报', '会议纪要', '调研报告']},
    ],
  },
  {
    key: '朋友圈',
    icon: '💬',
    filters: [
      {key: 'circleFormat', label: '形式', options: ['图文', '纯文字', '长文', '种草推荐']},
      {key: 'circleStyle', label: '风格', options: ['日常分享', '文艺', '搞笑', '高级感', '治愈']},
    ],
  },
];

// ── 默认选中值 ────────────────────────────────────────

const DEFAULT_VALUES: Record<FilterType, string> = {
  novelGenre: '不限',
  eduStage: '高中',
  genre: '议论文',
  language: '中文',
  goldenQuote: '关闭',
  marketingType: '种草文',
  marketingStyle: '活泼',
  target: '通用',
  length: '中等',
  docCategory: '通知',
  docFormat: '正式公文',
  circleFormat: '图文',
  circleStyle: '日常分享',
  platform: '公众号',
  style: '正式',
  wordCount: '1000',
};

// ── 组件 ──────────────────────────────────────────────

const AiWriteScreen = ({navigation}: any) => {
  const [activeTab, setActiveTab] = useState('通用');
  const [filters, setFilters] = useState<Record<FilterType, string>>({...DEFAULT_VALUES});
  const [topic, setTopic] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultText, setResultText] = useState('');
  const [activePicker, setActivePicker] = useState<{
    type: FilterType;
    options: string[];
  } | null>(null);

  const cancelSSERef = useRef<(() => void) | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const autoScrollRef = useRef(true);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // AI生成内容变化时自动滚动到底部
  useEffect(() => {
    if (autoScrollRef.current && resultText) {
      scrollRef.current?.scrollToEnd({animated: true});
    }
  }, [resultText]);

  // 防抖 onScroll：检测用户是否手动滚动离开底部
  const handleScroll = useCallback((e: any) => {
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = setTimeout(() => {
      const {contentOffset, contentSize, layoutMeasurement} = e.nativeEvent;
      const distanceFromBottom = contentSize.height - layoutMeasurement.height - contentOffset.y;
      if (distanceFromBottom > 10) {
        autoScrollRef.current = false;
      } else {
        autoScrollRef.current = true;
      }
    }, 80);
  }, []);

  const handleGoBack = useCallback(() => {
    cancelSSERef.current?.();
    navigation.goBack();
  }, [navigation]);

  const handleSend = useCallback(async () => {
    if (!topic.trim() || isGenerating) return;
    setResultText('');
    setIsGenerating(true);

    const typeConfig = WRITING_TYPES.find(t => t.key === activeTab)!;
    const selectedFilters: Record<string, string> = {};
    typeConfig.filters.forEach(f => {
      selectedFilters[f.key] = filters[f.key];
    });

    const cancel = startWritingStream(
      {writingType: activeTab, filters: selectedFilters, topic: topic.trim()},
      token => setResultText(prev => prev + token),
      () => setIsGenerating(false),
      err => {
        console.error('AI Writing SSE Error:', err);
        setResultText(prev => prev + '\n\n[网络错误，请重试]');
        setIsGenerating(false);
      },
    );
    cancelSSERef.current = cancel;
  }, [topic, isGenerating, activeTab, filters]);

  const renderPickerModal = (
    visible: boolean,
    onClose: () => void,
    onSelect: (value: string) => void,
    options: string[],
    currentValue: string,
  ) => (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.modalContent}>
          {options.map(option => (
            <TouchableOpacity
              key={option}
              style={[styles.modalOption, option === currentValue && styles.modalOptionActive]}
              onPress={() => { onSelect(option); onClose(); }}
              activeOpacity={0.7}>
              <View style={styles.modalOptionRow}>
                <Text style={[styles.modalOptionText, option === currentValue && styles.modalOptionTextActive]}>
                  {option}
                </Text>
                {option === currentValue && <Text style={styles.checkmark}>✓</Text>}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const currentTypeConfig = WRITING_TYPES.find(t => t.key === activeTab)!;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* 顶部聊天头 */}
      <View style={styles.chatHeader}>
        <TouchableOpacity style={styles.menuBtn} activeOpacity={0.7}>
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>元宝</Text>
          <Text style={styles.headerSub}>快速思考 ›</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerActionBtn} activeOpacity={0.7}>
            <Text style={styles.headerActionIcon}>🔇</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerActionBtn} activeOpacity={0.7}>
            <Text style={styles.headerActionIcon}>📞</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerActionBtn} activeOpacity={0.7}>
            <Text style={styles.headerActionIcon}>⋯</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 中间内容区：结果展示 */}
      <ScrollView
        ref={scrollRef}
        style={styles.contentArea}
        contentContainerStyle={styles.contentContainer}
        keyboardDismissMode="on-drag"
        onScroll={handleScroll}
        scrollEventThrottle={100}>
        {resultText ? (
          <Text style={styles.resultText}>
            {resultText}
            {isGenerating ? '▍' : ''}
          </Text>
        ) : isGenerating ? (
          <Text style={styles.resultText}>▍</Text>
        ) : null}
      </ScrollView>

      {/* 底部配置+输入面板 */}
      <View style={styles.bottomPanel}>
        {/* 选择写作类型 */}
        <Text style={styles.sectionTitle}>选择写作类型</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll}>
          {WRITING_TYPES.map(item => (
            <TouchableOpacity
              key={item.key}
              style={[styles.tabChip, activeTab === item.key && styles.tabChipActive]}
              onPress={() => setActiveTab(item.key)}
              activeOpacity={0.7}>
              <Text style={styles.tabChipIcon}>{item.icon}</Text>
              <View style={styles.tabChipLabelRow}>
                <Text style={[styles.tabChipText, activeTab === item.key && styles.tabChipTextActive]}>
                  {item.key}
                </Text>
                {activeTab === item.key && <Text style={styles.tabCheckmark}>✓</Text>}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* 动态筛选标签栏 */}
        <View style={styles.filterRow}>
          {currentTypeConfig.filters.map(f => (
            <TouchableOpacity
              key={f.key}
              style={styles.selectorPill}
              onPress={() => setActivePicker({type: f.key, options: f.options})}
              activeOpacity={0.7}>
              <Text style={styles.selectorPillText}>{filters[f.key]}</Text>
              <Text style={styles.selectorPillChevron}> ∨</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 输入栏：AI写作标签 + 关闭按钮 */}
        <View style={styles.inputRow}>
          <Text style={styles.aiWriteLabel}>✏️ AI写作</Text>
          <TouchableOpacity style={styles.closeBtn} onPress={handleGoBack} activeOpacity={0.7}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.inputBar}>
          <TextInput
            style={styles.textInput}
            value={topic}
            onChangeText={setTopic}
            placeholder="请输入你要写的主题"
            placeholderTextColor={COLORS.text.lightFaint}
            editable={!isGenerating}
            onSubmitEditing={handleSend}
            returnKeyType="send"
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!topic.trim() || isGenerating) && styles.sendBtnDisabled]}
            onPress={handleSend}
            activeOpacity={0.7}>
            <Text style={styles.sendBtnIcon}>↑</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 动态 Picker Modal */}
      {activePicker &&
        renderPickerModal(
          true,
          () => setActivePicker(null),
          val => setFilters(prev => ({...prev, [activePicker.type]: val})),
          activePicker.options,
          filters[activePicker.type],
        )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.light.bg,
  },

  // 顶部聊天头
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 52 : 12,
    paddingBottom: 12,
    backgroundColor: COLORS.light.bg,
  },
  menuBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuIcon: {
    fontSize: 20,
    color: COLORS.text.lightPrimary,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 4,
  },
  headerName: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text.lightPrimary,
  },
  headerSub: {
    fontSize: 12,
    color: COLORS.text.lightFaint,
    marginTop: 1,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.light.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerActionIcon: {
    fontSize: 16,
  },

  // 中间内容区
  contentArea: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  resultText: {
    fontSize: 15,
    color: COLORS.text.lightPrimary,
    lineHeight: 24,
  },

  // 底部面板
  bottomPanel: {
    backgroundColor: COLORS.light.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: -2},
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text.lightPrimary,
    marginBottom: 12,
  },
  tabScroll: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  tabChip: {
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.light.bg,
    marginRight: 10,
    minWidth: 80,
  },
  tabChipActive: {
    backgroundColor: '#EBF5FF',
    borderWidth: 1.5,
    borderColor: COLORS.accent.primary,
  },
  tabChipIcon: {
    fontSize: 24,
    marginBottom: 6,
  },
  tabChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.text.lightMuted,
  },
  tabChipTextActive: {
    color: COLORS.accent.primary,
    fontWeight: '600',
  },
  tabChipLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tabCheckmark: {
    fontSize: 11,
    color: COLORS.accent.primary,
    fontWeight: '700',
  },

  // 动态筛选标签行
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  selectorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.light.bg,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  selectorPillText: {
    fontSize: 13,
    color: COLORS.text.lightPrimary,
    fontWeight: '500',
  },
  selectorPillChevron: {
    fontSize: 12,
    color: COLORS.text.lightFaint,
  },

  // 输入行
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  aiWriteLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.lightPrimary,
    flex: 1,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.light.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 12,
    color: COLORS.text.lightFaint,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.light.bg,
    borderRadius: 24,
    paddingLeft: 16,
  },
  textInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text.lightPrimary,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.accent.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  sendBtnDisabled: {
    backgroundColor: COLORS.text.lightFaint,
  },
  sendBtnIcon: {
    fontSize: 18,
    color: COLORS.light.surface,
    fontWeight: '700',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay.light,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.light.surface,
    borderRadius: 16,
    paddingVertical: 8,
    width: '70%',
    maxHeight: '60%',
  },
  modalOption: {
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  modalOptionActive: {
    backgroundColor: '#EBF5FF',
  },
  modalOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalOptionText: {
    fontSize: 16,
    color: COLORS.text.lightPrimary,
  },
  modalOptionTextActive: {
    color: COLORS.accent.primary,
    fontWeight: '600',
  },
  checkmark: {
    fontSize: 16,
    color: COLORS.accent.primary,
    fontWeight: '700',
  },
});

export default AiWriteScreen;
