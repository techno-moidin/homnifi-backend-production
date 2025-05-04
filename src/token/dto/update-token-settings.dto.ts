import { IsBoolean } from 'class-validator';

export class UpdateTokenSettingsDto {
  @IsBoolean()
  withdrawEnabled: boolean;

  @IsBoolean()
  depositEnabled: boolean;

  @IsBoolean()
  fromSwapEnabled: boolean;

  @IsBoolean()
  toSwapEnabled: boolean;
}
