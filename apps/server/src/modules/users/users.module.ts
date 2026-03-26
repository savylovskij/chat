import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { NotificationsModule } from '../notifications/notifications.module';

import { BlockedUsersController } from './blocked-users.controller';
import { BlockedUsersService } from './blocked-users.service';
import { BlockedUserEntity } from './entities/blocked-user.entity';
import { DeviceEntity } from './entities/device.entity';
import { SignalPrekeyEntity } from './entities/signal-prekey.entity';
import { UserEntity } from './entities/user.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, DeviceEntity, BlockedUserEntity, SignalPrekeyEntity]),
    NotificationsModule,
  ],
  controllers: [BlockedUsersController, UsersController],
  providers: [UsersService, BlockedUsersService],
  exports: [UsersService, BlockedUsersService],
})
export class UsersModule {}
