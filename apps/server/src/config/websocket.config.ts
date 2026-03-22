import { INestApplication } from '@nestjs/common';

import { RedisIoAdapter } from '../common/adapters/redis-io.adapter';

export function setupWebSocket(app: INestApplication): void {
  const redisIoAdapter = new RedisIoAdapter(app);
  redisIoAdapter.connectToRedis();

  app.useWebSocketAdapter(redisIoAdapter);
}
