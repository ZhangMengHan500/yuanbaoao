/**
 * 语音通话波形动画组件
 * 根据 mode 显示不同动画效果：listening（随机跳动）、speaking（流动波形）、idle（平坦）
 */

import React, {useEffect, useRef} from 'react';
import {View, Animated, StyleSheet, Easing} from 'react-native';

interface VoiceWaveformProps {
  isActive: boolean;
  color?: string;
  barCount?: number;
  mode: 'listening' | 'speaking' | 'idle';
}

const VoiceWaveform: React.FC<VoiceWaveformProps> = ({
  isActive,
  color = '#FFFFFF',
  barCount = 7,
  mode,
}) => {
  const animatedValues = useRef<Animated.Value[]>(
    Array.from({length: barCount}, () => new Animated.Value(0.3)),
  ).current;

  useEffect(() => {
    if (!isActive || mode === 'idle') {
      // 平坦状态
      animatedValues.forEach(v => {
        Animated.timing(v, {
          toValue: 0.15,
          duration: 300,
          useNativeDriver: false,
        }).start();
      });
      return;
    }

    // 为每根柱子创建独立的循环动画
    const animations = animatedValues.map((anim, index) => {
      const delay = index * 80;

      if (mode === 'listening') {
        // 监听模式：随机高度跳动
        const loop = () => {
          const toValue = 0.2 + Math.random() * 0.8;
          Animated.timing(anim, {
            toValue,
            duration: 150 + Math.random() * 200,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
          }).start(() => {
            if (isActive) loop();
          });
        };
        return Animated.delay(delay).start(() => loop());
      } else {
        // 说话模式：正弦波流动
        const loop = () => {
          Animated.sequence([
            Animated.timing(anim, {
              toValue: 0.9,
              duration: 300 + index * 50,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: false,
            }),
            Animated.timing(anim, {
              toValue: 0.2,
              duration: 300 + index * 50,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: false,
            }),
          ]).start(() => {
            if (isActive) loop();
          });
        };
        return Animated.delay(delay).start(() => loop());
      }
    });

    return () => {
      animations.forEach(a => a?.stop?.());
    };
  }, [isActive, mode]);

  return (
    <View style={styles.container}>
      {animatedValues.map((anim, index) => (
        <Animated.View
          key={index}
          style={[
            styles.bar,
            {
              backgroundColor: color,
              height: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [4, 32],
              }),
              opacity: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.3, 1],
              }),
            },
          ]}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    gap: 4,
  },
  bar: {
    width: 4,
    borderRadius: 2,
    minHeight: 4,
  },
});

export default VoiceWaveform;
