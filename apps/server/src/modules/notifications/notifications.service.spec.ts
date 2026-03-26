import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { ChatMemberEntity } from '../chats/entities/chat-member.entity';
import { DeviceEntity } from '../users/entities/device.entity';

import { NotificationsService } from './notifications.service';

const mockRepository = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  update: jest.fn(),
});

describe('NotificationsService', () => {
  let service: NotificationsService;
  let deviceRepository: ReturnType<typeof mockRepository>;
  let chatMemberRepository: ReturnType<typeof mockRepository>;

  beforeEach(async () => {
    delete process.env.FIREBASE_PROJECT_ID;
    delete process.env.FIREBASE_PRIVATE_KEY;
    delete process.env.FIREBASE_CLIENT_EMAIL;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: getRepositoryToken(DeviceEntity), useFactory: mockRepository },
        { provide: getRepositoryToken(ChatMemberEntity), useFactory: mockRepository },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    deviceRepository = module.get(getRepositoryToken(DeviceEntity));
    chatMemberRepository = module.get(getRepositoryToken(ChatMemberEntity));
  });

  describe('registerPushToken', () => {
    it('should update push token for device', async () => {
      await service.registerPushToken('user-1', 'device-1', 'fcm-token-abc');

      expect(deviceRepository.update).toHaveBeenCalledWith(
        { id: 'device-1', userId: 'user-1' },
        { pushToken: 'fcm-token-abc' },
      );
    });
  });

  describe('sendPushToOfflineMembers', () => {
    it('should skip sending when firebase is not configured', async () => {
      service.onModuleInit();

      await service.sendPushToOfflineMembers('chat-1', 'user-1', 'Alice', []);

      expect(chatMemberRepository.find).not.toHaveBeenCalled();
    });

    it('should skip if no offline members', async () => {
      service.onModuleInit();

      chatMemberRepository.find.mockResolvedValue([]);

      await service.sendPushToOfflineMembers('chat-1', 'user-1', 'Alice', []);

      expect(deviceRepository.find).not.toHaveBeenCalled();
    });
  });

  describe('onModuleInit', () => {
    it('should not initialize firebase when credentials are missing', () => {
      service.onModuleInit();

      expect(service['firebaseApp']).toBeNull();
    });
  });
});
