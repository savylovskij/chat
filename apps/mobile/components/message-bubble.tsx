import { MessageStatus } from '@shared/enums/message-status.enum';
import { MessageType } from '@shared/enums/message-type.enum';
import { MessageWeight } from '@shared/enums/message-weight.enum';
import { format } from 'date-fns';
import { File, Paths } from 'expo-file-system';
import { Image } from 'expo-image';
import * as Sharing from 'expo-sharing';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Animated as RNAnimated,
  GestureResponderEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { TextStyle, ViewStyle } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useThemeColors } from '../hooks/use-theme-colors';
import { MessageBubbleProps } from '../models/message-bubble-props.interface';
import { getChatAccentColor } from '../utils/chat-accent-color';
import { formatFileSize } from '../utils/format-file-size';

import { ImageViewer } from './image-viewer';
import { ReactionBadge } from './reaction-badge';
import { TimerProgress } from './timer-progress';
import { VideoPlayer } from './video-player';
import { VoicePlayer } from './voice-player';

function getWeightBubbleStyle(weight: MessageWeight): ViewStyle {
  switch (weight) {
    case MessageWeight.IMPORTANT:
      return { borderLeftWidth: 3, borderLeftColor: '#2DD48C' };
    case MessageWeight.URGENT:
      return { borderLeftWidth: 3, borderLeftColor: '#FF3B30' };
    case MessageWeight.WHISPER:
      return { opacity: 0.7 };
    default:
      return {};
  }
}

function getWeightTextStyle(weight: MessageWeight): TextStyle {
  switch (weight) {
    case MessageWeight.IMPORTANT:
      return { fontWeight: '600' };
    case MessageWeight.URGENT:
      return { fontWeight: '700' };
    case MessageWeight.WHISPER:
      return { fontSize: 12, fontStyle: 'italic' };
    default:
      return {};
  }
}

function MessageStatusIcon({
  status,
  color,
}: {
  status: MessageStatus;
  color: string;
}): React.ReactElement | null {
  switch (status) {
    case MessageStatus.PENDING:
      return <Text style={[styles.statusIcon, { color }]}>{'\u{1F551}'}</Text>;
    case MessageStatus.SENT:
      return <Text style={[styles.statusIcon, { color }]}>{'\u2713'}</Text>;
    case MessageStatus.FAILED:
      return <Text style={[styles.statusIcon, { color: '#FF3B30' }]}>{'\u0021'}</Text>;
    default:
      return null;
  }
}

export const MessageBubble = memo(function MessageBubble({
  message,
  isOwnMessage,
  chatId,
  status,
  reactions,
  onRetry,
  onReply,
  onLongPress,
  onReactionPress,
}: MessageBubbleProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [videoPlayerVisible, setVideoPlayerVisible] = useState(false);
  const bubbleRef = useRef<View>(null);
  const swipeableRef = useRef<Swipeable>(null);

  const handleFileDownload = useCallback(async () => {
    if (message.mediaUrl === null || message.mediaUrl === '') return;

    const fileName = message.mediaMetadata?.fileName ?? 'download';

    try {
      const destination = new File(Paths.cache, fileName);
      await File.downloadFileAsync(message.mediaUrl, destination);
      await Sharing.shareAsync(destination.uri);
    } catch {
      Alert.alert(t('common.error'), t('common.downloadFailed'));
    }
  }, [message.mediaUrl, message.mediaMetadata?.fileName, t]);

  const handleRetry = useCallback(() => {
    if (onRetry !== undefined) {
      onRetry();
    }
  }, [onRetry]);

  const handleLongPress = useCallback(
    (event: GestureResponderEvent) => {
      const { pageX, pageY } = event.nativeEvent;
      onLongPress({ x: pageX, y: pageY });
    },
    [onLongPress],
  );

  const enterTranslateX = useSharedValue(isOwnMessage ? 60 : -60);
  const enterOpacity = useSharedValue(0);
  const enterRotate = useSharedValue(isOwnMessage ? 3 : -3);

  useEffect(() => {
    enterTranslateX.value = withSpring(0, { damping: 14, stiffness: 120 });
    enterOpacity.value = withTiming(1, { duration: 300 });
    enterRotate.value = withSpring(0, { damping: 14, stiffness: 120 });
  }, [enterTranslateX, enterOpacity, enterRotate]);

  const enterAnimatedStyle = useAnimatedStyle(() => ({
    opacity: enterOpacity.value,
    transform: [{ translateX: enterTranslateX.value }, { rotate: `${enterRotate.value}deg` }],
  }));

  const ghostOpacity = useSharedValue(1);
  const ghostScale = useSharedValue(1);

  useEffect(() => {
    if (message.deletedAt !== null) {
      ghostOpacity.value = withTiming(0, { duration: 600 });
      ghostScale.value = withTiming(0.8, { duration: 600 });
    }
  }, [message.deletedAt, ghostOpacity, ghostScale]);

  const ghostAnimatedStyle = useAnimatedStyle(() => ({
    opacity: ghostOpacity.value,
    transform: [{ scale: ghostScale.value }],
  }));

  if (message.deletedAt !== null) {
    return (
      <Animated.View
        style={[
          styles.container,
          isOwnMessage ? styles.ownContainer : styles.otherContainer,
          ghostAnimatedStyle,
        ]}
      >
        <View style={[styles.bubble, { backgroundColor: colors.surface }]}>
          <Text style={[styles.deletedText, { color: colors.textSecondary }]}>
            {t('chat.messageDeleted')}
          </Text>
        </View>
      </Animated.View>
    );
  }

  const isFailed = status === MessageStatus.FAILED;
  const isPending = status === MessageStatus.PENDING;
  const isDark = colors.background === '#1A1A2E';
  const bubbleColor = isOwnMessage ? getChatAccentColor(chatId, isDark) : colors.receiverBubble;
  const bubbleOpacity = isPending ? 0.7 : 1;
  const time = format(new Date(message.createdAt), 'HH:mm');

  const weightStyle = getWeightBubbleStyle(message.weight);
  const weightTextStyle = getWeightTextStyle(message.weight);

  const renderContent = () => {
    switch (message.type) {
      case MessageType.IMAGE:
        return (
          <View>
            {message.mediaUrl !== null && (
              <Pressable onPress={() => setImageViewerVisible(true)}>
                <Image
                  source={{ uri: message.mediaUrl }}
                  style={styles.mediaImage}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
              </Pressable>
            )}

            {message.encryptedContent !== null && (
              <Text style={[styles.messageText, { color: colors.textPrimary }]}>
                {message.encryptedContent}
              </Text>
            )}

            {message.mediaUrl !== null && (
              <ImageViewer
                uri={message.mediaUrl}
                visible={imageViewerVisible}
                onClose={() => setImageViewerVisible(false)}
              />
            )}
          </View>
        );

      case MessageType.VIDEO:
        return (
          <View>
            {message.mediaUrl !== null && (
              <Pressable onPress={() => setVideoPlayerVisible(true)}>
                <View style={styles.videoContainer}>
                  <Image
                    source={{ uri: message.mediaUrl }}
                    style={styles.mediaImage}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                  />
                  <View style={styles.playButton}>
                    <Text style={styles.playIcon}>{'\u25B6'}</Text>
                  </View>
                </View>
              </Pressable>
            )}

            {message.mediaUrl !== null && (
              <VideoPlayer
                uri={message.mediaUrl}
                visible={videoPlayerVisible}
                onClose={() => setVideoPlayerVisible(false)}
              />
            )}
          </View>
        );

      case MessageType.FILE:
        return (
          <Pressable onPress={() => void handleFileDownload()}>
            <View style={styles.fileContainer}>
              <Text style={styles.fileIcon}>{'\u{1F4CE}'}</Text>
              <View style={styles.fileInfo}>
                <Text style={[styles.fileName, { color: colors.textPrimary }]} numberOfLines={1}>
                  {message.mediaMetadata?.fileName ?? 'File'}
                </Text>
                <Text style={[styles.fileSize, { color: colors.textSecondary }]}>
                  {message.mediaMetadata?.size !== undefined && message.mediaMetadata.size !== 0
                    ? formatFileSize(message.mediaMetadata.size)
                    : ''}
                </Text>
              </View>
              <Text style={[styles.downloadIcon, { color: colors.accent }]}>{'\u2B07'}</Text>
            </View>
          </Pressable>
        );

      case MessageType.VOICE:
        return message.mediaUrl !== null ? (
          <VoicePlayer uri={message.mediaUrl} duration={message.mediaMetadata?.duration ?? 0} />
        ) : (
          <View style={styles.voicePlaceholder}>
            <Text style={[styles.voicePlaceholderText, { color: colors.textSecondary }]}>
              Voice message
            </Text>
          </View>
        );

      default:
        return (
          <Text style={[styles.messageText, { color: colors.textPrimary }, weightTextStyle]}>
            {message.encryptedContent ?? ''}
          </Text>
        );
    }
  };

  const renderReplyAction = (
    _progress: RNAnimated.AnimatedInterpolation<number>,
    dragX: RNAnimated.AnimatedInterpolation<number>,
  ) => {
    const translateX = dragX.interpolate({
      inputRange: [0, 60],
      outputRange: [-60, 0],
      extrapolate: 'clamp',
    });

    return (
      <RNAnimated.View style={[styles.replySwipeAction, { transform: [{ translateX }] }]}>
        <Text style={styles.replySwipeIcon}>{'\u21A9'}</Text>
      </RNAnimated.View>
    );
  };

  const handleSwipeReply = () => {
    swipeableRef.current?.close();
    onReply?.();
  };

  return (
    <Swipeable
      ref={swipeableRef}
      renderLeftActions={renderReplyAction}
      onSwipeableOpen={handleSwipeReply}
      overshootLeft={false}
    >
      <Animated.View
        style={[
          styles.container,
          isOwnMessage ? styles.ownContainer : styles.otherContainer,
          enterAnimatedStyle,
        ]}
      >
        <Pressable onLongPress={handleLongPress} delayLongPress={300}>
          <View
            ref={bubbleRef}
            style={[
              styles.bubble,
              { backgroundColor: bubbleColor, opacity: bubbleOpacity },
              weightStyle,
            ]}
          >
            {renderContent()}

            <View style={styles.metaRow}>
              {message.isEdited && (
                <Text style={[styles.editedLabel, { color: colors.textSecondary }]}>edited</Text>
              )}
              <Text style={[styles.time, { color: colors.textSecondary }]}>{time}</Text>
              {isOwnMessage && status !== undefined && (
                <MessageStatusIcon status={status} color={colors.textSecondary} />
              )}
            </View>

            {message.timer !== null && message.timer > 0 && (
              <TimerProgress timerSeconds={message.timer} createdAt={message.createdAt} />
            )}
          </View>
        </Pressable>

        {reactions.length > 0 && <ReactionBadge reactions={reactions} onPress={onReactionPress} />}

        {isFailed && onRetry !== undefined && (
          <Pressable onPress={handleRetry} style={styles.retryButton}>
            <Text style={styles.retryText}>{t('message.retry')}</Text>
          </Pressable>
        )}
      </Animated.View>
    </Swipeable>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 2,
  },
  ownContainer: {
    alignItems: 'flex-end',
  },
  otherContainer: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  deletedText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 2,
    gap: 4,
  },
  editedLabel: {
    fontSize: 11,
  },
  time: {
    fontSize: 11,
  },
  statusIcon: {
    fontSize: 11,
  },
  mediaImage: {
    width: 240,
    height: 180,
    borderRadius: 12,
    marginBottom: 4,
  },
  videoContainer: {
    position: 'relative',
  },
  playButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -20,
    marginLeft: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: {
    color: '#FFFFFF',
    fontSize: 18,
  },
  fileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fileIcon: {
    fontSize: 24,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '500',
  },
  fileSize: {
    fontSize: 12,
    marginTop: 2,
  },
  downloadIcon: {
    fontSize: 16,
  },
  voicePlaceholder: {
    minWidth: 180,
    paddingVertical: 8,
  },
  voicePlaceholderText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  retryButton: {
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#FF3B30',
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  replySwipeAction: {
    width: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  replySwipeIcon: {
    fontSize: 22,
    color: '#2DD48C',
  },
});
