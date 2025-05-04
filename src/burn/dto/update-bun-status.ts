import {
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsString,
} from 'class-validator';
import { BURN_STATUS_TYPE } from '../schema/burn.schema';
import { Type } from 'class-transformer';

export class UpdateBunStatusDto {
  @IsEnum(BURN_STATUS_TYPE, { message: 'Invalid status type' })
  @IsNotEmpty({ message: 'Status is required' })
  status: BURN_STATUS_TYPE;
}

export class UpdateBurnDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @Type(() => Date)
  @IsDate()
  @IsNotEmpty()
  startAt: Date;

  @Type(() => Date)
  @IsDate()
  @IsNotEmpty()
  expiresAt: Date;

  @IsNumber()
  @IsNotEmpty()
  @IsNotEmpty()
  normalPercentage: number;

  @IsNumber()
  @IsNotEmpty()
  @IsNotEmpty()
  boostPercentage: number;
}
