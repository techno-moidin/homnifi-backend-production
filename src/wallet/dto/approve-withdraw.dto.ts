import { PartialType } from '@nestjs/mapped-types';
import { IsObjectId } from 'class-validator-mongo-object-id';
import { Types } from 'mongoose';
import { WithdrawCallbackDto } from './withdraw-callback-dto';

export class ApproveWithdrawDto extends PartialType(WithdrawCallbackDto) {
  @IsObjectId()
  adminId?: Types.ObjectId;
}
