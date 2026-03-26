import { Logger, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import {
  DeleteMessageMode,
  EditMessageDto,
  SendMessageDto,
  WsDeleteMessageDto,
  WsEvents,
  WsReactionDto,
  WsReadMessageDto,
  WsTypingDto,
} from '@shared/core';
import { Server, Socket } from 'socket.io';

import { WsAuthGuard } from '../../common/guards/ws-auth.guard';
import { NotificationsService } from '../notifications/notifications.service';

import { GatewaySessionService } from './gateway-session.service';
import { GatewayService } from './gateway.service';

interface AuthenticatedSocket extends Socket {
  user: Record<'userId' | 'deviceId', string>;
}

const TYPING_TIMEOUT_MS = 5000;
const PRESENCE_TIMEOUT_MS = 45000;

@WebSocketGateway({ namespace: '/chat' })
@UseGuards(WsAuthGuard)
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private readonly typingTimers = new Map<string, NodeJS.Timeout>();
  private readonly presenceTimers = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly sessionService: GatewaySessionService,
    private readonly gatewayService: GatewayService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const user = this.gatewayService.authenticateSocket(client);

      if (!user) {
        client.disconnect();

        return;
      }

      client.user = user;
      const { userId, deviceId } = user;

      this.sessionService.addSocket(userId, deviceId, client);

      await client.join(`user:${userId}`);

      const chatIds = await this.gatewayService.getUserChatIds(userId);

      for (const chatId of chatIds) {
        await client.join(`chat:${chatId}`);
      }

      await this.gatewayService.setUserOnline(userId);
      this.resetPresenceTimer(userId);

      const contactIds = await this.gatewayService.getUserContactIds(userId);

      for (const contactId of contactIds) {
        this.server.to(`user:${contactId}`).emit(WsEvents.USER_ONLINE, {
          userId,
          isOnline: true,
        });
      }

      this.logger.log(`Client connected: ${userId} (device: ${deviceId})`);
    } catch (error) {
      this.logger.error(`Connection error: ${(error as Error).message}`);
      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    if (client.user === undefined) {
      return;
    }

    const { userId, deviceId } = client.user;

    this.sessionService.removeSocket(userId, deviceId);
    this.clearPresenceTimer(userId);

    if (!this.sessionService.isUserOnline(userId)) {
      const lastSeenAt = await this.gatewayService.setUserOffline(userId);

      const contactIds = await this.gatewayService.getUserContactIds(userId);

      for (const contactId of contactIds) {
        this.server.to(`user:${contactId}`).emit(WsEvents.USER_ONLINE, {
          userId,
          isOnline: false,
          lastSeenAt: lastSeenAt.toISOString(),
        });
      }
    }

    this.logger.log(`Client disconnected: ${userId} (device: ${deviceId})`);
  }

  @SubscribeMessage(WsEvents.MESSAGE_SEND)
  async handleMessageSend(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: SendMessageDto,
  ) {
    const { userId } = client.user;

    try {
      const message = await this.gatewayService.createMessage(userId, payload);

      this.server.to(`chat:${payload.chatId}`).emit(WsEvents.MESSAGE_NEW, {
        message,
        chatId: payload.chatId,
      });

      this.clearTypingTimer(`${payload.chatId}:${userId}`);

      const onlineUserIds = this.sessionService.getOnlineUserIds();
      const senderName = await this.gatewayService.getUserDisplayName(userId);

      void this.notificationsService.sendPushToOfflineMembers(
        payload.chatId,
        userId,
        senderName,
        onlineUserIds,
      );

      return { data: message };
    } catch (error) {
      return { error: { code: 'MESSAGE_SEND_ERROR', message: (error as Error).message } };
    }
  }

  @SubscribeMessage(WsEvents.MESSAGE_EDIT)
  async handleMessageEdit(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: EditMessageDto,
  ) {
    const { userId } = client.user;

    try {
      const result = await this.gatewayService.editMessage(userId, payload);

      this.server.to(`chat:${result.chatId}`).emit(WsEvents.MESSAGE_EDITED, {
        messageId: payload.messageId,
        chatId: result.chatId,
        encryptedContent: payload.encryptedContent,
        editedAt: result.editedAt,
      });

      return { data: result };
    } catch (error) {
      return { error: { code: 'MESSAGE_EDIT_ERROR', message: (error as Error).message } };
    }
  }

  @SubscribeMessage(WsEvents.MESSAGE_DELETE)
  async handleMessageDelete(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: WsDeleteMessageDto,
  ) {
    const { userId } = client.user;

    try {
      const result = await this.gatewayService.deleteMessage(userId, payload);

      if (payload.mode === DeleteMessageMode.FOR_EVERYONE) {
        this.server.to(`chat:${result.chatId}`).emit(WsEvents.MESSAGE_DELETED, {
          messageId: payload.messageId,
          chatId: result.chatId,
          mode: payload.mode,
        });
      } else {
        client.emit(WsEvents.MESSAGE_DELETED, {
          messageId: payload.messageId,
          chatId: result.chatId,
          mode: payload.mode,
        });
      }

      return { data: { success: true } };
    } catch (error) {
      return { error: { code: 'MESSAGE_DELETE_ERROR', message: (error as Error).message } };
    }
  }

  @SubscribeMessage(WsEvents.MESSAGE_READ)
  async handleMessageRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: WsReadMessageDto,
  ) {
    const { userId } = client.user;

    try {
      await this.gatewayService.markAsRead(userId, payload.chatId, payload.messageId);

      this.server.to(`chat:${payload.chatId}`).emit(WsEvents.MESSAGE_READ_ACK, {
        chatId: payload.chatId,
        userId,
        messageId: payload.messageId,
      });

      return { data: { success: true } };
    } catch (error) {
      return { error: { code: 'MESSAGE_READ_ERROR', message: (error as Error).message } };
    }
  }

  @SubscribeMessage(WsEvents.REACTION_ADD)
  async handleReactionAdd(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: WsReactionDto,
  ) {
    const { userId } = client.user;

    try {
      const result = await this.gatewayService.addReaction(userId, payload);

      this.server.to(`chat:${result.chatId}`).emit(WsEvents.REACTION_ADDED, {
        messageId: payload.messageId,
        chatId: result.chatId,
        userId,
        emoji: payload.emoji,
      });

      return { data: { success: true } };
    } catch (error) {
      return { error: { code: 'REACTION_ADD_ERROR', message: (error as Error).message } };
    }
  }

  @SubscribeMessage(WsEvents.REACTION_REMOVE)
  async handleReactionRemove(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: WsReactionDto,
  ) {
    const { userId } = client.user;

    try {
      const result = await this.gatewayService.removeReaction(userId, payload);

      this.server.to(`chat:${result.chatId}`).emit(WsEvents.REACTION_REMOVED, {
        messageId: payload.messageId,
        chatId: result.chatId,
        userId,
        emoji: payload.emoji,
      });

      return { data: { success: true } };
    } catch (error) {
      return { error: { code: 'REACTION_REMOVE_ERROR', message: (error as Error).message } };
    }
  }

  @SubscribeMessage(WsEvents.TYPING_START)
  handleTypingStart(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: WsTypingDto,
  ) {
    const { userId } = client.user;
    const timerKey = `${payload.chatId}:${userId}`;

    this.clearTypingTimer(timerKey);

    client.to(`chat:${payload.chatId}`).emit(WsEvents.TYPING_UPDATE, {
      chatId: payload.chatId,
      userId,
      isTyping: true,
    });

    this.typingTimers.set(
      timerKey,
      setTimeout(() => {
        client.to(`chat:${payload.chatId}`).emit(WsEvents.TYPING_UPDATE, {
          chatId: payload.chatId,
          userId,
          isTyping: false,
        });
        this.typingTimers.delete(timerKey);
      }, TYPING_TIMEOUT_MS),
    );
  }

  @SubscribeMessage(WsEvents.TYPING_STOP)
  handleTypingStop(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: WsTypingDto,
  ) {
    const { userId } = client.user;
    const timerKey = `${payload.chatId}:${userId}`;

    this.clearTypingTimer(timerKey);

    client.to(`chat:${payload.chatId}`).emit(WsEvents.TYPING_UPDATE, {
      chatId: payload.chatId,
      userId,
      isTyping: false,
    });
  }

  @SubscribeMessage(WsEvents.PRESENCE_PING)
  handlePresencePing(@ConnectedSocket() client: AuthenticatedSocket) {
    const { userId } = client.user;

    this.resetPresenceTimer(userId);
  }

  emitToChat(chatId: string, event: string, payload: unknown): void {
    this.server.to(`chat:${chatId}`).emit(event, payload);
  }

  emitToUser(userId: string, event: string, payload: unknown): void {
    this.server.to(`user:${userId}`).emit(event, payload);
  }

  async addSocketToRoom(userId: string, roomId: string): Promise<void> {
    const userSockets = this.sessionService.getUserSockets(userId);

    if (!userSockets) {
      return;
    }

    for (const socket of userSockets.values()) {
      await socket.join(roomId);
    }
  }

  async removeSocketFromRoom(userId: string, roomId: string): Promise<void> {
    const userSockets = this.sessionService.getUserSockets(userId);

    if (!userSockets) {
      return;
    }

    for (const socket of userSockets.values()) {
      await socket.leave(roomId);
    }
  }

  private clearTypingTimer(key: string): void {
    const timer = this.typingTimers.get(key);

    if (timer) {
      clearTimeout(timer);
      this.typingTimers.delete(key);
    }
  }

  private resetPresenceTimer(userId: string): void {
    this.clearPresenceTimer(userId);

    this.presenceTimers.set(
      userId,
      setTimeout(() => {
        const userSockets = this.sessionService.getUserSockets(userId);

        if (userSockets) {
          for (const socket of userSockets.values()) {
            socket.disconnect();
          }
        }
      }, PRESENCE_TIMEOUT_MS),
    );
  }

  private clearPresenceTimer(userId: string): void {
    const timer = this.presenceTimers.get(userId);

    if (timer) {
      clearTimeout(timer);
      this.presenceTimers.delete(userId);
    }
  }
}
