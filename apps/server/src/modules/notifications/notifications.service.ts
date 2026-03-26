import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as firebaseAdmin from 'firebase-admin';
import { In, Not, Repository } from 'typeorm';

import { ChatMemberEntity } from '../chats/entities/chat-member.entity';
import { DeviceEntity } from '../users/entities/device.entity';

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);
  private firebaseApp: firebaseAdmin.app.App | null = null;

  constructor(
    @InjectRepository(DeviceEntity)
    private readonly deviceRepository: Repository<DeviceEntity>,
    @InjectRepository(ChatMemberEntity)
    private readonly chatMemberRepository: Repository<ChatMemberEntity>,
  ) {}

  onModuleInit() {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

    if (
      projectId !== undefined &&
      projectId !== '' &&
      privateKey !== undefined &&
      privateKey !== '' &&
      clientEmail !== undefined &&
      clientEmail !== ''
    ) {
      this.firebaseApp = firebaseAdmin.initializeApp({
        credential: firebaseAdmin.credential.cert({
          projectId,
          privateKey: privateKey.replace(/\\n/g, '\n'),
          clientEmail,
        }),
      });
      this.logger.log('Firebase Admin SDK initialized');
    } else {
      this.logger.warn('Firebase credentials not configured — push notifications disabled');
    }
  }

  async registerPushToken(userId: string, deviceId: string, pushToken: string): Promise<void> {
    await this.deviceRepository.update({ id: deviceId, userId }, { pushToken });
  }

  async sendPushToOfflineMembers(
    chatId: string,
    senderUserId: string,
    senderName: string,
    onlineUserIds: string[],
  ): Promise<void> {
    if (this.firebaseApp === null) {
      return;
    }

    const members = await this.chatMemberRepository.find({
      where: {
        chatId,
        userId: Not(In([senderUserId, ...onlineUserIds])),
        notificationsMuted: false,
      },
      select: ['userId'],
    });

    const offlineUserIds = members.map((member) => member.userId);

    if (offlineUserIds.length === 0) {
      return;
    }

    const devices = await this.deviceRepository.find({
      where: {
        userId: In(offlineUserIds),
      },
    });

    const pushTokens = devices
      .map((device) => device.pushToken)
      .filter((token): token is string => token !== null && token !== '');

    if (pushTokens.length === 0) {
      return;
    }

    try {
      const messaging = this.firebaseApp.messaging();

      await messaging.sendEachForMulticast({
        tokens: pushTokens,
        notification: {
          title: senderName,
          body: 'New message',
        },
        data: {
          chatId,
          senderName,
        },
        android: {
          priority: 'high',
          notification: { channelId: 'messages' },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
              contentAvailable: true,
            },
          },
        },
      });

      this.logger.debug(`Push sent to ${pushTokens.length} devices for chat ${chatId}`);
    } catch (error) {
      this.logger.error(`Failed to send push: ${(error as Error).message}`);
    }
  }
}
