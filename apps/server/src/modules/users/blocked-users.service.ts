import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BlockedUserEntity } from './entities/blocked-user.entity';
import { UserEntity } from './entities/user.entity';

@Injectable()
export class BlockedUsersService {
  constructor(
    @InjectRepository(BlockedUserEntity)
    private readonly blockedUserRepository: Repository<BlockedUserEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  async blockUser(blockerId: string, blockedId: string) {
    if (blockerId === blockedId) {
      throw new ConflictException('Cannot block yourself');
    }

    const targetUser = await this.userRepository.findOne({ where: { id: blockedId } });

    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    const existing = await this.blockedUserRepository.findOne({
      where: { blockerId, blockedId },
    });

    if (existing) {
      throw new ConflictException('User is already blocked');
    }

    const blockedUser = this.blockedUserRepository.create({
      blockerId,
      blockedId,
    });

    await this.blockedUserRepository.save(blockedUser);
  }

  async unblockUser(blockerId: string, blockedId: string) {
    const blocked = await this.blockedUserRepository.findOne({
      where: { blockerId, blockedId },
    });

    if (!blocked) {
      throw new NotFoundException('User is not blocked');
    }

    await this.blockedUserRepository.remove(blocked);
  }

  async getBlockedUsers(blockerId: string) {
    const blockedEntries = await this.blockedUserRepository.find({
      where: { blockerId },
      relations: ['blocked'],
      order: { createdAt: 'DESC' },
    });

    return blockedEntries.map((entry) => ({
      id: entry.blocked.id,
      displayName: entry.blocked.displayName,
      avatarUrl: entry.blocked.avatarUrl,
      bio: entry.blocked.bio,
      isOnline: entry.blocked.isOnline,
      lastSeenAt: entry.blocked.lastSeenAt?.toISOString() ?? null,
    }));
  }

  async isBlocked(blockerId: string, blockedId: string): Promise<boolean> {
    const blocked = await this.blockedUserRepository.findOne({
      where: { blockerId, blockedId },
    });

    return blocked !== null;
  }
}
