import { WITHDRAW_TYPES } from '@/src/token/enums/withdraw-types.enum';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { IsObjectId } from 'class-validator-mongo-object-id';
import { Types } from 'mongoose';

export class CreateWithdrawDto {
  @IsObjectId({ message: 'Invalid token id' })
  @IsNotEmpty()
  token: Types.ObjectId;

  @IsString()
  @IsNotEmpty()
  receiverAddress: string;

  @IsOptional()
  network?: Types.ObjectId;

  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsString()
  @IsOptional()
  userRemarks;

  @IsString()
  @IsOptional()
  optionalRemarks;

  @IsString()
  type: WITHDRAW_TYPES;

  @IsNotEmpty()
  @IsObjectId({ message: 'Invalid Platform ID' })
  platform: Types.ObjectId;

  @IsBoolean()
  @IsOptional()
  hundredPercent?: boolean;
}
