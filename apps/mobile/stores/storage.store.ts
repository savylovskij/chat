import { create } from 'zustand';

import { MediaType } from '../models/media-type.type';
import { StorageSettings } from '../models/storage-settings.interface';
import { StorageState } from '../models/storage-state.interface';
import { storageService } from '../services/storage.service';

import { useChatStore } from './chat.store';

function buildChatNames(): Record<string, string> {
  const chats = useChatStore.getState().chats;
  const names: Record<string, string> = {};

  for (const chat of chats) {
    names[chat.id] = chat.name ?? chat.id;
  }

  return names;
}

export const useStorageStore = create<StorageState>((set, get) => ({
  storageInfo: null,
  settings: {
    keepMediaDuration: 'forever',
    maxCacheSize: null,
    autoDownloadPhoto: 'wifi',
    autoDownloadVideo: 'wifi',
    autoDownloadFile: 'wifi',
  },
  isLoading: false,

  fetchStorageInfo: async () => {
    set({ isLoading: true });

    try {
      const chatNames = buildChatNames();
      const storageInfo = await storageService.getStorageInfo(chatNames);
      const settings = await storageService.getSettings();
      set({ storageInfo, settings });
    } finally {
      set({ isLoading: false });
    }
  },

  clearAll: async () => {
    await storageService.clearAll();
    await get().fetchStorageInfo();
  },

  clearChat: async (chatId: string) => {
    await storageService.clearChat(chatId);
    await get().fetchStorageInfo();
  },

  clearByType: async (type: string) => {
    await storageService.clearByType(type as MediaType);
    await get().fetchStorageInfo();
  },

  updateSettings: async (partial: Partial<StorageSettings>) => {
    await storageService.updateSettings(partial);
    const settings = await storageService.getSettings();
    set({ settings });
  },

  runAutoCleanup: async () => {
    const settings = await storageService.getSettings();
    return storageService.autoCleanup(settings);
  },
}));
