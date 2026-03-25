import { MessageType } from '@shared/enums/message-type.enum';

export interface MediaAsset {
  uri: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  width?: number;
  height?: number;
  duration?: number;
  messageType: MessageType;
}
