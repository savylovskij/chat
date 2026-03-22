import { IsString, IsUUID, MaxLength } from 'class-validator';

export class WsReactionDto {
  @IsUUID()
  messageId!: string;

  @IsString()
  @MaxLength(32)
  emoji!: string;
}
