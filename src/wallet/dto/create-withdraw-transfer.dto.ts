import { WITHDRAW_TYPES } from '@/src/token/enums/withdraw-types.enum';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { IsObjectId } from 'class-validator-mongo-object-id';
import { Types } from 'mongoose';

export class CreateWithdrawTransferDto {
  @IsObjectId({ message: 'Invalid user id' })
  user: Types.ObjectId;

  @IsObjectId({ message: 'Invalid wallet id' })
  @IsNotEmpty()
  fromWallet: Types.ObjectId;

  @IsObjectId({ message: 'Invalid wallet transaction id' })
  @IsNotEmpty()
  fromWalletTrx: Types.ObjectId;

  @IsObjectId({ message: 'Invalid network id' })
  @IsNotEmpty()
  network: Types.ObjectId;

  @IsString()
  @IsNotEmpty()
  receiverAddress: string;

  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsString()
  @IsOptional()
  userRemarks;

  @IsString()
  @IsNotEmpty()
  type: WITHDRAW_TYPES;
}
