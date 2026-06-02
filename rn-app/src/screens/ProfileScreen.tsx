/**
 * 我的 — 个人中心页面（仿腾讯元宝APP）
 */

import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Pressable,
  Dimensions,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {useAuthStore} from '../stores/authStore';
import {mmkvStorage} from '../services/mmkv';
import {Message} from '../types';
import {COLORS} from '../constants';

const {width: SCREEN_WIDTH} = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 32 - 20) / 3;

const THEME_COLORS = [
  {name: '蓝色', color: COLORS.semantic.info},
  {name: '绿色', color: COLORS.semantic.success},
  {name: '红色', color: COLORS.semantic.error},
  {name: '紫色', color: COLORS.accent.primary},
];

const VOICE_OPTIONS = ['七七', '甜甜', '酷酷'];

const ProfileScreen = ({navigation}: any) => {
  const {user, isAuthenticated, isLoading, login, logout, restoreSession} =
    useAuthStore();

  // 登录表单
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // 用户偏好
  const [themeColor, setThemeColor] = useState('蓝色');
  const [voiceName, setVoiceName] = useState('七七');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showVoicePicker, setShowVoicePicker] = useState(false);

  // 录音统计
  const [recordingCount, setRecordingCount] = useState(0);
  const [latestRecording, setLatestRecording] = useState<Message | null>(null);

  useEffect(() => {
    restoreSession();
    setThemeColor(mmkvStorage.getThemeColor());
    setVoiceName(mmkvStorage.getVoiceName());
  }, []);

  // 每次聚焦时刷新录音统计
  useFocusEffect(
    useCallback(() => {
      const sessions = mmkvStorage.getSessionList();
      let count = 0;
      let latest: Message | null = null;
      for (const session of sessions) {
        const messages = mmkvStorage.getChatHistory(session.id);
        for (const msg of messages) {
          if ((msg as any).mediaType === 'recording') {
            count++;
            if (!latest || (msg as any).createdAt > (latest as any).createdAt) {
              latest = msg as any;
            }
          }
        }
      }
      setRecordingCount(count);
      setLatestRecording(latest);
    }, []),
  );

  const handleThemeColorSelect = useCallback((name: string) => {
    mmkvStorage.setThemeColor(name);
    setThemeColor(name);
    setShowColorPicker(false);
  }, []);

  const handleVoiceSelect = useCallback((name: string) => {
    mmkvStorage.setVoiceName(name);
    setVoiceName(name);
    setShowVoicePicker(false);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('提示', '请填写邮箱和密码');
      return;
    }
    try {
      await login(email.trim(), password);
      setEmail('');
      setPassword('');
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || '操作失败';
      Alert.alert('错误', msg);
    }
  }, [email, password, login]);

  const handleLogout = useCallback(() => {
    Alert.alert('退出登录', '确定要退出吗？', [
      {text: '取消', style: 'cancel'},
      {text: '确定退出', style: 'destructive', onPress: () => logout()},
    ]);
  }, [logout]);

  const getThemeColorValue = useCallback(() => {
    const found = THEME_COLORS.find(c => c.name === themeColor);
    return found?.color || COLORS.semantic.info;
  }, [themeColor]);

  // ========== 已登录视图 ==========
  if (isAuthenticated && user) {
    return (
      <View style={styles.container}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* 用户头像行 */}
          <TouchableOpacity style={styles.userRow} activeOpacity={0.7}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user.username?.charAt(0)?.toUpperCase() || 'U'}
              </Text>
            </View>
            <Text style={styles.nickname}>{user.username}</Text>
            <Text style={styles.arrow}>{'>'}</Text>
          </TouchableOpacity>

          {/* 三栏统计卡片 */}
          <View style={styles.cardsRow}>
            {/* 收藏 */}
            <View style={[styles.statCard, {backgroundColor: '#FFF8E7'}]}>
              <Text style={styles.statCardTitle}>暂无收藏</Text>
              <Text style={styles.statCardDesc}>收藏的对话、图片、文件等会展示在这</Text>
              <View style={styles.statCardFooter}>
                <Text style={styles.statCardLabel}>收藏</Text>
                <Text style={styles.statCardCount}>0</Text>
              </View>
            </View>

            {/* 录音 */}
            <TouchableOpacity
              style={[styles.statCard, {backgroundColor: COLORS.light.surfaceAlt}]}
              onPress={() => navigation.navigate('RecordingList')}
              activeOpacity={0.7}>
              {latestRecording ? (
                <>
                  <Text style={styles.statCardTitle} numberOfLines={2}>
                    {(latestRecording as any).content}
                  </Text>
                  <View style={styles.waveRow}>
                    {Array.from({length: 18}).map((_, i) => (
                      <View
                        key={i}
                        style={[
                          styles.waveBar,
                          {height: 4 + Math.abs(i - 9) * 0.8 + Math.sin(i * 0.8) * 3},
                        ]}
                      />
                    ))}
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.statCardTitle}>暂无录音</Text>
                  <View style={styles.waveRow}>
                    {Array.from({length: 18}).map((_, i) => (
                      <View
                        key={i}
                        style={[
                          styles.waveBar,
                          {height: 2 + Math.abs(i - 9) * 0.5, opacity: 0.3},
                        ]}
                      />
                    ))}
                  </View>
                </>
              )}
              <View style={styles.statCardFooter}>
                <Text style={styles.statCardLabel}>录音</Text>
                <Text style={styles.statCardCount}>{recordingCount}</Text>
              </View>
            </TouchableOpacity>

            {/* 文件 */}
            <View style={[styles.statCard, {backgroundColor: COLORS.light.surface, borderWidth: 1, borderColor: COLORS.light.border}]}>
              <Text style={styles.statCardTitle}>暂无文件</Text>
              <Text style={styles.statCardDesc}>给元宝发送的文件附件会展示在这</Text>
              <View style={styles.statCardFooter}>
                <Text style={styles.statCardLabel}>文件</Text>
                <Text style={styles.statCardCount}>0</Text>
              </View>
            </View>
          </View>

          {/* 元宝福利卡片 */}
          <View style={styles.promoCard}>
            <View style={styles.promoLeft}>
              <View style={styles.promoIcon}>
                <Text style={styles.promoIconText}>{'🟢'}</Text>
              </View>
              <View style={styles.promoTextWrap}>
                <Text style={styles.promoTitle}>元宝</Text>
                <Text style={styles.promoSubtitle}>相伴6天，为你准备了福利</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.promoBtn} activeOpacity={0.7}>
              <Text style={styles.promoBtnText}>福利中心</Text>
            </TouchableOpacity>
          </View>

          {/* 功能列表 */}
          <View style={styles.menuSection}>
            {[
              {icon: '⏰', label: '任务', right: null},
              {icon: '⚙', label: '个性化', right: null},
              {
                icon: '🎨',
                label: '主题色',
                right: (
                  <View style={styles.themeRight}>
                    <View style={[styles.themeDot, {backgroundColor: getThemeColorValue()}]} />
                    <Text style={styles.menuValue}>{themeColor}</Text>
                  </View>
                ),
                onPress: () => setShowColorPicker(true),
              },
              {
                icon: '🔊',
                label: '朗读音色',
                right: <Text style={styles.menuValue}>{voiceName}</Text>,
                onPress: () => setShowVoicePicker(true),
              },
              {icon: '🎫', label: '派邀请码', right: null},
              {icon: '✉', label: '消息中心', right: null},
            ].map((item, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.menuItem, i < 5 && styles.menuItemBorder]}
                onPress={item.onPress}
                activeOpacity={0.6}>
                <View style={styles.menuIconWrap}>
                  <Text style={styles.menuIcon}>{item.icon}</Text>
                </View>
                <Text style={styles.menuText}>{item.label}</Text>
                {item.right || <Text style={styles.menuArrow}>{'>'}</Text>}
              </TouchableOpacity>
            ))}
          </View>

          <View style={{height: 80}} />
        </ScrollView>

        {/* 主题色选择 Modal */}
        <Modal visible={showColorPicker} transparent animationType="fade" onRequestClose={() => setShowColorPicker(false)}>
          <Pressable style={styles.modalOverlay} onPress={() => setShowColorPicker(false)}>
            <Pressable style={styles.modalCard} onPress={() => {}}>
              <Text style={styles.modalTitle}>选择主题色</Text>
              <View style={styles.colorRow}>
                {THEME_COLORS.map(c => (
                  <TouchableOpacity
                    key={c.name}
                    style={styles.colorOption}
                    onPress={() => handleThemeColorSelect(c.name)}
                    activeOpacity={0.7}>
                    <View style={[styles.colorCircle, {backgroundColor: c.color}]}>
                      {themeColor === c.name && <Text style={styles.colorCheck}>{'✓'}</Text>}
                    </View>
                    <Text style={styles.colorLabel}>{c.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        {/* 朗读音色选择 Modal */}
        <Modal visible={showVoicePicker} transparent animationType="fade" onRequestClose={() => setShowVoicePicker(false)}>
          <Pressable style={styles.modalOverlay} onPress={() => setShowVoicePicker(false)}>
            <Pressable style={styles.modalCard} onPress={() => {}}>
              <Text style={styles.modalTitle}>选择朗读音色</Text>
              {VOICE_OPTIONS.map(v => (
                <TouchableOpacity
                  key={v}
                  style={[styles.voiceOption, voiceName === v && styles.voiceOptionActive]}
                  onPress={() => handleVoiceSelect(v)}
                  activeOpacity={0.7}>
                  <View style={[styles.radio, voiceName === v && styles.radioActive]}>
                    {voiceName === v && <View style={styles.radioDot} />}
                  </View>
                  <Text style={[styles.voiceText, voiceName === v && styles.voiceTextActive]}>{v}</Text>
                </TouchableOpacity>
              ))}
            </Pressable>
          </Pressable>
        </Modal>
      </View>
    );
  }

  // ========== 未登录视图 ==========
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.formContainer}
        keyboardShouldPersistTaps="handled">
        <View style={styles.logoArea}>
          <View style={styles.logoIconWrap}>
            <Text style={styles.logoIcon}>🤖</Text>
          </View>
          <Text style={styles.logoTitle}>元宝AI</Text>
          <Text style={styles.logoSubtitle}>欢迎回来</Text>
        </View>

        <View style={styles.formCard}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>邮箱</Text>
            <TextInput
              style={styles.textInput}
              placeholder="请输入邮箱"
              placeholderTextColor={COLORS.text.lightFaint}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>密码</Text>
            <TextInput
              style={styles.textInput}
              placeholder="请输入密码"
              placeholderTextColor={COLORS.text.lightFaint}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
            activeOpacity={0.8}>
            {isLoading ? (
              <ActivityIndicator size="small" color={COLORS.text.white} />
            ) : (
              <Text style={styles.submitText}>登录</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchButton}
            onPress={() => navigation.navigate('Register')}>
            <Text style={styles.switchText}>没有账号？立即注册</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.versionText}>元宝AI v1.0.0</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.light.bg,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: Platform.OS === 'ios' ? 56 : 16,
    paddingHorizontal: 16,
  },

  // 用户头像行
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFE0B2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarText: {
    fontSize: 26,
    color: '#E8A030',
    fontWeight: '800',
  },
  nickname: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.lightPrimary,
  },
  arrow: {
    fontSize: 18,
    color: COLORS.text.lightFaint,
    fontWeight: '600',
  },

  // 三栏卡片
  cardsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  statCard: {
    width: CARD_WIDTH,
    borderRadius: 12,
    padding: 12,
    minHeight: 130,
    justifyContent: 'space-between',
  },
  statCardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text.lightPrimary,
    marginBottom: 4,
  },
  statCardDesc: {
    fontSize: 10,
    color: COLORS.text.lightFaint,
    lineHeight: 14,
    flex: 1,
  },
  statCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  statCardLabel: {
    fontSize: 12,
    color: COLORS.text.lightMuted,
    fontWeight: '500',
  },
  statCardCount: {
    fontSize: 14,
    color: COLORS.text.lightPrimary,
    fontWeight: '700',
  },
  waveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 24,
    gap: 2,
    marginVertical: 6,
  },
  waveBar: {
    width: 2,
    borderRadius: 1,
    backgroundColor: COLORS.accent.primary,
  },

  // 元宝福利卡片
  promoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.light.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  promoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  promoIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  promoIconText: {
    fontSize: 18,
  },
  promoTextWrap: {
    flex: 1,
  },
  promoTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text.lightPrimary,
  },
  promoSubtitle: {
    fontSize: 12,
    color: COLORS.text.lightFaint,
    marginTop: 2,
  },
  promoBtn: {
    backgroundColor: '#FFF8E7',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  promoBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#E8A030',
  },

  // 功能列表
  menuSection: {
    backgroundColor: COLORS.light.surface,
    borderRadius: 12,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 15,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.light.border,
  },
  menuIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.light.bg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuIcon: {
    fontSize: 15,
  },
  menuText: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text.lightPrimary,
    fontWeight: '500',
  },
  menuValue: {
    fontSize: 14,
    color: COLORS.text.lightFaint,
    marginRight: 4,
  },
  menuArrow: {
    fontSize: 16,
    color: COLORS.text.lightFaint,
    fontWeight: '600',
  },
  themeRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  themeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay.light,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    width: SCREEN_WIDTH * 0.75,
    backgroundColor: COLORS.light.surface,
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text.lightPrimary,
    textAlign: 'center',
    marginBottom: 20,
  },
  colorRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  colorOption: {
    alignItems: 'center',
    gap: 8,
  },
  colorCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorCheck: {
    fontSize: 18,
    color: COLORS.light.surface,
    fontWeight: '700',
  },
  colorLabel: {
    fontSize: 12,
    color: COLORS.text.lightMuted,
  },
  voiceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  voiceOptionActive: {
    backgroundColor: '#F0F0FF',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.text.lightFaint,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  radioActive: {
    borderColor: COLORS.accent.primary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.accent.primary,
  },
  voiceText: {
    fontSize: 15,
    color: COLORS.text.lightPrimary,
  },
  voiceTextActive: {
    fontWeight: '600',
    color: COLORS.accent.primary,
  },

  // 登录表单
  formContainer: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  logoArea: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  logoIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0F0FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoIcon: {
    fontSize: 40,
  },
  logoTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.text.lightPrimary,
    marginBottom: 6,
  },
  logoSubtitle: {
    fontSize: 15,
    color: COLORS.text.lightFaint,
  },
  formCard: {
    backgroundColor: COLORS.light.surface,
    borderRadius: 16,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text.lightMuted,
    marginBottom: 6,
    marginLeft: 4,
  },
  textInput: {
    backgroundColor: COLORS.light.bg,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text.lightPrimary,
  },
  submitButton: {
    backgroundColor: COLORS.accent.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  submitButtonDisabled: {
    backgroundColor: COLORS.text.lightFaint,
  },
  submitText: {
    fontSize: 16,
    color: COLORS.light.surface,
    fontWeight: '700',
  },
  switchButton: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  switchText: {
    fontSize: 13,
    color: COLORS.accent.primary,
    fontWeight: '500',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: COLORS.text.lightFaint,
    marginTop: 24,
  },
});

export default ProfileScreen;
