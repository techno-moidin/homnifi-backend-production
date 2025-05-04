import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsEnum,
  IsOptional,
  IsMongoId,
  IsArray,
} from 'class-validator';
import { Types } from 'mongoose';
import { ChargesType } from '@/src/global/enums/charges.type.enum';
import { WITHDRAW_TYPES } from '../enums/withdraw-types.enum';
import { IsPlatformsSettings } from '@/src/decorators/IsPlatformsSettings.decorator';
import { NetworkSettingsType } from '@/src/platform/schemas/network-settings.schema';
import { IsNetworkSettings } from '@/src/decorators/IsNetworkSettings.decorator';
import { IsObjectId } from 'class-validator-mongo-object-id';

export class CreateWithdrawSettingDto {
  @IsMongoId()
  @IsNotEmpty()
  fromToken: Types.ObjectId;

  @IsNotEmpty()
  @IsNetworkSettings()
  networks: NetworkSettingsType[];

  @IsEnum(WITHDRAW_TYPES)
  @IsNotEmpty()
  type: string;

  @IsNotEmpty()
  @IsNumber()
  minAmount: number; // in dollars

  @IsOptional()
  @IsNumber()
  maxAmount: number; // in dollars

  @IsNotEmpty()
  @IsNumber()
  minDisplayAmount: number;

  @IsMongoId()
  @IsNotEmpty()
  toToken: Types.ObjectId;

  /**
   * fee - attribute has been deprecated. Do not use this attribute for any business logic
   * @deprecated
   */
  @IsNumber()
  @IsOptional()
  fee: number;

  /**
   * feeType - attribute has been deprecated. Do not use this attribute for any business logic
   * @deprecated
   */
  @IsEnum(ChargesType)
  @IsOptional()
  feeType: ChargesType;

  /**
   * commission - attribute has been deprecated. Do not use this attribute for any business logic
   * @deprecated
   */
  @IsNumber()
  @IsOptional()
  commission: number;

  /**
   * commissionType - attribute has been deprecated. Do not use this attribute for any business logic
   * @deprecated
   */
  @IsEnum(ChargesType)
  @IsOptional()
  commissionType: ChargesType;

  @IsNotEmpty()
  @IsObjectId({ message: 'Please provide a valid platform ID' })
  platform: Types.ObjectId;
}
