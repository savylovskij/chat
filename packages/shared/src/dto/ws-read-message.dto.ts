import { IsUUID } from 'class-validator';

export class WsReadMessageDto {
  @IsUUID()
  chatId!: string;

  @IsUUID()
  messageId!: string;
}
