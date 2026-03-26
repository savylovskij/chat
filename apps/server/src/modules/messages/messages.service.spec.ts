import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DeleteMessageMode } from '@shared/core';

import { ChatMemberEntity } from '../chats/entities/chat-member.entity';

import { MessageDeletionEntity } from './entities/message-deletion.entity';
import { MessageEntity } from './entities/message.entity';
import { MessagesService } from './messages.service';

const mockQueryBuilder = {
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  leftJoin: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  getMany: jest.fn().mockResolvedValue([]),
  insert: jest.fn().mockReturnThis(),
  into: jest.fn().mockReturnThis(),
  values: jest.fn().mockReturnThis(),
  orIgnore: jest.fn().mockReturnThis(),
  execute: jest.fn().mockResolvedValue({}),
};

const mockRepository = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn((data: Record<string, unknown>) => data),
  save: jest.fn((entity: Record<string, unknown>) => Promise.resolve(entity)),
  remove: jest.fn(),
  createQueryBuilder: jest.fn(() => ({ ...mockQueryBuilder })),
});

describe('MessagesService', () => {
  let service: MessagesService;
  let messageRepository: ReturnType<typeof mockRepository>;
  let messageDeletionRepository: ReturnType<typeof mockRepository>;
  let memberRepository: ReturnType<typeof mockRepository>;

  const chatId = 'chat-1';
  const userId = 'user-1';
  const messageId = 'msg-1';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagesService,
        { provide: getRepositoryToken(MessageEntity), useFactory: mockRepository },
        { provide: getRepositoryToken(MessageDeletionEntity), useFactory: mockRepository },
        { provide: getRepositoryToken(ChatMemberEntity), useFactory: mockRepository },
      ],
    }).compile();

    service = module.get<MessagesService>(MessagesService);
    messageRepository = module.get(getRepositoryToken(MessageEntity));
    messageDeletionRepository = module.get(getRepositoryToken(MessageDeletionEntity));
    memberRepository = module.get(getRepositoryToken(ChatMemberEntity));
  });

  describe('deleteMessage', () => {
    beforeEach(() => {
      memberRepository.findOne.mockResolvedValue({ chatId, userId });
    });

    it('should create deletion record for FOR_ME mode', async () => {
      messageRepository.findOne.mockResolvedValue({
        id: messageId,
        chatId,
        senderId: 'other-user',
      });

      await service.deleteMessage(chatId, messageId, userId, DeleteMessageMode.FOR_ME);

      expect(messageDeletionRepository.create).toHaveBeenCalledWith({ messageId, userId });
      expect(messageDeletionRepository.save).toHaveBeenCalled();
    });

    it('should soft delete for FOR_EVERYONE when user is author', async () => {
      const message = { id: messageId, chatId, senderId: userId, createdAt: new Date() };
      messageRepository.findOne.mockResolvedValue(message);

      await service.deleteMessage(chatId, messageId, userId, DeleteMessageMode.FOR_EVERYONE);

      expect(messageRepository.save).toHaveBeenCalledWith(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        expect.objectContaining({ deletedAt: expect.any(Date) }),
      );
    });

    it('should throw ForbiddenException for FOR_EVERYONE if not author', async () => {
      messageRepository.findOne.mockResolvedValue({
        id: messageId,
        chatId,
        senderId: 'other-user',
        createdAt: new Date(),
      });

      await expect(
        service.deleteMessage(chatId, messageId, userId, DeleteMessageMode.FOR_EVERYONE),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException for FOR_EVERYONE after 48 hours', async () => {
      const oldDate = new Date(Date.now() - 49 * 60 * 60 * 1000);
      messageRepository.findOne.mockResolvedValue({
        id: messageId,
        chatId,
        senderId: userId,
        createdAt: oldDate,
      });

      await expect(
        service.deleteMessage(chatId, messageId, userId, DeleteMessageMode.FOR_EVERYONE),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if message not found', async () => {
      messageRepository.findOne.mockResolvedValue(null);

      await expect(
        service.deleteMessage(chatId, messageId, userId, DeleteMessageMode.FOR_ME),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('bulkDeleteMessages', () => {
    beforeEach(() => {
      memberRepository.findOne.mockResolvedValue({ chatId, userId });
    });

    it('should create deletion entries for specified message IDs', async () => {
      const targetIds = ['msg-1', 'msg-2', 'msg-3'];

      await service.bulkDeleteMessages(chatId, userId, targetIds);

      const queryBuilder = messageDeletionRepository.createQueryBuilder();
      expect(queryBuilder.insert).toHaveBeenCalled();
    });

    it('should delete all messages in chat if no IDs provided', async () => {
      messageRepository.find.mockResolvedValue([{ id: 'msg-1' }, { id: 'msg-2' }]);

      await service.bulkDeleteMessages(chatId, userId);

      expect(messageRepository.find).toHaveBeenCalledWith({ where: { chatId }, select: ['id'] });
    });
  });

  describe('membership check', () => {
    it('should throw ForbiddenException if user is not a member', async () => {
      memberRepository.findOne.mockResolvedValue(null);

      await expect(
        service.deleteMessage(chatId, messageId, userId, DeleteMessageMode.FOR_ME),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
