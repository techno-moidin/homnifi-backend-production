import { PartialType } from '@nestjs/mapped-types';
import { CreateDepositAndStakeSettingsDto } from './create-deposit-and-stake-settings.dto';

export class UpdateDepositAndStakeSettingsDto extends PartialType(
  CreateDepositAndStakeSettingsDto,
) {}
