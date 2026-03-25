import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { SignalPrekeyEntity } from '../users/entities/signal-prekey.entity';
import { UserEntity } from '../users/entities/user.entity';

@Injectable()
export class KeysService {
  constructor(
    @InjectRepository(SignalPrekeyEntity)
    private readonly prekeyRepository: Repository<SignalPrekeyEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  async uploadKeys(
    userId: string,
    deviceId: string,
    identitiesKey: string,
    signedPreKey: { keyId: number; publicKey: string; signature: string },
    preKeys: { keyId: number; publicKey: string }[],
  ): Promise<void> {
    await this.userRepository.update(userId, {
      publicIdentitiesKey: Buffer.from(identitiesKey, 'base64'),
    });

    await this.prekeyRepository.delete({
      userId,
      deviceId,
      isSigned: true,
    });

    const signedEntity = this.prekeyRepository.create({
      userId,
      deviceId,
      keyId: signedPreKey.keyId,
      publicKey: Buffer.from(signedPreKey.publicKey, 'base64'),
      isSigned: true,
      signature: Buffer.from(signedPreKey.signature, 'base64'),
    });

    const preKeyEntities = preKeys.map((preKey) =>
      this.prekeyRepository.create({
        userId,
        deviceId,
        keyId: preKey.keyId,
        publicKey: Buffer.from(preKey.publicKey, 'base64'),
        isSigned: false,
        signature: null,
      }),
    );

    await this.prekeyRepository.save([signedEntity, ...preKeyEntities]);
  }

  async getKeysForUser(
    userId: string,
    deviceId?: string,
  ): Promise<{
    identitiesKey: string;
    signedPreKey: { keyId: number; publicKey: string; signature: string };
    oneTimePreKey?: { keyId: number; publicKey: string };
  }> {
    const user = await this.userRepository.findOne({
      where: {
        id: userId,
      },
    });

    if (!user || !user.publicIdentitiesKey) {
      throw new NotFoundException('Keys not found for this user');
    }

    const signedPreKeyWhere: Record<string, unknown> = {
      userId,
      isSigned: true,
    };

    if (deviceId !== undefined && deviceId !== '') {
      signedPreKeyWhere.deviceId = deviceId;
    }

    const signedPreKey = await this.prekeyRepository.findOne({
      where: signedPreKeyWhere,
      order: { createdAt: 'DESC' },
    });

    if (!signedPreKey) {
      throw new NotFoundException('Signed pre-key not found for this user');
    }

    const oneTimePreKeyWhere: Record<string, unknown> = {
      userId,
      isSigned: false,
      isUsed: false,
    };

    if (deviceId !== undefined && deviceId !== '') {
      oneTimePreKeyWhere.deviceId = deviceId;
    }

    const oneTimePreKey = await this.prekeyRepository.findOne({
      where: oneTimePreKeyWhere,
      order: { createdAt: 'ASC' },
    });

    if (oneTimePreKey) {
      await this.prekeyRepository.update(oneTimePreKey.id, { isUsed: true });
    }

    const result: {
      identitiesKey: string;
      signedPreKey: { keyId: number; publicKey: string; signature: string };
      oneTimePreKey?: { keyId: number; publicKey: string };
    } = {
      identitiesKey: user.publicIdentitiesKey.toString('base64'),
      signedPreKey: {
        keyId: signedPreKey.keyId,
        publicKey: signedPreKey.publicKey.toString('base64'),
        signature: signedPreKey.signature!.toString('base64'),
      },
    };

    if (oneTimePreKey) {
      result.oneTimePreKey = {
        keyId: oneTimePreKey.keyId,
        publicKey: oneTimePreKey.publicKey.toString('base64'),
      };
    }

    return result;
  }

  async replenishPreKeys(
    userId: string,
    deviceId: string,
    preKeys: { keyId: number; publicKey: string }[],
  ): Promise<void> {
    const preKeyEntities = preKeys.map((preKey) =>
      this.prekeyRepository.create({
        userId,
        deviceId,
        keyId: preKey.keyId,
        publicKey: Buffer.from(preKey.publicKey, 'base64'),
        isSigned: false,
        signature: null,
      }),
    );

    await this.prekeyRepository.save(preKeyEntities);
  }

  async getKeyStatus(userId: string, deviceId: string): Promise<{ availablePreKeys: number }> {
    const availablePreKeys = await this.prekeyRepository.count({
      where: {
        userId,
        deviceId,
        isSigned: false,
        isUsed: false,
      },
    });

    return { availablePreKeys };
  }
}
