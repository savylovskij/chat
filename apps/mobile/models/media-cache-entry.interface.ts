import { MediaType } from './media-type.type';

export interface MediaCacheEntry {
  id: string;
  chatId: string;
  messageId: string;
  type: MediaType;
  localPath: string;
  fileSize: number;
  mimeType?: string;
  downloadedAt: number;
  lastAccessed: number;
}
