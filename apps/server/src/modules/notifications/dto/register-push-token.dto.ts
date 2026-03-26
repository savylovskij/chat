import { IsString, MaxLength } from 'class-validator';

export class RegisterPushTokenDto {
  @IsString()
  @MaxLength(500)
  pushToken!: string;
}
