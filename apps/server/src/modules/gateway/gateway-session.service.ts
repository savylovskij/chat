import { Injectable } from '@nestjs/common';
import { Socket } from 'socket.io';

@Injectable()
export class GatewaySessionService {
  private readonly sessions = new Map<string, Map<string, Socket>>();

  addSocket(userId: string, deviceId: string, socket: Socket): void {
    if (!this.sessions.has(userId)) {
      this.sessions.set(userId, new Map());
    }

    this.sessions.get(userId)!.set(deviceId, socket);
  }

  removeSocket(userId: string, deviceId: string): void {
    const userSockets = this.sessions.get(userId);

    if (!userSockets) {
      return;
    }

    userSockets.delete(deviceId);

    if (userSockets.size === 0) {
      this.sessions.delete(userId);
    }
  }

  getUserSockets(userId: string): Map<string, Socket> | undefined {
    return this.sessions.get(userId);
  }

  isUserOnline(userId: string): boolean {
    const userSockets = this.sessions.get(userId);

    return userSockets !== undefined && userSockets.size > 0;
  }

  getSocketCount(userId: string): number {
    return this.sessions.get(userId)?.size ?? 0;
  }
}
