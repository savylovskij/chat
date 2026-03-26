import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { BulkDeleteMessagesDto, DeleteMessageDto } from '@shared/core';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

import { MessagesService } from './messages.service';
import { ReactionsService } from './reactions.service';

@ApiTags('Messages')
@Controller('chats/:chatId/messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(
    private readonly messagesService: MessagesService,
    private readonly reactionsService: ReactionsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get messages with cursor-based pagination' })
  async getMessages(
    @CurrentUser() user: { userId: string },
    @Param('chatId', ParseUUIDPipe) chatId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('direction') direction?: 'before' | 'after',
  ) {
    const result = await this.messagesService.getMessages(
      chatId,
      user.userId,
      cursor,
      limit !== undefined ? Number(limit) : 50,
      direction ?? 'before',
    );
    return {
      data: result.messages,
      meta: result.meta,
    };
  }

  @Get('media')
  @ApiOperation({ summary: 'Get shared media for a chat' })
  async getMedia(
    @CurrentUser() user: { userId: string },
    @Param('chatId', ParseUUIDPipe) chatId: string,
    @Query('type') type?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.messagesService.getMedia(
      chatId,
      user.userId,
      type,
      cursor,
      limit !== undefined ? Number(limit) : 50,
    );
    return {
      data: result.messages,
      meta: result.meta,
    };
  }

  @Get(':messageId')
  @ApiOperation({ summary: 'Get message by ID' })
  async getMessageById(
    @CurrentUser() user: { userId: string },
    @Param('chatId', ParseUUIDPipe) chatId: string,
    @Param('messageId', ParseUUIDPipe) messageId: string,
  ) {
    const message = await this.messagesService.getMessageById(chatId, messageId, user.userId);

    return {
      data: message,
    };
  }

  @Delete(':messageId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete message (forMe or forEveryone)' })
  async deleteMessage(
    @CurrentUser() user: { userId: string },
    @Param('chatId', ParseUUIDPipe) chatId: string,
    @Param('messageId', ParseUUIDPipe) messageId: string,
    @Body() dto: DeleteMessageDto,
  ) {
    await this.messagesService.deleteMessage(chatId, messageId, user.userId, dto.mode);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Bulk delete messages for self' })
  async bulkDeleteMessages(
    @CurrentUser() user: { userId: string },
    @Param('chatId', ParseUUIDPipe) chatId: string,
    @Body() dto: BulkDeleteMessagesDto,
  ) {
    await this.messagesService.bulkDeleteMessages(chatId, user.userId, dto.messageIds);
  }

  @Get(':messageId/reactions')
  @ApiOperation({ summary: 'Get reactions for a message' })
  async getReactions(
    @CurrentUser() user: { userId: string },
    @Param('chatId', ParseUUIDPipe) chatId: string,
    @Param('messageId', ParseUUIDPipe) messageId: string,
  ) {
    const reactions = await this.reactionsService.getReactions(chatId, messageId, user.userId);
    return { data: reactions };
  }
}
