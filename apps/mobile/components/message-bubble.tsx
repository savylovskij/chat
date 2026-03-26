import { MessageType } from '@shared/enums/message-type.enum';
import { format } from 'date-fns';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { useThemeColors } from '../hooks/use-theme-colors';
import { MessageBubbleProps } from '../models/message-bubble-props.interface';
import { formatFileSize } from '../utils/format-file-size';

import { ImageViewer } from './image-viewer';
import { VideoPlayer } from './video-player';
import { VoicePlayer } from './voice-player';

export const MessageBubble = memo(function MessageBubble({
  message,
  isOwnMessage,
}: MessageBubbleProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [videoPlayerVisible, setVideoPlayerVisible] = useState(false);

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

  if (message.deletedAt !== null) {
    return (
      <View style={[styles.container, isOwnMessage ? styles.ownContainer : styles.otherContainer]}>
        <View style={[styles.bubble, { backgroundColor: colors.surface }]}>
          <Text style={[styles.deletedText, { color: colors.textSecondary }]}>
            {t('chat.messageDeleted')}
          </Text>
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
              <Pressable onPress={() => setImageViewerVisible(true)}>
                <Image
                  source={{ uri: message.mediaUrl }}
                  style={styles.mediaImage}
                  resizeMode="cover"
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
                    resizeMode="cover"
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
});
