import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useThemeColors } from '../hooks/use-theme-colors';
import { TypingIndicatorProps } from '../models/typing-indicator-props.interface';

export const TypingIndicator = memo(function TypingIndicator({ userIds }: TypingIndicatorProps) {
  const colors = useThemeColors();

  if (userIds.length === 0) return null;

  const label = userIds.length === 1 ? 'typing...' : `${userIds.length} people typing...`;

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={styles.dots}>
        <View style={[styles.dot, { backgroundColor: colors.textSecondary }]} />
        <View style={[styles.dot, { backgroundColor: colors.textSecondary }]} />
        <View style={[styles.dot, { backgroundColor: colors.textSecondary }]} />
      </View>
      <Text style={[styles.text, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 6,
  },
  dots: {
    flexDirection: 'row',
    gap: 3,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontSize: 13,
  },
});
