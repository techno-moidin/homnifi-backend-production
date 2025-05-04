import {
  IsArray,
  IsBoolean,
  IsJSON,
  IsNumber,
  IsOptional,
} from 'class-validator';
import { Types } from 'mongoose';

export class CreateUsdkStakeSettingsDto {
  @IsNumber()
  multiplier: number;

  @IsNumber()
  rewardPercentage: number;

  // @IsBoolean()
  // status: boolean;

  @IsArray()
  tokens: Types.ObjectId[];

  @IsOptional()
  @IsJSON()
  meta?: Record<string, any>;
}

export class ChangeVisibilityUsdkStakeSettingsDto {
  @IsBoolean()
  isVisible: boolean;
}
