import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ChatMemberEntity } from '../chats/entities/chat-member.entity';
import { DeviceEntity } from '../users/entities/device.entity';

import { NotificationsService } from './notifications.service';

@Module({
  imports: [TypeOrmModule.forFeature([DeviceEntity, ChatMemberEntity])],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
