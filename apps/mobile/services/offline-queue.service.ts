import AsyncStorage from '@react-native-async-storage/async-storage';

import { QueuedMessage } from '../models/queued-message.interface';

const QUEUE_STORAGE_KEY = 'offline_message_queue';
const MAX_RETRIES = 5;

class OfflineQueueService {
  private queue: QueuedMessage[] = [];
  private isFlushing = false;
  private sendHandler: ((message: QueuedMessage) => Promise<void>) | null = null;

  async load(): Promise<void> {
    const stored = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
    this.queue = stored !== null ? (JSON.parse(stored) as QueuedMessage[]) : [];
  }

  setSendHandler(handler: (message: QueuedMessage) => Promise<void>): void {
    this.sendHandler = handler;
  }

  async enqueue(message: QueuedMessage): Promise<void> {
    this.queue.push(message);
    await this.persist();
  }

  async remove(clientMessageId: string): Promise<void> {
    this.queue = this.queue.filter((queued) => queued.clientMessageId !== clientMessageId);
    await this.persist();
  }

  async markFailed(clientMessageId: string): Promise<void> {
    const message = this.queue.find((queued) => queued.clientMessageId === clientMessageId);

    if (message !== undefined) {
      message.retryCount += 1;
    }

    await this.persist();
  }

  getQueue(): QueuedMessage[] {
    return [...this.queue];
  }

  hasMessages(): boolean {
    return this.queue.length > 0;
  }

  async flush(): Promise<void> {
    if (this.isFlushing || this.sendHandler === null || this.queue.length === 0) {
      return;
    }

    this.isFlushing = true;

    const messagesToSend = this.queue.filter((message) => message.retryCount < MAX_RETRIES);

    for (const message of messagesToSend) {
      try {
        await this.sendHandler(message);
        await this.remove(message.clientMessageId);
      } catch {
        await this.markFailed(message.clientMessageId);
      }
    }

    this.isFlushing = false;
  }

  private async persist(): Promise<void> {
    await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(this.queue));
  }
}

export const offlineQueueService = new OfflineQueueService();
