import { IsInEnum } from '@/src/decorators/IsInEnum.decorator';
import { PLATFORMS } from '@/src/global/enums/wallet.enum';

import {
  IsBoolean,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
} from 'class-validator';
import { Types } from 'mongoose';
import { DepositSettingsType } from '../enums/depositSettings-type-enum';
import { IsPlatformsSettings } from '@/src/decorators/IsPlatformsSettings.decorator';
import { NetworkSettingsType } from '@/src/platform/schemas/network-settings.schema';
import { IsNetworkSettings } from '@/src/decorators/IsNetworkSettings.decorator';
import { IsObjectId } from 'class-validator-mongo-object-id';

export class UpdateDepositSettingDto {
  @IsMongoId()
  @IsNotEmpty()
  fromToken: Types.ObjectId;

  @IsNotEmpty()
  @IsNetworkSettings()
  networks: NetworkSettingsType[];

  @IsMongoId()
  @IsNotEmpty()
  toToken: Types.ObjectId;

  @IsOptional()
  @IsBoolean()
  isVisible: boolean;

  @IsNotEmpty()
  @IsObjectId({ message: 'Please provide a valid platform ID' })
  platform: Types.ObjectId;

  @IsBoolean()
  @IsOptional()
  isOnChainDeposit: boolean;

  @IsBoolean()
  @IsOptional()
  isValidateMinAmount: boolean;

  @IsOptional()
  @IsNumber()
  onChainAttemptCount?: number;
}
