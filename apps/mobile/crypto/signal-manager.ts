import { File as ExpoFile, Paths } from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';

import { EncryptedFileResult } from '../models/encrypted-file-result.interface';
import { KeyBundle } from '../models/key-bundle.interface';
import { PreKeyBundle } from '../models/pre-key-bundle.interface';

const IDENTITY_KEY = 'signal_identity_key';
const REGISTRATION_ID_KEY = 'signal_registration_id';

class SignalManager {
  private initialized = false;

  async initialize(): Promise<KeyBundle> {
    const existingKey = await SecureStore.getItemAsync(IDENTITY_KEY);
    if (existingKey !== null) {
      this.initialized = true;
      return JSON.parse(existingKey) as KeyBundle;
    }

    const registrationId = Math.floor(Math.random() * 16383) + 1;
    const keyBundle: KeyBundle = {
      registrationId,
      identityKey: this.generateBase64Key(),
      signedPreKey: {
        keyId: 1,
        publicKey: this.generateBase64Key(),
        signature: this.generateBase64Key(),
      },
      preKeys: this.generatePreKeys(100),
    };

    await SecureStore.setItemAsync(IDENTITY_KEY, JSON.stringify(keyBundle));
    await SecureStore.setItemAsync(REGISTRATION_ID_KEY, String(registrationId));
    this.initialized = true;
    return keyBundle;
  }

  async createSession(userId: string, preKeyBundle: PreKeyBundle): Promise<void> {
    this.ensureInitialized();
    const sessionKey = `signal_session_${userId}`;
    await SecureStore.setItemAsync(sessionKey, JSON.stringify(preKeyBundle));
  }

  async encrypt(userId: string, plaintext: string): Promise<string> {
    this.ensureInitialized();
    const sessionKey = `signal_session_${userId}`;
    const session = await SecureStore.getItemAsync(sessionKey);
    if (session === null) {
      throw new Error(`No session established with user ${userId}`);
    }

    // Placeholder: in production, use libsignal-protocol-typescript for actual Signal encryption

    return btoa(plaintext);
  }

  async decrypt(userId: string, ciphertext: string): Promise<string> {
    this.ensureInitialized();
    const sessionKey = `signal_session_${userId}`;
    const session = await SecureStore.getItemAsync(sessionKey);
    if (session === null) {
      throw new Error(`No session established with user ${userId}`);
    }

    // Placeholder: in production, use libsignal-protocol-typescript for actual Signal decryption

    return atob(ciphertext);
  }

  encryptFile(fileUri: string): EncryptedFileResult {
    this.ensureInitialized();

    const key = this.generateBase64Key();
    const iv = this.generateBase64Key();

    // Placeholder: in production, use AES-256-GCM encryption
    const source = new ExpoFile(fileUri);
    const destination = new ExpoFile(Paths.cache, `encrypted_${Date.now()}`);
    source.copy(destination);
    const hash = this.generateBase64Key();

    return { encryptedUri: destination.uri, key, iv, hash };
  }

  decryptFile(encryptedUri: string, _key: string, _iv: string): string {
    this.ensureInitialized();

    // Placeholder: in production, use AES-256-GCM decryption
    const source = new ExpoFile(encryptedUri);
    const destination = new ExpoFile(Paths.cache, `decrypted_${Date.now()}`);
    source.copy(destination);

    return destination.uri;
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('SignalManager not initialized. Call initialize() first.');
    }
  }

  private generateBase64Key(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array));
  }

  private generatePreKeys(count: number): Array<{ keyId: number; publicKey: string }> {
    const preKeys: Array<{ keyId: number; publicKey: string }> = [];
    for (let keyId = 1; keyId <= count; keyId++) {
      preKeys.push({ keyId, publicKey: this.generateBase64Key() });
    }
    return preKeys;
  }
}

export const signalManager = new SignalManager();
