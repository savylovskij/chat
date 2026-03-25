import { MessageReaction } from '@shared/types/message-reaction.interface';

export interface ReactionBadgeProps {
  reactions: MessageReaction[];
  onPress: () => void;
}
