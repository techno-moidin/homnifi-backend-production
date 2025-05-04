import { IsNotEmpty, IsString } from 'class-validator';
import { IsObjectId } from 'class-validator-mongo-object-id';
import { Types } from 'mongoose';

export class CreateWalletDto {
  @IsObjectId({ message: 'User must be a valid ObjectId' })
  @IsNotEmpty()
  user: Types.ObjectId;

  @IsObjectId({ message: 'Token must be a valid ObjectId' })
  @IsNotEmpty()
  token: Types.ObjectId;
}
