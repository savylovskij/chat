import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { generateSecret, generateURI, verifySync } from 'otplib';
import * as QRCode from 'qrcode';
import { Repository } from 'typeorm';

import { UserEntity } from '../users/entities/user.entity';

@Injectable()
export class TwoFactorService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  async enable(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.totpEnabled) {
      throw new BadRequestException('2FA is already enabled');
    }

    const secret = generateSecret();

    user.totpSecret = this.encryptTotpSecret(secret);
    await this.userRepository.save(user);

    const otpAuthUrl = generateURI({
      issuer: 'SecureMessenger',
      label: user.phone,
      secret,
    });

    const qrCodeDataUrl = await QRCode.toDataURL(otpAuthUrl);

    return {
      secret,
      qrCodeDataUrl,
      manualEntryKey: secret,
    };
  }

  async confirm(userId: string, code: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user || user.totpSecret === null) {
      throw new BadRequestException('2FA setup not initiated');
    }

    const secret = this.decryptTotpSecret(user.totpSecret);
    const result = verifySync({ token: code, secret, epochTolerance: 30 });
    if (!result.valid) {
      throw new UnauthorizedException('Invalid 2FA code');
    }

    const recoveryCodes = this.generateRecoveryCodes();
    const hashedCodes = recoveryCodes.map((code) => this.hashToken(code));

    user.totpEnabled = true;
    user.recoveryCodes = hashedCodes;
    await this.userRepository.save(user);

    return { recoveryCodes };
  }

  async disable(userId: string, code: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });
    if (!user || !user.totpEnabled || user.totpSecret === null) {
      throw new BadRequestException('2FA is not enabled');
    }

    const secret = this.decryptTotpSecret(user.totpSecret);
    const result = verifySync({ token: code, secret, epochTolerance: 30 });
    if (!result.valid) {
      throw new UnauthorizedException('Invalid 2FA code');
    }

    user.totpEnabled = false;
    user.totpSecret = null;
    user.recoveryCodes = null;

    await this.userRepository.save(user);
  }

  async validateCode(user: UserEntity, code: string): Promise<boolean> {
    if (user.totpSecret === null) {
      return false;
    }

    const secret = this.decryptTotpSecret(user.totpSecret);
    const result = verifySync({ token: code, secret, epochTolerance: 30 });

    if (result.valid) {
      return true;
    }

    if (user.recoveryCodes !== null) {
      const codeHash = this.hashToken(code);
      const recoveryIndex = user.recoveryCodes.indexOf(codeHash);

      if (recoveryIndex !== -1) {
        user.recoveryCodes.splice(recoveryIndex, 1);
        await this.userRepository.save(user);
        return true;
      }
    }

    return false;
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private generateRecoveryCodes(): string[] {
    return Array.from({ length: 10 }, () => randomBytes(4).toString('hex'));
  }

  private encryptTotpSecret(secret: string): string {
    const key = Buffer.from(process.env.TOTP_ENCRYPTION_KEY!, 'hex');
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
  }

  private decryptTotpSecret(encryptedSecret: string): string {
    const key = Buffer.from(process.env.TOTP_ENCRYPTION_KEY!, 'hex');
    const [ivHex, authTagHex, encryptedHex] = encryptedSecret.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');
    const decipher = createDecipheriv('aes-256-gcm', key, iv);

    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

    return decrypted.toString('utf8');
  }
}
