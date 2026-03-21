import { MemberRole } from '../enums';

export interface ChatMember {
  id: string;
  chatId: string;
  userId: string;
  role: MemberRole;
  lastReadMessageId: string | null;
  notificationsMuted: boolean;
  joinedAt: string;
}
