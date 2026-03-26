import { Ionicons } from '@expo/vector-icons';
import { memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useThemeColors } from '../hooks/use-theme-colors';
import { MediaPlaceholderProps } from '../models/media-placeholder-props.interface';
import { MediaType } from '../models/media-type.type';
import { storageService } from '../services/storage.service';
import { formatFileSize } from '../utils/format-file-size';

import { DownloadProgress } from './download-progress';

const TYPE_ICONS: Record<MediaType, keyof typeof Ionicons.glyphMap> = {
  photo: 'image-outline',
  video: 'play-circle-outline',
  file: 'document-text-outline',
  voice: 'mic-outline',
  other: 'download-outline',
};

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remaining = Math.floor(seconds % 60);
  return `${minutes}:${remaining.toString().padStart(2, '0')}`;
}

export const MediaPlaceholder = memo(function MediaPlaceholder({
  mediaId,
  chatId,
  messageId,
  type,
  fileName,
  fileSize,
  duration,
  thumbnailUri,
  onDownloaded,
}: MediaPlaceholderProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleDownload = useCallback(async () => {
    if (isDownloading) return;

    setIsDownloading(true);
    setProgress(0);

    try {
      const localPath = await storageService.downloadAndCache(
        mediaId,
        chatId,
        messageId,
        type,
        undefined,
        setProgress,
      );
      onDownloaded(localPath);
    } catch {
      setIsDownloading(false);
      setProgress(0);
    }
  }, [isDownloading, mediaId, chatId, messageId, type, onDownloaded]);

  if (isDownloading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surface }]}>
        {thumbnailUri !== undefined && thumbnailUri !== '' && (
          <Image source={{ uri: thumbnailUri }} style={styles.thumbnail} blurRadius={10} />
        )}
        <DownloadProgress percentage={progress} fileSize={fileSize} />
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.surface }]}
      onPress={() => void handleDownload()}
      activeOpacity={0.7}
    >
      {thumbnailUri !== undefined && thumbnailUri !== '' && (
        <Image source={{ uri: thumbnailUri }} style={styles.thumbnail} blurRadius={10} />
      )}

      <View style={styles.overlay}>
        <View style={[styles.iconCircle, { backgroundColor: colors.accent + '30' }]}>
          <Ionicons name={TYPE_ICONS[type]} size={28} color={colors.accent} />
        </View>

        {fileName !== undefined && fileName !== '' && (
          <Text style={[styles.fileName, { color: colors.textPrimary }]} numberOfLines={1}>
            {fileName}
          </Text>
        )}

        <View style={styles.metaRow}>
          {fileSize !== undefined && fileSize > 0 && (
            <Text style={[styles.meta, { color: colors.textSecondary }]}>
              {formatFileSize(fileSize)}
            </Text>
          )}
          {duration !== undefined && duration > 0 && (
            <Text style={[styles.meta, { color: colors.textSecondary }]}>
              {formatDuration(duration)}
            </Text>
          )}
        </View>

        <Text style={[styles.tapHint, { color: colors.accent }]}>{t('storage.tapToDownload')}</Text>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
    minHeight: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnail: {
    ...StyleSheet.absoluteFillObject,
    resizeMode: 'cover',
  },
  overlay: {
    alignItems: 'center',
    padding: 16,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  fileName: {
    fontSize: 13,
    marginBottom: 4,
    maxWidth: 200,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  meta: {
    fontSize: 12,
  },
  tapHint: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
});
