import { IsString, MaxLength } from 'class-validator';

export class AddReactionDto {
  @IsString()
  @MaxLength(32)
  emoji!: string;
}
