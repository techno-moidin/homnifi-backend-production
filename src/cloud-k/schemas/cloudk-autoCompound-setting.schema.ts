import { User } from '@/src/users/schemas/user.schema';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, ObjectId } from 'mongoose';
import { CloudKMachine } from './cloudk-machine.schema';
enum STATUS_TYPE {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

@Schema({ timestamps: true, versionKey: false })
export class CloudKAutoCompoundSetting extends Document {
  @Prop({
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: CloudKMachine.name }],
    default: [],
  })
  machines: mongoose.Types.ObjectId[];

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: User.name })
  user: mongoose.Types.ObjectId;

  @Prop({
    enum: STATUS_TYPE,
    default: STATUS_TYPE.ACTIVE,
  })
  status: STATUS_TYPE;

  @Prop({
    type: Boolean,
    default: false,
  })
  globalAutoCompoundEnabled: boolean;

  @Prop({ default: null, type: Date })
  deletedAt: Date;
}

export const CloudKAutoCompoundSettingSchema = SchemaFactory.createForClass(
  CloudKAutoCompoundSetting,
);
