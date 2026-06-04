/**
 * 录音详情页（仿腾讯元宝APP截图）
 * 顶部播放条 + 标签切换 + 转写/总结内容 + AI分析气泡
 */

import React, {useState, useEffect, useRef, useCallback} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import Markdown from 'react-native-markdown-display';
// Web环境使用HTMLAudioElement播放音频
import {Message} from '../types';
import {COLORS} from '../constants';

type TabType = 'transcribe' | 'summary';

const WAVE_BAR_COUNT = 24;

const RecordingDetailScreen = ({route, navigation}: any) => {
  const message: Message = route.params?.message;
  const [activeTab, setActiveTab] = useState<TabType>('transcribe');
  const [isPlaying, setIsPlaying] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState(
    Number.isFinite((message.audioDuration || 0) * 1000) ? (message.audioDuration || 0) * 1000 : 0,
  );
  const [soundLoaded, setSoundLoaded] = useState(false);
  const soundRef = useRef<HTMLAudioElement | null>(null);
  const waveAnim = useRef(new Animated.Value(0)).current;
  const waveAnimLoop = useRef<Animated.CompositeAnimation | null>(null);

  const totalSecs = Number.isFinite(durationMs) ? Math.floor(durationMs / 1000) : 0;
  const currentSecs = Math.floor(positionMs / 1000);

  const formatTime = (s: number) => {
    if (!Number.isFinite(s) || s < 0) return '00:00';
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  // 加载音频
  useEffect(() => {
    if (!message.audioUri) return;
    let cancelled = false;

    // 使用HTMLAudioElement加载音频
    const audio = new Audio(message.audioUri);
    audio.addEventListener('loadedmetadata', () => {
      if (!cancelled) {
        setDurationMs(audio.duration * 1000);
        setSoundLoaded(true);
      }
    });
    audio.addEventListener('timeupdate', () => {
      if (!cancelled) {
        setPositionMs(audio.currentTime * 1000);
      }
    });
    audio.addEventListener('ended', () => {
      if (!cancelled) {
        setIsPlaying(false);
        setPositionMs(0);
      }
    });
    audio.load();
    soundRef.current = audio;

    return () => {
      cancelled = true;
      soundRef.current?.pause();
      soundRef.current = null;
    };
  }, [message.audioUri]);

  // 波形动画
  useEffect(() => {
    if (isPlaying) {
      waveAnimLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(waveAnim, {
            toValue: 1,
            duration: 400,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: false,
          }),
          Animated.timing(waveAnim, {
            toValue: 0,
            duration: 400,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: false,
          }),
        ]),
      );
      waveAnimLoop.current.start();
    } else {
      waveAnimLoop.current?.stop();
      waveAnim.setValue(0);
    }
    return () => {
      waveAnimLoop.current?.stop();
    };
  }, [isPlaying]);

  const handlePlayPause = useCallback(async () => {
    const audio = soundRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play();
      setIsPlaying(true);
    }
  }, [isPlaying]);

  // 格式化日期
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const y = d.getFullYear();
    const mo = (d.getMonth() + 1).toString().padStart(2, '0');
    const da = d.getDate().toString().padStart(2, '0');
    const h = d.getHours().toString().padStart(2, '0');
    const mi = d.getMinutes().toString().padStart(2, '0');
    return `${y}-${mo}-${da} | ${h}:${mi}`;
  };

  return (
    <View style={styles.container}>
      {/* 顶部深色区域：返回 + 播放条 */}
      <View style={styles.topSection}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}>
            <Text style={styles.backArrow}>{'‹'}</Text>
          </TouchableOpacity>
          <View style={styles.headerRight} />
        </View>

        {/* 播放条 */}
        <View style={styles.playerBar}>
          <Text style={styles.playerTime}>{formatTime(currentSecs)}</Text>

          {/* 波形 */}
          <View style={styles.waveContainer}>
            {Array.from({length: WAVE_BAR_COUNT}).map((_, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.waveBar,
                  {
                    height: waveAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [
                        3 + Math.abs(i - WAVE_BAR_COUNT / 2) * 0.5,
                        6 + (WAVE_BAR_COUNT / 2 - Math.abs(i - WAVE_BAR_COUNT / 2)) * 1.5,
                      ],
                    }),
                    opacity: isPlaying
                      ? waveAnim.interpolate({inputRange: [0, 1], outputRange: [0.4, 1]})
                      : 0.4,
                  },
                ]}
              />
            ))}
          </View>

          <TouchableOpacity
            style={[styles.playBtn, !soundLoaded && styles.playBtnDisabled]}
            onPress={handlePlayPause}
            disabled={!soundLoaded}
            activeOpacity={0.7}>
            <Text style={styles.playBtnIcon}>{isPlaying ? '⏸' : '▶'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 标签栏 */}
      <View style={styles.tabRow}>
        {([
          {key: 'transcribe', label: '实时转写', icon: '📋'},
          {key: 'summary', label: 'AI总结', icon: '📄'},
        ] as const).map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
            activeOpacity={0.7}>
            <Text style={styles.tabIcon}>{tab.icon}</Text>
            <Text
              style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 内容区域 */}
      <ScrollView style={styles.contentScroll} contentContainerStyle={styles.contentContainer}>
        {/* 标题 + 日期 */}
        <Text style={styles.contentTitle}>{message.content}</Text>
        <Text style={styles.contentDate}>{formatDate(message.createdAt)}</Text>

        {activeTab === 'transcribe' ? (
          // 实时转写内容
          <View style={styles.transcriptSection}>
            {message.transcript ? (
              <Text style={styles.transcriptText}>{message.transcript}</Text>
            ) : (
              <Text style={styles.placeholderText}>暂无转写内容</Text>
            )}
          </View>
        ) : (
          // AI总结内容
          <View style={styles.summarySection}>
            {message.summary ? (
              <Markdown style={markdownStyles}>{message.summary}</Markdown>
            ) : (
              <Text style={styles.placeholderText}>AI正在生成总结...</Text>
            )}
          </View>
        )}

        {/* AI分析气泡 */}
        {message.analysis ? (
          <View style={styles.analysisBubble}>
            <Text style={styles.analysisText}>{message.analysis}</Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
};

const markdownStyles = StyleSheet.create({
  body: {color: COLORS.text.lightPrimary, fontSize: 15, lineHeight: 24},
  heading1: {color: COLORS.text.lightPrimary, fontSize: 20, fontWeight: '700', marginVertical: 8},
  heading2: {color: COLORS.text.lightPrimary, fontSize: 17, fontWeight: '700', marginVertical: 6},
  heading3: {color: COLORS.text.lightSecondary, fontSize: 15, fontWeight: '600', marginVertical: 4},
  strong: {color: COLORS.text.lightPrimary, fontWeight: '700'},
  paragraph: {color: COLORS.text.lightPrimary, fontSize: 15, lineHeight: 24, marginVertical: 3},
  bullet_list: {color: COLORS.text.lightPrimary},
  list_item: {color: COLORS.text.lightPrimary, fontSize: 15, lineHeight: 24},
  code_block: {
    backgroundColor: COLORS.light.bg,
    color: COLORS.text.lightPrimary,
    padding: 10,
    borderRadius: 8,
    fontSize: 13,
  },
  code_inline: {
    backgroundColor: 'rgba(0,0,0,0.06)',
    color: COLORS.text.lightPrimary,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 13,
  },
  blockquote: {
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderLeftColor: COLORS.text.lightFaint,
    borderLeftWidth: 3,
    paddingLeft: 10,
    marginVertical: 4,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.light.surfaceAlt,
  },

  // 顶部深色区域
  topSection: {
    backgroundColor: '#2A2A2A',
    paddingTop: Platform.OS === 'ios' ? 52 : 12,
    paddingBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrow: {
    fontSize: 28,
    color: COLORS.light.surface,
    fontWeight: '300',
  },
  headerRight: {
    width: 40,
    height: 40,
  },

  // 播放条
  playerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  playerTime: {
    fontSize: 14,
    color: COLORS.light.surface,
    fontVariant: ['tabular-nums'],
    minWidth: 42,
  },
  waveContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 28,
    gap: 2,
  },
  waveBar: {
    width: 2,
    borderRadius: 1,
    backgroundColor: COLORS.light.surface,
  },
  playBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playBtnDisabled: {
    opacity: 0.4,
  },
  playBtnIcon: {
    fontSize: 14,
    color: COLORS.light.surface,
  },

  // 标签栏
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: '#EDE8DC',
    borderRadius: 10,
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  tabActive: {
    backgroundColor: COLORS.light.surface,
    borderRadius: 10,
  },
  tabIcon: {
    fontSize: 14,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#888',
  },
  tabTextActive: {
    color: COLORS.text.lightPrimary,
    fontWeight: '600',
  },

  // 内容区域
  contentScroll: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  contentTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text.lightPrimary,
    lineHeight: 28,
    marginBottom: 6,
  },
  contentDate: {
    fontSize: 13,
    color: COLORS.text.lightFaint,
    marginBottom: 20,
  },

  // 实时转写
  transcriptSection: {
    marginTop: 4,
  },
  transcriptText: {
    fontSize: 15,
    color: COLORS.text.lightPrimary,
    lineHeight: 26,
  },

  // AI总结
  summarySection: {
    marginTop: 4,
  },

  // AI分析气泡
  analysisBubble: {
    marginTop: 24,
    backgroundColor: '#E8F5E9',
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  analysisText: {
    fontSize: 14,
    color: '#2E7D32',
    lineHeight: 22,
  },

  placeholderText: {
    fontSize: 15,
    color: COLORS.text.lightFaint,
    lineHeight: 24,
    textAlign: 'center',
    marginTop: 40,
  },
});

export default RecordingDetailScreen;
