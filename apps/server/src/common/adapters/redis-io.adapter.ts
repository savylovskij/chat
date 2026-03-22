import { INestApplicationContext } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { Server, ServerOptions } from 'socket.io';

export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor!: ReturnType<typeof createAdapter>;

  constructor(app: INestApplicationContext) {
    super(app);
  }

  connectToRedis(): void {
    const redisOptions = {
      host: process.env.REDIS_HOST ?? 'localhost',
      port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
      password:
        process.env.REDIS_PASSWORD !== undefined && process.env.REDIS_PASSWORD !== ''
          ? process.env.REDIS_PASSWORD
          : undefined,
    };

    const pubClient = new Redis(redisOptions);
    const subClient = pubClient.duplicate();

    this.adapterConstructor = createAdapter(pubClient, subClient);
  }

  createIOServer(port: number, options?: Partial<ServerOptions>): Server {
    const server: Server = super.createIOServer(port, {
      ...options,
      cors: {
        origin: (process.env.CORS_ORIGINS ?? 'http://localhost:8081').split(','),
        credentials: true,
      },
      transports: ['websocket'],
    }) as Server;

    server.adapter(this.adapterConstructor);

    return server;
  }
}
