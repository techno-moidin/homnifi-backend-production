import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { IsObjectId } from 'class-validator-mongo-object-id';
import { Types } from 'mongoose';
import { SN_BONUS_TYPE } from '../enums/sn-bonus-type.enum';
import { LostReason } from '../enums/sn-lost-reason.enum';

export class CreateTransactionDto {
  @IsNotEmpty()
  @IsObjectId({ message: 'Invalid user id' })
  user: Types.ObjectId;

  @IsNotEmpty()
  @IsString()
  fromUser: Types.ObjectId;

  @IsEnum(SN_BONUS_TYPE)
  @IsNotEmpty()
  type: SN_BONUS_TYPE;

  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsNumber()
  @IsNotEmpty()
  tokenAmount: number;

  @IsOptional()
  @IsNumber()
  tokenPrice?: number;

  @IsNotEmpty()
  @IsObject()
  rewardData: object;

  @IsNotEmpty()
  @IsBoolean()
  receivable: boolean;

  @IsEnum(LostReason)
  @IsNotEmpty()
  lostReason: LostReason;

  @IsNumber()
  @IsNotEmpty()
  gaskRemaining: number;

  @IsNumber()
  @IsNotEmpty()
  loss: number;

  @IsOptional()
  @IsNumber()
  lossInToken?: number;

  @IsNotEmpty()
  @IsObjectId()
  cloudkTrx: Types.ObjectId;

  @IsOptional()
  @IsObjectId()
  machine?: Types.ObjectId;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsObjectId()
  job?: Types.ObjectId;

  @IsOptional()
  @IsBoolean()
  isMachingBonus?: boolean;

  @IsOptional()
  @IsString()
  machingBonusStatus?: string;
}

export class CheckEligibilityStatusDto {
  @IsObjectId({ message: 'Invalid user id' })
  uplineUser: Types.ObjectId;

  @IsNotEmpty()
  @IsString()
  currentUserId: Types.ObjectId;

  @IsNumber()
  @IsNotEmpty()
  rewardAmount: number;

  @IsNumber()
  @IsNotEmpty()
  percentageOfBonus: number;

  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsObjectId()
  cloudkTrx: Types.ObjectId;

  @IsNumber()
  @IsNotEmpty()
  currentLevel: number;

  @IsNumber()
  @IsNotEmpty()
  currentGasKValue: number;

  @IsOptional()
  @IsNumber()
  currentPrice?: number;
}

export class MatchingBonusTransactionDto {
  @IsObjectId({ message: 'Invalid user id' })
  uplineUser: Types.ObjectId;

  @IsNotEmpty()
  @IsString()
  currentUserId: string;

  @IsNumber()
  @IsNotEmpty()
  rewardAmount: number;

  @IsNumber()
  @IsNotEmpty()
  percentageOfBonus: number;

  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsObjectId()
  cloudkTrx: Types.ObjectId;

  @IsNumber()
  @IsNotEmpty()
  previousLevelRewardAmount: number;

  @IsNumber()
  @IsNotEmpty()
  matchingBonus: number;

  @IsNumber()
  @IsNotEmpty()
  currentPrice: number;

  @IsNumber()
  @IsNotEmpty()
  basePercentage: number;

  @IsNumber()
  @IsNotEmpty()
  currentLevel: number;

  @IsNumber()
  @IsNotEmpty()
  currentGasKValue: number;

  @IsOptional()
  @IsObjectId()
  machine?: Types.ObjectId;

  @IsOptional()
  @IsObjectId()
  job?: Types.ObjectId;

  @IsOptional()
  @IsObjectId()
  baseUser?: Types.ObjectId;
}
