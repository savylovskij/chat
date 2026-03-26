import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ChatType, DeleteChatMode, MemberRole } from '@shared/core';

import { MessageDeletionEntity } from '../messages/entities/message-deletion.entity';
import { MessageEntity } from '../messages/entities/message.entity';

import { ChatMembersService } from './chat-members.service';
import { ChatsService } from './chats.service';
import { ChatMemberEntity } from './entities/chat-member.entity';
import { ChatEntity } from './entities/chat.entity';

const mockQueryBuilder = {
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  innerJoin: jest.fn().mockReturnThis(),
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  addOrderBy: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  getOne: jest.fn().mockResolvedValue(null),
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
  create: jest.fn((data: Record<string, unknown>) => ({
    id: 'test-uuid',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...data,
  })),
  save: jest.fn((entity: unknown) => {
    if (Array.isArray(entity)) return Promise.resolve(entity);
    return Promise.resolve({
      id: 'test-uuid',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...(entity as Record<string, unknown>),
    });
  }),
  remove: jest.fn(),
  delete: jest.fn(),
  createQueryBuilder: jest.fn(() => ({ ...mockQueryBuilder })),
});

describe('ChatsService', () => {
  let service: ChatsService;
  let chatRepository: ReturnType<typeof mockRepository>;
  let memberRepository: ReturnType<typeof mockRepository>;
  let messageRepository: ReturnType<typeof mockRepository>;
  let chatMembersService: {
    assertMembership: jest.Mock;
    assertAdminRole: jest.Mock;
    toMemberResponse: jest.Mock;
  };

  const userId = 'user-1';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatsService,
        { provide: getRepositoryToken(ChatEntity), useFactory: mockRepository },
        { provide: getRepositoryToken(ChatMemberEntity), useFactory: mockRepository },
        { provide: getRepositoryToken(MessageEntity), useFactory: mockRepository },
        { provide: getRepositoryToken(MessageDeletionEntity), useFactory: mockRepository },
        {
          provide: ChatMembersService,
          useValue: {
            assertMembership: jest.fn(),
            assertAdminRole: jest.fn(),
            toMemberResponse: jest.fn((member: Record<string, unknown>) => member),
          },
        },
      ],
    }).compile();

    service = module.get<ChatsService>(ChatsService);
    chatRepository = module.get(getRepositoryToken(ChatEntity));
    memberRepository = module.get(getRepositoryToken(ChatMemberEntity));
    messageRepository = module.get(getRepositoryToken(MessageEntity));
    chatMembersService = module.get(ChatMembersService);
  });

  describe('createChat - direct', () => {
    it('should create a direct chat between two users', async () => {
      chatRepository.createQueryBuilder().getOne.mockResolvedValue(null);
      chatRepository.findOne.mockResolvedValue({
        id: 'chat-1',
        type: ChatType.DIRECT,
        members: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.createChat(userId, {
        type: ChatType.DIRECT,
        memberIds: ['user-2'],
      });

      expect(chatRepository.save).toHaveBeenCalled();
      expect(result).toHaveProperty('type', ChatType.DIRECT);
    });

    it('should throw BadRequestException if memberIds length is not 1', async () => {
      await expect(
        service.createChat(userId, { type: ChatType.DIRECT, memberIds: ['u2', 'u3'] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for self-chat', async () => {
      await expect(
        service.createChat(userId, { type: ChatType.DIRECT, memberIds: [userId] }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('createChat - group', () => {
    it('should create group chat with admin role for creator', async () => {
      chatRepository.findOne.mockResolvedValue({
        id: 'chat-1',
        type: ChatType.GROUP,
        name: 'Test Group',
        members: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.createChat(userId, {
        type: ChatType.GROUP,
        memberIds: ['user-2', 'user-3'],
        name: 'Test Group',
      });

      expect(memberRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId, role: MemberRole.ADMIN }),
      );
      expect(result).toHaveProperty('name', 'Test Group');
    });

    it('should throw BadRequestException if group has no name', async () => {
      await expect(
        service.createChat(userId, { type: ChatType.GROUP, memberIds: ['user-2'] }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteChat', () => {
    const chatId = 'chat-1';

    it('should remove member when mode is LEAVE for group chat', async () => {
      chatRepository.findOne.mockResolvedValue({
        id: chatId,
        type: ChatType.GROUP,
        createdBy: 'other-user',
        members: [],
      });
      chatMembersService.assertMembership.mockResolvedValue(undefined);

      await service.deleteChat(chatId, userId, DeleteChatMode.LEAVE);

      expect(memberRepository.delete).toHaveBeenCalledWith({ chatId, userId });
    });

    it('should throw BadRequestException when LEAVE on direct chat', async () => {
      chatRepository.findOne.mockResolvedValue({
        id: chatId,
        type: ChatType.DIRECT,
        createdBy: userId,
        members: [],
      });
      chatMembersService.assertMembership.mockResolvedValue(undefined);

      await expect(service.deleteChat(chatId, userId, DeleteChatMode.LEAVE)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should allow creator to DELETE_FOR_EVERYONE group chat', async () => {
      const chat = {
        id: chatId,
        type: ChatType.GROUP,
        createdBy: userId,
        members: [],
      };
      chatRepository.findOne.mockResolvedValue(chat);
      chatMembersService.assertMembership.mockResolvedValue(undefined);

      await service.deleteChat(chatId, userId, DeleteChatMode.DELETE_FOR_EVERYONE);

      expect(chatRepository.remove).toHaveBeenCalledWith(chat);
    });

    it('should throw ForbiddenException if non-creator deletes group for everyone', async () => {
      chatRepository.findOne.mockResolvedValue({
        id: chatId,
        type: ChatType.GROUP,
        createdBy: 'other-user',
        members: [],
      });
      chatMembersService.assertMembership.mockResolvedValue(undefined);

      await expect(
        service.deleteChat(chatId, userId, DeleteChatMode.DELETE_FOR_EVERYONE),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('clearHistory', () => {
    it('should create deletion entries for all messages in chat', async () => {
      const chatId = 'chat-1';
      chatMembersService.assertMembership.mockResolvedValue(undefined);
      messageRepository.find.mockResolvedValue([{ id: 'msg-1' }, { id: 'msg-2' }]);

      await service.clearHistory(chatId, userId);

      expect(messageRepository.find).toHaveBeenCalledWith({
        where: { chatId },
        select: ['id'],
      });
    });
  });
});
