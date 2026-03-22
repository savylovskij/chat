import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AddReactionDto } from '@shared/core';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

import { ReactionsService } from './reactions.service';

@ApiTags('Reactions')
@Controller('chats/:chatId/messages/:messageId/reactions')
@UseGuards(JwtAuthGuard)
export class ReactionsController {
  constructor(private readonly reactionsService: ReactionsService) {}

  @Post()
  @ApiOperation({ summary: 'Add reaction to message' })
  async addReaction(
    @CurrentUser() user: { userId: string },
    @Param('chatId', ParseUUIDPipe) chatId: string,
    @Param('messageId', ParseUUIDPipe) messageId: string,
    @Body() dto: AddReactionDto,
  ) {
    const reaction = await this.reactionsService.addReaction(
      chatId,
      messageId,
      user.userId,
      dto.emoji,
    );
    return { data: reaction };
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove reaction from message' })
  async removeReaction(
    @CurrentUser() user: { userId: string },
    @Param('chatId', ParseUUIDPipe) chatId: string,
    @Param('messageId', ParseUUIDPipe) messageId: string,
    @Query('emoji') emoji: string,
  ) {
    await this.reactionsService.removeReaction(chatId, messageId, user.userId, emoji);
  }
}
