import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useThemeColors } from '../hooks/use-theme-colors';
import { ReactionBadgeProps } from '../models/reaction-badge-props.interface';

export const ReactionBadge = memo(function ReactionBadge({
  reactions,
  onPress,
}: ReactionBadgeProps) {
  const colors = useThemeColors();

  if (reactions.length === 0) return null;

  const grouped = reactions.reduce<Record<string, number>>((acc, reaction) => {
    acc[reaction.emoji] = (acc[reaction.emoji] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <Pressable style={[styles.container, { backgroundColor: colors.surface }]} onPress={onPress}>
      {Object.entries(grouped).map(([emoji, count]) => (
        <View key={emoji} style={styles.reactionGroup}>
          <Text style={styles.emoji}>{emoji}</Text>
          <Text style={[styles.count, { color: colors.textSecondary }]}>{count}</Text>
        </View>
      ))}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 4,
    marginTop: 4,
  },
  reactionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  emoji: {
    fontSize: 14,
  },
  count: {
    fontSize: 12,
  },
});
