import { memo } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { useThemeColors } from '../hooks/use-theme-colors';
import { AvatarProps } from '../models/avatar-props.interface';

export const Avatar = memo(function Avatar({ uri, name, size }: AvatarProps) {
  const colors = useThemeColors();

  if (uri !== undefined && uri !== '') {
    return (
      <Image
        source={{ uri }}
        style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
      />
    );
  }

  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <View
      style={[
        styles.placeholder,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.accent,
        },
      ]}
    >
      <Text style={[styles.initials, { fontSize: size * 0.4 }]}>{initials}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  image: {
    resizeMode: 'cover',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
