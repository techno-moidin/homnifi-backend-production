import { PLATFORMS } from '@/src/global/enums/wallet.enum';
import { WITHDRAW_TYPES } from '@/src/token/enums/withdraw-types.enum';
import { IsEnum, IsNotEmpty, IsOptional } from 'class-validator';

export class GetDepositSettingsDto {
  @IsOptional()
  @IsEnum(PLATFORMS)
  platform: PLATFORMS;
}

export class CreateWithdrawSettingsDto {
  @IsOptional()
  @IsEnum(PLATFORMS)
  platform: PLATFORMS;

  @IsNotEmpty()
  @IsEnum(WITHDRAW_TYPES)
  type: WITHDRAW_TYPES;
}
