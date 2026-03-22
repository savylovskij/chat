import { IsUUID } from 'class-validator';

export class WsTypingDto {
  @IsUUID()
  chatId!: string;
}
