import { memo, useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useThemeColors } from '../hooks/use-theme-colors';
import { ReactionPickerProps } from '../models/reaction-picker-props.interface';

const QUICK_REACTIONS = [
  '\u{1F44D}',
  '\u{2764}\u{FE0F}',
  '\u{1F602}',
  '\u{1F62E}',
  '\u{1F622}',
  '\u{1F525}',
];

export const ReactionPicker = memo(function ReactionPicker({
  onSelect,
  onClose,
}: ReactionPickerProps) {
  const colors = useThemeColors();

  const handleSelect = useCallback(
    (emoji: string) => {
      onSelect(emoji);
      onClose();
    },
    [onSelect, onClose],
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      {QUICK_REACTIONS.map((emoji) => (
        <Pressable key={emoji} style={styles.reactionButton} onPress={() => handleSelect(emoji)}>
          <Text style={styles.emoji}>{emoji}</Text>
        </Pressable>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 24,
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 2,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  reactionButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 24,
  },
});
