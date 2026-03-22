import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ChatMemberEntity } from '../chats/entities/chat-member.entity';

import { MessageReactionEntity } from './entities/message-reaction.entity';
import { MessageEntity } from './entities/message.entity';

@Injectable()
export class ReactionsService {
  constructor(
    @InjectRepository(MessageReactionEntity)
    private readonly reactionRepository: Repository<MessageReactionEntity>,
    @InjectRepository(MessageEntity)
    private readonly messageRepository: Repository<MessageEntity>,
    @InjectRepository(ChatMemberEntity)
    private readonly memberRepository: Repository<ChatMemberEntity>,
  ) {}

  async addReaction(chatId: string, messageId: string, userId: string, emoji: string) {
    await this.assertMembership(chatId, userId);

    const message = await this.messageRepository.findOne({
      where: { id: messageId, chatId },
    });

    if (!message || message.deletedAt) {
      throw new NotFoundException('Message not found');
    }

    const existing = await this.reactionRepository.findOne({
      where: { messageId, userId, emoji },
    });

    if (existing) {
      throw new ConflictException('Reaction already exists');
    }

    const reaction = this.reactionRepository.create({
      messageId,
      userId,
      emoji,
    });

    const saved = await this.reactionRepository.save(reaction);

    return {
      id: saved.id,
      messageId: saved.messageId,
      userId: saved.userId,
      emoji: saved.emoji,
      createdAt: saved.createdAt.toISOString(),
    };
  }

  async removeReaction(chatId: string, messageId: string, userId: string, emoji: string) {
    await this.assertMembership(chatId, userId);

    const reaction = await this.reactionRepository.findOne({
      where: { messageId, userId, emoji },
    });

    if (!reaction) {
      throw new NotFoundException('Reaction not found');
    }

    await this.reactionRepository.remove(reaction);
  }

  async getReactions(chatId: string, messageId: string, userId: string) {
    await this.assertMembership(chatId, userId);

    const message = await this.messageRepository.findOne({
      where: { id: messageId, chatId },
    });

    if (!message || message.deletedAt) {
      throw new NotFoundException('Message not found');
    }

    const reactions = await this.reactionRepository.find({
      where: { messageId },
      relations: ['user'],
      order: { createdAt: 'ASC' },
    });

    const grouped = new Map<
      string,
      { emoji: string; users: Array<{ id: string; displayName: string; avatarUrl: string | null }> }
    >();

    for (const reaction of reactions) {
      if (!grouped.has(reaction.emoji)) {
        grouped.set(reaction.emoji, { emoji: reaction.emoji, users: [] });
      }

      grouped.get(reaction.emoji)!.users.push({
        id: reaction.user.id,
        displayName: reaction.user.displayName,
        avatarUrl: reaction.user.avatarUrl,
      });
    }

    return Array.from(grouped.values());
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
}
