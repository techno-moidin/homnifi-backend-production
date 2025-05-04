import { User } from '@/src/users/schemas/user.schema';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Date, Document, Types } from 'mongoose';
import { STATUS_TYPE } from '../enums/user-sngp.enum';
import { Sngp } from './sngp.schema';
import { CloudKMachine } from '@/src/cloud-k/schemas/cloudk-machine.schema';

@Schema({ timestamps: true, versionKey: false })
export class UserSngp extends Document {
  @Prop({
    type: Number,
    required: true,
  })
  points: number;

  @Prop({ type: Types.ObjectId, ref: Sngp.name, required: true })
  sngp: Sngp;

  @Prop({ type: Types.ObjectId, ref: User.name, required: true })
  user: User;

  @Prop({ type: Types.ObjectId, ref: CloudKMachine.name, required: false })
  machine: CloudKMachine;

  @Prop({ enum: STATUS_TYPE, required: true })
  status: STATUS_TYPE;

  @Prop({
    type: Object,
    required: true,
  })
  meta: object;

  @Prop({
    type: String,
    required: false,
  })
  remark?: string;

  @Prop({
    type: Date,
    default: null,
  })
  deletedAt: Date;
}

export const UserSngpSchema = SchemaFactory.createForClass(UserSngp);
