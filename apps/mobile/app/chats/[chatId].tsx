import { MessageStatus } from '@shared/enums/message-status.enum';
import { MessageType } from '@shared/enums/message-type.enum';
import { MediaMetadata } from '@shared/types/media-metadata.interface';
import { Message } from '@shared/types/message.interface';
import { FlashList } from '@shopify/flash-list';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text } from 'react-native';

import { BlurHeader } from '../../components/blur-header';
import { MessageBubble } from '../../components/message-bubble';
import { MessageInput } from '../../components/message-input';
import { ProfileModal } from '../../components/profile-modal';
import { TypingIndicator } from '../../components/typing-indicator';
import { useChatsLayout } from '../../contexts/chats-layout.context';
import { signalManager } from '../../crypto/signal-manager';
import { useThemeColors } from '../../hooks/use-theme-colors';
import { MediaAsset } from '../../models/media-asset.interface';
import { PendingMessage } from '../../models/message-state.interface';
import { UploadProgress } from '../../models/upload-progress.interface';
import { keysService } from '../../services/keys.service';
import { mediaService } from '../../services/media.service';
import { useAuthStore } from '../../stores/auth.store';
import { useChatStore } from '../../stores/chat.store';
import { useMessageStore } from '../../stores/message.store';
import { usePresenceStore } from '../../stores/presence.store';

interface DisplayMessage extends Message {
  status?: MessageStatus;
  clientMessageId?: string;
}

export default function ChatRoomScreen() {
  const { chatId } = useLocalSearchParams<{ chatId: string }>();
  const colors = useThemeColors();
  const navigation = useNavigation();
  const router = useRouter();
  const { isMobile, toggleProfilePanel } = useChatsLayout();

  const currentUser = useAuthStore((state) => state.user);
  const chat = useChatStore((state) => state.chats.find((item) => item.id === chatId));

  const setActiveChat = useChatStore((state) => state.setActiveChat);
  const getChatMemberIds = useChatStore((state) => state.getChatMemberIds);

  const { messagesByChat, hasMore, pendingMessages, fetchMessages, sendMessage, retrySendMessage } =
    useMessageStore();

  const typingUsers = usePresenceStore((state) => state.typingUsers[chatId ?? ''] ?? []);

  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadFileName, setUploadFileName] = useState<string | null>(null);
  const [mobileProfileVisible, setMobileProfileVisible] = useState(false);

  const messages = useMemo((): DisplayMessage[] => {
    if (!chatId) return [];

    const serverMessages: DisplayMessage[] = messagesByChat[chatId] ?? [];
    const chatPending: DisplayMessage[] = pendingMessages
      .filter((pending: PendingMessage) => pending.chatId === chatId)
      .map((pending: PendingMessage) => ({
        ...pending,
        status: pending.status,
        clientMessageId: pending.clientMessageId,
      }));

    const serverIds = new Set(serverMessages.map((message) => message.id));
    const uniquePending = chatPending.filter((pending) => !serverIds.has(pending.id));

    return [...uniquePending, ...serverMessages];
  }, [chatId, messagesByChat, pendingMessages]);

  const canLoadMore = chatId ? (hasMore[chatId] ?? true) : false;

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

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
      if (!chatId) return;

      void sendMessage(chatId, text, MessageType.TEXT);
    },
    [chatId, sendMessage],
  );

  const handleSendMedia = useCallback(
    async (asset: MediaAsset) => {
      if (!chatId) return;

      setUploadFileName(asset.fileName);
      setUploadProgress(0);

      try {
        const memberIds = getChatMemberIds(chatId);
        let fileUrl: string;
        let encryptedPayload: string = '';

        if (memberIds.length > 0) {
          const encryptedFile = await signalManager.encryptFile(asset.uri);

          fileUrl = await mediaService.uploadMediaAsset(
            { ...asset, uri: encryptedFile.encryptedUri },
            (progress: UploadProgress) => {
              setUploadProgress(progress.percentage);
            },
          );

          for (const memberId of memberIds) {
            await keysService.ensureSession(memberId);
          }

          const envelope = await signalManager.encryptMediaPayload(
            memberIds,
            encryptedFile.key,
            encryptedFile.iv,
            encryptedFile.hash,
            '',
          );

          encryptedPayload = JSON.stringify(envelope);
        } else {
          fileUrl = await mediaService.uploadMediaAsset(asset, (progress: UploadProgress) => {
            setUploadProgress(progress.percentage);
          });
        }

        const metadata: MediaMetadata = {
          size: asset.fileSize,
          mimeType: asset.mimeType,
          fileName: asset.fileName,
          width: asset.width,
          height: asset.height,
          duration: asset.duration,
        };

        void sendMessage(chatId, encryptedPayload, asset.messageType, fileUrl, metadata);
      } finally {
        setUploadProgress(null);
        setUploadFileName(null);
      }
    },
    [chatId, sendMessage, getChatMemberIds],
  );

  const handleRetry = useCallback(
    (clientMessageId: string) => {
      void retrySendMessage(clientMessageId);
    },
    [retrySendMessage],
  );

  const handleBack = useCallback(() => {
    if (isMobile) {
      router.back();
    }
  }, [isMobile, router]);

  const chatTitle = chat?.name ?? '';

  const headerLeftContent = useMemo(() => {
    if (!isMobile) return undefined;

    return (
      <Pressable style={styles.headerButton} onPress={handleBack}>
        <Text style={[styles.headerButtonIcon, { color: colors.accent }]}>{'\u2039'}</Text>
      </Pressable>
    );
  }, [isMobile, handleBack, colors.accent]);

  const handleOpenProfile = useCallback(() => {
    if (isMobile) {
      setMobileProfileVisible(true);
    } else {
      toggleProfilePanel();
    }
  }, [isMobile, toggleProfilePanel]);

  const headerRightContent = useMemo(() => {
    return (
      <Pressable style={styles.headerButton} onPress={handleOpenProfile}>
        <Text style={[styles.headerButtonIcon, { color: colors.accent }]}>{'\u24D8'}</Text>
      </Pressable>
    );
  }, [handleOpenProfile, colors.accent]);

  const renderItem = useCallback(
    ({ item }: { item: DisplayMessage }) => (
      <MessageBubble
        message={item}
        isOwnMessage={item.senderId === currentUser?.id}
        status={item.status}
        onRetry={
          item.status === MessageStatus.FAILED && item.clientMessageId !== undefined
            ? () => handleRetry(item.clientMessageId!)
            : undefined
        }
      />
    ),
    [currentUser?.id, handleRetry],
  );

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      <BlurHeader
        title={chatTitle}
        leftContent={headerLeftContent}
        rightContent={headerRightContent}
      />

      <FlashList
        data={messages}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        inverted
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
      />

      {typingUsers.length > 0 && <TypingIndicator userIds={typingUsers} />}

      <MessageInput
        onSend={handleSendMessage}
        onSendMedia={(asset: MediaAsset) => void handleSendMedia(asset)}
        chatId={chatId ?? ''}
        uploadProgress={uploadProgress}
        uploadFileName={uploadFileName}
      />
      {isMobile && chatId !== undefined && (
        <ProfileModal
          visible={mobileProfileVisible}
          chatId={chatId}
          onClose={() => setMobileProfileVisible(false)}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButtonIcon: {
    fontSize: 22,
    fontWeight: '400',
  },
});
