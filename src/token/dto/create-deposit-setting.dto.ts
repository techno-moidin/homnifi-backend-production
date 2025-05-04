import { IsInEnum } from '@/src/decorators/IsInEnum.decorator';
import { PLATFORMS } from '@/src/global/enums/wallet.enum';
import { Transform } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
} from 'class-validator';
import { Types } from 'mongoose';
import { DepositSettingsType } from '../enums/depositSettings-type-enum';

import { NetworkSettingsType } from '@/src/platform/schemas/network-settings.schema';
import { IsObjectId } from 'class-validator-mongo-object-id';
import { IsNetworkSettings } from '@/src/decorators/IsNetworkSettings.decorator';

export class CreateDepositSettingDto {
  @IsMongoId()
  @IsNotEmpty()
  fromToken: Types.ObjectId;

  @IsNotEmpty()
  @IsNetworkSettings()
  networks: NetworkSettingsType[];

  @IsMongoId()
  @IsNotEmpty()
  toToken: Types.ObjectId;

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
