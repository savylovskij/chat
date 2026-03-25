import { ChatType } from '@shared/enums/chat-type.enum';
import { Chat } from '@shared/types/chat.interface';
import { Message } from '@shared/types/message.interface';

export interface ChatState {
  chats: Chat[];
  activeChatId: string | null;
  isLoading: boolean;
  blockedUsers: string[];
  membersByChat: Record<string, string[]>;

  fetchChats: () => Promise<void>;
  createChat: (type: ChatType, memberIds: string[], name?: string) => Promise<Chat>;
  setActiveChat: (chatId: string | null) => void;
  updateUnreadCount: (chatId: string, count: number) => void;
  updateLastMessage: (chatId: string, message: Message) => void;
  getChatMemberIds: (chatId: string) => string[];
  leaveChat: (chatId: string) => Promise<void>;
  deleteChatForMe: (chatId: string) => Promise<void>;
  deleteChatForEveryone: (chatId: string) => Promise<void>;
  clearChatHistory: (chatId: string) => Promise<void>;
  blockUser: (userId: string) => Promise<void>;
  unblockUser: (userId: string) => Promise<void>;
  fetchBlockedUsers: () => Promise<void>;

  onChatCreated: (chat: Chat) => void;
  onChatUpdated: (chatId: string, changes: Partial<Chat>) => void;
  onChatDeleted: (chatId: string) => void;
}
