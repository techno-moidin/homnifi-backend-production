import { IsBoolean, IsNumber, IsOptional } from 'class-validator';
import { IsObjectId } from 'class-validator-mongo-object-id';
import { Types } from 'mongoose';

export class CreateSpecialSwapDto {
  @IsObjectId({ message: 'Invalid token id' })
  fromToken: Types.ObjectId;

  @IsObjectId({ message: 'Invalid token id' })
  toToken: Types.ObjectId;

  @IsNumber()
  amount: number;

  @IsBoolean()
  @IsOptional()
  hundredPercent?: boolean;
}
