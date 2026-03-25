import { Message } from '@shared/types/message.interface';

export interface MessageBubbleProps {
  message: Message;
  isOwnMessage: boolean;
}
