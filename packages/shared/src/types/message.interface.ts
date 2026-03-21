import { MessageType, MessageWeight } from '../enums';

import { MediaMetadata } from './media-metadata.interface';

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  type: MessageType;
  weight: MessageWeight;
  encryptedContent: string | null;
  mediaUrl: string | null;
  mediaMetadata: MediaMetadata | null;
  replyToId: string | null;
  timer: number | null;
  isEdited: boolean;
  editedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
}
