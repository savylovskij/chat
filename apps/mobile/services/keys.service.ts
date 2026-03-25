import { signalManager } from '../crypto/signal-manager';
import { KeyBundle } from '../models/key-bundle.interface';
import { PreKeyBundle } from '../models/pre-key-bundle.interface';

import { apiClient } from './api-client';

const PREKEY_LOW_THRESHOLD = 20;
const PREKEY_REPLENISH_COUNT = 50;

class KeysService {
  async initializeAndUploadKeys(): Promise<KeyBundle> {
    const keyBundle = await signalManager.initialize();

    await apiClient.post('/keys/upload', {
      identitiesKey: keyBundle.identityKey,
      signedPreKey: keyBundle.signedPreKey,
      preKeys: keyBundle.preKeys,
    });

    return keyBundle;
  }

  async fetchPreKeyBundle(userId: string): Promise<PreKeyBundle> {
    const response = await apiClient.get<{
      data: {
        identitiesKey: string;
        signedPreKey: { keyId: number; publicKey: string; signature: string };
        oneTimePreKey?: { keyId: number; publicKey: string };
      };
    }>(`/keys/${userId}`);

    return {
      registrationId: 0,
      identityKey: response.data.identitiesKey,
      signedPreKey: response.data.signedPreKey,
      preKey: response.data.oneTimePreKey ?? { keyId: 0, publicKey: '' },
    };
  }

  async ensureSession(userId: string): Promise<void> {
    const hasSession = await signalManager.hasSession(userId);

    if (hasSession) {
      return;
    }

    const preKeyBundle = await this.fetchPreKeyBundle(userId);
    await signalManager.createSession(userId, preKeyBundle);
  }

  async checkAndReplenishPreKeys(): Promise<void> {
    try {
      const response = await apiClient.get<{ data: { availablePreKeys: number } }>('/keys/status');
      const available = response.data.availablePreKeys;

      if (available < PREKEY_LOW_THRESHOLD) {
        const startKeyId = 101 + (100 - available);
        const newPreKeys = await signalManager.generateAndGetPreKeys(
          startKeyId,
          PREKEY_REPLENISH_COUNT,
        );

        await apiClient.post('/keys/replenish', { preKeys: newPreKeys });
      }
    } catch {
      // Silently fail — will retry on next check
    }
  }
}

export const keysService = new KeysService();
