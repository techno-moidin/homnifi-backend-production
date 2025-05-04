import { OnChainWalletSettingStatus } from '@/src/token/schemas/on.chain.wallet.setting.schema';
import {
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { Types } from 'mongoose';

export class CreateOnChainWalletSettingsDto {
  @IsMongoId()
  depositSetting: Types.ObjectId;

  @IsMongoId()
  token: Types.ObjectId;

  @IsMongoId()
  network: Types.ObjectId;

  @IsOptional()
  @IsNumber()
  maxAttempts?: number;

  @IsOptional()
  @IsEnum(OnChainWalletSettingStatus)
  status?: OnChainWalletSettingStatus;
}
