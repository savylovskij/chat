import { Chat } from '@shared/types/chat.interface';
import { memo, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useThemeColors } from '../hooks/use-theme-colors';

import { Avatar } from './avatar';

interface FloatingBubblesProps {
  chats: Chat[];
  activeChatId?: string;
  onChatPress: (chatId: string) => void;
}

const MIN_BUBBLE_SIZE = 36;
const DEFAULT_BUBBLE_SIZE = 40;
const MAX_BUBBLE_SIZE = 56;
const UNREAD_SCALE_CAP = 20;

function getBubbleSize(isActive: boolean, unreadCount: number): number {
  if (isActive) return MAX_BUBBLE_SIZE;
  if (unreadCount <= 0) return MIN_BUBBLE_SIZE;

  const ratio = Math.min(unreadCount, UNREAD_SCALE_CAP) / UNREAD_SCALE_CAP;

  return Math.round(DEFAULT_BUBBLE_SIZE + ratio * (MAX_BUBBLE_SIZE - DEFAULT_BUBBLE_SIZE));
}

export const FloatingBubbles = memo(function FloatingBubbles({
  chats,
  activeChatId,
  onChatPress,
}: FloatingBubblesProps) {
  const colors = useThemeColors();

  const sortedChats = useMemo(() => {
    const sorted = [...chats];

    if (activeChatId !== undefined && activeChatId !== '') {
      const activeIndex = sorted.findIndex((chat) => chat.id === activeChatId);

      if (activeIndex > 0) {
        const [active] = sorted.splice(activeIndex, 1);
        sorted.unshift(active);
      }
    }

    return sorted.slice(0, 15);
  }, [chats, activeChatId]);

  if (sortedChats.length === 0) return null;

  return (
    <View style={[styles.container, { borderBottomColor: colors.border }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {sortedChats.map((chat) => {
          const isActive = chat.id === activeChatId;
          const unreadCount = (chat as Chat & { unreadCount?: number }).unreadCount ?? 0;
          const size = getBubbleSize(isActive, unreadCount);

          return (
            <Pressable
              key={chat.id}
              style={[
                styles.bubbleWrapper,
                isActive && [styles.activeBubble, { borderColor: colors.accent }],
              ]}
              onPress={() => onChatPress(chat.id)}
            >
              <Avatar uri={chat.avatarUrl} name={chat.name ?? '?'} size={size} />

              {(chat as Chat & { unreadCount?: number }).unreadCount !== undefined &&
                (chat as Chat & { unreadCount?: number }).unreadCount! > 0 && (
                  <View style={[styles.unreadBadge, { backgroundColor: colors.unreadBadge }]}>
                    <Text style={styles.unreadText}>
                      {(chat as Chat & { unreadCount?: number }).unreadCount}
                    </Text>
                  </View>
                )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  scrollContent: {
    paddingHorizontal: 12,
    gap: 10,
    alignItems: 'center',
  },
  bubbleWrapper: {
    position: 'relative',
    borderRadius: 999,
    borderWidth: 2,
    borderColor: 'transparent',
    padding: 2,
  },
  activeBubble: {
    borderWidth: 2,
  },
  unreadBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  unreadText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
});
