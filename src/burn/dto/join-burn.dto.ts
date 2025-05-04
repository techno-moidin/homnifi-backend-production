import { IsNotEmpty, IsMongoId } from 'class-validator';
import { Types } from 'mongoose';

export class JoinBurnDto {
  @IsMongoId()
  @IsNotEmpty()
  machine: Types.ObjectId;
}
