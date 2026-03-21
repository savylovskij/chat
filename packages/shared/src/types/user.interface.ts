export interface User {
  id: string;
  phone: string;
  phoneVerified: boolean;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  isOnline: boolean;
  lastSeenAt: string | null;
  totpEnabled: boolean;
  publicIdentitiesKey: Uint8Array | null;
  createdAt: string;
  updatedAt: string;
}
