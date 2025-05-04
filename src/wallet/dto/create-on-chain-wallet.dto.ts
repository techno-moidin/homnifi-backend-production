import { WITHDRAW_TYPES } from '@/src/token/enums/withdraw-types.enum';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { IsObjectId } from 'class-validator-mongo-object-id';
import { Types } from 'mongoose';

export class CreateOnChainWalletDto {
  @IsObjectId({ message: 'User must be a valid ObjectId' })
  @IsNotEmpty()
  user: Types.ObjectId;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsObjectId({ message: 'Network must be a valid ObjectId' })
  @IsNotEmpty()
  network: Types.ObjectId;

  @IsObjectId({ message: 'Token must be a valid ObjectId' })
  @IsNotEmpty()
  token: Types.ObjectId;

  @IsString()
  @IsOptional()
  status?: String;
}
