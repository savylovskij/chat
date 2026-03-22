import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

import { BlockedUsersService } from './blocked-users.service';

@ApiTags('Blocking')
@Controller('users')
@UseGuards(JwtAuthGuard)
export class BlockedUsersController {
  constructor(private readonly blockedUsersService: BlockedUsersService) {}

  @Post(':userId/block')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Block a user' })
  async blockUser(
    @CurrentUser() user: { userId: string },
    @Param('userId', ParseUUIDPipe) targetUserId: string,
  ) {
    await this.blockedUsersService.blockUser(user.userId, targetUserId);
  }

  @Delete(':userId/block')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unblock a user' })
  async unblockUser(
    @CurrentUser() user: { userId: string },
    @Param('userId', ParseUUIDPipe) targetUserId: string,
  ) {
    await this.blockedUsersService.unblockUser(user.userId, targetUserId);
  }

  @Get('blocked')
  @ApiOperation({ summary: 'Get list of blocked users' })
  async getBlockedUsers(@CurrentUser() user: { userId: string }) {
    const users = await this.blockedUsersService.getBlockedUsers(user.userId);
    return { data: users };
  }
}
