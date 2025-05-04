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

export class CreateRoleDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsArray()
  @IsOptional()
  @Type(() => PermissionDTO)
  @ValidateNested({ each: true })
  permissions?: PermissionDTO[];
}

export class PermissionDTO {
  @IsEnum(PERMISSION_MODULE)
  @IsNotEmpty()
  module: PERMISSION_MODULE;

  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(ACTION, { each: true })
  action: ACTION[];
}
