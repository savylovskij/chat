import { MediaAsset } from './media-asset.interface';

export interface MessageInputProps {
  onSend: (text: string) => void;
  onSendMedia: (asset: MediaAsset) => void;
  chatId: string;
  uploadProgress: number | null;
  uploadFileName: string | null;
}
