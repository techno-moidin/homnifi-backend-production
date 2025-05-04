import { IsBoolean, IsMongoId, IsOptional } from 'class-validator';

export class CloudKKillSettingDTO {
  @IsBoolean()
  stakeEnabled: boolean;

  @IsBoolean()
  claimEnabled: boolean;

  @IsBoolean()
  machineBuyEnabled: boolean;

  @IsBoolean()
  rewardsJobEnabled: boolean;
}
