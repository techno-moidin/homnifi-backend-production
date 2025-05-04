import { IsString, IsNotEmpty, IsBoolean, IsEnum } from 'class-validator';
import { Types } from 'mongoose';
import { WalletSettingsType } from '../enums/wallet-settings-type.schema';

export class CreateWalletSettingsDto {
  @IsEnum(WalletSettingsType)
  @IsNotEmpty()
  type: WalletSettingsType;

  @IsBoolean()
  @IsNotEmpty()
  enabled: boolean;

  @IsString()
  @IsNotEmpty()
  buttonMessage: string;

  @IsString()
  @IsNotEmpty()
  message: string;
}
