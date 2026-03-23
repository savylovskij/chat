import { IsInt, IsString, Min } from 'class-validator';

export class PreKeyDto {
  @IsInt()
  @Min(0)
  keyId!: number;

  @IsString()
  publicKey!: string;
}
