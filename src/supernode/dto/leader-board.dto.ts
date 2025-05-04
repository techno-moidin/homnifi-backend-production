import { IsOptional, IsString, IsNumber } from 'class-validator';
import { SN_BONUS_TYPE } from '../enums/sn-bonus-type.enum';
import { Type } from 'class-transformer';
import { TIME_PERIOD } from '@/src/utils/constants';

export class LeaderBoardDto {
  @IsString()
  @IsOptional()
  type: SN_BONUS_TYPE;

  @IsOptional()
  @IsString()
  filter: TIME_PERIOD;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number = 50;

  @IsOptional()
  @IsString()
  query?: string;
}
