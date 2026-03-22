import { IsEnum } from 'class-validator';

import { DeleteMessageMode } from '../enums/delete-message-mode.enum';

export class DeleteMessageDto {
  @IsEnum(DeleteMessageMode)
  mode!: DeleteMessageMode;
}
