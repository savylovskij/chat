import Constants from 'expo-constants';

import { RequestConfig } from '../models/request-config.interface';

const API_URL: string =
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ?? 'http://localhost:3000';

async function getAuthHeader(): Promise<Record<string, string>> {
  const { useAuthStore } = await import('../stores/auth.store');
  const token = useAuthStore.getState().accessToken;

  return token !== null ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(method: string, path: string, config?: RequestConfig): Promise<T> {
  const authHeaders = await getAuthHeader();
  const url = new URL(path, API_URL);

  if (config?.params) {
    for (const [key, value] of Object.entries(config.params)) {
      url.searchParams.set(key, value);
    }
  }

  const response = await fetch(url.toString(), {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
    },
    body: config?.data !== undefined ? JSON.stringify(config.data) : undefined,
  });

  if (response.status === 401) {
    const { useAuthStore } = await import('../stores/auth.store');
    await useAuthStore.getState().refreshTokens();

    return request<T>(method, path, config);
  }

  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as { message?: string };

    throw new Error(error.message ?? `Request failed with status ${response.status}`);
  }

  const data = await response.json().catch(() => null);

  return data as T;
}

export const apiClient = {
  get: <T>(path: string, config?: RequestConfig) => request<T>('GET', path, config),
  post: <T>(path: string, data?: unknown) => request<T>('POST', path, { data }),
  patch: <T>(path: string, data?: unknown) => request<T>('PATCH', path, { data }),
  put: <T>(path: string, data?: unknown) => request<T>('PUT', path, { data }),
  delete: <T>(path: string, config?: RequestConfig) => request<T>('DELETE', path, config),
};
