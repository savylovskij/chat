import {
  KeyHelper,
  SessionBuilder,
  SessionCipher,
  SignalProtocolAddress,
} from 'libsignal-protocol-typescript';

import { EncryptedEnvelope } from '../models/encrypted-envelope.interface';
import { EncryptedFileResult } from '../models/encrypted-file-result.interface';
import { EncryptedKey } from '../models/encrypted-key.interface';
import { KeyBundle } from '../models/key-bundle.interface';
import { MediaEncryptionPayload } from '../models/media-encryption-payload.interface';
import { PreKeyBundle } from '../models/pre-key-bundle.interface';

import {
  decryptAesGcm,
  decryptFile as decryptFileAes,
  encryptAesGcm,
  encryptFile as encryptFileAes,
  generateAesKey,
  generateIv,
} from './crypto-utils';
import { SignalProtocolStore, arrayBufferToBase64, base64ToArrayBuffer } from './signal-store';

const DEVICE_ID = 1;

class SignalManager {
  private store = new SignalProtocolStore();
  private initialized = false;

  async initialize(): Promise<KeyBundle> {
    const existingKeyPair = await this.store.getIdentityKeyPair();
    const existingRegId = await this.store.getLocalRegistrationId();

    if (existingKeyPair !== undefined && existingRegId !== undefined) {
      this.initialized = true;

      return this.buildKeyBundleFromStore(existingRegId);
    }

    const identityKeyPair = await KeyHelper.generateIdentityKeyPair();
    const registrationId = KeyHelper.generateRegistrationId();

    await this.store.saveIdentityKeyPair(identityKeyPair);
    await this.store.saveLocalRegistrationId(registrationId);

    const signedPreKey = await KeyHelper.generateSignedPreKey(identityKeyPair, 1);
    await this.store.storeSignedPreKey(signedPreKey.keyId, signedPreKey.keyPair);

    const preKeys: Array<{ keyId: number; publicKey: string }> = [];

    for (let keyId = 1; keyId <= 100; keyId++) {
      const preKey = await KeyHelper.generatePreKey(keyId);
      await this.store.storePreKey(preKey.keyId, preKey.keyPair);
      preKeys.push({
        keyId: preKey.keyId,
        publicKey: arrayBufferToBase64(preKey.keyPair.pubKey),
      });
    }

    this.initialized = true;

    return {
      registrationId,
      identityKey: arrayBufferToBase64(identityKeyPair.pubKey),
      signedPreKey: {
        keyId: signedPreKey.keyId,
        publicKey: arrayBufferToBase64(signedPreKey.keyPair.pubKey),
        signature: arrayBufferToBase64(signedPreKey.signature),
      },
      preKeys,
    };
  }

  async createSession(userId: string, preKeyBundle: PreKeyBundle): Promise<void> {
    this.ensureInitialized();

    const address = new SignalProtocolAddress(userId, DEVICE_ID);
    const sessionBuilder = new SessionBuilder(this.store, address);

    await sessionBuilder.processPreKey({
      identityKey: base64ToArrayBuffer(preKeyBundle.identityKey),
      registrationId: preKeyBundle.registrationId,
      signedPreKey: {
        keyId: preKeyBundle.signedPreKey.keyId,
        publicKey: base64ToArrayBuffer(preKeyBundle.signedPreKey.publicKey),
        signature: base64ToArrayBuffer(preKeyBundle.signedPreKey.signature),
      },
      preKey:
        preKeyBundle.preKey !== undefined && preKeyBundle.preKey.publicKey !== ''
          ? {
              keyId: preKeyBundle.preKey.keyId,
              publicKey: base64ToArrayBuffer(preKeyBundle.preKey.publicKey),
            }
          : undefined,
    });
  }

  async hasSession(userId: string): Promise<boolean> {
    const address = new SignalProtocolAddress(userId, DEVICE_ID);

    return this.store.hasSession(address.toString());
  }

  async encryptMessage(recipientIds: string[], plaintext: string): Promise<EncryptedEnvelope> {
    this.ensureInitialized();

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- CryptoKey is safe
    const aesKey = await generateAesKey();
    const iv = generateIv();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument -- CryptoKey type is safe
    const encryptedBody = await encryptAesGcm(plaintext, aesKey, iv);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument -- CryptoKey type is safe
    const rawKey = await crypto.subtle.exportKey('raw', aesKey);
    const keys: Record<string, EncryptedKey> = {};

    for (const recipientId of recipientIds) {
      const address = new SignalProtocolAddress(recipientId, DEVICE_ID);
      const cipher = new SessionCipher(this.store, address);
      const encrypted = await cipher.encrypt(rawKey);

      keys[recipientId] = {
        type: encrypted.type,
        body: encrypted.body ?? '',
      };
    }

    return {
      v: 1,
      body: encryptedBody,
      iv: arrayBufferToBase64(iv.buffer as ArrayBuffer),
      keys,
    };
  }

  async decryptMessage(
    senderId: string,
    envelope: EncryptedEnvelope,
    currentUserId: string,
  ): Promise<string> {
    this.ensureInitialized();

    const myKey = envelope.keys[currentUserId];

    if (myKey === undefined) {
      throw new Error('No encryption key found for current user');
    }

    const address = new SignalProtocolAddress(senderId, DEVICE_ID);
    const cipher = new SessionCipher(this.store, address);

    let rawKey: ArrayBuffer;

    if (myKey.type === 3) {
      rawKey = await cipher.decryptPreKeyWhisperMessage(myKey.body, 'binary');
    } else {
      rawKey = await cipher.decryptWhisperMessage(myKey.body, 'binary');
    }

    const aesKey = await crypto.subtle.importKey(
      'raw',
      rawKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt'],
    );

    const iv = new Uint8Array(base64ToArrayBuffer(envelope.iv));

    return decryptAesGcm(envelope.body, aesKey, iv);
  }

  async encryptMediaPayload(
    recipientIds: string[],
    fileKey: string,
    fileIv: string,
    fileHash: string,
    caption: string,
  ): Promise<EncryptedEnvelope> {
    const payload: MediaEncryptionPayload = {
      text: caption,
      fileKey,
      fileIv,
      fileHash,
    };

    return this.encryptMessage(recipientIds, JSON.stringify(payload));
  }

  async decryptMediaPayload(
    senderId: string,
    envelope: EncryptedEnvelope,
    currentUserId: string,
  ): Promise<MediaEncryptionPayload> {
    const json = await this.decryptMessage(senderId, envelope, currentUserId);

    return JSON.parse(json) as MediaEncryptionPayload;
  }

  encryptFile(fileUri: string): Promise<EncryptedFileResult> {
    this.ensureInitialized();

    return encryptFileAes(fileUri);
  }

  decryptFile(encryptedUri: string, key: string, iv: string): Promise<string> {
    this.ensureInitialized();

    return decryptFileAes(encryptedUri, key, iv);
  }

  async generateAndGetPreKeys(
    startKeyId: number,
    count: number,
  ): Promise<Array<{ keyId: number; publicKey: string }>> {
    this.ensureInitialized();

    const preKeys: Array<{ keyId: number; publicKey: string }> = [];

    for (let index = 0; index < count; index++) {
      const keyId = startKeyId + index;
      const preKey = await KeyHelper.generatePreKey(keyId);
      await this.store.storePreKey(preKey.keyId, preKey.keyPair);
      preKeys.push({
        keyId: preKey.keyId,
        publicKey: arrayBufferToBase64(preKey.keyPair.pubKey),
      });
    }

    return preKeys;
  }

  private async buildKeyBundleFromStore(registrationId: number): Promise<KeyBundle> {
    const identityKeyPair = await this.store.getIdentityKeyPair();

    if (identityKeyPair === undefined) {
      throw new Error('Identity key pair not found in store');
    }

    const signedPreKey = await this.store.loadSignedPreKey(1);

    return {
      registrationId,
      identityKey: arrayBufferToBase64(identityKeyPair.pubKey),
      signedPreKey: {
        keyId: 1,
        publicKey: signedPreKey !== undefined ? arrayBufferToBase64(signedPreKey.pubKey) : '',
        signature: '',
      },
      preKeys: [],
    };
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('SignalManager not initialized. Call initialize() first.');
    }
  }
}

export const signalManager = new SignalManager();
