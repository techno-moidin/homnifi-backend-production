import { PartialType } from '@nestjs/mapped-types';
import { CreateWithdrawSettingDto } from './create-withdraw-setting.dto';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateWithdrawSettingDto extends PartialType(
  CreateWithdrawSettingDto,
) {
  @IsBoolean()
  @IsOptional()
  isVisible: boolean;

  @IsBoolean()
  @IsOptional()
  isEnable: boolean;
}
