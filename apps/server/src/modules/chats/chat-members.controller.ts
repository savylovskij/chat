import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AddMembersDto, UpdateMemberRoleDto } from '@shared/core';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

import { ChatMembersService } from './chat-members.service';

@ApiTags('Chat Members')
@Controller('chats/:chatId/members')
@UseGuards(JwtAuthGuard)
export class ChatMembersController {
  constructor(private readonly chatMembersService: ChatMembersService) {}

  @Post()
  @ApiOperation({ summary: 'Add members to group chat' })
  async addMembers(
    @CurrentUser() user: { userId: string },
    @Param('chatId', ParseUUIDPipe) chatId: string,
    @Body() dto: AddMembersDto,
  ) {
    const members = await this.chatMembersService.addMembers(chatId, user.userId, dto.userIds);

    return {
      data: members,
    };
  }

  @Delete(':userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove member or leave chat' })
  async removeMember(
    @CurrentUser() user: { userId: string },
    @Param('chatId', ParseUUIDPipe) chatId: string,
    @Param('userId', ParseUUIDPipe) targetUserId: string,
  ) {
    await this.chatMembersService.removeMember(chatId, user.userId, targetUserId);
  }

  @Patch(':userId/role')
  @ApiOperation({ summary: 'Update member role' })
  async updateMemberRole(
    @CurrentUser() user: { userId: string },
    @Param('chatId', ParseUUIDPipe) chatId: string,
    @Param('userId', ParseUUIDPipe) targetUserId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    const member = await this.chatMembersService.updateMemberRole(
      chatId,
      user.userId,
      targetUserId,
      dto.role,
    );

    return {
      data: member,
    };
  }
}
