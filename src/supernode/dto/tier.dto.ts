import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  IsBoolean,
  IsNotEmpty,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { BuilderGenerationDto } from './create-base-ref-setting.dto';
import { IsObjectId } from 'class-validator-mongo-object-id';
import { Types } from 'mongoose';

export class TierSettingsDto {
  @IsString()
  @IsOptional()
  note: string;

  @IsNumber()
  @IsNotEmpty()
  totalLevels: number;

  @IsArray()
  @Type(() => settingLevelsDto)
  @ValidateNested({ each: true })
  settingLevels: settingLevelsDto[];
}

export class settingLevelsDto {
  @IsNumber()
  @IsNotEmpty()
  from: number;

  @IsNumber()
  @IsNotEmpty()
  to: number;

  @IsNumber()
  @IsNotEmpty()
  amount: number;
}
