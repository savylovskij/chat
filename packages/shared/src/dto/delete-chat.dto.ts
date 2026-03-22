import { IsEnum } from 'class-validator';

import { DeleteChatMode } from '../enums/delete-chat-mode.enum';

export class DeleteChatDto {
  @IsEnum(DeleteChatMode)
  mode!: DeleteChatMode;
}
