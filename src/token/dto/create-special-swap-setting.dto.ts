import { ChargesType } from '@/src/global/enums/charges.type.enum';

import {
  IsArray,
  IsBoolean,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

import { IsObjectId } from 'class-validator-mongo-object-id';
import { Types } from 'mongoose';

export class CreateSpecialSwapSettingDto {
  @IsArray()
  @IsNotEmpty()
  @IsMongoId({ each: true })
  countries: Types.ObjectId[];

  @IsMongoId()
  @IsNotEmpty()
  fromToken: Types.ObjectId;

  @IsMongoId()
  @IsNotEmpty()
  toToken: Types.ObjectId;
 
  @IsNumber()
  @IsNotEmpty()
  commission: number;

  @IsString()
  @IsNotEmpty()
  commissionType: ChargesType;

  @IsNumber()
  @IsOptional()
  rate: number;

  @IsBoolean()
  @IsOptional()
  isMarketRateEnable: boolean;

  @IsOptional()
  @IsObjectId({ message: 'Please provide a valid platform ID' })
  platform: Types.ObjectId;

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  minAmount: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  maxAmount: number;

  @IsBoolean()
  isEnable: boolean;
}
