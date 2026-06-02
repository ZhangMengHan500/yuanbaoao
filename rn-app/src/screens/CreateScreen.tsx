import React, {useEffect, useCallback} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Dimensions,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import {useCreateStore} from '../stores/createStore';
import {AiStyleTemplate} from '../types';
import {resolveImageUrl, COLORS} from '../constants';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

// 顶部功能按钮配置
const FEATURE_BUTTONS = [
  {id: 'ai_image_gen', label: 'AI生图', icon: '✨', color: '#6366f1'},
  {id: 'ai_edit', label: '智能P图', icon: '✂️', color: '#f97316'},
  {id: 'cos', label: '王者COS', icon: '👑', color: '#eab308'},
];

// 卡片宽度：两列布局，左右边距 12，卡片间距 10
const CARD_GAP = 10;
const CARD_WIDTH = (SCREEN_WIDTH - 24 - CARD_GAP) / 2;

const CreateScreen = ({navigation}: any) => {
  const {
    categories,
    templates,
    activeCategoryId,
    isLoading,
    setActiveCategoryId,
    fetchCategories,
  } = useCreateStore();

  // 首次加载分类和模板
  useEffect(() => {
    fetchCategories();
  }, []);

  // 切换分类标签
  const handleTagPress = useCallback(
    (id: string | null) => {
      setActiveCategoryId(id);
    },
    [setActiveCategoryId],
  );

  // 点击功能按钮 → 跳转对应页面
  const handleFeaturePress = useCallback(
    (featureId: string) => {
      switch (featureId) {
        case 'ai_image_gen':
          navigation.navigate('AiImageGen');
          break;
        case 'ai_edit':
          navigation.navigate('SmartEdit');
          break;
        case 'cos':
          navigation.navigate('Cos');
          break;
      }
    },
    [navigation],
  );

  // 点击"做同款" → 跳转图生图页面，自动带入模板参考图 + 提示词 + 风格名
  const handleTemplatePress = useCallback(
    (template: AiStyleTemplate) => {
      navigation.navigate('Img2Img', {
        templateId: template.id,
        stylePrompt: template.prompt,
        coverImage: resolveImageUrl(template.coverImg),
        styleName: template.name,
      });
    },
    [navigation],
  );

  // 渲染顶部功能按钮
  const renderFeatureButtons = () => (
    <View style={styles.featureRow}>
      {FEATURE_BUTTONS.map(btn => (
        <TouchableOpacity
          key={btn.id}
          style={[styles.featureButton, {backgroundColor: btn.color + '18'}]}
          onPress={() => handleFeaturePress(btn.id)}
          activeOpacity={0.7}>
          <Text style={styles.featureIcon}>{btn.icon}</Text>
          <Text style={[styles.featureLabel, {color: btn.color}]}>
            {btn.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  // 渲染标签栏（从数据库读取分类）
  const renderTags = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.tagsContainer}>
      <TouchableOpacity
        style={[styles.tag, activeCategoryId === null && styles.tagActive]}
        onPress={() => handleTagPress(null)}
        activeOpacity={0.7}>
        <Text
          style={[
            styles.tagText,
            activeCategoryId === null && styles.tagTextActive,
          ]}>
          全部
        </Text>
      </TouchableOpacity>
      {categories.map(cat => (
        <TouchableOpacity
          key={cat.id}
          style={[styles.tag, activeCategoryId === cat.id && styles.tagActive]}
          onPress={() => handleTagPress(cat.id)}
          activeOpacity={0.7}>
          <Text
            style={[
              styles.tagText,
              activeCategoryId === cat.id && styles.tagTextActive,
            ]}>
            {cat.name}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  // 渲染单张模板卡片
  const renderTemplateCard = ({item, index}: {item: AiStyleTemplate; index: number}) => {
    const cardHeight = index % 3 === 0 ? CARD_WIDTH * 1.3 : CARD_WIDTH * 1.1;

    return (
      <TouchableOpacity
        style={[styles.card, {width: CARD_WIDTH}]}
        onPress={() => handleTemplatePress(item)}
        activeOpacity={0.8}>
        {/* 模板预览图 */}
        <View style={[styles.cardPreview, {height: cardHeight}]}>
          <Image
            source={{uri: resolveImageUrl(item.coverImg)}}
            style={styles.cardImage}
            resizeMode="cover"
          />
        </View>

        {/* 卡片底部信息 */}
        <View style={styles.cardInfo}>
          <Text style={styles.cardName} numberOfLines={1}>
            {item.name}
          </Text>
          <TouchableOpacity
            style={styles.makeButton}
            onPress={() => handleTemplatePress(item)}
            activeOpacity={0.7}>
            <Text style={styles.makeButtonText}>做同款</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* 顶部标题栏 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>创作</Text>
      </View>

      {/* 模板卡片网格 */}
      <FlatList
        data={templates}
        renderItem={renderTemplateCard}
        keyExtractor={item => item.id}
        numColumns={2}
        columnWrapperStyle={styles.cardRow}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading && templates.length === 0}
            onRefresh={fetchCategories}
            tintColor={COLORS.accent.primary}
            colors={[COLORS.accent.primary]}
          />
        }
        ListHeaderComponent={
          <View>
            {renderFeatureButtons()}
            {renderTags()}
          </View>
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={styles.emptyText}>暂无模板</Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          isLoading && templates.length > 0 ? (
            <ActivityIndicator
              style={{marginVertical: 20}}
              color={COLORS.accent.primary}
              size="small"
            />
          ) : null
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.light.bg,
  },

  // 顶部标题
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    backgroundColor: COLORS.light.bg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.light.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text.lightPrimary,
    letterSpacing: 0.5,
  },

  // 顶部功能按钮
  featureRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 10,
    gap: 10,
  },
  featureButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.light.border,
  },
  featureIcon: {
    fontSize: 28,
    marginBottom: 6,
  },
  featureLabel: {
    fontSize: 13,
    fontWeight: '700',
  },

  // 标签栏
  tagsContainer: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  tag: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.light.border,
    borderWidth: 1,
    borderColor: COLORS.light.border,
  },
  tagActive: {
    backgroundColor: COLORS.accent.primaryLight,
    borderColor: 'rgba(124,106,239,0.4)',
  },
  tagText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.lightMuted,
  },
  tagTextActive: {
    color: COLORS.accent.primary,
  },

  // 卡片网格
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 20,
  },
  cardRow: {
    justifyContent: 'space-between',
    marginBottom: CARD_GAP,
  },

  // 单张卡片
  card: {
    borderRadius: 14,
    backgroundColor: COLORS.light.surface,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.light.borderSubtle,
  },
  cardPreview: {
    width: '100%',
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },

  // 卡片底部
  cardInfo: {
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  cardName: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text.lightPrimary,
    marginBottom: 8,
  },
  makeButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 5,
    backgroundColor: COLORS.accent.primaryLight,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(124,106,239,0.3)',
  },
  makeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.accent.primary,
  },

  // 空状态
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 15,
    color: COLORS.text.lightFaint,
  },
});

export default CreateScreen;
