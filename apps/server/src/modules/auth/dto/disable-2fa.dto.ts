import { IsString, MaxLength, MinLength } from 'class-validator';

export class Disable2faDto {
  @IsString()
  @MinLength(6)
  @MaxLength(6)
  code!: string;
}
