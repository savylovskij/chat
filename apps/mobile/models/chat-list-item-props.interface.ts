import { Chat } from '@shared/types/chat.interface';

export interface ChatListItemProps {
  chat: Chat;
  onPress: () => void;
  onSwipeAction?: () => void;
}
