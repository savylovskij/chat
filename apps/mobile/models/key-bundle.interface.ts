export interface KeyBundle {
  registrationId: number;
  identityKey: string;
  signedPreKey: {
    keyId: number;
    publicKey: string;
    signature: string;
  };
  preKeys: Array<{
    keyId: number;
    publicKey: string;
  }>;
}
