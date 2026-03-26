import { MessageReaction } from '@shared/types/message-reaction.interface';
import { Message } from '@shared/types/message.interface';

export interface MessageContextMenuProps {
  visible: boolean;
  message: Message | null;
  reactions: MessageReaction[];
  isOwnMessage: boolean;
  anchorPosition: { x: number; y: number };
  onClose: () => void;
  onReaction: (emoji: string) => void;
  onReply: () => void;
  onCopy: () => void;
  onEdit: () => void;
  onDeleteForMe: () => void;
  onDeleteForEveryone: () => void;
}
