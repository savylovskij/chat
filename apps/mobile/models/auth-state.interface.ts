import { User } from '@shared/types/user.interface';

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;

  tempToken: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  refreshTokens: () => Promise<void>;

  requires2FA: boolean;
  verifyOtp: (code: string) => Promise<void>;

  verify2FA: (code: string) => Promise<void>;
  logout: () => Promise<void>;
  login: (phone: string) => Promise<void>;

  register: (phone: string, displayName: string) => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  restoreSession: () => Promise<void>;
}
