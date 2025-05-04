import { TrxType } from '@/src/global/enums/trx.type.enum';
import {
  IsDate,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { IsObjectId } from 'class-validator-mongo-object-id';
import { Types } from 'mongoose';
import { TransactionFlow } from '../enums/transcation.flow.enum';

export class CreateWalletTransactionDto {
  @IsObjectId({ message: 'Invalid user id' })
  user: Types.ObjectId;

  @IsObjectId({ message: 'Invalid wallet id' })
  wallet: Types.ObjectId;

  @IsEnum(TrxType)
  trxType: TrxType;

  @IsNumber()
  amount: number;

  @IsEnum(TransactionFlow)
  transactionFlow: TransactionFlow;

  @IsOptional()
  note?: string;

  @IsOptional()
  remark?: string;

  @IsOptional()
  machine?: string;

  @IsNumber()
  actualAmount?: number;

  @IsObjectId({ message: 'Invalid token id' })
  token?: Types.ObjectId;

  @IsNumber()
  bonus?: number;

  @IsOptional()
  @IsObject({ message: 'Meta must be a valid object' })
  meta?: Record<string, any>;

  @IsDate()
  @IsOptional()
  deletedAt?: Date;
}
