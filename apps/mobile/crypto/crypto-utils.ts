import { Paths } from 'expo-file-system';
import { readAsStringAsync, writeAsStringAsync, EncodingType } from 'expo-file-system/legacy';

import { EncryptedFileResult } from '../models/encrypted-file-result.interface';

import { arrayBufferToBase64, base64ToArrayBuffer } from './signal-store';

/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment -- CryptoKey/Web Crypto types are safe at runtime */

export async function generateAesKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
}

export function generateIv(): Uint8Array {
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);

  return iv;
}

export async function exportKey(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey('raw', key);

  return arrayBufferToBase64(raw);
}

export async function importKey(base64Key: string): Promise<CryptoKey> {
  const raw = base64ToArrayBuffer(base64Key);

  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM', length: 256 }, true, [
    'encrypt',
    'decrypt',
  ]);
}

export async function encryptAesGcm(
  plaintext: string,
  key: CryptoKey,
  iv: Uint8Array,
): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
    key,
    data,
  );

  return arrayBufferToBase64(encrypted);
}

export async function decryptAesGcm(
  ciphertext: string,
  key: CryptoKey,
  iv: Uint8Array,
): Promise<string> {
  const data = base64ToArrayBuffer(ciphertext);
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
    key,
    data,
  );
  const decoder = new TextDecoder();

  return decoder.decode(decrypted);
}

export async function encryptFile(fileUri: string): Promise<EncryptedFileResult> {
  const fileBase64 = await readAsStringAsync(fileUri, { encoding: EncodingType.Base64 });
  const fileBuffer = base64ToArrayBuffer(fileBase64);

  const key = await generateAesKey();
  const iv = generateIv();
  const encryptedData = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
    key,
    fileBuffer,
  );

  const hashBuffer = await crypto.subtle.digest('SHA-256', encryptedData);
  const hash = arrayBufferToBase64(hashBuffer);

  const encryptedBase64 = arrayBufferToBase64(encryptedData);
  const encryptedPath = `${Paths.cache.uri}/encrypted_${Date.now()}`;
  await writeAsStringAsync(encryptedPath, encryptedBase64, { encoding: EncodingType.Base64 });

  const exportedKey = await exportKey(key);
  const ivBuffer: ArrayBuffer = iv.buffer as ArrayBuffer;

  return {
    encryptedUri: encryptedPath,
    key: exportedKey,
    iv: arrayBufferToBase64(ivBuffer),
    hash,
  };
}

export async function decryptFile(
  encryptedUri: string,
  keyBase64: string,
  ivBase64: string,
): Promise<string> {
  const encryptedBase64 = await readAsStringAsync(encryptedUri, { encoding: EncodingType.Base64 });
  const encryptedBuffer = base64ToArrayBuffer(encryptedBase64);

  const key = await importKey(keyBase64);
  const ivArray = new Uint8Array(base64ToArrayBuffer(ivBase64));
  const decryptedData = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivArray.buffer },
    key,
    encryptedBuffer,
  );

  const decryptedBase64 = arrayBufferToBase64(decryptedData);
  const decryptedPath = `${Paths.cache.uri}/decrypted_${Date.now()}`;
  await writeAsStringAsync(decryptedPath, decryptedBase64, { encoding: EncodingType.Base64 });

  return decryptedPath;
}

/* eslint-enable @typescript-eslint/no-unsafe-argument */
