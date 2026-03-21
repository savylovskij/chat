import { IsString, Matches } from 'class-validator';

export class LoginDto {
  @IsString()
  @Matches(/^\+[1-9]\d{1,14}$/, { message: 'phone must be in E.164 format' })
  phone!: string;

  @IsString()
  deviceName!: string;

  @IsString()
  platform!: string;
}
