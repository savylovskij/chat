import { IsString, IsUUID } from 'class-validator';

export class EditMessageDto {
  @IsUUID()
  messageId!: string;

  @IsString()
  encryptedContent!: string;
}
