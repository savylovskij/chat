import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeleteMessageMode } from '@shared/core';
import { Repository } from 'typeorm';

import { ChatMemberEntity } from '../chats/entities/chat-member.entity';

import { MessageDeletionEntity } from './entities/message-deletion.entity';
import { MessageEntity } from './entities/message.entity';

const DELETE_FOR_EVERYONE_LIMIT_MS = 48 * 60 * 60 * 1000;

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(MessageEntity)
    private readonly messageRepository: Repository<MessageEntity>,
    @InjectRepository(MessageDeletionEntity)
    private readonly messageDeletionRepository: Repository<MessageDeletionEntity>,
    @InjectRepository(ChatMemberEntity)
    private readonly memberRepository: Repository<ChatMemberEntity>,
  ) {}

  async getMessages(
    chatId: string,
    userId: string,
    cursor?: string,
    limit: number = 50,
    direction: 'before' | 'after' = 'before',
  ) {
    await this.assertMembership(chatId, userId);

    const queryBuilder = this.messageRepository
      .createQueryBuilder('message')
      .where('message.chat_id = :chatId', { chatId })
      .andWhere('message.deleted_at IS NULL')
      .leftJoin(
        'message_deletions',
        'deletion',
        'deletion.message_id = message.id AND deletion.user_id = :userId',
        { userId },
      )
      .andWhere('deletion.id IS NULL')
      .take(limit);

    if (cursor !== undefined && cursor !== '') {
      const cursorMessage = await this.messageRepository.findOne({ where: { id: cursor } });

      if (cursorMessage) {
        if (direction === 'before') {
          queryBuilder
            .andWhere('message.created_at < :cursorDate', { cursorDate: cursorMessage.createdAt })
            .orderBy('message.created_at', 'DESC');
        } else {
          queryBuilder
            .andWhere('message.created_at > :cursorDate', { cursorDate: cursorMessage.createdAt })
            .orderBy('message.created_at', 'ASC');
        }
      } else {
        queryBuilder.orderBy('message.created_at', 'DESC');
      }
    } else {
      queryBuilder.orderBy('message.created_at', 'DESC');
    }

    const messages = await queryBuilder.getMany();

    if (direction === 'before' || cursor === undefined || cursor === '') {
      messages.reverse();
    }

    return {
      messages: messages.map((message) => this.toMessageResponse(message)),
      meta: {
        cursor: messages.length > 0 ? messages[0].id : null,
        hasMore: messages.length === limit,
      },
    };
  }

  async getMessageById(chatId: string, messageId: string, userId: string) {
    await this.assertMembership(chatId, userId);

    const message = await this.messageRepository.findOne({
      where: { id: messageId, chatId },
    });

    if (!message || message.deletedAt) {
      throw new NotFoundException('Message not found');
    }

    const deletion = await this.messageDeletionRepository.findOne({
      where: { messageId, userId },
    });

    if (deletion) {
      throw new NotFoundException('Message not found');
    }

    return this.toMessageResponse(message);
  }

  async deleteMessage(chatId: string, messageId: string, userId: string, mode: DeleteMessageMode) {
    await this.assertMembership(chatId, userId);

    const message = await this.messageRepository.findOne({
      where: { id: messageId, chatId },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (mode === DeleteMessageMode.FOR_ME) {
      const deletion = this.messageDeletionRepository.create({
        messageId,
        userId,
      });

      await this.messageDeletionRepository.save(deletion);
    } else {
      if (message.senderId !== userId) {
        throw new ForbiddenException('Only the author can delete a message for everyone');
      }

      const messageAge = Date.now() - message.createdAt.getTime();

      if (messageAge > DELETE_FOR_EVERYONE_LIMIT_MS) {
        throw new BadRequestException('Cannot delete message for everyone after 48 hours');
      }

      message.deletedAt = new Date();
      await this.messageRepository.save(message);
    }
  }

  async bulkDeleteMessages(chatId: string, userId: string, messageIds?: string[]) {
    await this.assertMembership(chatId, userId);

    let targetMessageIds: string[];

    if (messageIds && messageIds.length > 0) {
      targetMessageIds = messageIds;
    } else {
      const messages = await this.messageRepository.find({
        where: { chatId },
        select: ['id'],
      });

      targetMessageIds = messages.map((message) => message.id);
    }

    if (targetMessageIds.length === 0) {
      return;
    }

    const deletionValues = targetMessageIds.map((messageId) => ({
      messageId,
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

  private async assertMembership(chatId: string, userId: string) {
    const member = await this.memberRepository.findOne({
      where: { chatId, userId },
    });

    if (!member) {
      throw new ForbiddenException('You are not a member of this chat');
    }

    return member;
  }

  private toMessageResponse(message: MessageEntity) {
    return {
      id: message.id,
      chatId: message.chatId,
      senderId: message.senderId,
      type: message.type,
      weight: message.weight,
      encryptedContent: message.encryptedContent,
      mediaUrl: message.mediaUrl,
      mediaMetadata: message.mediaMetadata,
      replyToId: message.replyToId,
      timer: message.timer,
      isEdited: message.isEdited,
      editedAt: message.editedAt?.toISOString() ?? null,
      deletedAt: message.deletedAt?.toISOString() ?? null,
      createdAt: message.createdAt.toISOString(),
    };
  }
}
