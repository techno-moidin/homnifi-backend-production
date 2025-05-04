import { Types } from 'mongoose';
import { IsObjectId } from 'class-validator-mongo-object-id';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateTransferTrxDto {
  @IsObjectId({ message: 'Invalid user id' })
  @IsNotEmpty()
  user: Types.ObjectId;

  @IsObjectId({ message: 'Invalid to user id' })
  @IsNotEmpty()
  toUser: Types.ObjectId;

  @IsObjectId({ message: 'Invalid from wallet id' })
  @IsNotEmpty()
  fromWallet: Types.ObjectId;

  @IsObjectId({ message: 'Invalid from wallet transaction id' })
  @IsNotEmpty()
  fromWalletTrx: Types.ObjectId;

  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsString()
  @IsNotEmpty()
  userRemarks: string;
}
