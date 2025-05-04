import { IsNetworkSettings } from '@/src/decorators/IsNetworkSettings.decorator';
import { NetworkSettingsType } from '@/src/platform/schemas/network-settings.schema';
import {
  IsBoolean,
  IsDate,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsArray,
  IsNotEmpty,
} from 'class-validator';
import { Types } from 'mongoose';

export class CreateDepositAndStakeSettingsDto {
  @IsMongoId()
  @IsNotEmpty()
  fromToken: string;

  @IsMongoId()
  @IsNotEmpty()
  toToken: string;

  @IsNotEmpty()
  @IsNetworkSettings()
  networks: NetworkSettingsType[];

  @IsNumber()
  @IsOptional()
  minAmount: number = 0;

  @IsNumber()
  @IsOptional()
  minDisplayAmount: number = 0;

  @IsBoolean()
  @IsNotEmpty()
  isEnable: boolean = true;

  @IsBoolean()
  @IsOptional()
  isVisible: boolean = false;

  @IsNumber()
  @IsNotEmpty()
  validityHours: number;

  @IsMongoId({
    message: 'platform Is not valid Id',
  })
  @IsNotEmpty()
  platform: Types.ObjectId;
}
