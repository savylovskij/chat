import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MessageDeletionEntity } from '../messages/entities/message-deletion.entity';
import { MessageEntity } from '../messages/entities/message.entity';

import { ChatMembersController } from './chat-members.controller';
import { ChatMembersService } from './chat-members.service';
import { ChatsController } from './chats.controller';
import { ChatsService } from './chats.service';
import { ChatMemberEntity } from './entities/chat-member.entity';
import { ChatEntity } from './entities/chat.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChatEntity, MessageEntity, ChatMemberEntity, MessageDeletionEntity]),
  ],
  controllers: [ChatsController, ChatMembersController],
  providers: [ChatsService, ChatMembersService],
  exports: [ChatsService, ChatMembersService],
})
export class ChatsModule {}
