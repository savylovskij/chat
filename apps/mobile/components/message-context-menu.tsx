import { BlurView } from 'expo-blur';
import { memo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dimensions, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
} from 'react-native-reanimated';

import { useThemeColors } from '../hooks/use-theme-colors';
import { MessageContextMenuProps } from '../models/message-context-menu-props.interface';

const QUICK_REACTIONS = [
  '\u{1F44D}',
  '\u{2764}\u{FE0F}',
  '\u{1F602}',
  '\u{1F62E}',
  '\u{1F622}',
  '\u{1F525}',
];

const SPRING_CONFIG = { damping: 15, stiffness: 150, mass: 0.8 };

function ReactionButton({
  emoji,
  index,
  onPress,
}: {
  emoji: string;
  index: number;
  onPress: () => void;
}) {
  const scale = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(index * 50, withSpring(1, SPRING_CONFIG));
  }, [index, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable style={styles.reactionButton} onPress={onPress}>
        <Text style={styles.reactionEmoji}>{emoji}</Text>
      </Pressable>
    </Animated.View>
  );
}

export const MessageContextMenu = memo(function MessageContextMenu({
  visible,
  message,
  isOwnMessage,
  anchorPosition,
  onClose,
  onReaction,
  onReply,
  onCopy,
  onEdit,
  onDeleteForMe,
  onDeleteForEveryone,
}: MessageContextMenuProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();

  if (!visible || message === null) return null;

  const screenHeight = Dimensions.get('window').height;
  const menuAbove = anchorPosition.y > screenHeight * 0.5;
  const menuTop = menuAbove ? undefined : anchorPosition.y + 10;
  const menuBottom = menuAbove ? screenHeight - anchorPosition.y + 10 : undefined;

  const hasTextContent = message.encryptedContent !== null && message.encryptedContent !== '';
  const canDeleteForEveryone = isOwnMessage && isWithin48Hours(message.createdAt);

  const menuItems: { label: string; onPress: () => void; danger?: boolean }[] = [
    { label: t('menu.reply'), onPress: onReply },
  ];

  if (hasTextContent) {
    menuItems.push({ label: t('menu.copy'), onPress: onCopy });
  }

  if (isOwnMessage && hasTextContent) {
    menuItems.push({ label: t('menu.edit'), onPress: onEdit });
  }

  menuItems.push({ label: t('menu.deleteForMe'), onPress: onDeleteForMe, danger: false });

  if (canDeleteForEveryone) {
    menuItems.push({
      label: t('menu.deleteForEveryone'),
      onPress: onDeleteForEveryone,
      danger: true,
    });
  }

  const BackdropComponent = Platform.OS === 'ios' ? BlurView : View;
  const backdropProps = Platform.OS === 'ios' ? { intensity: 30, tint: 'dark' as const } : {};

  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
          style={StyleSheet.absoluteFill}
        >
          <BackdropComponent
            {...backdropProps}
            style={[StyleSheet.absoluteFill, Platform.OS !== 'ios' && styles.androidBackdrop]}
          />
        </Animated.View>
      </Pressable>

      <Animated.View
        entering={SlideInDown.springify().damping(18).stiffness(140)}
        style={[
          styles.menuContainer,
          {
            top: menuTop,
            bottom: menuBottom,
            alignSelf: isOwnMessage ? 'flex-end' : 'flex-start',
            marginHorizontal: 16,
          },
        ]}
      >
        <View style={[styles.reactionsRow, { backgroundColor: colors.surface }]}>
          {QUICK_REACTIONS.map((emoji, index) => (
            <ReactionButton
              key={emoji}
              emoji={emoji}
              index={index}
              onPress={() => onReaction(emoji)}
            />
          ))}
        </View>

        <View style={[styles.menuList, { backgroundColor: colors.surface }]}>
          {menuItems.map((item, index) => (
            <Pressable
              key={item.label}
              style={({ pressed }) => [
                styles.menuItem,
                pressed && { backgroundColor: colors.border },
                index < menuItems.length - 1 && {
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: colors.border,
                },
              ]}
              onPress={() => {
                item.onPress();
                onClose();
              }}
            >
              <Text
                style={[
                  styles.menuItemText,
                  { color: item.danger === true ? colors.danger : colors.textPrimary },
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </Animated.View>
    </View>
  );
});

function isWithin48Hours(createdAt: string): boolean {
  const created = new Date(createdAt).getTime();
  const now = Date.now();
  const hours48 = 48 * 60 * 60 * 1000;

  return now - created < hours48;
}

const styles = StyleSheet.create({
  androidBackdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  menuContainer: {
    position: 'absolute',
    maxWidth: 280,
    minWidth: 220,
    gap: 8,
  },
  reactionsRow: {
    flexDirection: 'row',
    borderRadius: 24,
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 2,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  reactionButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactionEmoji: {
    fontSize: 26,
  },
  menuList: {
    borderRadius: 14,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  menuItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  menuItemText: {
    fontSize: 16,
  },
});
