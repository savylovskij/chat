import { StorageInfo } from './storage-info.interface';
import { StorageSettings } from './storage-settings.interface';

export interface StorageState {
  storageInfo: StorageInfo | null;
  settings: StorageSettings;
  isLoading: boolean;

  fetchStorageInfo: () => Promise<void>;
  clearAll: () => Promise<void>;
  clearChat: (chatId: string) => Promise<void>;
  clearByType: (type: string) => Promise<void>;
  updateSettings: (settings: Partial<StorageSettings>) => Promise<void>;
  runAutoCleanup: () => Promise<number>;
}
