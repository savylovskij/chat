import { IsEnum, IsInt, IsObject, IsOptional, IsString, IsUUID, Min } from 'class-validator';

import { MessageType, MessageWeight } from '../enums';

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

  @IsOptional()
  @IsEnum(MessageWeight)
  weight?: MessageWeight;

  @IsOptional()
  @IsInt()
  @Min(1)
  timer?: number;

  @IsUUID()
  clientMessageId!: string;
}
