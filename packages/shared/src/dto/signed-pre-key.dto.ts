import { IsInt, IsString, Min } from 'class-validator';

export class SignedPreKeyDto {
  @IsInt()
  @Min(0)
  keyId!: number;

  @IsString()
  publicKey!: string;

  @IsString()
  signature!: string;
}
