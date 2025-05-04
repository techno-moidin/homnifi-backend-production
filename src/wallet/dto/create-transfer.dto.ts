import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { IsObjectId } from 'class-validator-mongo-object-id';
import { Types } from 'mongoose';

export class CreateTransferDto {
  @IsObjectId({ message: 'Invalid wallet id' })
  @IsNotEmpty()
  wallet: Types.ObjectId;

  @IsObjectId({ message: 'Invalid user id' })
  @IsNotEmpty()
  toUser: Types.ObjectId;

  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsString()
  @IsOptional()
  userRemarks;
}
