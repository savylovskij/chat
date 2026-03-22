import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DeleteMessageMode,
  EditMessageDto,
  SendMessageDto,
  WsDeleteMessageDto,
  WsReactionDto,
} from '@shared/core';
import { Socket } from 'socket.io';
import { Repository } from 'typeorm';

import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { ChatMemberEntity } from '../chats/entities/chat-member.entity';
import { ChatEntity } from '../chats/entities/chat.entity';
import { MessageDeletionEntity } from '../messages/entities/message-deletion.entity';
import { MessageReactionEntity } from '../messages/entities/message-reaction.entity';
import { MessageEntity } from '../messages/entities/message.entity';
import { UserEntity } from '../users/entities/user.entity';

const DELETE_FOR_EVERYONE_LIMIT_MS = 48 * 60 * 60 * 1000;

@Injectable()
export class GatewayService {
  private readonly logger = new Logger(GatewayService.name);

  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(ChatEntity)
    private readonly chatRepository: Repository<ChatEntity>,
    @InjectRepository(ChatMemberEntity)
    private readonly memberRepository: Repository<ChatMemberEntity>,
    @InjectRepository(MessageEntity)
    private readonly messageRepository: Repository<MessageEntity>,
    @InjectRepository(MessageDeletionEntity)
    private readonly messageDeletionRepository: Repository<MessageDeletionEntity>,
    @InjectRepository(MessageReactionEntity)
    private readonly reactionRepository: Repository<MessageReactionEntity>,
  ) {}

  authenticateSocket(client: Socket): { userId: string; deviceId: string } | null {
    const authHeader = client.handshake.headers?.authorization;

    const token: string | undefined =
      (client.handshake.auth as Record<string, string> | undefined)?.token ??
      (typeof authHeader === 'string' ? authHeader.split(' ')[1] : undefined);

    if (token === undefined) {
      return null;
    }

    try {
      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: process.env.JWT_ACCESS_SECRET,
      });

      return {
        userId: payload.sub,
        deviceId: payload.deviceId,
      };
    } catch {
      this.logger.warn('Invalid JWT token on WebSocket connection');

      return null;
    }
  }

  async getUserChatIds(userId: string): Promise<string[]> {
    const memberships = await this.memberRepository.find({
      where: { userId },
      select: ['chatId'],
    });

    return memberships.map((membership) => membership.chatId);
  }

  async getUserContactIds(userId: string): Promise<string[]> {
    const memberships = await this.memberRepository.find({
      where: { userId },
      select: ['chatId'],
    });

    const chatIds = memberships.map((membership) => membership.chatId);

    if (chatIds.length === 0) {
      return [];
    }

    const contacts = await this.memberRepository
      .createQueryBuilder('member')
      .select('DISTINCT member.user_id', 'userId')
      .where('member.chat_id IN (:...chatIds)', { chatIds })
      .andWhere('member.user_id != :userId', { userId })
      .getRawMany<{ userId: string }>();

    return contacts.map((contact) => contact.userId);
  }

  async setUserOnline(userId: string): Promise<void> {
    await this.userRepository.update(userId, { isOnline: true });
  }

  async setUserOffline(userId: string): Promise<Date> {
    const lastSeenAt = new Date();

    await this.userRepository.update(userId, {
      isOnline: false,
      lastSeenAt,
    });

    return lastSeenAt;
  }

  async createMessage(userId: string, payload: SendMessageDto) {
    await this.assertMembership(payload.chatId, userId);

    const message = this.messageRepository.create({
      chatId: payload.chatId,
      senderId: userId,
      type: payload.type,
      encryptedContent: payload.encryptedContent ?? null,
      mediaUrl: payload.mediaUrl ?? null,
      replyToId: payload.replyToId ?? null,
    });

    const savedMessage = await this.messageRepository.save(message);

    await this.chatRepository.update(payload.chatId, {
      lastMessageId: savedMessage.id,
      lastMessageAt: savedMessage.createdAt,
    });

    return {
      id: savedMessage.id,
      chatId: savedMessage.chatId,
      senderId: savedMessage.senderId,
      type: savedMessage.type,
      encryptedContent: savedMessage.encryptedContent,
      mediaUrl: savedMessage.mediaUrl,
      replyToId: savedMessage.replyToId,
      clientMessageId: payload.clientMessageId,
      createdAt: savedMessage.createdAt.toISOString(),
    };
  }

  async editMessage(userId: string, payload: EditMessageDto) {
    const message = await this.messageRepository.findOne({
      where: {
        id: payload.messageId,
        senderId: userId,
      },
    });

    if (!message) {
      throw new Error('Message not found or not authorized');
    }

    message.encryptedContent = payload.encryptedContent;
    message.isEdited = true;
    message.editedAt = new Date();

    await this.messageRepository.save(message);

    return {
      chatId: message.chatId,
      editedAt: message.editedAt.toISOString(),
    };
  }

  async deleteMessage(userId: string, payload: WsDeleteMessageDto) {
    const message = await this.messageRepository.findOne({
      where: {
        id: payload.messageId,
      },
    });

    if (!message) {
      throw new Error('Message not found');
    }

    await this.assertMembership(message.chatId, userId);

    if (payload.mode === DeleteMessageMode.FOR_ME) {
      const deletion = this.messageDeletionRepository.create({
        messageId: payload.messageId,
        userId,
      });

      await this.messageDeletionRepository.save(deletion);
    } else {
      if (message.senderId !== userId) {
        throw new Error('Only the author can delete a message for everyone');
      }

      const messageAge = Date.now() - message.createdAt.getTime();

      if (messageAge > DELETE_FOR_EVERYONE_LIMIT_MS) {
        throw new Error('Cannot delete message for everyone after 48 hours');
      }

      message.deletedAt = new Date();
      await this.messageRepository.save(message);
    }

    return { chatId: message.chatId };
  }

  async markAsRead(userId: string, chatId: string, messageId: string): Promise<void> {
    const member = await this.assertMembership(chatId, userId);

    member.lastReadMessageId = messageId;
    await this.memberRepository.save(member);
  }

  async addReaction(userId: string, payload: WsReactionDto) {
    const message = await this.messageRepository.findOne({
      where: { id: payload.messageId },
    });

    if (!message || message.deletedAt) {
      throw new Error('Message not found');
    }

    await this.assertMembership(message.chatId, userId);

    const existing = await this.reactionRepository.findOne({
      where: { messageId: payload.messageId, userId, emoji: payload.emoji },
    });

    if (existing) {
      throw new Error('Reaction already exists');
    }

    const reaction = this.reactionRepository.create({
      messageId: payload.messageId,
      userId,
      emoji: payload.emoji,
    });

    await this.reactionRepository.save(reaction);

    return { chatId: message.chatId };
  }

  async removeReaction(userId: string, payload: WsReactionDto) {
    const message = await this.messageRepository.findOne({
      where: { id: payload.messageId },
    });

    if (!message) {
      throw new Error('Message not found');
    }

    await this.assertMembership(message.chatId, userId);

    const reaction = await this.reactionRepository.findOne({
      where: { messageId: payload.messageId, userId, emoji: payload.emoji },
    });

    if (!reaction) {
      throw new Error('Reaction not found');
    }

    await this.reactionRepository.remove(reaction);

    return { chatId: message.chatId };
  }

  private async assertMembership(chatId: string, userId: string): Promise<ChatMemberEntity> {
    const member = await this.memberRepository.findOne({
      where: { chatId, userId },
    });

    if (!member) {
      throw new Error('You are not a member of this chat');
    }

    return member;
  }
}
