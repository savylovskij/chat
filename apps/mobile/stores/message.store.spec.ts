jest.mock('../crypto/signal-manager', () => ({
  signalManager: { encryptMessage: jest.fn(), decryptMessage: jest.fn() },
}));
jest.mock('../services/api-client', () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));
jest.mock('../services/keys.service', () => ({
  keysService: { ensureSession: jest.fn(), checkAndReplenishPreKeys: jest.fn() },
}));
jest.mock('../services/network-monitor.service', () => ({
  networkMonitorService: { getIsConnected: jest.fn(() => true) },
}));
jest.mock('../services/offline-queue.service', () => ({
  offlineQueueService: { setSendHandler: jest.fn(), enqueue: jest.fn(), remove: jest.fn() },
}));
jest.mock('./auth.store', () => ({
  useAuthStore: { getState: jest.fn(() => ({ user: { id: 'user-1' } })) },
}));
jest.mock('./chat.store', () => ({
  useChatStore: { getState: jest.fn(() => ({ getChatMemberIds: jest.fn(() => ['user-2']) })) },
}));
jest.mock('@shared/enums/delete-message-mode.enum', () => ({
  DeleteMessageMode: { FOR_ME: 'forMe', FOR_EVERYONE: 'forEveryone' },
}));
jest.mock('@shared/enums/message-status.enum', () => ({
  MessageStatus: {
    PENDING: 'PENDING',
    SENT: 'SENT',
    DELIVERED: 'DELIVERED',
    READ: 'READ',
    FAILED: 'FAILED',
  },
}));
jest.mock('@shared/enums/message-type.enum', () => ({
  MessageType: { TEXT: 'TEXT', IMAGE: 'IMAGE', VIDEO: 'VIDEO', VOICE: 'VOICE', FILE: 'FILE' },
}));
jest.mock('@shared/types/media-metadata.interface', () => ({}));
jest.mock('@shared/types/message.interface', () => ({}));
jest.mock('@shared/types/message-reaction.interface', () => ({}));

import { useMessageStore } from './message.store';

function createMessage(overrides: Record<string, unknown> = {}) {
  return {
    id: 'msg-1',
    chatId: 'chat-1',
    senderId: 'user-2',
    type: 'TEXT',
    weight: 'normal',
    encryptedContent: 'hello',
    mediaUrl: null,
    mediaMetadata: null,
    replyToId: null,
    timer: null,
    isEdited: false,
    editedAt: null,
    deletedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('MessageStore', () => {
  beforeEach(() => {
    useMessageStore.setState({
      messagesByChat: {},
      hasMore: {},
      pendingMessages: [],
      reactionsByMessage: {},
    });
  });

  describe('onNewMessage', () => {
    it('should add message to messagesByChat', () => {
      const message = createMessage();

      useMessageStore.getState().onNewMessage('chat-1', message as never);

      const messages = useMessageStore.getState().messagesByChat['chat-1'];
      expect(messages).toHaveLength(1);
      expect(messages[0].id).toBe('msg-1');
    });

    it('should remove matching pending message by id', () => {
      useMessageStore.setState({
        pendingMessages: [{ id: 'msg-1', clientMessageId: 'client-1', chatId: 'chat-1' } as never],
      });

      const message = createMessage({ id: 'msg-1' });
      useMessageStore.getState().onNewMessage('chat-1', message as never);

      expect(useMessageStore.getState().pendingMessages).toHaveLength(0);
    });

    it('should prepend message to existing messages', () => {
      const existingMessage = createMessage({ id: 'msg-0', createdAt: '2025-12-31T00:00:00.000Z' });
      useMessageStore.setState({
        messagesByChat: { 'chat-1': [existingMessage as never] },
      });

      const newMessage = createMessage({ id: 'msg-1' });
      useMessageStore.getState().onNewMessage('chat-1', newMessage as never);

      const messages = useMessageStore.getState().messagesByChat['chat-1'];
      expect(messages).toHaveLength(2);
      expect(messages[0].id).toBe('msg-1');
    });
  });

  describe('onMessageEdited', () => {
    it('should update encryptedContent and set isEdited to true', () => {
      const message = createMessage();
      useMessageStore.setState({
        messagesByChat: { 'chat-1': [message as never] },
      });

      useMessageStore.getState().onMessageEdited('msg-1', 'updated-content');

      const updated = useMessageStore.getState().messagesByChat['chat-1'][0];
      expect(updated.encryptedContent).toBe('updated-content');
      expect(updated.isEdited).toBe(true);
    });

    it('should not affect other messages', () => {
      const message1 = createMessage({ id: 'msg-1' });
      const message2 = createMessage({ id: 'msg-2', encryptedContent: 'original' });
      useMessageStore.setState({
        messagesByChat: { 'chat-1': [message1 as never, message2 as never] },
      });

      useMessageStore.getState().onMessageEdited('msg-1', 'edited');

      const messages = useMessageStore.getState().messagesByChat['chat-1'];
      expect(messages[1].encryptedContent).toBe('original');
    });
  });

  describe('onMessageDeleted', () => {
    it('should set deletedAt on the message', () => {
      const message = createMessage();
      useMessageStore.setState({
        messagesByChat: { 'chat-1': [message as never] },
      });

      useMessageStore.getState().onMessageDeleted('msg-1');

      const deleted = useMessageStore.getState().messagesByChat['chat-1'][0];
      expect(deleted.deletedAt).not.toBeNull();
    });
  });

  describe('onReactionAdded', () => {
    it('should add reaction to reactionsByMessage', () => {
      useMessageStore.getState().onReactionAdded('msg-1', 'user-2', '👍');

      const reactions = useMessageStore.getState().reactionsByMessage['msg-1'];
      expect(reactions).toHaveLength(1);
      expect(reactions[0].emoji).toBe('👍');
      expect(reactions[0].userId).toBe('user-2');
    });

    it('should skip duplicate reactions', () => {
      useMessageStore.getState().onReactionAdded('msg-1', 'user-2', '👍');
      useMessageStore.getState().onReactionAdded('msg-1', 'user-2', '👍');

      expect(useMessageStore.getState().reactionsByMessage['msg-1']).toHaveLength(1);
    });

    it('should allow different emojis from same user', () => {
      useMessageStore.getState().onReactionAdded('msg-1', 'user-2', '👍');
      useMessageStore.getState().onReactionAdded('msg-1', 'user-2', '❤️');

      expect(useMessageStore.getState().reactionsByMessage['msg-1']).toHaveLength(2);
    });
  });

  describe('onReactionRemoved', () => {
    it('should remove matching reaction by userId and emoji', () => {
      useMessageStore.getState().onReactionAdded('msg-1', 'user-2', '👍');
      useMessageStore.getState().onReactionAdded('msg-1', 'user-3', '👍');

      useMessageStore.getState().onReactionRemoved('msg-1', 'user-2', '👍');

      const reactions = useMessageStore.getState().reactionsByMessage['msg-1'];
      expect(reactions).toHaveLength(1);
      expect(reactions[0].userId).toBe('user-3');
    });
  });

  describe('removePendingMessage', () => {
    it('should remove from pendingMessages by clientMessageId', () => {
      useMessageStore.setState({
        pendingMessages: [
          { clientMessageId: 'client-1', chatId: 'chat-1' } as never,
          { clientMessageId: 'client-2', chatId: 'chat-1' } as never,
        ],
      });

      useMessageStore.getState().removePendingMessage('client-1');

      const pending = useMessageStore.getState().pendingMessages;
      expect(pending).toHaveLength(1);
      expect((pending[0] as { clientMessageId: string }).clientMessageId).toBe('client-2');
    });
  });
});
