import { IsString, MaxLength, MinLength } from 'class-validator';

export class Verify2faDto {
  @IsString()
  @MinLength(6)
  @MaxLength(6)
  code!: string;
}
