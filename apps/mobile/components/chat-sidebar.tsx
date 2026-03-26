import { Chat } from '@shared/types/chat.interface';
import { FlashList } from '@shopify/flash-list';
import { memo, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';

import { useThemeColors } from '../hooks/use-theme-colors';
import { ChatSidebarProps } from '../models/chat-sidebar-props.interface';
import { useChatStore } from '../stores/chat.store';

import { ChatListItem } from './chat-list-item';
import { FloatingBubbles } from './floating-bubbles';

export const ChatSidebar = memo(function ChatSidebar({
  onChatPress,
  activeChatId,
}: ChatSidebarProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const { chats, isLoading, fetchChats } = useChatStore();
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    void fetchChats();
  }, [fetchChats]);

  const filteredChats = searchQuery
    ? chats.filter((chat) => chat.name?.toLowerCase().includes(searchQuery.toLowerCase()))
    : chats;

  const handleChatPress = useCallback(
    (chat: Chat) => {
      onChatPress(chat.id);
    },
    [onChatPress],
  );

  const renderItem = useCallback(
    ({ item }: { item: Chat }) => (
      <View style={[item.id === activeChatId && { backgroundColor: colors.surface }]}>
        <ChatListItem chat={item} onPress={() => handleChatPress(item)} />
      </View>
    ),
    [handleChatPress, activeChatId, colors.surface],
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.searchContainer, { backgroundColor: colors.surface }]}>
        <TextInput
          style={[styles.searchInput, { color: colors.textPrimary }]}
          placeholder={t('chat.searchChats')}
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <FloatingBubbles
        chats={filteredChats}
        activeChatId={activeChatId}
        onChatPress={onChatPress}
      />

      <FlashList
        data={filteredChats}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={() => void fetchChats()} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {t('chat.noChats')}
            </Text>
          </View>
        }
      />

      <Pressable
        style={[styles.fab, { backgroundColor: colors.accent }]}
        onPress={() => onChatPress('new')}
      >
        <Text style={styles.fabText}>+</Text>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchInput: {
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 16,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '300',
    lineHeight: 30,
  },
});
