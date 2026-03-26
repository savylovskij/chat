import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DeleteMessageMode, MessageType, MessageWeight } from '@shared/core';

import { ChatMemberEntity } from '../chats/entities/chat-member.entity';
import { ChatEntity } from '../chats/entities/chat.entity';
import { MessageDeletionEntity } from '../messages/entities/message-deletion.entity';
import { MessageReactionEntity } from '../messages/entities/message-reaction.entity';
import { MessageEntity } from '../messages/entities/message.entity';
import { UserEntity } from '../users/entities/user.entity';

import { GatewayService } from './gateway.service';

const mockRepository = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn((data: unknown) => data),
  save: jest.fn((entity: unknown) =>
    Promise.resolve({
      ...(entity as object),
      id: 'msg-1',
      createdAt: new Date(),
      isEdited: false,
      editedAt: null,
      deletedAt: null,
    }),
  ),
  update: jest.fn(),
  remove: jest.fn(),
  createQueryBuilder: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue([]),
  })),
});

describe('GatewayService', () => {
  let service: GatewayService;
  let messageRepository: ReturnType<typeof mockRepository>;
  let memberRepository: ReturnType<typeof mockRepository>;
  let chatRepository: ReturnType<typeof mockRepository>;
  let reactionRepository: ReturnType<typeof mockRepository>;
  let messageDeletionRepository: ReturnType<typeof mockRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GatewayService,
        { provide: JwtService, useValue: { verify: jest.fn() } },
        { provide: getRepositoryToken(UserEntity), useFactory: mockRepository },
        { provide: getRepositoryToken(ChatEntity), useFactory: mockRepository },
        { provide: getRepositoryToken(ChatMemberEntity), useFactory: mockRepository },
        { provide: getRepositoryToken(MessageEntity), useFactory: mockRepository },
        { provide: getRepositoryToken(MessageDeletionEntity), useFactory: mockRepository },
        { provide: getRepositoryToken(MessageReactionEntity), useFactory: mockRepository },
      ],
    }).compile();

    service = module.get<GatewayService>(GatewayService);
    messageRepository = module.get(getRepositoryToken(MessageEntity));
    memberRepository = module.get(getRepositoryToken(ChatMemberEntity));
    chatRepository = module.get(getRepositoryToken(ChatEntity));
    reactionRepository = module.get(getRepositoryToken(MessageReactionEntity));
    messageDeletionRepository = module.get(getRepositoryToken(MessageDeletionEntity));
  });

  describe('createMessage', () => {
    beforeEach(() => {
      memberRepository.findOne.mockResolvedValue({ chatId: 'chat-1', userId: 'user-1' });
    });

    it('should create a message with default weight and null timer', async () => {
      const result = await service.createMessage('user-1', {
        chatId: 'chat-1',
        type: MessageType.TEXT,
        encryptedContent: 'hello',
        clientMessageId: 'client-1',
      });

      expect(messageRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          weight: 'normal',
          timer: null,
        }),
      );
      expect(result.weight).toBe('normal');
      expect(result.timer).toBeNull();
    });

    it('should create a message with specified weight', async () => {
      const result = await service.createMessage('user-1', {
        chatId: 'chat-1',
        type: MessageType.TEXT,
        encryptedContent: 'urgent!',
        clientMessageId: 'client-2',
        weight: MessageWeight.URGENT,
      });

      expect(messageRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          weight: 'urgent',
        }),
      );
      expect(result.weight).toBe('urgent');
    });

    it('should create a message with timer', async () => {
      const result = await service.createMessage('user-1', {
        chatId: 'chat-1',
        type: MessageType.TEXT,
        encryptedContent: 'disappearing',
        clientMessageId: 'client-3',
        timer: 30,
      });

      expect(messageRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          timer: 30,
        }),
      );
      expect(result.timer).toBe(30);
    });

    it('should create a whisper message', async () => {
      const result = await service.createMessage('user-1', {
        chatId: 'chat-1',
        type: MessageType.TEXT,
        encryptedContent: 'psst',
        clientMessageId: 'client-4',
        weight: MessageWeight.WHISPER,
      });

      expect(messageRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          weight: 'whisper',
        }),
      );
      expect(result.weight).toBe('whisper');
    });

    it('should throw if user is not a member of the chat', async () => {
      memberRepository.findOne.mockResolvedValue(null);

      await expect(
        service.createMessage('user-1', {
          chatId: 'chat-1',
          type: MessageType.TEXT,
          encryptedContent: 'hello',
          clientMessageId: 'client-5',
        }),
      ).rejects.toThrow('You are not a member of this chat');
    });

    it('should update chat lastMessageId and lastMessageAt', async () => {
      await service.createMessage('user-1', {
        chatId: 'chat-1',
        type: MessageType.TEXT,
        encryptedContent: 'hello',
        clientMessageId: 'client-6',
      });

      expect(chatRepository.update).toHaveBeenCalledWith(
        'chat-1',
        expect.objectContaining({
          lastMessageId: 'msg-1',
        }),
      );
    });

    it('should return complete message response with all fields', async () => {
      const result = await service.createMessage('user-1', {
        chatId: 'chat-1',
        type: MessageType.TEXT,
        encryptedContent: 'hello',
        clientMessageId: 'client-7',
        weight: MessageWeight.IMPORTANT,
        timer: 60,
      });

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('chatId');
      expect(result).toHaveProperty('senderId');
      expect(result).toHaveProperty('type');
      expect(result).toHaveProperty('weight');
      expect(result).toHaveProperty('encryptedContent');
      expect(result).toHaveProperty('timer');
      expect(result).toHaveProperty('isEdited');
      expect(result).toHaveProperty('editedAt');
      expect(result).toHaveProperty('deletedAt');
      expect(result).toHaveProperty('clientMessageId');
      expect(result).toHaveProperty('createdAt');
    });
  });

  describe('deleteMessage', () => {
    const recentMessage = {
      id: 'msg-1',
      chatId: 'chat-1',
      senderId: 'user-1',
      createdAt: new Date(),
      deletedAt: null,
    };

    beforeEach(() => {
      memberRepository.findOne.mockResolvedValue({ chatId: 'chat-1', userId: 'user-1' });
    });

    it('should create deletion record for forMe mode', async () => {
      messageRepository.findOne.mockResolvedValue(recentMessage);

      await service.deleteMessage('user-1', {
        messageId: 'msg-1',
        mode: DeleteMessageMode.FOR_ME,
      });

      expect(messageDeletionRepository.create).toHaveBeenCalledWith({
        messageId: 'msg-1',
        userId: 'user-1',
      });
      expect(messageDeletionRepository.save).toHaveBeenCalled();
    });

    it('should soft delete for forEveryone mode', async () => {
      messageRepository.findOne.mockResolvedValue(recentMessage);

      await service.deleteMessage('user-1', {
        messageId: 'msg-1',
        mode: DeleteMessageMode.FOR_EVERYONE,
      });

      expect(messageRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ deletedAt: expect.any(Date) as Date }),
      );
    });

    it('should throw if non-author tries forEveryone', async () => {
      messageRepository.findOne.mockResolvedValue(recentMessage);

      await expect(
        service.deleteMessage('user-2', {
          messageId: 'msg-1',
          mode: DeleteMessageMode.FOR_EVERYONE,
        }),
      ).rejects.toThrow('Only the author can delete a message for everyone');
    });

    it('should throw if message is older than 48 hours for forEveryone', async () => {
      const oldMessage = {
        ...recentMessage,
        createdAt: new Date(Date.now() - 49 * 60 * 60 * 1000),
      };
      messageRepository.findOne.mockResolvedValue(oldMessage);

      await expect(
        service.deleteMessage('user-1', {
          messageId: 'msg-1',
          mode: DeleteMessageMode.FOR_EVERYONE,
        }),
      ).rejects.toThrow('Cannot delete message for everyone after 48 hours');
    });

    it('should throw if message not found', async () => {
      messageRepository.findOne.mockResolvedValue(null);

      await expect(
        service.deleteMessage('user-1', {
          messageId: 'nonexistent',
          mode: DeleteMessageMode.FOR_ME,
        }),
      ).rejects.toThrow('Message not found');
    });
  });

  describe('addReaction', () => {
    beforeEach(() => {
      memberRepository.findOne.mockResolvedValue({ chatId: 'chat-1', userId: 'user-1' });
    });

    it('should add a reaction to a message', async () => {
      messageRepository.findOne.mockResolvedValue({
        id: 'msg-1',
        chatId: 'chat-1',
        deletedAt: null,
      });
      reactionRepository.findOne.mockResolvedValue(null);

      const result = await service.addReaction('user-1', {
        messageId: 'msg-1',
        emoji: '👍',
      });

      expect(reactionRepository.create).toHaveBeenCalledWith({
        messageId: 'msg-1',
        userId: 'user-1',
        emoji: '👍',
      });
      expect(result).toEqual({ chatId: 'chat-1' });
    });

    it('should throw if reaction already exists', async () => {
      messageRepository.findOne.mockResolvedValue({
        id: 'msg-1',
        chatId: 'chat-1',
        deletedAt: null,
      });
      reactionRepository.findOne.mockResolvedValue({ id: 'reaction-1' });

      await expect(
        service.addReaction('user-1', { messageId: 'msg-1', emoji: '👍' }),
      ).rejects.toThrow('Reaction already exists');
    });

    it('should throw if message is deleted', async () => {
      messageRepository.findOne.mockResolvedValue({
        id: 'msg-1',
        chatId: 'chat-1',
        deletedAt: new Date(),
      });

      await expect(
        service.addReaction('user-1', { messageId: 'msg-1', emoji: '👍' }),
      ).rejects.toThrow('Message not found');
    });
  });

  describe('removeReaction', () => {
    beforeEach(() => {
      memberRepository.findOne.mockResolvedValue({ chatId: 'chat-1', userId: 'user-1' });
    });

    it('should remove a reaction', async () => {
      messageRepository.findOne.mockResolvedValue({ id: 'msg-1', chatId: 'chat-1' });
      reactionRepository.findOne.mockResolvedValue({ id: 'reaction-1' });

      const result = await service.removeReaction('user-1', {
        messageId: 'msg-1',
        emoji: '👍',
      });

      expect(reactionRepository.remove).toHaveBeenCalled();
      expect(result).toEqual({ chatId: 'chat-1' });
    });

    it('should throw if reaction not found', async () => {
      messageRepository.findOne.mockResolvedValue({ id: 'msg-1', chatId: 'chat-1' });
      reactionRepository.findOne.mockResolvedValue(null);

      await expect(
        service.removeReaction('user-1', { messageId: 'msg-1', emoji: '👍' }),
      ).rejects.toThrow('Reaction not found');
    });
  });

  describe('markAsRead', () => {
    it('should update lastReadMessageId on member', async () => {
      const member = { chatId: 'chat-1', userId: 'user-1', lastReadMessageId: null };
      memberRepository.findOne.mockResolvedValue(member);

      await service.markAsRead('user-1', 'chat-1', 'msg-5');

      expect(memberRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ lastReadMessageId: 'msg-5' }),
      );
    });

    it('should throw if user is not a member', async () => {
      memberRepository.findOne.mockResolvedValue(null);

      await expect(service.markAsRead('user-1', 'chat-1', 'msg-5')).rejects.toThrow(
        'You are not a member of this chat',
      );
    });
  });

  describe('getUserChatIds', () => {
    it('should return chat IDs for user', async () => {
      memberRepository.find.mockResolvedValue([{ chatId: 'chat-1' }, { chatId: 'chat-2' }]);

      const result = await service.getUserChatIds('user-1');

      expect(result).toEqual(['chat-1', 'chat-2']);
    });

    it('should return empty array if user has no chats', async () => {
      memberRepository.find.mockResolvedValue([]);

      const result = await service.getUserChatIds('user-1');

      expect(result).toEqual([]);
    });
  });
});
