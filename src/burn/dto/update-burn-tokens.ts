import { IsEnum, IsNotEmpty } from 'class-validator';
import { BURN_STATUS_TYPE } from '../schema/burn.schema';
import { Types } from 'mongoose';
import { IsObjectId } from 'class-validator-mongo-object-id';

export class UpdateBurnTokenDto {

  @IsNotEmpty()
  @IsObjectId({ message: 'Invalid token id' })
  burnReceiveToken: Types.ObjectId;

  
  
  @IsNotEmpty()
  @IsObjectId({ message: 'Invalid token id' })
  burnInToken: Types.ObjectId;


}
