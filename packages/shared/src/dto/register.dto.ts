import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @Matches(/^\+[1-9]\d{1,14}$/, { message: 'phone must be in E.164 format' })
  phone!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  displayName!: string;
}
