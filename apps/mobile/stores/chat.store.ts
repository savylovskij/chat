import { ChatType } from '@shared/enums/chat-type.enum';
import { Chat } from '@shared/types/chat.interface';
import { Message } from '@shared/types/message.interface';
import { create } from 'zustand';

import { ChatState } from '../models/chat-state.interface';
import { apiClient } from '../services/api-client';

interface ChatWithMembers extends Chat {
  members?: Array<{ userId: string }>;
}

function extractMembersByChat(chats: ChatWithMembers[]): Record<string, string[]> {
  const result: Record<string, string[]> = {};

  for (const chat of chats) {
    if (chat.members !== undefined) {
      result[chat.id] = chat.members.map((member) => member.userId);
    }
  }

  return result;
}

export const useChatStore = create<ChatState>((set, get) => ({
  chats: [],
  activeChatId: null,
  isLoading: false,
  blockedUsers: [],
  membersByChat: {},

  fetchChats: async () => {
    set({ isLoading: true });

    try {
      const chats = await apiClient.get<ChatWithMembers[]>('/chats');
      const membersByChat = extractMembersByChat(chats);
      set((state) => ({
        chats,
        membersByChat: { ...state.membersByChat, ...membersByChat },
      }));
    } finally {
      set({ isLoading: false });
    }
  },

  createChat: async (type: ChatType, memberIds: string[], name?: string) => {
    const chat = await apiClient.post<ChatWithMembers>('/chats', { type, memberIds, name });
    const members = extractMembersByChat([chat]);

    set((state) => ({
      chats: [chat, ...state.chats],
      membersByChat: { ...state.membersByChat, ...members },
    }));

    return chat;
  },

  getChatMemberIds: (chatId: string) => {
    return get().membersByChat[chatId] ?? [];
  },

  setActiveChat: (chatId: string | null) => {
    set({ activeChatId: chatId });
  },

  updateUnreadCount: (chatId: string, count: number) => {
    set((state) => ({
      chats: state.chats.map((chat) =>
        chat.id === chatId ? { ...chat, unreadCount: count } : chat,
      ),
    }));
  },

  updateLastMessage: (chatId: string, message: Message) => {
    set((state) => ({
      chats: state.chats.map((chat) =>
        chat.id === chatId
          ? { ...chat, lastMessageId: message.id, lastMessageAt: message.createdAt }
          : chat,
      ),
    }));
  },

  leaveChat: async (chatId: string) => {
    await apiClient.post(`/chats/${chatId}/leave`);

    set((state) => ({ chats: state.chats.filter((chat) => chat.id !== chatId) }));
  },

  deleteChatForMe: async (chatId: string) => {
    await apiClient.delete(`/chats/${chatId}`, { data: { mode: 'forMe' } });

    set((state) => ({ chats: state.chats.filter((chat) => chat.id !== chatId) }));
  },

  deleteChatForEveryone: async (chatId: string) => {
    await apiClient.delete(`/chats/${chatId}`, { data: { mode: 'forEveryone' } });

    set((state) => ({ chats: state.chats.filter((chat) => chat.id !== chatId) }));
  },

  clearChatHistory: async (chatId: string) => {
    await apiClient.post(`/chats/${chatId}/clear`);
  },

  blockUser: async (userId: string) => {
    await apiClient.post(`/blocked-users/${userId}`);

    set((state) => ({ blockedUsers: [...state.blockedUsers, userId] }));
  },

  unblockUser: async (userId: string) => {
    await apiClient.delete(`/blocked-users/${userId}`);

    set((state) => ({
      blockedUsers: state.blockedUsers.filter((blockedId) => blockedId !== userId),
    }));
  },

  fetchBlockedUsers: async () => {
    const blockedUsers = await apiClient.get<string[]>('/blocked-users');

    set({ blockedUsers });
  },

  onChatCreated: (chat: Chat) => {
    set((state) => {
      const exists = state.chats.some((existing) => existing.id === chat.id);

      if (exists) {
        return state;
      }

      return { chats: [chat, ...state.chats] };
    });
  },

  onChatUpdated: (chatId: string, changes: Partial<Chat>) => {
    set((state) => ({
      chats: state.chats.map((chat) => (chat.id === chatId ? { ...chat, ...changes } : chat)),
    }));
  },

  onChatDeleted: (chatId: string) => {
    set((state) => ({
      chats: state.chats.filter((chat) => chat.id !== chatId),
      activeChatId: state.activeChatId === chatId ? null : state.activeChatId,
    }));
  },
}));
