import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { ChatMemberEntity } from '../chats/entities/chat-member.entity';

import { MessageReactionEntity } from './entities/message-reaction.entity';
import { MessageEntity } from './entities/message.entity';
import { ReactionsService } from './reactions.service';

const mockRepository = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn((data: Record<string, unknown>) => ({
    id: 'reaction-uuid',
    createdAt: new Date(),
    ...data,
  })),
  save: jest.fn((entity: Record<string, unknown>) =>
    Promise.resolve({ id: 'reaction-uuid', createdAt: new Date(), ...entity }),
  ),
  remove: jest.fn(),
});

describe('ReactionsService', () => {
  let service: ReactionsService;
  let reactionRepository: ReturnType<typeof mockRepository>;
  let messageRepository: ReturnType<typeof mockRepository>;
  let memberRepository: ReturnType<typeof mockRepository>;

  const chatId = 'chat-1';
  const messageId = 'msg-1';
  const userId = 'user-1';
  const emoji = '👍';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReactionsService,
        { provide: getRepositoryToken(MessageReactionEntity), useFactory: mockRepository },
        { provide: getRepositoryToken(MessageEntity), useFactory: mockRepository },
        { provide: getRepositoryToken(ChatMemberEntity), useFactory: mockRepository },
      ],
    }).compile();

    service = module.get<ReactionsService>(ReactionsService);
    reactionRepository = module.get(getRepositoryToken(MessageReactionEntity));
    messageRepository = module.get(getRepositoryToken(MessageEntity));
    memberRepository = module.get(getRepositoryToken(ChatMemberEntity));
  });

  describe('addReaction', () => {
    beforeEach(() => {
      memberRepository.findOne.mockResolvedValue({ chatId, userId });
    });

    it('should create and return a reaction', async () => {
      messageRepository.findOne.mockResolvedValue({ id: messageId, chatId, deletedAt: null });
      reactionRepository.findOne.mockResolvedValue(null);

      const result = await service.addReaction(chatId, messageId, userId, emoji);

      expect(reactionRepository.create).toHaveBeenCalledWith({ messageId, userId, emoji });
      expect(result).toHaveProperty('emoji', emoji);
    });

    it('should throw ConflictException if reaction already exists', async () => {
      messageRepository.findOne.mockResolvedValue({ id: messageId, chatId, deletedAt: null });
      reactionRepository.findOne.mockResolvedValue({ id: 'existing', messageId, userId, emoji });

      await expect(service.addReaction(chatId, messageId, userId, emoji)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw NotFoundException if message not found', async () => {
      messageRepository.findOne.mockResolvedValue(null);

      await expect(service.addReaction(chatId, messageId, userId, emoji)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if message is deleted', async () => {
      messageRepository.findOne.mockResolvedValue({ id: messageId, chatId, deletedAt: new Date() });

      await expect(service.addReaction(chatId, messageId, userId, emoji)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if user is not a member', async () => {
      memberRepository.findOne.mockResolvedValue(null);

      await expect(service.addReaction(chatId, messageId, userId, emoji)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('removeReaction', () => {
    beforeEach(() => {
      memberRepository.findOne.mockResolvedValue({ chatId, userId });
    });

    it('should remove an existing reaction', async () => {
      const reaction = { id: 'reaction-1', messageId, userId, emoji };
      reactionRepository.findOne.mockResolvedValue(reaction);

      await service.removeReaction(chatId, messageId, userId, emoji);

      expect(reactionRepository.remove).toHaveBeenCalledWith(reaction);
    });

    it('should throw NotFoundException if reaction not found', async () => {
      reactionRepository.findOne.mockResolvedValue(null);

      await expect(service.removeReaction(chatId, messageId, userId, emoji)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getReactions', () => {
    beforeEach(() => {
      memberRepository.findOne.mockResolvedValue({ chatId, userId });
    });

    it('should return reactions grouped by emoji', async () => {
      messageRepository.findOne.mockResolvedValue({ id: messageId, chatId, deletedAt: null });
      reactionRepository.find.mockResolvedValue([
        { emoji: '👍', user: { id: 'user-1', displayName: 'Alice', avatarUrl: null } },
        { emoji: '👍', user: { id: 'user-2', displayName: 'Bob', avatarUrl: null } },
        { emoji: '❤️', user: { id: 'user-1', displayName: 'Alice', avatarUrl: null } },
      ]);

      const result = await service.getReactions(chatId, messageId, userId);

      expect(result).toHaveLength(2);
      const thumbs = result.find((group) => group.emoji === '👍');
      expect(thumbs?.users).toHaveLength(2);
      const heart = result.find((group) => group.emoji === '❤️');
      expect(heart?.users).toHaveLength(1);
    });
  });
});
