import { MediaType } from './media-type.type';

export interface StorageInfo {
  total: number;
  byType: Record<MediaType, number>;
  byChat: Array<{ chatId: string; chatName: string; size: number }>;
}
