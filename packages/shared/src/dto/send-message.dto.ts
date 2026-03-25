import { IsEnum, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

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
  @IsObject()
  mediaMetadata?: Record<string, unknown>;

  @IsOptional()
  @IsUUID()
  replyToId?: string;

  @IsUUID()
  clientMessageId!: string;
}
