import { ChatType } from '@shared/enums/chat-type.enum';
import { UserPublic } from '@shared/types/user-public.interface';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Avatar } from '../../components/avatar';
import { BlurHeader } from '../../components/blur-header';
import { useThemeColors } from '../../hooks/use-theme-colors';
import { apiClient } from '../../services/api-client';
import { useChatStore } from '../../stores/chat.store';

const SEARCH_MIN_LENGTH = 2;

export default function ContactsScreen() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const router = useRouter();

  const createChat = useChatStore((state) => state.createChat);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserPublic[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const handleSearch = useCallback(async (text: string) => {
    setQuery(text);

    if (text.length < SEARCH_MIN_LENGTH) {
      setResults([]);
      return;
    }

    setIsSearching(true);

    try {
      const users = await apiClient.get<UserPublic[]>('/users/search', {
        params: { query: text, limit: '20' },
      });
      setResults(users);
    } catch {
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleUserPress = useCallback(
    async (user: UserPublic) => {
      if (isCreating) return;

      setIsCreating(true);

      try {
        const chat = await createChat(ChatType.DIRECT, [user.id]);
        router.push(`/chats/${chat.id}`);
      } catch {
        setIsCreating(false);
      }
    },
    [createChat, router, isCreating],
  );

  const renderUser = useCallback(
    ({ item }: { item: UserPublic }) => (
      <Pressable
        style={[styles.userItem, { borderBottomColor: colors.border }]}
        onPress={() => void handleUserPress(item)}
      >
        <Avatar uri={item.avatarUrl} name={item.displayName} size={48} />

        <View style={styles.userInfo}>
          <Text style={[styles.userName, { color: colors.textPrimary }]}>{item.displayName}</Text>
          {item.bio !== null && item.bio !== '' ? (
            <Text style={[styles.userBio, { color: colors.textSecondary }]} numberOfLines={1}>
              {item.bio}
            </Text>
          ) : null}
        </View>

        {item.isOnline && <View style={[styles.onlineDot, { backgroundColor: colors.accent }]} />}
      </Pressable>
    ),
    [colors, handleUserPress],
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <BlurHeader title={t('contacts.title')} onBack={() => router.back()} />

      <View style={[styles.searchContainer, { backgroundColor: colors.surface }]}>
        <TextInput
          style={[styles.searchInput, { color: colors.textPrimary }]}
          placeholder={t('chat.searchContacts')}
          placeholderTextColor={colors.textSecondary}
          value={query}
          onChangeText={(text) => void handleSearch(text)}
          autoFocus
        />
      </View>

      {isSearching && <ActivityIndicator style={styles.loader} color={colors.accent} />}

      <FlatList
        data={results}
        renderItem={renderUser}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          query.length >= SEARCH_MIN_LENGTH && !isSearching ? (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {t('contacts.noResults')}
              </Text>
            </View>
          ) : query.length < SEARCH_MIN_LENGTH ? (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {t('contacts.searchHint')}
              </Text>
            </View>
          ) : null
        }
      />
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
  loader: {
    paddingVertical: 16,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: '500',
  },
  userBio: {
    fontSize: 14,
    marginTop: 2,
  },
  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 16,
  },
});
