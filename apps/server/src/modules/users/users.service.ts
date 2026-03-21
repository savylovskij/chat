import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';

import { DeviceEntity } from './entities/device.entity';
import { UserEntity } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(DeviceEntity)
    private readonly deviceRepository: Repository<DeviceEntity>,
  ) {}

  async getMe(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.toUserResponse(user);
  }

  async updateMe(userId: string, data: { displayName?: string; bio?: string; avatarUrl?: string }) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (data.displayName !== undefined) user.displayName = data.displayName;
    if (data.bio !== undefined) user.bio = data.bio;
    if (data.avatarUrl !== undefined) user.avatarUrl = data.avatarUrl;

    await this.userRepository.save(user);

    return this.toUserResponse(user);
  }

  async search(query: string, limit: number = 20) {
    const users = await this.userRepository.find({
      where: {
        displayName: ILike(`%${query}%`),
      },
      take: limit,
    });

    return users.map((u) => this.toPublicUser(u));
  }

  async getById(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.toPublicUser(user);
  }

  async getDevices(userId: string) {
    const devices = await this.deviceRepository.find({
      where: { userId },
      order: { lastActiveAt: 'DESC' },
    });

    return devices.map((device) => ({
      id: device.id,
      deviceName: device.deviceName,
      platform: device.platform,
      lastActiveAt: device.lastActiveAt.toISOString(),
      createdAt: device.createdAt.toISOString(),
    }));
  }

  async deleteDevice(userId: string, deviceId: string) {
    const device = await this.deviceRepository.findOne({
      where: {
        id: deviceId,
        userId,
      },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    await this.deviceRepository.remove(device);
  }

  private toUserResponse(user: UserEntity) {
    return {
      id: user.id,
      phone: user.phone,
      phoneVerified: user.phoneVerified,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      isOnline: user.isOnline,
      lastSeenAt: user.lastSeenAt?.toISOString() ?? null,
      totpEnabled: user.totpEnabled,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  private toPublicUser(user: UserEntity) {
    return {
      id: user.id,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      isOnline: user.isOnline,
      lastSeenAt: user.lastSeenAt?.toISOString() ?? null,
    };
  }
}
