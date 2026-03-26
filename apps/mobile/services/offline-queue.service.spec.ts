import AsyncStorage from '@react-native-async-storage/async-storage';

import { QueuedMessage } from '../models/queued-message.interface';

import { offlineQueueService } from './offline-queue.service';

function createQueuedMessage(overrides: Partial<QueuedMessage> = {}): QueuedMessage {
  return {
    clientMessageId: 'msg-1',
    chatId: 'chat-1',
    content: 'hello',
    type: 'TEXT',
    createdAt: new Date().toISOString(),
    retryCount: 0,
    ...overrides,
  } as QueuedMessage;
}

describe('OfflineQueueService', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    await offlineQueueService.load();
  });

  describe('load', () => {
    it('should load messages from AsyncStorage', async () => {
      const stored = [createQueuedMessage()];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(stored));

      await offlineQueueService.load();

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('offline_message_queue');
      expect(offlineQueueService.getQueue()).toEqual(stored);
    });

    it('should return empty array if nothing stored', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      await offlineQueueService.load();

      expect(offlineQueueService.getQueue()).toEqual([]);
    });
  });

  describe('enqueue', () => {
    it('should add message to queue and persist', async () => {
      const message = createQueuedMessage();

      await offlineQueueService.enqueue(message);

      expect(offlineQueueService.getQueue()).toEqual([message]);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'offline_message_queue',
        JSON.stringify([message]),
      );
    });
  });

  describe('remove', () => {
    it('should remove message by clientMessageId', async () => {
      const messageOne = createQueuedMessage({ clientMessageId: 'msg-1' });
      const messageTwo = createQueuedMessage({ clientMessageId: 'msg-2' });
      await offlineQueueService.enqueue(messageOne);
      await offlineQueueService.enqueue(messageTwo);

      await offlineQueueService.remove('msg-1');

      expect(offlineQueueService.getQueue()).toEqual([messageTwo]);
    });
  });

  describe('markFailed', () => {
    it('should increment retryCount', async () => {
      const message = createQueuedMessage({ clientMessageId: 'msg-1', retryCount: 0 });
      await offlineQueueService.enqueue(message);

      await offlineQueueService.markFailed('msg-1');

      const queue = offlineQueueService.getQueue();
      expect(queue[0].retryCount).toBe(1);
    });
  });

  describe('hasMessages', () => {
    it('should return true when queue is not empty', async () => {
      await offlineQueueService.enqueue(createQueuedMessage());

      expect(offlineQueueService.hasMessages()).toBe(true);
    });

    it('should return false when queue is empty', () => {
      expect(offlineQueueService.hasMessages()).toBe(false);
    });
  });

  describe('flush', () => {
    it('should call sendHandler for each message and remove on success', async () => {
      const sendHandler = jest.fn().mockResolvedValue(undefined);
      offlineQueueService.setSendHandler(sendHandler);
      const message = createQueuedMessage({ clientMessageId: 'msg-1' });
      await offlineQueueService.enqueue(message);

      await offlineQueueService.flush();

      expect(sendHandler).toHaveBeenCalledWith(
        expect.objectContaining({ clientMessageId: 'msg-1' }),
      );
      expect(offlineQueueService.hasMessages()).toBe(false);
    });

    it('should mark message as failed on send error', async () => {
      const sendHandler = jest.fn().mockRejectedValue(new Error('network error'));
      offlineQueueService.setSendHandler(sendHandler);
      const message = createQueuedMessage({ clientMessageId: 'msg-1', retryCount: 0 });
      await offlineQueueService.enqueue(message);

      await offlineQueueService.flush();

      const queue = offlineQueueService.getQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].retryCount).toBe(1);
    });

    it('should skip messages with retryCount >= MAX_RETRIES', async () => {
      const sendHandler = jest.fn().mockResolvedValue(undefined);
      offlineQueueService.setSendHandler(sendHandler);
      const exhaustedMessage = createQueuedMessage({ clientMessageId: 'msg-1', retryCount: 5 });
      await offlineQueueService.enqueue(exhaustedMessage);

      await offlineQueueService.flush();

      expect(sendHandler).not.toHaveBeenCalled();
    });

    it('should do nothing if no sendHandler is set', async () => {
      offlineQueueService.setSendHandler(null as never);
      await offlineQueueService.enqueue(createQueuedMessage());

      await offlineQueueService.flush();

      expect(offlineQueueService.hasMessages()).toBe(true);
    });

    it('should do nothing if queue is empty', async () => {
      const sendHandler = jest.fn().mockResolvedValue(undefined);
      offlineQueueService.setSendHandler(sendHandler);

      await offlineQueueService.flush();

      expect(sendHandler).not.toHaveBeenCalled();
    });
  });
});
