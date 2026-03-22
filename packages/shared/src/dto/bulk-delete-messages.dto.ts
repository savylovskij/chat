import { IsArray, IsOptional, IsUUID } from 'class-validator';

export class BulkDeleteMessagesDto {
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  messageIds?: string[];
}
