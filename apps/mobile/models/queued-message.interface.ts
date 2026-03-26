import { MessageType } from '@shared/enums/message-type.enum';
import { MediaMetadata } from '@shared/types/media-metadata.interface';

export interface QueuedMessage {
  clientMessageId: string;
  chatId: string;
  content: string;
  type: MessageType;
  mediaUrl?: string;
  mediaMetadata?: MediaMetadata;
  createdAt: string;
  retryCount: number;
}
