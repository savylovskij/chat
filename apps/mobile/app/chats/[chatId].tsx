import { DeleteMessageMode } from '@shared/enums/delete-message-mode.enum';
import { MessageStatus } from '@shared/enums/message-status.enum';
import { MessageType } from '@shared/enums/message-type.enum';
import { MediaMetadata } from '@shared/types/media-metadata.interface';
import { MessageReaction } from '@shared/types/message-reaction.interface';
import { Message } from '@shared/types/message.interface';
import { FlashList } from '@shopify/flash-list';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { BlurHeader } from '../../components/blur-header';
import { ConfettiExplosion } from '../../components/confetti-explosion';
import { MessageBubble } from '../../components/message-bubble';
import { MessageContextMenu } from '../../components/message-context-menu';
import { MessageInput } from '../../components/message-input';
import { ParticleBackground } from '../../components/particle-background';
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

const COMBO_THRESHOLD = 3;
const TIME_GAP_MEDIUM_MS = 5 * 60 * 1000;
const TIME_GAP_LARGE_MS = 15 * 60 * 1000;

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

  const {
    messagesByChat,
    hasMore,
    pendingMessages,
    reactionsByMessage,
    fetchMessages,
    sendMessage,
    retrySendMessage,
    editMessage,
    deleteMessage,
    addReaction,
    removeReaction,
  } = useMessageStore();

  const typingUsers = usePresenceStore((state) => state.typingUsers[chatId ?? ''] ?? []);

  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadFileName, setUploadFileName] = useState<string | null>(null);
  const [mobileProfileVisible, setMobileProfileVisible] = useState(false);

  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<DisplayMessage | null>(null);
  const [menuAnchor, setMenuAnchor] = useState({ x: 0, y: 0 });
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const [confettiOrigin, setConfettiOrigin] = useState<{ x: number; y: number } | null>(null);

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
      setReplyToMessage(null);
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

  const handleLongPress = useCallback(
    (message: DisplayMessage, position: { x: number; y: number }) => {
      setSelectedMessage(message);
      setMenuAnchor(position);
      setContextMenuVisible(true);
    },
    [],
  );

  const handleCloseContextMenu = useCallback(() => {
    setContextMenuVisible(false);
    setSelectedMessage(null);
  }, []);

  const handleReaction = useCallback(
    (emoji: string) => {
      if (selectedMessage === null) return;

      const messageReactions = reactionsByMessage[selectedMessage.id] ?? [];
      const existingReaction = messageReactions.find(
        (reaction) => reaction.userId === currentUser?.id && reaction.emoji === emoji,
      );

      if (existingReaction !== undefined) {
        void removeReaction(selectedMessage.id, emoji);
      } else {
        void addReaction(selectedMessage.id, emoji);

        const updatedReactions = [
          ...messageReactions,
          {
            id: '',
            messageId: selectedMessage.id,
            userId: currentUser?.id ?? '',
            emoji,
            createdAt: '',
          },
        ];
        const grouped = updatedReactions.reduce<Record<string, number>>((acc, reaction) => {
          acc[reaction.emoji] = (acc[reaction.emoji] ?? 0) + 1;
          return acc;
        }, {});
        const maxCount = Math.max(0, ...Object.values(grouped));

        if (maxCount >= COMBO_THRESHOLD) {
          setConfettiOrigin(menuAnchor);
        }
      }

      handleCloseContextMenu();
    },
    [
      selectedMessage,
      reactionsByMessage,
      currentUser?.id,
      addReaction,
      removeReaction,
      handleCloseContextMenu,
      menuAnchor,
    ],
  );

  const handleReply = useCallback(() => {
    if (selectedMessage !== null) {
      setReplyToMessage(selectedMessage);
    }
    handleCloseContextMenu();
  }, [selectedMessage, handleCloseContextMenu]);

  const handleCopy = useCallback(() => {
    if (
      selectedMessage?.encryptedContent !== null &&
      selectedMessage?.encryptedContent !== undefined
    ) {
      void Clipboard.setStringAsync(selectedMessage.encryptedContent);
    }
    handleCloseContextMenu();
  }, [selectedMessage, handleCloseContextMenu]);

  const handleEdit = useCallback(() => {
    if (selectedMessage !== null && selectedMessage.encryptedContent !== null) {
      void editMessage(selectedMessage.id, selectedMessage.encryptedContent);
    }
    handleCloseContextMenu();
  }, [selectedMessage, editMessage, handleCloseContextMenu]);

  const handleDeleteForMe = useCallback(() => {
    if (selectedMessage !== null) {
      void deleteMessage(selectedMessage.id, DeleteMessageMode.FOR_ME);
    }
    handleCloseContextMenu();
  }, [selectedMessage, deleteMessage, handleCloseContextMenu]);

  const handleDeleteForEveryone = useCallback(() => {
    if (selectedMessage !== null) {
      void deleteMessage(selectedMessage.id, DeleteMessageMode.FOR_EVERYONE);
    }
    handleCloseContextMenu();
  }, [selectedMessage, deleteMessage, handleCloseContextMenu]);

  const handleCancelReply = useCallback(() => {
    setReplyToMessage(null);
  }, []);

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
    ({ item, index }: { item: DisplayMessage; index: number }) => {
      const messageReactions: MessageReaction[] = reactionsByMessage[item.id] ?? [];

      const nextMessage = index < messages.length - 1 ? messages[index + 1] : null;
      let timeGapPadding = 0;
      let showBreathingLine = false;

      if (nextMessage !== null) {
        const currentTime = new Date(item.createdAt).getTime();
        const nextTime = new Date(nextMessage.createdAt).getTime();
        const gap = currentTime - nextTime;

        if (gap >= TIME_GAP_LARGE_MS) {
          timeGapPadding = 24;
          showBreathingLine = true;
        } else if (gap >= TIME_GAP_MEDIUM_MS) {
          timeGapPadding = 12;
        }
      }

      return (
        <View style={timeGapPadding > 0 ? { paddingBottom: timeGapPadding } : undefined}>
          {showBreathingLine && (
            <View style={[styles.breathingLine, { backgroundColor: colors.border }]} />
          )}
          <MessageBubble
            message={item}
            isOwnMessage={item.senderId === currentUser?.id}
            chatId={chatId ?? ''}
            status={item.status}
            reactions={messageReactions}
            onRetry={
              item.status === MessageStatus.FAILED && item.clientMessageId !== undefined
                ? () => handleRetry(item.clientMessageId!)
                : undefined
            }
            onReply={() => setReplyToMessage(item)}
            onLongPress={(position) => handleLongPress(item, position)}
            onReactionPress={() => {
              setSelectedMessage(item);
              setMenuAnchor({ x: 100, y: 300 });
              setContextMenuVisible(true);
            }}
          />
        </View>
      );
    },
    [
      currentUser?.id,
      handleRetry,
      handleLongPress,
      reactionsByMessage,
      messages,
      chatId,
      colors.border,
    ],
  );

  const selectedReactions =
    selectedMessage !== null ? (reactionsByMessage[selectedMessage.id] ?? []) : [];

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

      <ParticleBackground />

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
        replyToMessage={replyToMessage}
        onCancelReply={handleCancelReply}
      />

      {isMobile && chatId !== undefined && (
        <ProfileModal
          visible={mobileProfileVisible}
          chatId={chatId}
          onClose={() => setMobileProfileVisible(false)}
        />
      )}

      {contextMenuVisible && (
        <MessageContextMenu
          visible={contextMenuVisible}
          message={selectedMessage}
          reactions={selectedReactions}
          isOwnMessage={selectedMessage?.senderId === currentUser?.id}
          anchorPosition={menuAnchor}
          onClose={handleCloseContextMenu}
          onReaction={handleReaction}
          onReply={handleReply}
          onCopy={handleCopy}
          onEdit={handleEdit}
          onDeleteForMe={handleDeleteForMe}
          onDeleteForEveryone={handleDeleteForEveryone}
        />
      )}

      {confettiOrigin !== null && (
        <ConfettiExplosion origin={confettiOrigin} onComplete={() => setConfettiOrigin(null)} />
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
  breathingLine: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 40,
    marginVertical: 8,
    opacity: 0.4,
  },
});
