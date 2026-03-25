export interface PresenceState {
  onlineUsers: Set<string>;
  typingUsers: Record<string, string[]>;
  lastSeen: Record<string, Date>;

  setOnline: (userId: string, isOnline: boolean) => void;
  setTyping: (chatId: string, userId: string, isTyping: boolean) => void;
  setLastSeen: (userId: string, date: Date) => void;
}
