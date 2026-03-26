import { MediaType } from './media-type.type';

export interface MediaPlaceholderProps {
  mediaId: string;
  chatId: string;
  messageId: string;
  type: MediaType;
  fileName?: string;
  fileSize?: number;
  duration?: number;
  thumbnailUri?: string;
  onDownloaded: (localPath: string) => void;
}
