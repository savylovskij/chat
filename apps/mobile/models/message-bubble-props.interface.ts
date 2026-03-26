import { MessageStatus } from '@shared/enums/message-status.enum';
import { MessageReaction } from '@shared/types/message-reaction.interface';
import { Message } from '@shared/types/message.interface';

import { MessagePosition } from './message-position.type';

export interface MessageBubbleProps {
  message: Message;
  isOwnMessage: boolean;
  chatId: string;
  position: MessagePosition;
  status?: MessageStatus;
  reactions: MessageReaction[];
  onRetry?: () => void;
  onReply?: () => void;
  onLongPress: (position: Record<'x' | 'y', number>) => void;
  onReactionPress: () => void;
}
