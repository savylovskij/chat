import { IsEnum, IsUUID } from 'class-validator';

import { DeleteMessageMode } from '../enums/delete-message-mode.enum';

export class WsDeleteMessageDto {
  @IsUUID()
  messageId!: string;

  @IsEnum(DeleteMessageMode)
  mode!: DeleteMessageMode;
}
