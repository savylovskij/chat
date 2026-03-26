import { memo, useEffect, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { TimerProgressProps } from '../models/timer-progress-props.interface';

function getTimerColor(progress: number): string {
  if (progress > 0.5) return '#2DD48C';
  if (progress > 0.2) return '#FFD60A';

  return '#FF3B30';
}

export const TimerProgress = memo(function TimerProgress({
  timerSeconds,
  createdAt,
  onExpired,
}: TimerProgressProps) {
  const [progress, setProgress] = useState(1);
  const [fadeAnim] = useState(() => new Animated.Value(1));

  useEffect(() => {
    const startTime = new Date(createdAt).getTime();
    const endTime = startTime + timerSeconds * 1000;

    const interval = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, (endTime - now) / (timerSeconds * 1000));

      setProgress(remaining);

      if (remaining <= 0) {
        clearInterval(interval);

        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }).start(() => onExpired?.());
      }
    }, 100);

    return () => clearInterval(interval);
  }, [timerSeconds, createdAt, fadeAnim, onExpired]);

  const color = getTimerColor(progress);

  return (
    <Animated.View style={{ opacity: fadeAnim }}>
      <View style={styles.track}>
        <View style={[styles.bar, { width: `${progress * 100}%`, backgroundColor: color }]} />
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  track: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 1.5,
    marginTop: 4,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: 1.5,
  },
});
