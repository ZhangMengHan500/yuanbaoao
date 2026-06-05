/**
 * 注册页面 — 邮箱 + 密码 + 确认密码，含实时校验和防重复提交
 */

import React, {useState, useCallback} from 'react';
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
} from 'react-native';
import {COLORS} from '../constants';
import {useAuthStore} from '../stores/authStore';

// 邮箱格式正则
const EMAIL_REGEX = /\S+@\S+\.\S+/;

const RegisterScreen = ({navigation}: any) => {
  const {register, isLoading} = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ========== 实时校验状态 ==========
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  // 实时校验邮箱格式
  const handleEmailChange = useCallback((text: string) => {
    setEmail(text);
    if (text && !EMAIL_REGEX.test(text)) {
      setEmailError('邮箱格式不正确');
    } else {
      setEmailError('');
    }
  }, []);

  // 实时校验密码
  const handlePasswordChange = useCallback((text: string) => {
    setPassword(text);
    if (text && text.length < 6) {
      setPasswordError('密码至少6个字符');
    } else if (text && !/^(?=.*[a-zA-Z\d]).{6,}$/.test(text)) {
      setPasswordError('密码只能包含字母和数字');
    } else {
      setPasswordError('');
    }
    // 如果确认密码已填写，同步校验一致性
    if (confirmPassword && text !== confirmPassword) {
      setConfirmPasswordError('两次输入的密码不一致');
    } else if (confirmPassword && text === confirmPassword) {
      setConfirmPasswordError('');
    }
  }, [confirmPassword]);

  // 实时校验确认密码
  const handleConfirmPasswordChange = useCallback(
    (text: string) => {
      setConfirmPassword(text);
      if (text && text !== password) {
        setConfirmPasswordError('两次输入的密码不一致');
      } else {
        setConfirmPasswordError('');
      }
    },
    [password],
  );

  // 整体表单校验
  const isFormValid = useCallback(() => {
    return (
      EMAIL_REGEX.test(email) &&
      password.length >= 6 &&
      /^(?=.*[a-zA-Z\d]).{6,}$/.test(password) &&
      confirmPassword === password &&
      confirmPassword.length >= 6
    );
  }, [email, password, confirmPassword]);

  // 提交注册
  const handleSubmit = useCallback(async () => {
    // 防重复点击
    if (isSubmitting || isLoading) return;

    // 最终校验
    if (!EMAIL_REGEX.test(email)) {
      setEmailError('邮箱格式不正确');
      return;
    }
    if (password.length < 6) {
      setPasswordError('密码至少6个字符');
      return;
    }
    if (!/^(?=.*[a-zA-Z\d]).{6,}$/.test(password)) {
      setPasswordError('密码只能包含字母和数字');
      return;
    }
    if (confirmPassword !== password) {
      setConfirmPasswordError('两次输入的密码不一致');
      return;
    }

    setIsSubmitting(true);
    try {
      // 不传 username，后端会自动从邮箱前缀生成用户名
      // 注意：不能传空字符串 ''，因为后端 @MinLength(2) 会拒绝
      await register(email.trim(), undefined as any, password);
      // 注册成功，回到个人中心（已自动登录）
      navigation.goBack();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || '注册失败';
      Alert.alert('注册失败', msg);
    } finally {
      setIsSubmitting(false);
    }
  }, [email, password, confirmPassword, isSubmitting, isLoading, register, navigation]);

  const isBusy = isSubmitting || isLoading;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.formContainer}
        keyboardShouldPersistTaps="handled">
        {/* Logo 区域 */}
        <View style={styles.logoArea}>
          <View style={styles.logoIconWrap}>
            <Text style={styles.logoIcon}>🤖</Text>
          </View>
          <Text style={styles.logoTitle}>创建新账号</Text>
          <Text style={styles.logoSubtitle}>注册元宝AI，开始你的AI之旅</Text>
        </View>

        {/* 表单卡片 */}
        <View style={styles.formCard}>
          {/* 邮箱 */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>邮箱</Text>
            <TextInput
              style={[styles.textInput, emailError && styles.textInputError]}
              placeholder="请输入邮箱"
              placeholderTextColor={COLORS.text.lightFaint}
              value={email}
              onChangeText={handleEmailChange}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isBusy}
            />
            {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
          </View>

          {/* 密码 */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>密码</Text>
            <View style={styles.passwordWrap}>
              <TextInput
                style={[styles.textInput, styles.passwordInput, passwordError && styles.textInputError]}
                placeholder="请输入密码（至少6位）"
                placeholderTextColor={COLORS.text.lightFaint}
                value={password}
                onChangeText={handlePasswordChange}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                editable={!isBusy}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
                activeOpacity={0.6}>
                <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁'}</Text>
              </TouchableOpacity>
            </View>
            {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
          </View>

          {/* 确认密码 */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>确认密码</Text>
            <View style={styles.passwordWrap}>
              <TextInput
                style={[styles.textInput, styles.passwordInput, confirmPasswordError && styles.textInputError]}
                placeholder="请再次输入密码"
                placeholderTextColor={COLORS.text.lightFaint}
                value={confirmPassword}
                onChangeText={handleConfirmPasswordChange}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                editable={!isBusy}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                activeOpacity={0.6}>
                <Text style={styles.eyeIcon}>{showConfirmPassword ? '🙈' : '👁'}</Text>
              </TouchableOpacity>
            </View>
            {confirmPasswordError ? (
              <Text style={styles.errorText}>{confirmPasswordError}</Text>
            ) : null}
          </View>

          {/* 注册按钮 */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              (!isFormValid() || isBusy) && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!isFormValid() || isBusy}
            activeOpacity={0.8}>
            {isBusy ? (
              <ActivityIndicator size="small" color={COLORS.text.white} />
            ) : (
              <Text style={styles.submitText}>注册</Text>
            )}
          </TouchableOpacity>

          {/* 返回登录 */}
          <TouchableOpacity
            style={styles.switchButton}
            onPress={() => navigation.goBack()}>
            <Text style={styles.switchText}>已有账号？立即登录</Text>
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
  formContainer: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },

  // Logo 区域
  logoArea: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 32,
  },
  logoIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.accent.primaryLight,
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

  // 表单卡片
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
  textInputError: {
    borderWidth: 1,
    borderColor: COLORS.semantic.error,
  },

  // 密码输入框 + 显示/隐藏
  passwordWrap: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 44,
  },
  eyeButton: {
    position: 'absolute',
    right: 4,
    top: 4,
    bottom: 4,
    width: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eyeIcon: {
    fontSize: 18,
  },

  // 错误提示
  errorText: {
    fontSize: 12,
    color: COLORS.semantic.error,
    marginTop: 4,
    marginLeft: 4,
  },

  // 提交按钮
  submitButton: {
    backgroundColor: COLORS.accent.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  submitButtonDisabled: {
    backgroundColor: COLORS.text.lightFaint,
    opacity: 0.7,
  },
  submitText: {
    fontSize: 16,
    color: COLORS.light.surface,
    fontWeight: '700',
  },

  // 切换登录
  switchButton: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  switchText: {
    fontSize: 13,
    color: COLORS.accent.primary,
    fontWeight: '500',
  },

  // 版本号
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: COLORS.text.lightFaint,
    marginTop: 24,
  },
});

export default RegisterScreen;
