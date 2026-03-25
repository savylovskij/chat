import { User } from '@shared/types/user.interface';
import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

import { AuthState } from '../models/auth-state.interface';
import { apiClient } from '../services/api-client';
import { keysService } from '../services/keys.service';

const TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  requires2FA: false,
  tempToken: null,

  login: async (phone: string) => {
    const { tempToken } = await apiClient.post<{ tempToken: string }>('/auth/login', { phone });

    set({ tempToken });
  },

  register: async (phone: string, displayName: string) => {
    const { tempToken } = await apiClient.post<{ tempToken: string }>('/auth/register', {
      phone,
      displayName,
    });

    set({ tempToken });
  },

  verifyOtp: async (code: string) => {
    const { tempToken } = get();

    const result = await apiClient.post<{
      accessToken?: string;
      refreshToken?: string;
      user?: User;
      requires2FA?: boolean;
      tempToken?: string;
    }>('/auth/verify-otp', { code, tempToken });

    if (result.requires2FA === true) {
      set({ requires2FA: true, tempToken: result.tempToken ?? tempToken });

      return;
    }

    const { accessToken, refreshToken, user } = result;

    if (accessToken !== undefined && refreshToken !== undefined) {
      await SecureStore.setItemAsync(TOKEN_KEY, accessToken);
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);

      set({
        accessToken,
        refreshToken,
        user: user ?? null,
        isAuthenticated: true,
        requires2FA: false,
        tempToken: null,
      });

      try {
        await keysService.initializeAndUploadKeys();
      } catch {
        // Keys will be uploaded on next session restore
      }
    }
  },

  verify2FA: async (code: string) => {
    const { tempToken } = get();

    const { accessToken, refreshToken, user } = await apiClient.post<{
      accessToken: string;
      refreshToken: string;
      user: User;
    }>('/auth/verify-2fa', { code, tempToken });
    await SecureStore.setItemAsync(TOKEN_KEY, accessToken);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);

    set({
      accessToken,
      refreshToken,
      user,
      isAuthenticated: true,
      requires2FA: false,
      tempToken: null,
    });

    try {
      await keysService.initializeAndUploadKeys();
    } catch {
      // Keys will be uploaded on next session restore
    }
  },

  logout: async () => {
    const { refreshToken } = get();

    try {
      await apiClient.post('/auth/logout', { refreshToken });
    } catch {
      // ignore logout errors
    }

    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);

    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      requires2FA: false,
      tempToken: null,
    });
  },

  refreshTokens: async () => {
    const { refreshToken } = get();

    if (refreshToken === null) {
      return;
    }

    const { accessToken, refreshToken: newRefreshToken } = await apiClient.post<{
      accessToken: string;
      refreshToken: string;
    }>('/auth/refresh', { refreshToken });

    await SecureStore.setItemAsync(TOKEN_KEY, accessToken);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, newRefreshToken);

    set({ accessToken, refreshToken: newRefreshToken });
  },

  updateProfile: async (data: Partial<User>) => {
    const user = await apiClient.patch<User>('/users/me', data);

    set({ user });
  },

  restoreSession: async () => {
    const accessToken = await SecureStore.getItemAsync(TOKEN_KEY);
    const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);

    if (accessToken === null || refreshToken === null) {
      return;
    }

    set({ accessToken, refreshToken });

    try {
      const user = await apiClient.get<User>('/users/me');

      set({ user, isAuthenticated: true });
    } catch {
      await get().refreshTokens();
      const user = await apiClient.get<User>('/users/me');

      set({ user, isAuthenticated: true });
    }

    try {
      await keysService.initializeAndUploadKeys();
    } catch {
      // Non-critical — E2EE will initialize on next attempt
    }
  },
}));
