import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useThemeColors } from '../hooks/use-theme-colors';
import { DownloadProgressProps } from '../models/download-progress-props.interface';
import { formatFileSize } from '../utils/format-file-size';

export const DownloadProgress = memo(function DownloadProgress({
  percentage,
  fileSize,
}: DownloadProgressProps) {
  const colors = useThemeColors();

  return (
    <View style={styles.container}>
      <View style={styles.info}>
        <Text style={[styles.percentage, { color: colors.textPrimary }]}>{percentage}%</Text>
        {fileSize !== undefined && fileSize > 0 && (
          <Text style={[styles.size, { color: colors.textSecondary }]}>
            {formatFileSize(Math.round((fileSize * percentage) / 100))} / {formatFileSize(fileSize)}
          </Text>
        )}
      </View>
      <View style={[styles.trackBar, { backgroundColor: colors.border }]}>
        <View
          style={[styles.progressBar, { width: `${percentage}%`, backgroundColor: colors.accent }]}
        />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    padding: 16,
    width: '100%',
  },
  info: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  percentage: {
    fontSize: 15,
    fontWeight: '600',
  },
  size: {
    fontSize: 12,
  },
  trackBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
});
