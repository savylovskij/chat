import { MessageStatus } from '@shared/enums/message-status.enum';
import { Message } from '@shared/types/message.interface';

export interface MessageBubbleProps {
  message: Message;
  isOwnMessage: boolean;
  status?: MessageStatus;
  onRetry?: () => void;
}
