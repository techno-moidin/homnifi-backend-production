import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { IsObjectId } from 'class-validator-mongo-object-id';
import { Types } from 'mongoose';

export class RejectWithdrawDto {
  @IsObjectId()
  @IsNotEmpty()
  adminId: Types.ObjectId;

  @IsString()
  @IsOptional()
  denialReason: string;
}
