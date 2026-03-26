import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReplenishPreKeysDto, UploadKeysDto, WsEvents } from '@shared/core';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ChatGateway } from '../gateway/chat.gateway';

import { KeysService } from './keys.service';

@ApiTags('Keys')
@Controller('keys')
@UseGuards(JwtAuthGuard)
export class KeysController {
  constructor(
    private readonly keysService: KeysService,
    private readonly chatGateway: ChatGateway,
  ) {}

  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Upload identity key, signed pre-key, and one-time pre-keys' })
  async uploadKeys(
    @CurrentUser() user: Record<'userId' | 'deviceId', string>,
    @Body() dto: UploadKeysDto,
  ) {
    await this.keysService.uploadKeys(
      user.userId,
      user.deviceId,
      dto.identitiesKey,
      dto.signedPreKey,
      dto.preKeys,
    );
  }

  @Post('replenish')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Upload additional one-time pre-keys' })
  async replenishPreKeys(
    @CurrentUser() user: Record<'userId' | 'deviceId', string>,
    @Body() dto: ReplenishPreKeysDto,
  ) {
    await this.keysService.replenishPreKeys(user.userId, user.deviceId, dto.preKeys);
  }

  @Get('status')
  @ApiOperation({ summary: 'Get count of available one-time pre-keys' })
  async getKeyStatus(@CurrentUser() user: Record<'userId' | 'deviceId', string>) {
    const result = await this.keysService.getKeyStatus(user.userId, user.deviceId);
    return {
      data: result,
    };
  }

  @Get(':userId')
  @ApiOperation({ summary: 'Get keys for a user (for establishing E2EE session)' })
  async getKeys(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query('deviceId') deviceId?: string,
  ) {
    const result = await this.keysService.getKeysForUser(userId, deviceId);

    const status = await this.keysService.checkAndNotifyLowPreKeys(userId, deviceId);
    if (status.needsReplenishment) {
      this.chatGateway.emitToUser(userId, WsEvents.KEYS_LOW, {
        availablePreKeys: status.availablePreKeys,
      });
    }

    return {
      data: result,
    };
  }
}
