import { ChatType } from '../enums';

export interface Chat {
  id: string;
  type: ChatType;
  name: string | null;
  description: string | null;
  avatarUrl: string | null;
  createdBy: string;
  lastMessageId: string | null;
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
}
