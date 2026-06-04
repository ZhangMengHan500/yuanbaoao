/**
 * 录音消息卡片（仿腾讯元宝APP）
 * 展示在聊天列表中，支持播放/暂停、波形动画、跳转详情页
 */

import React, {useState, useEffect, useRef, useCallback} from 'react';
import {View, Text, TouchableOpacity, StyleSheet, Platform, Animated, Easing} from 'react-native';
import {Message} from '../types';
import {COLORS} from '../constants';

// Web环境音频播放
let currentWebAudio: HTMLAudioElement | null = null;
let currentCardId: string | null = null;

interface RecordingCardProps {
  message: Message;
  navigation: any;
}

const WAVE_BAR_COUNT = 20;

const RecordingCard = ({message, navigation}: RecordingCardProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState((message.audioDuration || 0) * 1000);
  const [soundLoaded, setSoundLoaded] = useState(false);
  const webAudioRef = useRef<HTMLAudioElement | null>(null);
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

  // 加载音频 - Web环境使用HTMLAudioElement
  useEffect(() => {
    if (!message.audioUri) return;
    let cancelled = false;

    // Web环境：使用HTMLAudioElement
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
    webAudioRef.current = audio;

    return () => {
      cancelled = true;
      webAudioRef.current?.pause();
      webAudioRef.current = null;
    };
  }, [message.audioUri]);

  // 波形动画
  useEffect(() => {
    if (isPlaying) {
      waveAnimLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(waveAnim, {toValue: 1, duration: 400, easing: Easing.inOut(Easing.sin), useNativeDriver: false}),
          Animated.timing(waveAnim, {toValue: 0, duration: 400, easing: Easing.inOut(Easing.sin), useNativeDriver: false}),
        ]),
      );
      waveAnimLoop.current.start();
    } else {
      waveAnimLoop.current?.stop();
      waveAnim.setValue(0);
    }
    return () => { waveAnimLoop.current?.stop(); };
  }, [isPlaying]);

  const handlePlayPause = useCallback(async () => {
    const audio = webAudioRef.current;
    if (!audio) return;

    // 如果另一个卡片在播放，先停止
    if (currentWebAudio && currentCardId !== message.id) {
      currentWebAudio.pause();
      currentWebAudio.currentTime = 0;
      currentWebAudio = null;
      currentCardId = null;
    }

    if (isPlaying) {
      audio.pause();
      currentWebAudio = null;
      currentCardId = null;
      setIsPlaying(false);
    } else {
      audio.play();
      currentWebAudio = audio;
      currentCardId = message.id;
      setIsPlaying(true);
    }
  }, [isPlaying, message.id]);

  const handleCardPress = useCallback(() => {
    navigation.navigate('RecordingDetail', {
      message,
      messageId: message.id,
      sessionId: message.sessionId,
    });
  }, [navigation, message]);

  return (
    <View style={styles.card}>
      {/* Header: 标题 + 箭头 */}
      <TouchableOpacity style={styles.header} onPress={handleCardPress} activeOpacity={0.7}>
        <Text style={styles.headerTitle} numberOfLines={1}>{message.content}</Text>
        <Text style={styles.headerArrow}>{'>'}</Text>
      </TouchableOpacity>

      {/* 播放器区域 */}
      <View style={styles.playerRow}>
        <Text style={styles.timeText}>
          {formatTime(currentSecs)} / {formatTime(totalSecs)}
        </Text>

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
                      4 + Math.abs(i - WAVE_BAR_COUNT / 2) * 1,
                      8 + (WAVE_BAR_COUNT / 2 - Math.abs(i - WAVE_BAR_COUNT / 2)) * 2 + Math.random() * 4,
                    ],
                  }),
                  opacity: waveAnim.interpolate({inputRange: [0, 1], outputRange: [0.3, 0.8]}),
                },
              ]}
            />
          ))}
        </View>

        {/* 播放按钮 */}
        <TouchableOpacity
          style={[styles.playBtn, !soundLoaded && styles.playBtnDisabled]}
          onPress={handlePlayPause}
          disabled={!soundLoaded}
          activeOpacity={0.7}>
          <Text style={styles.playBtnIcon}>{isPlaying ? '⏸' : '▶'}</Text>
        </TouchableOpacity>
      </View>

      {/* 操作栏 */}
      <View style={styles.actionBar}>
        {[
          {icon: '📋', label: '复制'},
          {icon: '👍', label: '点赞'},
          {icon: '👎', label: '踩'},
          {icon: '🔊', label: '音量'},
          {icon: '↗', label: '分享'},
        ].map((action, idx) => (
          <TouchableOpacity key={idx} style={styles.actionBtn} activeOpacity={0.6}>
            <Text style={styles.actionIcon}>{action.icon}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.light.surface,
    borderRadius: 16,
    width: 280,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.light.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.light.bg,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.lightPrimary,
    flex: 1,
    marginRight: 8,
  },
  headerArrow: {
    fontSize: 14,
    color: COLORS.text.lightFaint,
    fontWeight: '600',
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
  },
  timeText: {
    fontSize: 12,
    color: COLORS.text.lightMuted,
    fontVariant: ['tabular-nums'],
    minWidth: 80,
  },
  waveContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 32,
    gap: 2,
  },
  waveBar: {
    width: 2,
    borderRadius: 1,
    backgroundColor: COLORS.accent.primary,
  },
  playBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.accent.primary,
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
  actionBar: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 8,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.light.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionIcon: {
    fontSize: 14,
  },
});

export default RecordingCard;
