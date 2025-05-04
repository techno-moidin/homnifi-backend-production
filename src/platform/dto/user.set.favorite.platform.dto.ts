import { IsMongoId, IsNotEmpty } from 'class-validator';
import { Types } from 'mongoose';

export class UserSetFavoritePlatformDto {
  @IsMongoId()
  @IsNotEmpty()
  platform: Types.ObjectId;
}
