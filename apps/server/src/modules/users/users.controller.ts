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
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RegisterPushTokenDto } from '../notifications/dto/register-push-token.dto';
import { NotificationsService } from '../notifications/notifications.service';

import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  async getMe(@CurrentUser() user: { userId: string }) {
    const result = await this.usersService.getMe(user.userId);
    return { data: result };
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  async updateMe(@CurrentUser() user: { userId: string }, @Body() dto: UpdateUserDto) {
    const result = await this.usersService.updateMe(user.userId, dto);
    return { data: result };
  }

  @Get('search')
  @ApiOperation({ summary: 'Search users by display name' })
  async search(@Query('query') query: string, @Query('limit') limit?: number) {
    const users = await this.usersService.search(query, limit !== undefined ? Number(limit) : 20);
    return { data: users };
  }

  @Get('me/devices')
  @ApiOperation({ summary: 'Get current user devices' })
  async getDevices(@CurrentUser() user: { userId: string }) {
    const devices = await this.usersService.getDevices(user.userId);
    return { data: devices };
  }

  @Patch('me/push-token')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Register push notification token for current device' })
  async registerPushToken(
    @CurrentUser() user: { userId: string; deviceId: string },
    @Body() dto: RegisterPushTokenDto,
  ) {
    await this.notificationsService.registerPushToken(user.userId, user.deviceId, dto.pushToken);
  }

  @Delete('me/devices/:deviceId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a device' })
  async deleteDevice(
    @CurrentUser() user: { userId: string },
    @Param('deviceId', ParseUUIDPipe) deviceId: string,
  ) {
    await this.usersService.deleteDevice(user.userId, deviceId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  async getById(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.usersService.getById(id);
    return { data: result };
  }
}
