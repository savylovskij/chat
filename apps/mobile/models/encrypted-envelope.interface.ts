import { EncryptedKey } from './encrypted-key.interface';

export interface EncryptedEnvelope {
  v: number;
  body: string;
  iv: string;
  keys: Record<string, EncryptedKey>;
}
