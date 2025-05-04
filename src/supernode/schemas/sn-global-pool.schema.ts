export class Supernode {}
import { User } from '@/src/users/schemas/user.schema';
import { TransactionFlow } from '@/src/wallet/enums/transcation.flow.enum';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true, versionKey: false })
export class GlobalPool extends Document {
  @Prop({ type: Types.ObjectId, ref: User.name, required: true })
  user: User;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true })
  flow: TransactionFlow;
}

export const GlobalPoolSchema = SchemaFactory.createForClass(GlobalPool);
