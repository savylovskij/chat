import { create } from 'zustand';

import { PresenceState } from '../models/presence-state.interface';

export const usePresenceStore = create<PresenceState>((set) => ({
  onlineUsers: new Set<string>(),
  typingUsers: {},
  lastSeen: {},

  setOnline: (userId: string, isOnline: boolean) => {
    set((state) => {
      const onlineUsers = new Set(state.onlineUsers);
      if (isOnline) {
        onlineUsers.add(userId);
      } else {
        onlineUsers.delete(userId);
      }
      return { onlineUsers };
    });
  },

  setTyping: (chatId: string, userId: string, isTyping: boolean) => {
    set((state) => {
      const current = state.typingUsers[chatId] ?? [];
      const updated = isTyping
        ? current.includes(userId)
          ? current
          : [...current, userId]
        : current.filter((typingId) => typingId !== userId);
      return { typingUsers: { ...state.typingUsers, [chatId]: updated } };
    });
  },

  setLastSeen: (userId: string, date: Date) => {
    set((state) => ({
      lastSeen: { ...state.lastSeen, [userId]: date },
    }));
  },
}));
