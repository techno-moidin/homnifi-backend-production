import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { CloudKMachine } from './cloudk-machine.schema';
import { User } from '@/src/users/schemas/user.schema';

@Schema({ timestamps: true, versionKey: false })
export class NewUserStake extends Document {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: User.name,
    required: true,
  })
  user: string;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: CloudKMachine.name,
    required: true,
  })
  machine: string;

  @Prop({ type: Number, required: true })
  oldATH: number;

  @Prop({ type: Number, required: true })
  newATH: number;

  @Prop({ type: Number, required: true })
  newStake: number;

  @Prop({ type: Number, required: true })
  oldStake: number;
}

export const NewUserStakeSchema = SchemaFactory.createForClass(NewUserStake);
