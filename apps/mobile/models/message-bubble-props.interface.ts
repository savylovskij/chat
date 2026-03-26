import { MessageStatus } from '@shared/enums/message-status.enum';
import { MessageReaction } from '@shared/types/message-reaction.interface';
import { Message } from '@shared/types/message.interface';

export interface MessageBubbleProps {
  message: Message;
  isOwnMessage: boolean;
  chatId: string;
  status?: MessageStatus;
  reactions: MessageReaction[];
  onRetry?: () => void;
  onReply?: () => void;
  onLongPress: (position: { x: number; y: number }) => void;
  onReactionPress: () => void;
}
