import { MessageType } from '@shared/enums/message-type.enum';
import { MessageWeight } from '@shared/enums/message-weight.enum';
import { MediaMetadata } from '@shared/types/media-metadata.interface';

export interface QueuedMessage {
  clientMessageId: string;
  chatId: string;
  content: string;
  type: MessageType;
  mediaUrl?: string;
  mediaMetadata?: MediaMetadata;
  weight?: MessageWeight;
  timer?: number;
  createdAt: string;
  retryCount: number;
}
