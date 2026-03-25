import { MessageType } from '@shared/enums/message-type.enum';
import { Message } from '@shared/types/message.interface';
import { FlashList } from '@shopify/flash-list';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useCallback, useEffect, useMemo } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';

import { MessageBubble } from '../../components/message-bubble';
import { MessageInput } from '../../components/message-input';
import { TypingIndicator } from '../../components/typing-indicator';
import { useThemeColors } from '../../hooks/use-theme-colors';
import { useAuthStore } from '../../stores/auth.store';
import { useChatStore } from '../../stores/chat.store';
import { useMessageStore } from '../../stores/message.store';
import { usePresenceStore } from '../../stores/presence.store';

export default function ChatRoomScreen() {
  const { chatId } = useLocalSearchParams<{ chatId: string }>();
  const colors = useThemeColors();
  const navigation = useNavigation();

  const currentUser = useAuthStore((state) => state.user);
  const chat = useChatStore((state) => state.chats.find((item) => item.id === chatId));

  const setActiveChat = useChatStore((state) => state.setActiveChat);

  const { messagesByChat, hasMore, fetchMessages, sendMessage } = useMessageStore();

  const typingUsers = usePresenceStore((state) => state.typingUsers[chatId ?? ''] ?? []);

  const messages = useMemo(
    () => (chatId ? (messagesByChat[chatId] ?? []) : []),
    [chatId, messagesByChat],
  );
  const canLoadMore = chatId ? (hasMore[chatId] ?? true) : false;

  useEffect(() => {
    if (chat?.name !== undefined && chat.name !== '') {
      navigation.setOptions({ title: chat.name });
    }
  }, [chat?.name, navigation]);

  useEffect(() => {
    if (chatId) {
      setActiveChat(chatId);
      void fetchMessages(chatId);
    }

    return () => setActiveChat(null);
  }, [chatId, setActiveChat, fetchMessages]);

  const handleLoadMore = useCallback(() => {
    if (!chatId || !canLoadMore || messages.length === 0) {
      return;
    }

    const lastMessage = messages[messages.length - 1];
    void fetchMessages(chatId, lastMessage.id);
  }, [chatId, canLoadMore, messages, fetchMessages]);

  const handleSendMessage = useCallback(
    (text: string) => {
      if (!chatId) {
        return;
      }

      void sendMessage(chatId, text, MessageType.TEXT);
    },
    [chatId, sendMessage],
  );

  const renderItem = useCallback(
    ({ item }: { item: Message }) => (
      <MessageBubble message={item} isOwnMessage={item.senderId === currentUser?.id} />
    ),
    [currentUser?.id],
  );

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      <FlashList
        data={messages}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        inverted
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
      />

      {typingUsers.length > 0 && <TypingIndicator userIds={typingUsers} />}

      <MessageInput onSend={handleSendMessage} chatId={chatId ?? ''} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
