import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateChatDto, DeleteChatDto, MuteChatDto, UpdateChatDto } from '@shared/core';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

import { ChatMembersService } from './chat-members.service';
import { ChatsService } from './chats.service';

@ApiTags('Chats')
@Controller('chats')
@UseGuards(JwtAuthGuard)
export class ChatsController {
  constructor(
    private readonly chatsService: ChatsService,
    private readonly chatMembersService: ChatMembersService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new chat' })
  async createChat(@CurrentUser() user: { userId: string }, @Body() dto: CreateChatDto) {
    const chat = await this.chatsService.createChat(user.userId, dto);

    return {
      data: chat,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get chat list' })
  async getChatList(
    @CurrentUser() user: { userId: string },
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.chatsService.getChatList(
      user.userId,
      cursor,
      limit !== undefined ? Number(limit) : 20,
    );

    return {
      data: result.chats,
      meta: result.meta,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get chat by ID' })
  async getChatById(
    @CurrentUser() user: { userId: string },
    @Param('id', ParseUUIDPipe) chatId: string,
  ) {
    const chat = await this.chatsService.getChatById(chatId, user.userId);

    return {
      data: chat,
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update chat (group only, admin)' })
  async updateChat(
    @CurrentUser() user: { userId: string },
    @Param('id', ParseUUIDPipe) chatId: string,
    @Body() dto: UpdateChatDto,
  ) {
    const chat = await this.chatsService.updateChat(chatId, user.userId, dto);

    return {
      data: chat,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete/leave chat' })
  async deleteChat(
    @CurrentUser() user: { userId: string },
    @Param('id', ParseUUIDPipe) chatId: string,
    @Body() dto: DeleteChatDto,
  ) {
    await this.chatsService.deleteChat(chatId, user.userId, dto.mode);
  }

  @Post(':id/mute')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Mute/unmute chat notifications' })
  async muteChat(
    @CurrentUser() user: { userId: string },
    @Param('id', ParseUUIDPipe) chatId: string,
    @Body() dto: MuteChatDto,
  ) {
    await this.chatMembersService.muteChat(chatId, user.userId, dto.muted);
  }

  @Post(':id/clear')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Clear chat history for self' })
  async clearHistory(
    @CurrentUser() user: { userId: string },
    @Param('id', ParseUUIDPipe) chatId: string,
  ) {
    await this.chatsService.clearHistory(chatId, user.userId);
  }
}
