import { IsNotEmpty, IsMongoId } from 'class-validator';
import mongoose from 'mongoose';

export class IsIdDTO {
  @IsMongoId({ message: 'Invalid object id' })
  @IsNotEmpty()
  id: mongoose.Types.ObjectId;
}
