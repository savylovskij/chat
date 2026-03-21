import { VerifyOtpDto } from '@shared/core';
import { IsString } from 'class-validator';

export class VerifyOtpWithTokenDto extends VerifyOtpDto {
  @IsString()
  tempToken!: string;
}
