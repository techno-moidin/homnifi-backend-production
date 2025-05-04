import { ChargesType } from '@/src/global/enums/charges.type.enum';

import {
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { IsObjectId } from 'class-validator-mongo-object-id';
import { Types } from 'mongoose';

export class CreateSwapSettingDto {
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

  @IsOptional()
  @IsObjectId({ message: 'Please provide a valid platform ID' })
  platform: Types.ObjectId;
}
