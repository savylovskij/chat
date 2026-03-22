import { IsEnum } from 'class-validator';

import { MemberRole } from '../enums';

export class UpdateMemberRoleDto {
  @IsEnum(MemberRole)
  role!: MemberRole;
}
