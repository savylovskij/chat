import { DeleteMessageMode } from '@shared/enums/delete-message-mode.enum';
import { MessageType } from '@shared/enums/message-type.enum';
import { MediaMetadata } from '@shared/types/media-metadata.interface';
import { Message } from '@shared/types/message.interface';
import { create } from 'zustand';

import { signalManager } from '../crypto/signal-manager';
import { EncryptedEnvelope } from '../models/encrypted-envelope.interface';
import { MessageState } from '../models/message-state.interface';
import { apiClient } from '../services/api-client';
import { keysService } from '../services/keys.service';

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

export const useMessageStore = create<MessageState>((set) => ({
  messagesByChat: {},
  hasMore: {},
  pendingMessages: [],

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
    const pendingMessage: Message = {
      id: clientMessageId,
      chatId,
      senderId: '',
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
    };

    set((state) => ({ pendingMessages: [...state.pendingMessages, pendingMessage] }));

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
    await apiClient.post(`/messages/${messageId}/reactions`, { emoji });
  },

  removeReaction: async (messageId: string, emoji: string) => {
    await apiClient.delete(`/messages/${messageId}/reactions/${emoji}`);
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
              existing.id === message.id ? { ...existing, encryptedContent: decrypted } : existing,
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
          message.id === messageId ? { ...message, deletedAt: new Date().toISOString() } : message,
        );
      }
      return { messagesByChat: updated };
    });
  },

  onReactionAdded: (_messageId: string, _userId: string, _emoji: string) => {
    // Reactions are managed at the message level; refresh from server or update locally
  },

  onReactionRemoved: (_messageId: string, _userId: string, _emoji: string) => {
    // Reactions are managed at the message level; refresh from server or update locally
  },
}));
