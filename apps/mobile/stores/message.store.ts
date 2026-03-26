import { DeleteMessageMode } from '@shared/enums/delete-message-mode.enum';
import { MessageStatus } from '@shared/enums/message-status.enum';
import { MessageType } from '@shared/enums/message-type.enum';
import { MediaMetadata } from '@shared/types/media-metadata.interface';
import { Message } from '@shared/types/message.interface';
import { create } from 'zustand';

import { signalManager } from '../crypto/signal-manager';
import { EncryptedEnvelope } from '../models/encrypted-envelope.interface';
import { MessageState, PendingMessage } from '../models/message-state.interface';
import { QueuedMessage } from '../models/queued-message.interface';
import { apiClient } from '../services/api-client';
import { keysService } from '../services/keys.service';
import { networkMonitorService } from '../services/network-monitor.service';
import { offlineQueueService } from '../services/offline-queue.service';

import { useAuthStore } from './auth.store';
import { useChatStore } from './chat.store';

async function ensureSessionsForRecipients(recipientIds: string[]): Promise<void> {
  for (const recipientId of recipientIds) {
    await keysService.ensureSession(recipientId);
  }
}

async function encryptContent(recipientIds: string[], content: string): Promise<string> {
  await ensureSessionsForRecipients(recipientIds);
  const envelope = await signalManager.encryptMessage(recipientIds, content);

  return JSON.stringify(envelope);
}

async function decryptContent(
  senderId: string,
  encryptedContent: string,
  currentUserId: string,
): Promise<string> {
  try {
    const envelope = JSON.parse(encryptedContent) as EncryptedEnvelope;

    if (envelope.v !== 1 || envelope.keys === undefined) {
      return encryptedContent;
    }

    return await signalManager.decryptMessage(senderId, envelope, currentUserId);
  } catch {
    return encryptedContent;
  }
}

function createPendingMessage(
  clientMessageId: string,
  chatId: string,
  content: string,
  type: MessageType,
  mediaUrl?: string,
  mediaMetadata?: MediaMetadata,
): PendingMessage {
  return {
    id: clientMessageId,
    clientMessageId,
    chatId,
    senderId: useAuthStore.getState().user?.id ?? '',
    type,
    weight: 'normal' as Message['weight'],
    encryptedContent: content || null,
    mediaUrl: mediaUrl ?? null,
    mediaMetadata: mediaMetadata ?? null,
    replyToId: null,
    timer: null,
    isEdited: false,
    editedAt: null,
    deletedAt: null,
    createdAt: new Date().toISOString(),
    status: MessageStatus.PENDING,
  };
}

async function sendMessageToServer(
  chatId: string,
  content: string,
  type: MessageType,
  clientMessageId: string,
  mediaUrl?: string,
  mediaMetadata?: MediaMetadata,
): Promise<void> {
  const memberIds = useChatStore.getState().getChatMemberIds(chatId);
  let encryptedContent: string | undefined;

  if (content !== '' && memberIds.length > 0) {
    try {
      encryptedContent = await encryptContent(memberIds, content);
    } catch {
      encryptedContent = content;
    }
  } else {
    encryptedContent = content || undefined;
  }

  await apiClient.post('/messages', {
    chatId,
    type,
    encryptedContent,
    mediaUrl,
    mediaMetadata,
    clientMessageId,
  });

  void keysService.checkAndReplenishPreKeys();
}

export const useMessageStore = create<MessageState>((set, get) => {
  offlineQueueService.setSendHandler(async (queued: QueuedMessage) => {
    await sendMessageToServer(
      queued.chatId,
      queued.content,
      queued.type,
      queued.clientMessageId,
      queued.mediaUrl,
      queued.mediaMetadata,
    );

    set((state) => ({
      pendingMessages: state.pendingMessages.map((pending) =>
        pending.clientMessageId === queued.clientMessageId
          ? { ...pending, status: MessageStatus.SENT }
          : pending,
      ),
    }));
  });

  return {
    messagesByChat: {},
    hasMore: {},
    pendingMessages: [],
    reactionsByMessage: {},

    fetchMessages: async (chatId: string, cursor?: string) => {
      const params: Record<string, string> | undefined =
        cursor !== undefined && cursor !== '' ? { cursor } : undefined;
      const { data, hasMore } = await apiClient.get<{ data: Message[]; hasMore: boolean }>(
        `/chats/${chatId}/messages`,
        { params },
      );

      const currentUserId = useAuthStore.getState().user?.id ?? '';
      const decryptedMessages = await Promise.all(
        data.map(async (message) => {
          if (message.encryptedContent !== null && message.encryptedContent !== '') {
            const decrypted = await decryptContent(
              message.senderId,
              message.encryptedContent,
              currentUserId,
            );

            return { ...message, encryptedContent: decrypted };
          }

          return message;
        }),
      );

      set((state) => ({
        messagesByChat: {
          ...state.messagesByChat,
          [chatId]:
            cursor !== undefined && cursor !== ''
              ? [...(state.messagesByChat[chatId] ?? []), ...decryptedMessages]
              : decryptedMessages,
        },
        hasMore: { ...state.hasMore, [chatId]: hasMore },
      }));
    },

    sendMessage: async (
      chatId: string,
      content: string,
      type: MessageType,
      mediaUrl?: string,
      mediaMetadata?: MediaMetadata,
    ) => {
      const clientMessageId = crypto.randomUUID();

      const pendingMessage = createPendingMessage(
        clientMessageId,
        chatId,
        content,
        type,
        mediaUrl,
        mediaMetadata,
      );

      set((state) => ({ pendingMessages: [...state.pendingMessages, pendingMessage] }));

      if (!networkMonitorService.getIsConnected()) {
        await offlineQueueService.enqueue({
          clientMessageId,
          chatId,
          content,
          type,
          mediaUrl,
          mediaMetadata,
          createdAt: pendingMessage.createdAt,
          retryCount: 0,
        });

        return;
      }

      try {
        await sendMessageToServer(chatId, content, type, clientMessageId, mediaUrl, mediaMetadata);

        set((state) => ({
          pendingMessages: state.pendingMessages.map((pending) =>
            pending.clientMessageId === clientMessageId
              ? { ...pending, status: MessageStatus.SENT }
              : pending,
          ),
        }));
      } catch {
        set((state) => ({
          pendingMessages: state.pendingMessages.map((pending) =>
            pending.clientMessageId === clientMessageId
              ? { ...pending, status: MessageStatus.FAILED }
              : pending,
          ),
        }));

        await offlineQueueService.enqueue({
          clientMessageId,
          chatId,
          content,
          type,
          mediaUrl,
          mediaMetadata,
          createdAt: pendingMessage.createdAt,
          retryCount: 0,
        });
      }
    },

    retrySendMessage: async (clientMessageId: string) => {
      const pending = get().pendingMessages.find(
        (message) => message.clientMessageId === clientMessageId,
      );

      if (pending === undefined) return;

      set((state) => ({
        pendingMessages: state.pendingMessages.map((message) =>
          message.clientMessageId === clientMessageId
            ? { ...message, status: MessageStatus.PENDING }
            : message,
        ),
      }));

      try {
        await sendMessageToServer(
          pending.chatId,
          pending.encryptedContent ?? '',
          pending.type,
          clientMessageId,
          pending.mediaUrl ?? undefined,
          pending.mediaMetadata ?? undefined,
        );

        await offlineQueueService.remove(clientMessageId);

        set((state) => ({
          pendingMessages: state.pendingMessages.map((message) =>
            message.clientMessageId === clientMessageId
              ? { ...message, status: MessageStatus.SENT }
              : message,
          ),
        }));
      } catch {
        set((state) => ({
          pendingMessages: state.pendingMessages.map((message) =>
            message.clientMessageId === clientMessageId
              ? { ...message, status: MessageStatus.FAILED }
              : message,
          ),
        }));
      }
    },

    editMessage: async (messageId: string, content: string) => {
      await apiClient.patch(`/messages/${messageId}`, { encryptedContent: content });
    },

    deleteMessage: async (messageId: string, mode: DeleteMessageMode) => {
      await apiClient.delete(`/messages/${messageId}`, { data: { mode } });
    },

    deleteAllMessages: async (chatId: string) => {
      await apiClient.delete(`/chats/${chatId}/messages`);
      set((state) => ({
        messagesByChat: { ...state.messagesByChat, [chatId]: [] },
      }));
    },

    addReaction: async (messageId: string, emoji: string) => {
      const userId = useAuthStore.getState().user?.id ?? '';
      const reaction: import('@shared/types/message-reaction.interface').MessageReaction = {
        id: crypto.randomUUID(),
        messageId,
        userId,
        emoji,
        createdAt: new Date().toISOString(),
      };

      set((state) => ({
        reactionsByMessage: {
          ...state.reactionsByMessage,
          [messageId]: [...(state.reactionsByMessage[messageId] ?? []), reaction],
        },
      }));

      await apiClient.post(`/messages/${messageId}/reactions`, { emoji });
    },

    removeReaction: async (messageId: string, emoji: string) => {
      const userId = useAuthStore.getState().user?.id ?? '';

      set((state) => ({
        reactionsByMessage: {
          ...state.reactionsByMessage,
          [messageId]: (state.reactionsByMessage[messageId] ?? []).filter(
            (reaction) => !(reaction.userId === userId && reaction.emoji === emoji),
          ),
        },
      }));

      await apiClient.delete(`/messages/${messageId}/reactions/${emoji}`);
    },

    getReactions: (messageId: string) => {
      return get().reactionsByMessage[messageId] ?? [];
    },

    removePendingMessage: (clientMessageId: string) => {
      set((state) => ({
        pendingMessages: state.pendingMessages.filter(
          (pending) => pending.clientMessageId !== clientMessageId,
        ),
      }));

      void offlineQueueService.remove(clientMessageId);
    },

    onNewMessage: (chatId: string, message: Message) => {
      const currentUserId = useAuthStore.getState().user?.id ?? '';

      if (message.senderId === currentUserId && message.encryptedContent !== null) {
        const state = useMessageStore.getState();
        const pending = state.pendingMessages.find(
          (pendingMessage) => pendingMessage.chatId === chatId,
        );

        if (pending?.encryptedContent !== null && pending?.encryptedContent !== undefined) {
          message = { ...message, encryptedContent: pending.encryptedContent };
        }
      }

      if (
        message.senderId !== currentUserId &&
        message.encryptedContent !== null &&
        message.encryptedContent !== ''
      ) {
        void decryptContent(message.senderId, message.encryptedContent, currentUserId).then(
          (decrypted) => {
            useMessageStore.setState((state) => {
              const chatMessages = state.messagesByChat[chatId] ?? [];
              const updated = chatMessages.map((existing) =>
                existing.id === message.id
                  ? { ...existing, encryptedContent: decrypted }
                  : existing,
              );

              return { messagesByChat: { ...state.messagesByChat, [chatId]: updated } };
            });
          },
        );
      }

      set((state) => ({
        messagesByChat: {
          ...state.messagesByChat,
          [chatId]: [message, ...(state.messagesByChat[chatId] ?? [])],
        },
        pendingMessages: state.pendingMessages.filter((pending) => pending.id !== message.id),
      }));
    },

    onMessageEdited: (messageId: string, content: string) => {
      set((state) => {
        const updated = { ...state.messagesByChat };
        for (const chatId of Object.keys(updated)) {
          updated[chatId] = updated[chatId].map((message) =>
            message.id === messageId
              ? { ...message, encryptedContent: content, isEdited: true }
              : message,
          );
        }
        return { messagesByChat: updated };
      });
    },

    onMessageDeleted: (messageId: string) => {
      set((state) => {
        const updated = { ...state.messagesByChat };
        for (const chatId of Object.keys(updated)) {
          updated[chatId] = updated[chatId].map((message) =>
            message.id === messageId
              ? { ...message, deletedAt: new Date().toISOString() }
              : message,
          );
        }
        return { messagesByChat: updated };
      });
    },

    onReactionAdded: (messageId: string, userId: string, emoji: string) => {
      const existing = get().reactionsByMessage[messageId] ?? [];
      const alreadyExists = existing.some(
        (reaction) => reaction.userId === userId && reaction.emoji === emoji,
      );

      if (alreadyExists) return;

      const reaction: import('@shared/types/message-reaction.interface').MessageReaction = {
        id: crypto.randomUUID(),
        messageId,
        userId,
        emoji,
        createdAt: new Date().toISOString(),
      };

      set((state) => ({
        reactionsByMessage: {
          ...state.reactionsByMessage,
          [messageId]: [...(state.reactionsByMessage[messageId] ?? []), reaction],
        },
      }));
    },

    onReactionRemoved: (messageId: string, userId: string, emoji: string) => {
      set((state) => ({
        reactionsByMessage: {
          ...state.reactionsByMessage,
          [messageId]: (state.reactionsByMessage[messageId] ?? []).filter(
            (reaction) => !(reaction.userId === userId && reaction.emoji === emoji),
          ),
        },
      }));
    },
  };
});
