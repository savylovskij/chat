import { IsBoolean } from 'class-validator';

export class MuteChatDto {
  @IsBoolean()
  muted!: boolean;
}
