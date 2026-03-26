import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { GatewayModule } from '../gateway/gateway.module';
import { SignalPrekeyEntity } from '../users/entities/signal-prekey.entity';
import { UserEntity } from '../users/entities/user.entity';

import { KeysController } from './keys.controller';
import { KeysService } from './keys.service';

@Module({
  imports: [TypeOrmModule.forFeature([SignalPrekeyEntity, UserEntity]), GatewayModule],
  controllers: [KeysController],
  providers: [KeysService],
  exports: [KeysService],
})
export class KeysModule {}
