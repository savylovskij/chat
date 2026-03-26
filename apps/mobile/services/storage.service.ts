import AsyncStorage from '@react-native-async-storage/async-storage';
import { Paths } from 'expo-file-system';
import {
  createDownloadResumable,
  deleteAsync,
  getInfoAsync,
  makeDirectoryAsync,
} from 'expo-file-system/legacy';

import {
  deleteAllCache,
  deleteCacheByChat,
  deleteCacheByType,
  deleteCacheEntry,
  deleteOlderThan,
  deleteLeastRecentlyUsed,
  getCacheEntry,
  getSizeByChat,
  getTotalCacheSize,
  getTotalSizeByType,
  insertCacheEntry,
  updateLastAccessed,
} from '../db/cache';
import { MediaType } from '../models/media-type.type';
import { StorageInfo } from '../models/storage-info.interface';
import { StorageSettings } from '../models/storage-settings.interface';

import { apiClient } from './api-client';

const STORAGE_SETTINGS_KEY = 'storage_settings';

const DEFAULT_SETTINGS: StorageSettings = {
  keepMediaDuration: 'forever',
  maxCacheSize: null,
  autoDownloadPhoto: 'wifi',
  autoDownloadVideo: 'wifi',
  autoDownloadFile: 'wifi',
};

const DURATION_MS: Record<string, number> = {
  '3d': 3 * 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
};

class StorageService {
  async getStorageInfo(chatNames: Record<string, string>): Promise<StorageInfo> {
    const [byType, byChat] = await Promise.all([getTotalSizeByType(), getSizeByChat()]);

    const total = Object.values(byType).reduce((sum, size) => sum + size, 0);

    return {
      total,
      byType,
      byChat: byChat.map((entry) => ({
        chatId: entry.chatId,
        chatName: chatNames[entry.chatId] ?? entry.chatId,
        size: entry.size,
      })),
    };
  }

  async clearAll(): Promise<void> {
    const paths = await deleteAllCache();
    await this.deleteFiles(paths);
  }

  async clearChat(chatId: string): Promise<void> {
    const paths = await deleteCacheByChat(chatId);
    await this.deleteFiles(paths);
  }

  async clearByType(type: MediaType): Promise<void> {
    const paths = await deleteCacheByType(type);
    await this.deleteFiles(paths);
  }

  async removeFile(mediaId: string): Promise<void> {
    const entry = await getCacheEntry(mediaId);

    if (entry) {
      await deleteCacheEntry(mediaId);
      await this.deleteFiles([entry.localPath]);
    }
  }

  async autoCleanup(settings: StorageSettings): Promise<number> {
    const sizeBefore = await getTotalCacheSize();
    let freed = 0;

    if (settings.keepMediaDuration !== 'forever') {
      const durationMs = DURATION_MS[settings.keepMediaDuration];

      if (durationMs) {
        const cutoff = Date.now() - durationMs;
        const paths = await deleteOlderThan(cutoff);
        await this.deleteFiles(paths);
      }
    }

    if (settings.maxCacheSize !== null) {
      const currentSize = await getTotalCacheSize();

      if (currentSize > settings.maxCacheSize) {
        const bytesToFree = currentSize - settings.maxCacheSize;
        const paths = await deleteLeastRecentlyUsed(bytesToFree);
        await this.deleteFiles(paths);
      }
    }

    const sizeAfter = await getTotalCacheSize();
    freed = sizeBefore - sizeAfter;

    return freed;
  }

  async isCached(mediaId: string): Promise<string | null> {
    const entry = await getCacheEntry(mediaId);

    if (!entry) return null;

    const fileInfo = await getInfoAsync(entry.localPath);

    if (!fileInfo.exists) {
      await deleteCacheEntry(mediaId);
      return null;
    }

    return entry.localPath;
  }

  async downloadAndCache(
    mediaId: string,
    chatId: string,
    messageId: string,
    type: MediaType,
    mimeType?: string,
    onProgress?: (progress: number) => void,
  ): Promise<string> {
    const downloadUrl = await apiClient.get<{ url: string }>(`/media/${mediaId}/download`);
    const extension = mimeType?.split('/')[1] ?? 'bin';
    const cacheDir = Paths.cache.uri;
    const localPath = `${cacheDir}/media/${mediaId}.${extension}`;

    const dirPath = `${cacheDir}/media/`;
    const dirInfo = await getInfoAsync(dirPath);

    if (!dirInfo.exists) {
      await makeDirectoryAsync(dirPath, { intermediates: true });
    }

    const downloadResumable = createDownloadResumable(
      downloadUrl.url,
      localPath,
      {},
      (downloadProgress) => {
        if (onProgress && downloadProgress.totalBytesExpectedToWrite > 0) {
          const percentage = Math.round(
            (downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite) * 100,
          );
          onProgress(percentage);
        }
      },
    );

    const result = await downloadResumable.downloadAsync();

    if (!result) {
      throw new Error('Download failed');
    }

    const fileInfo = await getInfoAsync(localPath);
    const fileSize = fileInfo.exists && 'size' in fileInfo ? fileInfo.size : 0;
    const now = Date.now();

    await insertCacheEntry({
      id: mediaId,
      chatId,
      messageId,
      type,
      localPath,
      fileSize,
      mimeType,
      downloadedAt: now,
      lastAccessed: now,
    });

    return localPath;
  }

  async touch(mediaId: string): Promise<void> {
    await updateLastAccessed(mediaId);
  }

  async getSettings(): Promise<StorageSettings> {
    const stored = await AsyncStorage.getItem(STORAGE_SETTINGS_KEY);

    if (stored === null) return DEFAULT_SETTINGS;

    return { ...DEFAULT_SETTINGS, ...(JSON.parse(stored) as Partial<StorageSettings>) };
  }

  async updateSettings(partial: Partial<StorageSettings>): Promise<void> {
    const current = await this.getSettings();
    const updated = { ...current, ...partial };
    await AsyncStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(updated));
  }

  private async deleteFiles(paths: string[]): Promise<void> {
    await Promise.all(
      paths.map(async (path) => {
        try {
          const info = await getInfoAsync(path);

          if (info.exists) {
            await deleteAsync(path, { idempotent: true });
          }
        } catch {
          // Silently fail — file may already be deleted
        }
      }),
    );
  }
}

export const storageService = new StorageService();
