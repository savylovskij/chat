import { DeleteMessageMode } from '@shared/enums/delete-message-mode.enum';
import { MessageType } from '@shared/enums/message-type.enum';
import { Message } from '@shared/types/message.interface';
import { create } from 'zustand';

import { MessageState } from '../models/message-state.interface';
import { apiClient } from '../services/api-client';

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
    set((state) => ({
      messagesByChat: {
        ...state.messagesByChat,
        [chatId]:
          cursor !== undefined && cursor !== ''
            ? [...(state.messagesByChat[chatId] ?? []), ...data]
            : data,
      },
      hasMore: { ...state.hasMore, [chatId]: hasMore },
    }));
  },

  sendMessage: async (chatId: string, content: string, type: MessageType, mediaUrl?: string) => {
    const clientMessageId = crypto.randomUUID();
    const pendingMessage: Message = {
      id: clientMessageId,
      chatId,
      senderId: '',
      type,
      weight: 'normal' as Message['weight'],
      encryptedContent: content,
      mediaUrl: mediaUrl ?? null,
      mediaMetadata: null,
      replyToId: null,
      timer: null,
      isEdited: false,
      editedAt: null,
      deletedAt: null,
      createdAt: new Date().toISOString(),
    };

    set((state) => ({ pendingMessages: [...state.pendingMessages, pendingMessage] }));

    await apiClient.post('/messages', {
      chatId,
      type,
      encryptedContent: content,
      mediaUrl,
      clientMessageId,
    });
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
