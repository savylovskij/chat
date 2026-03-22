import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ChatType, DeleteChatMode, MemberRole } from '@shared/core';
import { Repository } from 'typeorm';

import { MessageDeletionEntity } from '../messages/entities/message-deletion.entity';
import { MessageEntity } from '../messages/entities/message.entity';

import { ChatMembersService } from './chat-members.service';
import { ChatMemberEntity } from './entities/chat-member.entity';
import { ChatEntity } from './entities/chat.entity';

@Injectable()
export class ChatsService {
  constructor(
    @InjectRepository(ChatEntity)
    private readonly chatRepository: Repository<ChatEntity>,
    @InjectRepository(ChatMemberEntity)
    private readonly memberRepository: Repository<ChatMemberEntity>,
    @InjectRepository(MessageEntity)
    private readonly messageRepository: Repository<MessageEntity>,
    @InjectRepository(MessageDeletionEntity)
    private readonly messageDeletionRepository: Repository<MessageDeletionEntity>,
    private readonly chatMembersService: ChatMembersService,
  ) {}

  async createChat(
    userId: string,
    data: {
      type: ChatType;
      memberIds: string[];
      name?: string;
      description?: string;
    },
  ) {
    if (data.type === ChatType.DIRECT) {
      if (data.memberIds.length !== 1) {
        throw new BadRequestException('Direct chat requires exactly one member ID');
      }

      const otherUserId = data.memberIds[0];

      if (otherUserId === userId) {
        throw new BadRequestException('Cannot create direct chat with yourself');
      }

      const existingChat = await this.findExistingDirectChat(userId, otherUserId);

      if (existingChat) {
        return this.toChatResponse(existingChat);
      }
    }

    if (data.type === ChatType.GROUP && (data.name === undefined || data.name === '')) {
      throw new BadRequestException('Group chat requires a name');
    }

    const chat = this.chatRepository.create({
      type: data.type,
      name: data.name ?? null,
      description: data.description ?? null,
      createdBy: userId,
    });

    const savedChat = await this.chatRepository.save(chat);

    const allMemberIds = [userId, ...data.memberIds.filter((memberId) => memberId !== userId)];
    const members = allMemberIds.map((memberId, index) =>
      this.memberRepository.create({
        chatId: savedChat.id,
        userId: memberId,
        role: index === 0 ? MemberRole.ADMIN : MemberRole.MEMBER,
      }),
    );

    await this.memberRepository.save(members);

    const fullChat = await this.chatRepository.findOne({
      where: { id: savedChat.id },
      relations: ['members', 'members.user'],
    });

    return this.toChatResponse(fullChat!);
  }

  async getChatList(userId: string, cursor?: string, limit: number = 20) {
    const queryBuilder = this.chatRepository
      .createQueryBuilder('chat')
      .innerJoin('chat.members', 'membership', 'membership.user_id = :userId', { userId })
      .leftJoinAndSelect('chat.members', 'members')
      .leftJoinAndSelect('members.user', 'memberUser')
      .orderBy('chat.lastMessageAt', 'DESC', 'NULLS LAST')
      .addOrderBy('chat.createdAt', 'DESC')
      .take(limit);

    if (cursor !== undefined && cursor !== '') {
      const cursorChat = await this.chatRepository.findOne({ where: { id: cursor } });

      if (cursorChat) {
        queryBuilder.andWhere(
          '(chat.lastMessageAt < :lastMessageAt OR (chat.lastMessageAt IS NULL AND chat.createdAt < :createdAt))',
          {
            lastMessageAt: cursorChat.lastMessageAt ?? cursorChat.createdAt,
            createdAt: cursorChat.createdAt,
          },
        );
      }
    }

    const chats = await queryBuilder.getMany();

    const chatResponses = await Promise.all(
      chats.map(async (chat) => {
        const response = this.toChatResponse(chat);
        const unreadCount = await this.getUnreadCount(chat.id, userId);

        return { ...response, unreadCount };
      }),
    );

    return {
      chats: chatResponses,
      meta: {
        cursor: chats.length > 0 ? chats[chats.length - 1].id : null,
        hasMore: chats.length === limit,
      },
    };
  }

  async getChatById(chatId: string, userId: string) {
    await this.chatMembersService.assertMembership(chatId, userId);

    const chat = await this.chatRepository.findOne({
      where: { id: chatId },
      relations: ['members', 'members.user'],
    });

    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    return this.toChatResponse(chat);
  }

  async updateChat(
    chatId: string,
    userId: string,
    data: {
      name?: string;
      description?: string;
      avatarUrl?: string;
    },
  ) {
    const chat = await this.chatRepository.findOne({ where: { id: chatId } });

    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    if (chat.type !== ChatType.GROUP) {
      throw new BadRequestException('Can only update group chats');
    }

    await this.chatMembersService.assertAdminRole(chatId, userId);

    if (data.name !== undefined) chat.name = data.name;
    if (data.description !== undefined) chat.description = data.description;
    if (data.avatarUrl !== undefined) chat.avatarUrl = data.avatarUrl;

    await this.chatRepository.save(chat);

    const fullChat = await this.chatRepository.findOne({
      where: { id: chatId },
      relations: ['members', 'members.user'],
    });

    return this.toChatResponse(fullChat!);
  }

  async deleteChat(chatId: string, userId: string, mode: DeleteChatMode) {
    const chat = await this.chatRepository.findOne({
      where: { id: chatId },
      relations: ['members'],
    });

    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    await this.chatMembersService.assertMembership(chatId, userId);

    switch (mode) {
      case DeleteChatMode.LEAVE: {
        if (chat.type !== ChatType.GROUP) {
          throw new BadRequestException('Cannot leave a direct chat');
        }

        await this.memberRepository.delete({ chatId, userId });
        break;
      }

      case DeleteChatMode.DELETE_FOR_ME: {
        const messages = await this.messageRepository.find({
          where: { chatId },
          select: ['id'],
        });

        if (messages.length > 0) {
          const deletionValues = messages.map((message) => ({
            messageId: message.id,
            userId,
          }));

          await this.messageDeletionRepository
            .createQueryBuilder()
            .insert()
            .into(MessageDeletionEntity)
            .values(deletionValues)
            .orIgnore()
            .execute();
        }

        await this.memberRepository.delete({ chatId, userId });
        break;
      }

      case DeleteChatMode.DELETE_FOR_EVERYONE: {
        if (chat.type === ChatType.DIRECT) {
          await this.chatRepository.remove(chat);
        } else {
          if (chat.createdBy !== userId) {
            throw new ForbiddenException('Only creator can delete group chat for everyone');
          }

          await this.chatRepository.remove(chat);
        }

        break;
      }
    }
  }

  async clearHistory(chatId: string, userId: string) {
    await this.chatMembersService.assertMembership(chatId, userId);

    const messages = await this.messageRepository.find({
      where: { chatId },
      select: ['id'],
    });

    if (messages.length > 0) {
      const deletionValues = messages.map((message) => ({
        messageId: message.id,
        userId,
      }));

      await this.messageDeletionRepository
        .createQueryBuilder()
        .insert()
        .into(MessageDeletionEntity)
        .values(deletionValues)
        .orIgnore()
        .execute();
    }
  }

  private async findExistingDirectChat(
    userId1: string,
    userId2: string,
  ): Promise<ChatEntity | null> {
    return await this.chatRepository
      .createQueryBuilder('chat')
      .innerJoin('chat.members', 'member1', 'member1.user_id = :userId1', { userId1 })
      .innerJoin('chat.members', 'member2', 'member2.user_id = :userId2', { userId2 })
      .leftJoinAndSelect('chat.members', 'members')
      .leftJoinAndSelect('members.user', 'memberUser')
      .where('chat.type = :type', { type: ChatType.DIRECT })
      .getOne();
  }

  private async getUnreadCount(chatId: string, userId: string): Promise<number> {
    const member = await this.memberRepository.findOne({
      where: { chatId, userId },
    });

    if (member === null || member.lastReadMessageId === null) {
      return await this.messageRepository
        .createQueryBuilder('message')
        .where('message.chat_id = :chatId', { chatId })
        .andWhere('message.sender_id != :userId', { userId })
        .andWhere('message.deleted_at IS NULL')
        .leftJoin(
          'message_deletions',
          'deletion',
          'deletion.message_id = message.id AND deletion.user_id = :userId',
          { userId },
        )
        .andWhere('deletion.id IS NULL')
        .getCount();
    }

    const lastReadMessage = await this.messageRepository.findOne({
      where: { id: member.lastReadMessageId },
    });

    if (!lastReadMessage) {
      return 0;
    }

    return await this.messageRepository
      .createQueryBuilder('message')
      .where('message.chat_id = :chatId', { chatId })
      .andWhere('message.sender_id != :userId', { userId })
      .andWhere('message.created_at > :lastReadAt', { lastReadAt: lastReadMessage.createdAt })
      .andWhere('message.deleted_at IS NULL')
      .leftJoin(
        'message_deletions',
        'deletion',
        'deletion.message_id = message.id AND deletion.user_id = :userId',
        { userId },
      )
      .andWhere('deletion.id IS NULL')
      .getCount();
  }

  private toChatResponse(chat: ChatEntity) {
    const members =
      chat.members?.map((member) => this.chatMembersService.toMemberResponse(member)) ?? [];

    return {
      id: chat.id,
      type: chat.type,
      name: chat.name,
      description: chat.description,
      avatarUrl: chat.avatarUrl,
      createdBy: chat.createdBy,
      lastMessageId: chat.lastMessageId,
      lastMessageAt: chat.lastMessageAt?.toISOString() ?? null,
      createdAt: chat.createdAt.toISOString(),
      updatedAt: chat.updatedAt.toISOString(),
      members,
    };
  }
}
