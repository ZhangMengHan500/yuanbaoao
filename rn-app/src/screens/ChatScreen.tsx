import React, {useEffect, useRef, useCallback, useState} from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {useChatStore} from '../stores/chatStore';
import {startSSEStream, startPhotoSolveStream} from '../services/sse';
import {createAPI} from '../services/api';
import {mmkvStorage} from '../services/mmkv';
import {DEFAULT_PERSONA, resolveImageUrl, COLORS} from '../constants';
import {Message, RecordingData} from '../types';
import dayjs from 'dayjs';
import MessageBubble from '../components/MessageBubble';
import ChatInput from '../components/ChatInput';
import ChatActionPanel from '../components/ChatActionPanel';
import SidebarDrawer from '../components/SidebarDrawer';

// 主题色映射表
const THEME_COLOR_MAP: Record<string, string> = {
  '蓝色': COLORS.semantic.info,
  '绿色': COLORS.semantic.success,
  '红色': COLORS.semantic.error,
  '紫色': COLORS.accent.primary,
};

const ChatScreen = ({route, navigation}: any) => {
  const sessionId = route.params?.sessionId || '';
  const listRef = useRef<FlatList>(null);
  const cancelSSERef = useRef<(() => void) | null>(null);
  const thinkingPhaseRef = useRef(false); // 深度思索：是否处于思考阶段
  const thinkingBufferRef = useRef(''); // 深度思索：思考阶段的token缓冲

  const {
    messages,
    currentSessionId,
    currentPersona,
    isStreaming,
    addMessage,
    updateLastAssistantMessage,
    setLastAssistantContent,
    setStreaming,
    setCurrentSession,
    loadMessages,
    loadSessions,
    createSession,
    setCurrentPersona,
    recordingResult,
    setRecordingResult,
  } = useChatStore();

  useEffect(() => {
    const init = async () => {
      if (!currentPersona) {
        setCurrentPersona(DEFAULT_PERSONA);
      }
      if (sessionId) {
        setCurrentSession(sessionId);
        await loadMessages(sessionId);
      }
    };
    init();
    return () => {
      cancelSSERef.current?.();
    };
  }, [sessionId]);

  // 录音完成后，自动生成录音消息卡片
  useEffect(() => {
    console.log('Recording result received:', !!recordingResult, 'sessionId:', currentSessionId);
    if (!recordingResult) return;

    const handleRecording = async () => {
      let sid = currentSessionId;

      // 如果没有当前会话，先创建一个新会话
      if (!sid) {
        try {
          const session = await createSession('AI录音');
          sid = session.id;
          setCurrentSession(sid);
        } catch (err) {
          console.error('Failed to create session for recording:', err);
          setRecordingResult(null);
          return;
        }
      }

      const msg: Message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        sessionId: sid,
        role: 'user',
        content: `AI录音笔: ${dayjs().format('M月D日HH点mm分')}`,
        mediaType: 'recording',
        audioUri: recordingResult.audioUri || undefined,
        audioDuration: recordingResult.duration,
        transcript: recordingResult.transcript,
        summary: recordingResult.summary,
        analysis: recordingResult.analysis,
        createdAt: new Date().toISOString(),
      };
      addMessage(sid, msg);

      // 保存录音记录到本地存储
      mmkvStorage.addRecordingRecord({
        id: msg.id,
        title: msg.content,
        audioUri: recordingResult.audioUri || null,
        duration: recordingResult.duration,
        transcript: recordingResult.transcript,
        summary: recordingResult.summary,
        analysis: recordingResult.analysis,
        createdAt: msg.createdAt,
        favorited: false,
      });

      setRecordingResult(null);
    };

    handleRecording();
  }, [recordingResult, currentSessionId]);

  const [ragEnabled, setRagEnabled] = useState(false);
  const [deepThinking, setDeepThinking] = useState(false);
  const [webSearch, setWebSearch] = useState(false);
  const [webSearching, setWebSearching] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [autoRead, setAutoRead] = useState(true);
  const [isReading, setIsReading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 初始化朗读设置
  useEffect(() => {
    setAutoRead(mmkvStorage.getAutoRead());
  }, []);

  // 切换朗读开关
  const toggleAutoRead = useCallback(() => {
    const newValue = !autoRead;
    setAutoRead(newValue);
    mmkvStorage.setAutoRead(newValue);
    if (!newValue) {
      // 关闭朗读时停止当前播放
      stopReading();
    }
  }, [autoRead]);

  // 停止朗读
  const stopReading = useCallback(() => {
    // 停止 Web Speech API 朗读
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    // 停止音频播放
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsReading(false);
  }, []);

  // 朗读文本 - 使用 Web Speech API
  const speakText = useCallback(async (text: string) => {
    if (!text || !autoRead) return;

    try {
      setIsReading(true);

      // 使用浏览器内置的 Web Speech API
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        // 停止之前的朗读
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'zh-CN'; // 中文
        utterance.rate = 1.0; // 语速
        utterance.pitch = 1.0; // 音调

        // 尝试根据用户选择的音色设置声音
        const voiceName = mmkvStorage.getVoiceName();
        const voices = window.speechSynthesis.getVoices();
        const chineseVoice = voices.find(v =>
          v.lang.startsWith('zh') && v.name.includes(voiceName === '甜甜' ? 'Female' : voiceName === '酷酷' ? 'Male' : 'Xiaoxiao')
        ) || voices.find(v => v.lang.startsWith('zh'));

        if (chineseVoice) {
          utterance.voice = chineseVoice;
        }

        utterance.onend = () => {
          setIsReading(false);
        };

        utterance.onerror = (event) => {
          console.error('Speech synthesis error:', event);
          setIsReading(false);
        };

        window.speechSynthesis.speak(utterance);
      } else {
        console.log('Web Speech API not supported');
        setIsReading(false);
      }
    } catch (err) {
      console.error('TTS error:', err);
      setIsReading(false);
    }
  }, [autoRead]);

  const genId = () => `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  const handleSend = useCallback(
    async (text: string, imageUri?: string) => {
      const token = mmkvStorage.getToken();
      if (!token) {
        Alert.alert('提示', '请先登录后再聊天', [{text: '好的'}]);
        return;
      }

      let sid = currentSessionId;

      if (!sid) {
        try {
          const session = await createSession('New Chat');
          sid = session.id;
          setCurrentSession(sid);
        } catch {
          return;
        }
      }

      // 如果有图片，走拍照答疑流程
      if (imageUri) {
        try {
          // 显示带图片的用户消息
          const userMsg: Message = {
            id: genId(),
            sessionId: sid,
            role: 'user',
            content: text || '请解答这道题目',
            imageUrl: imageUri,
            createdAt: new Date().toISOString(),
          };
          addMessage(sid, userMsg);

          const aiMsg: Message = {
            id: genId(),
            sessionId: sid,
            role: 'assistant',
            content: '',
            createdAt: new Date().toISOString(),
          };
          addMessage(sid, aiMsg);

          // 上传图片
          const formData = new FormData();
          if (Platform.OS === 'web') {
            const resp = await fetch(imageUri);
            const blob = await resp.blob();
            formData.append('file', blob, 'photo.jpg');
          } else {
            formData.append('file', {
              uri: imageUri,
              name: 'photo.jpg',
              type: 'image/jpeg',
            } as any);
          }

          const uploadRes: any = await createAPI.uploadImage(formData);
          const uploadUrl = uploadRes.data?.url || uploadRes.url;

          if (!uploadUrl) {
            updateLastAssistantMessage(sid, '图片上传失败，请重试');
            setStreaming(false);
            setSelectedImage(null);
            return;
          }

          // 流式获取AI解题回复
          setStreaming(true);

          const cancel = startPhotoSolveStream(
            {
              sessionId: sid,
              content: text || '请解答这道题目',
              imageUrl: resolveImageUrl(uploadUrl),
              personaId: currentPersona?.id || DEFAULT_PERSONA.id,
            },
            t => {
              updateLastAssistantMessage(sid, t);
            },
            () => {
              setStreaming(false);
              setSelectedImage(null);
              loadSessions();
            },
            err => {
              console.error('Photo Solve SSE Error:', err);
              updateLastAssistantMessage(sid, '\n\n[网络错误，请重试]');
              setStreaming(false);
              setSelectedImage(null);
            },
          );

          cancelSSERef.current = cancel;
        } catch (err: any) {
          console.error('拍照答疑处理失败:', err);
          Alert.alert('处理失败', err.message || '请重试');
          setSelectedImage(null);
        }
        return;
      }

      // 纯文字聊天
      const userMsg: Message = {
        id: genId(),
        sessionId: sid,
        role: 'user',
        content: text,
        createdAt: new Date().toISOString(),
      };
      addMessage(sid, userMsg);

      const aiMsg: Message = {
        id: genId(),
        sessionId: sid,
        role: 'assistant',
        content: '',
        createdAt: new Date().toISOString(),
      };
      addMessage(sid, aiMsg);

      setStreaming(true);
      if (webSearch) setWebSearching(true);

      // 深度思索模式：重置状态
      if (deepThinking) {
        thinkingPhaseRef.current = false;
        thinkingBufferRef.current = '';
        setIsThinking(true);
      }

      const cancel = startSSEStream(
        {
          sessionId: sid,
          content: text,
          personaId: currentPersona?.id || DEFAULT_PERSONA.id,
          enableRag: ragEnabled,
          deepThinking,
          webSearch,
        },
        token => {
          setWebSearching(false);
          if (!deepThinking) {
            updateLastAssistantMessage(sid, token);
            return;
          }

          // 深度思索模式
          thinkingBufferRef.current += token;
          const buf = thinkingBufferRef.current;
          const answerMarker = '【最终答案】';
          const answerIdx = buf.indexOf(answerMarker);

          if (answerIdx === -1) {
            // 还没出现【最终答案】→ 处于思考阶段，直接追加显示
            if (!thinkingPhaseRef.current && buf.includes('【深度思考分析】')) {
              thinkingPhaseRef.current = true;
              setIsThinking(true);
            }
            if (thinkingPhaseRef.current) {
              updateLastAssistantMessage(sid, token);
            }
          } else {
            // 【最终答案】已出现 → 思考结束，只显示答案部分
            if (thinkingPhaseRef.current) {
              thinkingPhaseRef.current = false;
              setIsThinking(false);
            }
            const answerContent = buf.substring(answerIdx + answerMarker.length).trim();
            setLastAssistantContent(sid, answerContent);
          }
        },
        () => {
          setStreaming(false);
          setWebSearching(false);
          setIsThinking(false);
          thinkingPhaseRef.current = false;
          thinkingBufferRef.current = '';
          loadSessions();

          // AI回复完成后自动朗读
          if (autoRead) {
            // 获取最新的助手消息内容
            const currentMessages = useChatStore.getState().messages[sid] || [];
            const lastAssistantMsg = [...currentMessages].reverse().find(m => m.role === 'assistant');
            if (lastAssistantMsg?.content) {
              // 清理Markdown格式，只保留文本
              const plainText = lastAssistantMsg.content
                .replace(/#{1,6}\s/g, '')
                .replace(/\*\*(.*?)\*\*/g, '$1')
                .replace(/\*(.*?)\*/g, '$1')
                .replace(/`(.*?)`/g, '$1')
                .replace(/```[\s\S]*?```/g, '')
                .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
                .trim();
              if (plainText) {
                speakText(plainText);
              }
            }
          }
        },
        err => {
          console.error('SSE Error:', err);
          updateLastAssistantMessage(sid, '\n\n[网络错误，请重试]');
          setStreaming(false);
          setWebSearching(false);
          setIsThinking(false);
          thinkingPhaseRef.current = false;
          thinkingBufferRef.current = '';
        },
      );

      cancelSSERef.current = cancel;
    },
    [currentSessionId, currentPersona, ragEnabled, deepThinking, webSearch],
  );

  const handleVoicePress = useCallback(() => {
    // 语音识别逻辑已内置在 ChatInput 组件中
  }, []);

  const [showPanel, setShowPanel] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);

  const handleCameraPress = useCallback(async () => {
    const {status} = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('提示', '需要相机权限才能拍照解题', [{text: '好的'}]);
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.6,
    });

    if (!result.canceled && result.assets?.[0]) {
      setSelectedImage(result.assets[0].uri);
    }
  }, []);

  const handlePhotoSolve = useCallback(async () => {
    const {status} = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('提示', '需要相册权限才能选择图片', [{text: '好的'}]);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.6,
    });

    if (!result.canceled && result.assets?.[0]) {
      setSelectedImage(result.assets[0].uri);
    }
  }, []);

  const handlePanelAction = useCallback(
    async (id: string) => {
      setShowPanel(false);
      if (id === 'photo_solve') {
        await handlePhotoSolve();
      } else if (id === 'homework_check') {
        navigation.navigate('HomeworkGrade');
      } else if (id === 'ai_edit') {
        navigation.navigate('SmartEdit');
      } else if (id === 'ai_recorder') {
        navigation.navigate('Recording');
      } else if (id === 'persona') {
        navigation.navigate('Persona');
      } else if (id === 'ai_write') {
        navigation.navigate('AiWrite');
      } else if (id === 'phone_call') {
        navigation.navigate('VoiceCall');
      } else if (id === 'knowledge') {
        navigation.navigate('Knowledge');
      } else if (id === 'doc_read') {
        navigation.navigate('DocReader');
      } else if (id === 'ai_video') {
        navigation.navigate('AiVideoGen');
      } else if (id === 'ai_exam') {
        navigation.navigate('AiExam');
      } else if (id === 'ai_gen') {
        // AI生图在「创作」Tab，需要跨Tab导航
        const parent = navigation.getParent();
        if (parent) {
          parent.navigate('Create', { screen: 'AiImageGen' });
        }
      } else if (id === 'cos') {
        // 王者COS照在「创作」Tab，需要跨Tab导航
        const parent = navigation.getParent();
        if (parent) {
          parent.navigate('Create', { screen: 'Cos' });
        }
      }
    },
    [handlePhotoSolve, navigation],
  );

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      listRef.current?.scrollToEnd({animated: true});
    }, 100);
  }, []);

  const currentMessages: Message[] = (currentSessionId ? messages[currentSessionId] : []) || [];

  const renderMessage = useCallback(
    ({item}: {item: Message}) => (
      <MessageBubble
        message={item}
        navigation={navigation}
        isThinking={isThinking && item.role === 'assistant'}
      />
    ),
    [isThinking],
  );

  const keyExtractor = useCallback((item: Message) => item.id, []);

  if (!sessionId && currentMessages.length === 0) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}>
        {/* 侧边栏抽屉 */}
        <SidebarDrawer
          visible={sidebarVisible}
          onClose={() => setSidebarVisible(false)}
          navigation={navigation}
        />
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.menuBtn}
            onPress={() => setSidebarVisible(true)}
            activeOpacity={0.6}>
            <Text style={styles.menuIcon}>☰</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconWrap}>
            <Text style={styles.emptyIcon}>🤖</Text>
          </View>
          <Text style={styles.emptyTitle}>元宝AI助手</Text>
          <Text style={styles.emptySubtitle}>
            {currentPersona?.description || DEFAULT_PERSONA.description}
          </Text>
          <View style={styles.hintRow}>
            <View style={styles.hintChip}>
              <Text style={styles.hintText}>试试问我点什么</Text>
            </View>
          </View>
        </View>
        {/* RAG 开关 - 空会话状态 */}
        <View style={styles.ragBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.ragBarContent}>
            <TouchableOpacity
              style={[styles.ragToggle, ragEnabled && styles.ragToggleActive]}
              onPress={() => setRagEnabled(prev => !prev)}
              activeOpacity={0.7}>
              <Text style={[styles.ragToggleText, ragEnabled && styles.ragToggleTextActive]}>
                📚 知识库
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.ragToggle, deepThinking && styles.deepThinkingActive]}
              onPress={() => setDeepThinking(prev => !prev)}
              activeOpacity={0.7}>
              <Text style={[styles.ragToggleText, deepThinking && styles.deepThinkingTextActive]}>
                🧠 深度思索
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.ragToggle, webSearch && styles.webSearchActive]}
              onPress={() => setWebSearch(prev => !prev)}
              activeOpacity={0.7}>
              <Text style={[styles.ragToggleText, webSearch && styles.webSearchTextActive]}>
                🌐 联网搜索
              </Text>
            </TouchableOpacity>
          </ScrollView>
          {webSearching && (
            <View style={styles.webSearchingBadge}>
              <ActivityIndicator size="small" color="#2563eb" />
              <Text style={styles.webSearchingText}>搜索中...</Text>
            </View>
          )}
        </View>
        <ChatInput
          onSend={handleSend}
          onCameraPress={handleCameraPress}
          onVoicePress={handleVoicePress}
          onPlusPress={() => setShowPanel(true)}
          disabled={isStreaming}
          selectedImage={selectedImage}
          onClearImage={() => setSelectedImage(null)}
        />

        <ChatActionPanel
          visible={showPanel}
          onClose={() => setShowPanel(false)}
          onAction={handlePanelAction}
        />
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}>
      {/* 侧边栏抽屉 */}
      <SidebarDrawer
        visible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
        navigation={navigation}
      />
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.menuBtn}
            onPress={() => setSidebarVisible(true)}
            activeOpacity={0.6}>
            <Text style={styles.menuIcon}>☰</Text>
          </TouchableOpacity>
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>
              {currentPersona?.avatar || '🤖'}
            </Text>
          </View>
          <View>
            <Text style={styles.headerTitle}>
              {currentPersona?.name || DEFAULT_PERSONA.name}
            </Text>
            {isStreaming && (
              <Text style={styles.streamingText}>正在回复...</Text>
            )}
          </View>
        </View>
        <View style={styles.headerRight}>
          {isStreaming && (
            <ActivityIndicator size="small" color={COLORS.accent.primary} style={{marginRight: 12}} />
          )}
          {/* 朗读开关按钮 */}
          <TouchableOpacity
            style={[styles.autoReadBtn, autoRead && styles.autoReadBtnActive]}
            onPress={toggleAutoRead}
            activeOpacity={0.7}>
            <Text style={[styles.autoReadBtnText, autoRead && styles.autoReadBtnTextActive]}>
              {isReading ? '🔊' : autoRead ? '🔊' : '🔇'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        ref={listRef}
        data={currentMessages}
        renderItem={renderMessage}
        keyExtractor={keyExtractor}
        style={styles.messageList}
        contentContainerStyle={styles.messageListContent}
        onContentSizeChange={scrollToBottom}
        onLayout={scrollToBottom}
        ListEmptyComponent={
          <View style={styles.emptyChat}>
            <Text style={styles.emptyChatText}>发送第一条消息开始对话</Text>
          </View>
        }
      />

      {/* RAG 开关 */}
      <View style={styles.ragBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.ragBarContent}>
          <TouchableOpacity
            style={[styles.ragToggle, ragEnabled && styles.ragToggleActive]}
            onPress={() => setRagEnabled(prev => !prev)}
            activeOpacity={0.7}>
            <Text style={[styles.ragToggleText, ragEnabled && styles.ragToggleTextActive]}>
              📚 知识库
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.ragToggle, deepThinking && styles.deepThinkingActive]}
            onPress={() => setDeepThinking(prev => !prev)}
            activeOpacity={0.7}>
            <Text style={[styles.ragToggleText, deepThinking && styles.deepThinkingTextActive]}>
              🧠 深度思索
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.ragToggle, webSearch && styles.webSearchActive]}
            onPress={() => setWebSearch(prev => !prev)}
            activeOpacity={0.7}>
            <Text style={[styles.ragToggleText, webSearch && styles.webSearchTextActive]}>
              🌐 联网搜索
            </Text>
          </TouchableOpacity>
        </ScrollView>
        {webSearching && (
          <View style={styles.webSearchingBadge}>
            <ActivityIndicator size="small" color="#2563eb" />
            <Text style={styles.webSearchingText}>搜索中...</Text>
          </View>
        )}
      </View>

      <ChatInput
        onSend={handleSend}
        onCameraPress={handleCameraPress}
        onVoicePress={handleVoicePress}
        onPlusPress={() => setShowPanel(true)}
        disabled={isStreaming}
        selectedImage={selectedImage}
        onClearImage={() => setSelectedImage(null)}
      />

      <ChatActionPanel
        visible={showPanel}
        onClose={() => setShowPanel(false)}
        onAction={handlePanelAction}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.light.bg,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: Platform.OS === 'ios' ? 52 : 12,
    paddingBottom: 8,
    backgroundColor: COLORS.light.surface,
  },
  menuBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuIcon: {
    fontSize: 22,
    color: COLORS.text.lightPrimary,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.light.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.light.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: COLORS.accent.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerAvatarText: {
    fontSize: 18,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text.lightPrimary,
  },
  streamingText: {
    fontSize: 12,
    color: COLORS.accent.primary,
    marginTop: 2,
  },
  messageList: {
    flex: 1,
  },
  messageListContent: {
    paddingVertical: 12,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: COLORS.accent.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyIcon: {
    fontSize: 44,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text.lightPrimary,
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.text.lightMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  hintRow: {
    flexDirection: 'row',
    marginTop: 24,
    gap: 8,
  },
  hintChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.accent.primaryMuted,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(124,106,239,0.2)',
  },
  hintText: {
    fontSize: 13,
    color: COLORS.accent.primary,
  },
  emptyChat: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyChatText: {
    fontSize: 14,
    color: COLORS.text.lightFaint,
  },
  ragToggle: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  ragToggleActive: {
    backgroundColor: '#ede9fe',
    borderColor: '#8b5cf6',
  },
  ragToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },
  ragToggleTextActive: {
    color: '#7c3aed',
  },
  deepThinkingActive: {
    backgroundColor: '#fef3c7',
    borderColor: '#f59e0b',
  },
  deepThinkingTextActive: {
    color: '#d97706',
  },
  webSearchActive: {
    backgroundColor: '#dbeafe',
    borderColor: '#3b82f6',
  },
  webSearchTextActive: {
    color: '#2563eb',
  },
  ragBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingVertical: 2,
  },
  ragBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 8,
  },
  webSearchingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: 'rgba(59,130,246,0.08)',
    borderRadius: 12,
    marginRight: 12,
    gap: 4,
  },
  webSearchingText: {
    fontSize: 11,
    color: '#2563eb',
    fontWeight: '500',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  autoReadBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  autoReadBtnActive: {
    backgroundColor: '#ede9fe',
    borderColor: '#8b5cf6',
  },
  autoReadBtnText: {
    fontSize: 18,
  },
  autoReadBtnTextActive: {
    fontSize: 18,
  },
});

export default ChatScreen;
