import * as SecureStore from 'expo-secure-store';
import { Direction, KeyPairType, StorageType } from 'libsignal-protocol-typescript';

const IDENTITY_KEY_PAIR = 'signal_identity_keypair';
const REGISTRATION_ID = 'signal_registration_id';
const PREFIX_SESSION = 'signal_session_';
const PREFIX_PREKEY = 'signal_prekey_';
const PREFIX_SIGNED_PREKEY = 'signal_signed_prekey_';
const PREFIX_IDENTITY = 'signal_identity_';

function serializeKeyPair(keyPair: KeyPairType): string {
  return JSON.stringify({
    pubKey: arrayBufferToBase64(keyPair.pubKey),
    privKey: arrayBufferToBase64(keyPair.privKey),
  });
}

function deserializeKeyPair(serialized: string): KeyPairType {
  const parsed = JSON.parse(serialized) as { pubKey: string; privKey: string };

  return {
    pubKey: base64ToArrayBuffer(parsed.pubKey),
    privKey: base64ToArrayBuffer(parsed.privKey),
  };
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes.buffer;
}

export class SignalProtocolStore implements StorageType {
  async getIdentityKeyPair(): Promise<KeyPairType | undefined> {
    const serialized = await SecureStore.getItemAsync(IDENTITY_KEY_PAIR);

    if (serialized === null) {
      return undefined;
    }

    return deserializeKeyPair(serialized);
  }

  async saveIdentityKeyPair(keyPair: KeyPairType): Promise<void> {
    await SecureStore.setItemAsync(IDENTITY_KEY_PAIR, serializeKeyPair(keyPair));
  }

  async getLocalRegistrationId(): Promise<number | undefined> {
    const value = await SecureStore.getItemAsync(REGISTRATION_ID);

    if (value === null) {
      return undefined;
    }

    return Number(value);
  }

  async saveLocalRegistrationId(registrationId: number): Promise<void> {
    await SecureStore.setItemAsync(REGISTRATION_ID, String(registrationId));
  }

  async isTrustedIdentity(
    _identifier: string,
    identityKey: ArrayBuffer,
    _direction: Direction,
  ): Promise<boolean> {
    const stored = await SecureStore.getItemAsync(PREFIX_IDENTITY + _identifier);

    if (stored === null) {
      return true;
    }

    const storedKey = base64ToArrayBuffer(stored);
    const storedBytes = new Uint8Array(storedKey);
    const incomingBytes = new Uint8Array(identityKey);

    if (storedBytes.length !== incomingBytes.length) {
      return false;
    }

    for (let index = 0; index < storedBytes.length; index++) {
      if (storedBytes[index] !== incomingBytes[index]) {
        return false;
      }
    }

    return true;
  }

  async saveIdentity(encodedAddress: string, publicKey: ArrayBuffer): Promise<boolean> {
    const existing = await SecureStore.getItemAsync(PREFIX_IDENTITY + encodedAddress);
    const encoded = arrayBufferToBase64(publicKey);

    await SecureStore.setItemAsync(PREFIX_IDENTITY + encodedAddress, encoded);

    return existing !== null && existing !== encoded;
  }

  async loadPreKey(encodedAddress: string | number): Promise<KeyPairType | undefined> {
    const serialized = await SecureStore.getItemAsync(PREFIX_PREKEY + String(encodedAddress));

    if (serialized === null) {
      return undefined;
    }

    return deserializeKeyPair(serialized);
  }

  async storePreKey(keyId: number | string, keyPair: KeyPairType): Promise<void> {
    await SecureStore.setItemAsync(PREFIX_PREKEY + String(keyId), serializeKeyPair(keyPair));
  }

  async removePreKey(keyId: number | string): Promise<void> {
    await SecureStore.deleteItemAsync(PREFIX_PREKEY + String(keyId));
  }

  async loadSignedPreKey(keyId: number | string): Promise<KeyPairType | undefined> {
    const serialized = await SecureStore.getItemAsync(PREFIX_SIGNED_PREKEY + String(keyId));

    if (serialized === null) {
      return undefined;
    }

    return deserializeKeyPair(serialized);
  }

  async storeSignedPreKey(keyId: number | string, keyPair: KeyPairType): Promise<void> {
    await SecureStore.setItemAsync(PREFIX_SIGNED_PREKEY + String(keyId), serializeKeyPair(keyPair));
  }

  async removeSignedPreKey(keyId: number | string): Promise<void> {
    await SecureStore.deleteItemAsync(PREFIX_SIGNED_PREKEY + String(keyId));
  }

  async loadSession(encodedAddress: string): Promise<string | undefined> {
    const session = await SecureStore.getItemAsync(PREFIX_SESSION + encodedAddress);

    if (session === null) {
      return undefined;
    }

    return session;
  }

  async storeSession(encodedAddress: string, record: string): Promise<void> {
    await SecureStore.setItemAsync(PREFIX_SESSION + encodedAddress, record);
  }

  async removeSession(encodedAddress: string): Promise<void> {
    await SecureStore.deleteItemAsync(PREFIX_SESSION + encodedAddress);
  }

  async removeAllSessions(identifier: string): Promise<void> {
    await SecureStore.deleteItemAsync(PREFIX_SESSION + identifier + '.1');
  }

  async hasSession(encodedAddress: string): Promise<boolean> {
    const session = await SecureStore.getItemAsync(PREFIX_SESSION + encodedAddress);

    return session !== null;
  }
}
