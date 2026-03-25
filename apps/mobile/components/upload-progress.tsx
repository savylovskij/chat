import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useThemeColors } from '../hooks/use-theme-colors';
import { UploadProgressProps } from '../models/upload-progress-props.interface';

export const UploadProgress = memo(function UploadProgress({
  percentage,
  fileName,
}: UploadProgressProps) {
  const colors = useThemeColors();

  return (
    <View
      style={[styles.container, { backgroundColor: colors.surface, borderTopColor: colors.border }]}
    >
      <View style={styles.info}>
        <Text style={[styles.fileName, { color: colors.textPrimary }]} numberOfLines={1}>
          {fileName}
        </Text>
        <Text style={[styles.percentage, { color: colors.textSecondary }]}>{percentage}%</Text>
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
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  info: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  fileName: {
    fontSize: 13,
    flex: 1,
    marginRight: 8,
  },
  percentage: {
    fontSize: 13,
    fontWeight: '500',
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
