import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsString, ValidateNested } from 'class-validator';
export class RewardLossResponseDto {
  @IsNumber()
  inActiveFirstUser: number;
  @IsNumber()
  dailyCapping: number;
  @IsNumber()
  insufficientGask: number;
  @IsNumber()
  netTotal: number;
  token: any;
}

export class TotalProductionResponseDto {
  @IsNumber()
  myProduction: number;
  @IsNumber()
  teamProduction: number;
  @IsNumber()
  firstLineProduction: number;
  @IsNumber()
  netTotal: number;
  token: any;
}

export class UserTotalProductionResponseDto {
  @IsNumber()
  myProduction: number;
}

export class DailyRewardsResponseDto {
  @IsNumber()
  totalToken: number;
  @IsNumber()
  totalAmount: number;
}
