import { WsEvents } from '@shared/enums/ws-events.enum';
import { Chat } from '@shared/types/chat.interface';
import { Message } from '@shared/types/message.interface';
import Constants from 'expo-constants';
import { io, Socket } from 'socket.io-client';

import { useChatStore } from '../stores/chat.store';
import { useMessageStore } from '../stores/message.store';
import { usePresenceStore } from '../stores/presence.store';

import { offlineQueueService } from './offline-queue.service';

const WS_URL: string =
  (Constants.expoConfig?.extra?.wsUrl as string | undefined) ?? 'http://localhost:3000';

class SocketService {
  private socket: Socket | null = null;

  connect(token: string): void {
    this.socket = io(WS_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
    });

    this.socket.on('connect', this.onConnect);
    this.socket.on('disconnect', this.onDisconnect);
    this.socket.on('connect_error', this.onError);

    this.registerMessageHandlers();
    this.registerReactionHandlers();
    this.registerPresenceHandlers();
    this.registerChatHandlers();
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  sendMessage(data: {
    chatId: string;
    type: string;
    encryptedContent?: string;
    mediaUrl?: string;
    replyToId?: string;
    clientMessageId: string;
  }): void {
    this.socket?.emit(WsEvents.MESSAGE_SEND, data);
  }

  editMessage(messageId: string, encryptedContent: string): void {
    this.socket?.emit(WsEvents.MESSAGE_EDIT, { messageId, encryptedContent });
  }

  deleteMessage(messageId: string, mode: string): void {
    this.socket?.emit(WsEvents.MESSAGE_DELETE, { messageId, mode });
  }

  markAsRead(chatId: string, messageId: string): void {
    this.socket?.emit(WsEvents.MESSAGE_READ, { chatId, messageId });
  }

  addReaction(messageId: string, emoji: string): void {
    this.socket?.emit(WsEvents.REACTION_ADD, { messageId, emoji });
  }

  removeReaction(messageId: string, emoji: string): void {
    this.socket?.emit(WsEvents.REACTION_REMOVE, { messageId, emoji });
  }

  startTyping(chatId: string): void {
    this.socket?.emit(WsEvents.TYPING_START, { chatId });
  }

  stopTyping(chatId: string): void {
    this.socket?.emit(WsEvents.TYPING_STOP, { chatId });
  }

  private onConnect = () => {
    const chatStore = useChatStore.getState();
    for (const chat of chatStore.chats) {
      this.socket?.emit('chat:join', { chatId: chat.id });
    }
    void this.syncMissedMessages();
    void offlineQueueService.flush();
  };

  private onDisconnect = () => {
    // Connection lost — reconnection handled automatically by socket.io
  };

  private onError = (error: Error) => {
    console.error('[SocketService] Connection error:', error.message);
  };

  private syncMissedMessages(): void {
    const messageStore = useMessageStore.getState();
    const chatStore = useChatStore.getState();

    for (const chat of chatStore.chats) {
      const messages = messageStore.messagesByChat[chat.id];
      if (messages !== undefined && messages.length > 0) {
        const lastMessageId = messages[0].id;
        this.socket?.emit('message:sync', { chatId: chat.id, afterMessageId: lastMessageId });
      }
    }
  }

  private registerMessageHandlers(): void {
    const messageStore = useMessageStore.getState;

    this.socket?.on(WsEvents.MESSAGE_NEW, (data: { chatId: string; message: Message }) => {
      messageStore().onNewMessage(data.chatId, data.message);
      useChatStore.getState().updateLastMessage(data.chatId, data.message);
    });

    this.socket?.on(
      WsEvents.MESSAGE_EDITED,
      (data: { messageId: string; encryptedContent: string }) => {
        messageStore().onMessageEdited(data.messageId, data.encryptedContent);
      },
    );

    this.socket?.on(WsEvents.MESSAGE_DELETED, (data: { messageId: string }) => {
      messageStore().onMessageDeleted(data.messageId);
    });
  }

  private registerReactionHandlers(): void {
    const messageStore = useMessageStore.getState;

    this.socket?.on(
      WsEvents.REACTION_ADDED,
      (data: { messageId: string; userId: string; emoji: string }) => {
        messageStore().onReactionAdded(data.messageId, data.userId, data.emoji);
      },
    );

    this.socket?.on(
      WsEvents.REACTION_REMOVED,
      (data: { messageId: string; userId: string; emoji: string }) => {
        messageStore().onReactionRemoved(data.messageId, data.userId, data.emoji);
      },
    );
  }

  private registerPresenceHandlers(): void {
    const presenceStore = usePresenceStore.getState;

    this.socket?.on(
      WsEvents.USER_ONLINE,
      (data: { userId: string; isOnline: boolean; lastSeenAt?: string }) => {
        presenceStore().setOnline(data.userId, data.isOnline);
        if (data.lastSeenAt !== undefined) {
          presenceStore().setLastSeen(data.userId, new Date(data.lastSeenAt));
        }
      },
    );

    this.socket?.on(
      WsEvents.TYPING_UPDATE,
      (data: { chatId: string; userId: string; isTyping: boolean }) => {
        presenceStore().setTyping(data.chatId, data.userId, data.isTyping);
      },
    );
  }

  private registerChatHandlers(): void {
    const chatStore = useChatStore.getState;

    this.socket?.on(WsEvents.CHAT_CREATED, (data: { chat: Chat }) => {
      chatStore().onChatCreated(data.chat);
      this.socket?.emit('chat:join', { chatId: data.chat.id });
    });

    this.socket?.on(WsEvents.CHAT_UPDATED, (data: { chatId: string; changes: Partial<Chat> }) => {
      chatStore().onChatUpdated(data.chatId, data.changes);
    });
  }
}

export const socketService = new SocketService();
