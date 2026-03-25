import { MessageType } from '@shared/enums/message-type.enum';
import { format } from 'date-fns';
import { memo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { useThemeColors } from '../hooks/use-theme-colors';
import { MessageBubbleProps } from '../models/message-bubble-props.interface';

export const MessageBubble = memo(function MessageBubble({
  message,
  isOwnMessage,
}: MessageBubbleProps) {
  const colors = useThemeColors();

  if (message.deletedAt !== null) {
    return (
      <View style={[styles.container, isOwnMessage ? styles.ownContainer : styles.otherContainer]}>
        <View style={[styles.bubble, { backgroundColor: colors.surface }]}>
          <Text style={[styles.deletedText, { color: colors.textSecondary }]}>Message deleted</Text>
        </View>
      </View>
    );
  }

  const bubbleColor = isOwnMessage ? colors.senderBubble : colors.receiverBubble;
  const time = format(new Date(message.createdAt), 'HH:mm');

  const renderContent = () => {
    switch (message.type) {
      case MessageType.IMAGE:
        return (
          <View>
            {message.mediaUrl !== null && (
              <Image
                source={{ uri: message.mediaUrl }}
                style={styles.mediaImage}
                resizeMode="cover"
              />
            )}

            {message.encryptedContent !== null && (
              <Text style={[styles.messageText, { color: colors.textPrimary }]}>
                {message.encryptedContent}
              </Text>
            )}
          </View>
        );

      case MessageType.VIDEO:
        return (
          <View>
            {message.mediaUrl !== null && (
              <View style={styles.videoContainer}>
                <Image
                  source={{ uri: message.mediaUrl }}
                  style={styles.mediaImage}
                  resizeMode="cover"
                />
                <View style={styles.playButton}>
                  <Text style={styles.playIcon}>{'\u25B6'}</Text>
                </View>
              </View>
            )}
          </View>
        );

      case MessageType.FILE:
        return (
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
          </View>
        );

      case MessageType.VOICE:
        return (
          <View style={styles.voiceContainer}>
            <Pressable style={[styles.voicePlayButton, { backgroundColor: colors.accent }]}>
              <Text style={styles.voicePlayIcon}>{'\u25B6'}</Text>
            </Pressable>
            <View style={[styles.waveform, { backgroundColor: colors.textSecondary }]} />
            <Text style={[styles.voiceDuration, { color: colors.textSecondary }]}>
              {message.mediaMetadata?.duration !== undefined && message.mediaMetadata.duration !== 0
                ? formatDuration(message.mediaMetadata.duration)
                : '0:00'}
            </Text>
          </View>
        );

      default:
        return (
          <Text style={[styles.messageText, { color: colors.textPrimary }]}>
            {message.encryptedContent ?? ''}
          </Text>
        );
    }
  };

  return (
    <View style={[styles.container, isOwnMessage ? styles.ownContainer : styles.otherContainer]}>
      <View style={[styles.bubble, { backgroundColor: bubbleColor }]}>
        {renderContent()}

        <View style={styles.metaRow}>
          {message.isEdited && (
            <Text style={[styles.editedLabel, { color: colors.textSecondary }]}>edited</Text>
          )}
          <Text style={[styles.time, { color: colors.textSecondary }]}>{time}</Text>
        </View>
      </View>
    </View>
  );
});

function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
}

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
  voiceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 180,
  },
  voicePlayButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voicePlayIcon: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  waveform: {
    flex: 1,
    height: 2,
    borderRadius: 1,
  },
  voiceDuration: {
    fontSize: 12,
  },
});
