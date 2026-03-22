import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ChatMemberEntity } from '../chats/entities/chat-member.entity';

import { MessageDeletionEntity } from './entities/message-deletion.entity';
import { MessageReactionEntity } from './entities/message-reaction.entity';
import { MessageEntity } from './entities/message.entity';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { ReactionsController } from './reactions.controller';
import { ReactionsService } from './reactions.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MessageEntity,
      MessageDeletionEntity,
      MessageReactionEntity,
      ChatMemberEntity,
    ]),
  ],
  controllers: [MessagesController, ReactionsController],
  providers: [MessagesService, ReactionsService],
  exports: [MessagesService, ReactionsService],
})
export class MessagesModule {}
