import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ChatMemberEntity } from '../chats/entities/chat-member.entity';
import { ChatEntity } from '../chats/entities/chat.entity';
import { MessageDeletionEntity } from '../messages/entities/message-deletion.entity';
import { MessageReactionEntity } from '../messages/entities/message-reaction.entity';
import { MessageEntity } from '../messages/entities/message.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { UserEntity } from '../users/entities/user.entity';

import { ChatGateway } from './chat.gateway';
import { GatewaySessionService } from './gateway-session.service';
import { GatewayService } from './gateway.service';

@Module({
  imports: [
    JwtModule.register({}),
    NotificationsModule,
    TypeOrmModule.forFeature([
      UserEntity,
      ChatEntity,
      ChatMemberEntity,
      MessageEntity,
      MessageDeletionEntity,
      MessageReactionEntity,
    ]),
  ],
  providers: [ChatGateway, GatewayService, GatewaySessionService],
  exports: [ChatGateway, GatewaySessionService],
})
export class GatewayModule {}
