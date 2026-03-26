import { memo, useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useThemeColors } from '../hooks/use-theme-colors';
import { ReactionBadgeProps } from '../models/reaction-badge-props.interface';

const COMBO_THRESHOLD = 3;

export const ReactionBadge = memo(function ReactionBadge({
  reactions,
  onPress,
}: ReactionBadgeProps) {
  const colors = useThemeColors();
  const comboScale = useSharedValue(1);

  const grouped = reactions.reduce<Record<string, number>>((acc, reaction) => {
    acc[reaction.emoji] = (acc[reaction.emoji] ?? 0) + 1;
    return acc;
  }, {});

  const maxCount = Math.max(0, ...Object.values(grouped));
  const hasCombo = maxCount >= COMBO_THRESHOLD;
  const comboEmoji = Object.entries(grouped).find(([_, count]) => count >= COMBO_THRESHOLD);

  useEffect(() => {
    if (hasCombo) {
      comboScale.value = withSequence(
        withTiming(1.3, { duration: 150 }),
        withSpring(1, { damping: 8, stiffness: 200 }),
      );
    }
  }, [hasCombo, maxCount, comboScale]);

  const comboAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: comboScale.value }],
  }));

  if (reactions.length === 0) return null;

  return (
    <View style={styles.wrapper}>
      <Pressable style={[styles.container, { backgroundColor: colors.surface }]} onPress={onPress}>
        {Object.entries(grouped).map(([emoji, count]) => (
          <View key={emoji} style={styles.reactionGroup}>
            <Text style={styles.emoji}>{emoji}</Text>
            <Text style={[styles.count, { color: colors.textSecondary }]}>{count}</Text>
          </View>
        ))}
      </Pressable>

      {hasCombo && comboEmoji !== undefined && (
        <Animated.View style={[styles.comboBadge, comboAnimatedStyle]}>
          <Text style={styles.comboText}>
            {'\u{1F525}'} x{comboEmoji[1]} COMBO!
          </Text>
        </Animated.View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  container: {
    flexDirection: 'row',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 4,
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
  comboBadge: {
    backgroundColor: '#FF6B00',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  comboText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
});
