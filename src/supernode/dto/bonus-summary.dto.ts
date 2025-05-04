import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { IsObjectId } from 'class-validator-mongo-object-id';
import { Types } from 'mongoose';
import { SN_BONUS_SUMMARY_TYPE } from '../enums/sn-bonus-type.enum';
import { Type } from 'class-transformer';
export class GetBonusSummaryDto {
  @IsNotEmpty()
  @IsObjectId({ message: 'Invalid user id' })
  fromUser: Types.ObjectId;

  @IsEnum(SN_BONUS_SUMMARY_TYPE)
  @IsNotEmpty()
  type: SN_BONUS_SUMMARY_TYPE;

  @IsString()
  @IsDateString()
  date: string;

  @IsOptional()
  level?: string;

  @IsOptional()
  page?: number = 1;

  @IsOptional()
  limit?: number = 10;

  @IsNotEmpty()
  @IsObjectId({ message: 'Invalid Object id' })
  cloudKtrx: Types.ObjectId;
}

export class ReturnBonusSummaryDto {
  @IsNotEmpty()
  @IsNumber()
  total: number;

  @IsNotEmpty()
  @IsObject()
  result: object;

  @IsNotEmpty()
  @IsObject()
  baseReward: object;

  // @IsNotEmpty()
  // @IsObjectId({ message: 'Invalid Object id' })
  // cloudKtrx: Types.ObjectId;
}

export class GetUserDetailsDto {
  @IsNotEmpty()
  @IsObjectId({ message: 'Invalid user id' })
  user: Types.ObjectId;
}

export class GetBonusSummaryTransactionDto {
  @IsEnum(SN_BONUS_SUMMARY_TYPE)
  @IsNotEmpty()
  type: SN_BONUS_SUMMARY_TYPE;

  @IsOptional()
  @IsNotEmpty()
  level: string;

  @IsOptional()
  @Type(() => Date)
  fromDate: Date;

  @IsOptional()
  @Type(() => Date)
  toDate: Date;

  @IsOptional()
  page?: number = 1;

  @IsOptional()
  limit?: number = 10;

  // @IsNotEmpty()
  // @IsObjectId({ message: 'Invalid Object id' })
  // cloudKtrx: Types.ObjectId;

  @IsOptional()
  @IsNotEmpty()
  treeLevel: string;

  @IsOptional()
  @IsNotEmpty()
  rewardLevel: string;
}
