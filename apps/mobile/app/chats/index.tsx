import { Chat } from '@shared/types/chat.interface';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';

import { ChatListItem } from '../../components/chat-list-item';
import { useThemeColors } from '../../hooks/use-theme-colors';
import { useChatStore } from '../../stores/chat.store';

export default function ChatListScreen() {
  const colors = useThemeColors();
  const router = useRouter();
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
      router.push(`/chats/${chat.id}`);
    },
    [router],
  );

  const renderItem = useCallback(
    ({ item }: { item: Chat }) => (
      <ChatListItem chat={item} onPress={() => handleChatPress(item)} />
    ),
    [handleChatPress],
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.searchContainer, { backgroundColor: colors.surface }]}>
        <TextInput
          style={[styles.searchInput, { color: colors.textPrimary }]}
          placeholder="Search chats..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <FlashList
        data={filteredChats}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={() => void fetchChats()} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No chats yet</Text>
          </View>
        }
      />

      <Pressable
        style={[styles.fab, { backgroundColor: colors.accent }]}
        onPress={() => router.push('/chats/new')}
      >
        <Text style={styles.fabText}>+</Text>
      </Pressable>
    </View>
  );
}

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
