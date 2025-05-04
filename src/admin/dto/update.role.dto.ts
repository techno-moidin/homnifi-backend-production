import { ACTION, PERMISSION_MODULE } from '@/src/enums/permission';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class UpdateRoleDto {
  @IsString()
  @IsOptional()
  name: string;

  @IsArray()
  @IsOptional()
  @Type(() => PermissionDTO)
  @ValidateNested({ each: true })
  permissions?: PermissionDTO[];
}

export class PermissionDTO {
  @IsEnum(PERMISSION_MODULE)
  @IsOptional()
  module: PERMISSION_MODULE;

  @IsArray()
  @IsOptional()
  @ArrayNotEmpty()
  @IsEnum(ACTION, { each: true })
  action: ACTION[];
}
