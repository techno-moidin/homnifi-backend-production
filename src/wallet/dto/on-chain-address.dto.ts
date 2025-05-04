import { IsNotEmpty, IsString } from 'class-validator';
import { IsObjectId } from 'class-validator-mongo-object-id';
import { Types } from 'mongoose';

export class OnChainAddressDto {
  @IsObjectId({ message: 'UserId must be a valid ObjectId' })
  @IsNotEmpty()
  userId: Types.ObjectId;

  @IsObjectId({ message: 'NetworkId must be a valid ObjectId' })
  @IsNotEmpty()
  networkId: Types.ObjectId;

  @IsObjectId({ message: 'onChainTokenId must be a valid ObjectId' })
  @IsNotEmpty()
  onChainTokenId: Types.ObjectId;
}
