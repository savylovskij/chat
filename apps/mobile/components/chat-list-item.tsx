import { formatDistanceToNow } from 'date-fns';
import { memo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';

import { useThemeColors } from '../hooks/use-theme-colors';
import { ChatListItemProps } from '../models/chat-list-item-props.interface';
import { usePresenceStore } from '../stores/presence.store';

import { Avatar } from './avatar';

export const ChatListItem = memo(function ChatListItem({
  chat,
  onPress,
  onSwipeAction,
  onMute,
  onArchive,
}: ChatListItemProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const swipeableRef = useRef<Swipeable>(null);
  const onlineUsers = usePresenceStore((state) => state.onlineUsers);
  const isOnline = chat.createdBy ? onlineUsers.has(chat.createdBy) : false;

  const timeLabel =
    chat.lastMessageAt !== null
      ? formatDistanceToNow(new Date(chat.lastMessageAt), { addSuffix: true })
      : '';

  const renderRightActions = (
    _progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>,
  ) => {
    const translateX = dragX.interpolate({
      inputRange: [-160, 0],
      outputRange: [0, 160],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View style={[styles.swipeActionsRow, { transform: [{ translateX }] }]}>
        <Pressable
          style={[styles.swipeAction, { backgroundColor: '#FFD60A' }]}
          onPress={() => {
            swipeableRef.current?.close();
            onMute?.();
          }}
        >
          <Text style={styles.swipeActionIcon}>{'\u{1F515}'}</Text>
          <Text style={styles.swipeActionText}>{t('chat.mute')}</Text>
        </Pressable>
        <Pressable
          style={[styles.swipeAction, { backgroundColor: colors.accent }]}
          onPress={() => {
            swipeableRef.current?.close();
            onArchive?.();
          }}
        >
          <Text style={styles.swipeActionIcon}>{'\u{1F4E6}'}</Text>
          <Text style={styles.swipeActionText}>{t('chat.archive')}</Text>
        </Pressable>
      </Animated.View>
    );
  };

  const handleSwipeOpen = () => {
    swipeableRef.current?.close();
    onSwipeAction?.();
  };

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      onSwipeableOpen={handleSwipeOpen}
      overshootRight={false}
    >
      <Pressable
        style={[
          styles.container,
          { borderBottomColor: colors.border, backgroundColor: colors.background },
        ]}
        onPress={onPress}
      >
        <View style={styles.avatarContainer}>
          <Avatar uri={chat.avatarUrl} name={chat.name ?? '?'} size={48} />
          {isOnline && (
            <View style={[styles.onlineIndicator, { backgroundColor: colors.onlineIndicator }]} />
          )}
        </View>

        <View style={styles.content}>
          <View style={styles.topRow}>
            <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
              {chat.name ?? 'Chat'}
            </Text>
            <Text style={[styles.time, { color: colors.textSecondary }]}>{timeLabel}</Text>
          </View>

          <View style={styles.bottomRow}>
            <Text style={[styles.lastMessage, { color: colors.textSecondary }]} numberOfLines={1}>
              {/* Last message preview will come from enriched chat data */}
            </Text>
          </View>
        </View>
      </Pressable>
    </Swipeable>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  time: {
    fontSize: 13,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: 14,
    flex: 1,
  },
  swipeActionsRow: {
    flexDirection: 'row',
  },
  swipeAction: {
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  swipeActionIcon: {
    fontSize: 18,
    marginBottom: 2,
  },
  swipeActionText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
});
