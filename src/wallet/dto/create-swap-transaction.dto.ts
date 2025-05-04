import { IsNotEmpty, IsNumber } from 'class-validator';
import { IsObjectId } from 'class-validator-mongo-object-id';
import { Types } from 'mongoose';

export class CreateSwapTransactionDto {
  @IsObjectId({ message: 'Invalid user id' })
  @IsNotEmpty()
  user: Types.ObjectId;

  @IsObjectId({ message: 'Invalid "from" wallet id' })
  @IsNotEmpty()
  fromWallet: Types.ObjectId;

  @IsObjectId({ message: 'Invalid "from" wallet transaction id' })
  @IsNotEmpty()
  fromWalletTrx: Types.ObjectId;

  @IsObjectId({ message: 'Invalid "to" wallet id' })
  @IsNotEmpty()
  toWallet: Types.ObjectId;

  @IsObjectId({ message: 'Invalid "to" wallet transaction id' })
  @IsNotEmpty()
  toWalletTrx: Types.ObjectId;

  @IsNumber()
  @IsNotEmpty()
  amount: number;
}
