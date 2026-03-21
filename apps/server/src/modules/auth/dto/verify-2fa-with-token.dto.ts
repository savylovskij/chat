import { Verify2faDto } from '@shared/core';
import { IsString } from 'class-validator';

export class Verify2faWithTokenDto extends Verify2faDto {
  @IsString()
  tempToken!: string;
}
