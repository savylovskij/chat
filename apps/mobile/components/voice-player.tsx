import { Audio, AVPlaybackStatus } from 'expo-av';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useThemeColors } from '../hooks/use-theme-colors';
import { VoiceMood } from '../models/voice-mood.enum';
import { VoicePlayerProps } from '../models/voice-player-props.interface';

const WAVEFORM_BARS = 30;
const SPEED_OPTIONS = [1, 1.5, 2] as const;

const MOOD_COLORS: Record<VoiceMood, string> = {
  [VoiceMood.CALM]: '#10B981',
  [VoiceMood.ENERGY]: '#F59E0B',
  [VoiceMood.QUIET]: '#9CA3AF',
};

function generateWaveformBars(barCount: number): number[] {
  const bars: number[] = [];
  for (let index = 0; index < barCount; index++) {
    bars.push(0.2 + Math.random() * 0.8);
  }
  return bars;
}

function detectMood(durationSeconds: number): VoiceMood {
  if (durationSeconds <= 3) {
    return VoiceMood.QUIET;
  }

  if (durationSeconds <= 15) {
    return VoiceMood.CALM;
  }

  return VoiceMood.ENERGY;
}

export const VoicePlayer = memo(function VoicePlayer({ uri, duration }: VoicePlayerProps) {
  const colors = useThemeColors();
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [speedIndex, setSpeedIndex] = useState(0);
  const soundRef = useRef<Audio.Sound | null>(null);
  const waveformBars = useRef(generateWaveformBars(WAVEFORM_BARS)).current;

  const mood = detectMood(duration);
  const moodColor = MOOD_COLORS[mood];
  const totalMs = duration * 1000;
  const progress = totalMs > 0 ? position / totalMs : 0;
  const activeBars = Math.floor(progress * WAVEFORM_BARS);

  useEffect(() => {
    return () => {
      void soundRef.current?.unloadAsync();
    };
  }, []);

  const onPlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;

    setPosition(status.positionMillis);
    setIsPlaying(status.isPlaying);

    if (status.didJustFinish) {
      setIsPlaying(false);
      setPosition(0);
    }
  }, []);

  const handleTogglePlay = useCallback(async () => {
    if (isPlaying && soundRef.current) {
      await soundRef.current.pauseAsync();
      return;
    }

    if (soundRef.current) {
      await soundRef.current.playAsync();
      return;
    }

    const { sound } = await Audio.Sound.createAsync(
      { uri },
      { shouldPlay: true, rate: SPEED_OPTIONS[speedIndex] },
      onPlaybackStatusUpdate,
    );
    soundRef.current = sound;
  }, [uri, isPlaying, speedIndex, onPlaybackStatusUpdate]);

  const handleSpeedToggle = useCallback(async () => {
    const nextIndex = (speedIndex + 1) % SPEED_OPTIONS.length;
    setSpeedIndex(nextIndex);

    if (soundRef.current) {
      await soundRef.current.setRateAsync(SPEED_OPTIONS[nextIndex], true);
    }
  }, [speedIndex]);

  const formatTime = (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  };

  const displayTime = isPlaying || position > 0 ? formatTime(position) : formatTime(totalMs);

  return (
    <View style={styles.container}>
      <Pressable
        style={[styles.playButton, { backgroundColor: moodColor }]}
        onPress={() => void handleTogglePlay()}
      >
        <Text style={styles.playIcon}>{isPlaying ? '\u275A\u275A' : '\u25B6'}</Text>
      </Pressable>

      <View style={styles.waveformContainer}>
        {waveformBars.map((height, index) => (
          <View
            key={index}
            style={[
              styles.bar,
              {
                height: 4 + height * 20,
                backgroundColor: index <= activeBars ? moodColor : colors.textSecondary,
                opacity: index <= activeBars ? 1 : 0.3,
              },
            ]}
          />
        ))}
      </View>

      <View style={styles.rightSection}>
        <Text style={[styles.duration, { color: colors.textSecondary }]}>{displayTime}</Text>
        <Pressable onPress={() => void handleSpeedToggle()}>
          <Text style={[styles.speedLabel, { color: moodColor }]}>
            {SPEED_OPTIONS[speedIndex]}x
          </Text>
        </Pressable>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 200,
  },
  playButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  waveformContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1.5,
    height: 28,
  },
  bar: {
    width: 3,
    borderRadius: 1.5,
  },
  rightSection: {
    alignItems: 'flex-end',
    gap: 2,
  },
  duration: {
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  speedLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
});
