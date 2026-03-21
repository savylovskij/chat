import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

import { JwtPayload } from '../interfaces/jwt-payload.interface';

interface AuthenticatedSocket extends Socket {
  user: Record<'userId' | 'deviceId', string>;
}

@Injectable()
export class WsAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const client = context.switchToWs().getClient<AuthenticatedSocket>();
    const authHeader = client.handshake.headers?.authorization;

    const token: string | undefined =
      (client.handshake.auth as Record<string, string> | undefined)?.token ??
      (typeof authHeader === 'string' ? authHeader.split(' ')[1] : undefined);

    if (token === undefined) {
      throw new WsException('Unauthorized');
    }

    try {
      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: process.env.JWT_ACCESS_SECRET,
      });

      client.user = {
        userId: payload.sub,
        deviceId: payload.deviceId,
      };

      return true;
    } catch {
      throw new WsException('Unauthorized');
    }
  }
}
