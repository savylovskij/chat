import { IsEnum, IsInt, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

import { AllowedMimeType } from '../enums/allowed-mime-type.enum';

export class RequestUploadUrlDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  fileName!: string;

  @IsEnum(AllowedMimeType)
  mimeType!: AllowedMimeType;

  @IsInt()
  @Min(1)
  @Max(104857600)
  fileSize!: number;
}
