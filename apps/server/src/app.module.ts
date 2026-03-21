import { Module, ValidationPipe } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';

import { AuthModule } from './modules/auth/auth.module';
import { ChatsModule } from './modules/chats/chats.module';
import { DbModule } from './modules/db/db.module';
import { GatewayModule } from './modules/gateway/gateway.module';
import { HealthModule } from './modules/health/health.module';
import { KeysModule } from './modules/keys/keys.module';
import { MediaModule } from './modules/media/media.module';
import { MessagesModule } from './modules/messages/messages.module';
import { RedisModule } from './modules/redis/redis.module';
import { AppThrottlerModule } from './modules/throttler/throttler.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    DbModule,
    AppThrottlerModule,
    RedisModule,
    HealthModule,
    AuthModule,
    UsersModule,
    ChatsModule,
    MessagesModule,
    MediaModule,
    KeysModule,
    GatewayModule,
  ],
  providers: [
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    },
  ],
})
export class AppModule {}
