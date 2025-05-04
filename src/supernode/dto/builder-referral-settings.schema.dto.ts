import {
  IsNumber,
  IsOptional,
  IsString,
  IsBoolean,
  IsNotEmpty,
} from 'class-validator';

export class CreateBuilderReferralSettingsDto {
  @IsNumber()
  @IsNotEmpty()
  bonusThresholdPercentage: number;

  @IsNumber()
  @IsNotEmpty()
  bonusMultiplier: number;

  @IsNumber()
  @IsNotEmpty()
  fiftyPercentRuleMultiplier: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
