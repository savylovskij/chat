import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ChatType, MemberRole } from '@shared/core';
import { Repository } from 'typeorm';

import { ChatMemberEntity } from './entities/chat-member.entity';
import { ChatEntity } from './entities/chat.entity';

@Injectable()
export class ChatMembersService {
  constructor(
    @InjectRepository(ChatEntity)
    private readonly chatRepository: Repository<ChatEntity>,
    @InjectRepository(ChatMemberEntity)
    private readonly memberRepository: Repository<ChatMemberEntity>,
  ) {}

  async addMembers(chatId: string, userId: string, userIds: string[]) {
    const chat = await this.chatRepository.findOne({ where: { id: chatId } });

    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    if (chat.type !== ChatType.GROUP) {
      throw new BadRequestException('Can only add members to group chats');
    }

    await this.assertAdminRole(chatId, userId);

    const newMembers = userIds.map((memberId) =>
      this.memberRepository.create({
        chatId,
        userId: memberId,
        role: MemberRole.MEMBER,
      }),
    );

    const saved = await this.memberRepository.save(newMembers);

    return saved.map((member) => this.toMemberResponse(member));
  }

  async removeMember(chatId: string, userId: string, targetUserId: string) {
    const chat = await this.chatRepository.findOne({ where: { id: chatId } });

    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    if (userId !== targetUserId) {
      await this.assertAdminRole(chatId, userId);
    }

    const member = await this.memberRepository.findOne({
      where: { chatId, userId: targetUserId },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    await this.memberRepository.remove(member);
  }

  async updateMemberRole(chatId: string, userId: string, targetUserId: string, role: MemberRole) {
    await this.assertAdminRole(chatId, userId);

    const member = await this.memberRepository.findOne({
      where: { chatId, userId: targetUserId },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    member.role = role;
    await this.memberRepository.save(member);

    return this.toMemberResponse(member);
  }

  async muteChat(chatId: string, userId: string, muted: boolean) {
    const member = await this.memberRepository.findOne({
      where: { chatId, userId },
    });

    if (!member) {
      throw new NotFoundException('Not a member of this chat');
    }

    member.notificationsMuted = muted;
    await this.memberRepository.save(member);
  }

  async assertMembership(chatId: string, userId: string) {
    const member = await this.memberRepository.findOne({
      where: { chatId, userId },
    });

    if (!member) {
      throw new ForbiddenException('You are not a member of this chat');
    }

    return member;
  }

  async assertAdminRole(chatId: string, userId: string) {
    const member = await this.assertMembership(chatId, userId);

    if (member.role !== MemberRole.ADMIN) {
      throw new ForbiddenException('Admin role required');
    }

    return member;
  }

  toMemberResponse(member: ChatMemberEntity) {
    return {
      id: member.id,
      chatId: member.chatId,
      userId: member.userId,
      role: member.role,
      lastReadMessageId: member.lastReadMessageId,
      notificationsMuted: member.notificationsMuted,
      joinedAt: member.joinedAt.toISOString(),
      user:
        member.user !== undefined && member.user !== null
          ? {
              id: member.user.id,
              displayName: member.user.displayName,
              avatarUrl: member.user.avatarUrl,
              isOnline: member.user.isOnline,
              lastSeenAt: member.user.lastSeenAt?.toISOString() ?? null,
            }
          : undefined,
    };
  }
}
