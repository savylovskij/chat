import { MessageType } from '@shared/enums/message-type.enum';
import { Audio } from 'expo-av';
import { getInfoAsync } from 'expo-file-system/legacy';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  GestureResponderEvent,
  PanResponder,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useThemeColors } from '../hooks/use-theme-colors';
import { VoiceRecorderProps } from '../models/voice-recorder-props.interface';

const CANCEL_THRESHOLD = -100;

export const VoiceRecorder = memo(function VoiceRecorder({ onRecordComplete }: VoiceRecorderProps) {
  const colors = useThemeColors();
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [metering, setMetering] = useState<number[]>([]);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);
  const cancelledRef = useRef(false);
  const slideX = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        cancelledRef.current = false;
        void startRecording();
      },
      onPanResponderMove: (_event: GestureResponderEvent, gestureState) => {
        if (gestureState.dx < 0) {
          slideX.setValue(gestureState.dx);
        }
        if (gestureState.dx < CANCEL_THRESHOLD) {
          cancelledRef.current = true;
        }
      },
      onPanResponderRelease: () => {
        slideX.setValue(0);
        void stopRecording();
      },
      onPanResponderTerminate: () => {
        slideX.setValue(0);
        void stopRecording();
      },
    }),
  ).current;

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const startRecording = useCallback(async () => {
    const permission = await Audio.requestPermissionsAsync();
    if (!permission.granted) return;

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    const { recording } = await Audio.Recording.createAsync(
      {
        android: {
          extension: '.m4a',
          outputFormat: 3, // MPEG_4
          audioEncoder: 3, // AAC
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          outputFormat: 'aac',
          audioQuality: 127,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        web: { mimeType: 'audio/mp4', bitsPerSecond: 128000 },
        keepAudioActiveHint: true,
        isMeteringEnabled: true,
      },
      (status) => {
        if (status.isRecording && status.metering !== undefined) {
          setMetering((previous) => [...previous.slice(-30), status.metering!]);
        }
      },
      100,
    );

    recordingRef.current = recording;
    startTimeRef.current = Date.now();
    setIsRecording(true);
    setMetering([]);
    setDuration(0);

    timerRef.current = setInterval(() => {
      setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 200);
  }, []);

  const stopRecording = useCallback(async () => {
    if (!recordingRef.current) return;

    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setIsRecording(false);

    const recording = recordingRef.current;
    recordingRef.current = null;

    await recording.stopAndUnloadAsync();
    await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

    if (cancelledRef.current) {
      cancelledRef.current = false;
      setDuration(0);
      setMetering([]);
      return;
    }

    const uri = recording.getURI();
    if (uri === null || uri === undefined || uri === '') return;

    const fileInfo = await getInfoAsync(uri);
    const recordingDuration = Math.floor((Date.now() - startTimeRef.current) / 1000);

    onRecordComplete({
      uri,
      fileName: `voice_${Date.now()}.m4a`,
      mimeType: 'audio/mp4',
      fileSize: fileInfo.exists ? fileInfo.size : 0,
      duration: recordingDuration,
      messageType: MessageType.VOICE,
    });

    setDuration(0);
    setMetering([]);
  }, [onRecordComplete]);

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remaining = seconds % 60;
    return `${minutes}:${String(remaining).padStart(2, '0')}`;
  };

  if (!isRecording) {
    return (
      <View {...panResponder.panHandlers} style={styles.micTouchArea}>
        <Text style={[styles.micIcon, { color: colors.accent }]}>{'\u{1F3A4}'}</Text>
      </View>
    );
  }

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.recordingContainer,
        { backgroundColor: colors.surface, transform: [{ translateX: slideX }] },
      ]}
    >
      <View style={[styles.recordDot, { backgroundColor: colors.danger }]} />
      <Text style={[styles.timerText, { color: colors.textPrimary }]}>{formatTime(duration)}</Text>

      <View style={styles.waveformContainer}>
        {metering.slice(-20).map((level, index) => {
          const normalizedHeight = Math.max(4, Math.min(24, ((level + 60) / 60) * 24));
          return (
            <View
              key={index}
              style={[
                styles.waveformBar,
                {
                  height: normalizedHeight,
                  backgroundColor: colors.accent,
                },
              ]}
            />
          );
        })}
      </View>

      <Text style={[styles.slideHint, { color: colors.textSecondary }]}>
        {'\u2190'} slide to cancel
      </Text>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  micTouchArea: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  micIcon: {
    fontSize: 20,
  },
  recordingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  recordDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  timerText: {
    fontSize: 16,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
    minWidth: 40,
  },
  waveformContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 28,
  },
  waveformBar: {
    width: 3,
    borderRadius: 1.5,
  },
  slideHint: {
    fontSize: 13,
  },
});
