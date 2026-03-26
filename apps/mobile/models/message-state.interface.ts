import { DeleteMessageMode } from '@shared/enums/delete-message-mode.enum';
import { MessageStatus } from '@shared/enums/message-status.enum';
import { MessageType } from '@shared/enums/message-type.enum';
import { MediaMetadata } from '@shared/types/media-metadata.interface';
import { MessageReaction } from '@shared/types/message-reaction.interface';
import { Message } from '@shared/types/message.interface';

export interface PendingMessage extends Message {
  status: MessageStatus;
  clientMessageId: string;
}

export interface MessageState {
  messagesByChat: Record<string, Message[]>;
  hasMore: Record<string, boolean>;
  pendingMessages: PendingMessage[];
  reactionsByMessage: Record<string, MessageReaction[]>;

  fetchMessages: (chatId: string, cursor?: string) => Promise<void>;
  sendMessage: (
    chatId: string,
    content: string,
    type: MessageType,
    mediaUrl?: string,
    mediaMetadata?: MediaMetadata,
  ) => Promise<void>;
  retrySendMessage: (clientMessageId: string) => Promise<void>;
  editMessage: (messageId: string, content: string) => Promise<void>;
  deleteMessage: (messageId: string, mode: DeleteMessageMode) => Promise<void>;
  deleteAllMessages: (chatId: string) => Promise<void>;
  addReaction: (messageId: string, emoji: string) => Promise<void>;
  removeReaction: (messageId: string, emoji: string) => Promise<void>;
  removePendingMessage: (clientMessageId: string) => void;
  getReactions: (messageId: string) => MessageReaction[];
  onNewMessage: (chatId: string, message: Message) => void;
  onMessageEdited: (messageId: string, content: string) => void;
  onMessageDeleted: (messageId: string) => void;
  onReactionAdded: (messageId: string, userId: string, emoji: string) => void;
  onReactionRemoved: (messageId: string, userId: string, emoji: string) => void;
}
