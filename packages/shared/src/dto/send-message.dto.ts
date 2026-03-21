import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

import { MessageType } from '../enums';

export class SendMessageDto {
  @IsUUID()
  chatId!: string;

  @IsEnum(MessageType)
  type!: MessageType;

  @IsOptional()
  @IsString()
  encryptedContent?: string;

  @IsOptional()
  @IsString()
  mediaUrl?: string;

  @IsOptional()
  @IsUUID()
  replyToId?: string;

  @IsUUID()
  clientMessageId!: string;
}
