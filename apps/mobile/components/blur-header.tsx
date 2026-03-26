import { BlurView } from 'expo-blur';
import { memo } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useThemeColors } from '../hooks/use-theme-colors';
import { BlurHeaderProps } from '../models/blur-header-props.interface';

export const BlurHeader = memo(function BlurHeader({ title, onBack }: BlurHeaderProps) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  const headerContent = (
    <View style={[styles.content, { paddingTop: insets.top }]}>
      {onBack && (
        <Pressable style={styles.backButton} onPress={onBack}>
          <Text style={[styles.backIcon, { color: colors.accent }]}>‹</Text>
        </Pressable>
      )}
      <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
        {title}
      </Text>
    </View>
  );

  if (Platform.OS === 'ios') {
    return (
      <BlurView
        intensity={80}
        tint="dark"
        style={[styles.container, { borderBottomColor: colors.border }]}
      >
        {headerContent}
      </BlurView>
    );
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, borderBottomColor: colors.border },
      ]}
    >
      {headerContent}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  content: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  backButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  backIcon: {
    fontSize: 28,
    fontWeight: '300',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
});
