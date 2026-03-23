import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsString, ValidateNested } from 'class-validator';

import { PreKeyDto } from './pre-key.dto';
import { SignedPreKeyDto } from './signed-pre-key.dto';

export class UploadKeysDto {
  @IsString()
  identitiesKey!: string;

  @ValidateNested()
  @Type(() => SignedPreKeyDto)
  signedPreKey!: SignedPreKeyDto;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => PreKeyDto)
  preKeys!: PreKeyDto[];
}
