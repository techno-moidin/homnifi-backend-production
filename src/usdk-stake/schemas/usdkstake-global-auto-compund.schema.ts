import { User } from '@/src/users/schemas/user.schema';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';

@Schema({ timestamps: true, versionKey: false })
export class UsdkStakeGlobalAutoCompound extends Document {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: User.name })
  user: mongoose.Types.ObjectId;

  @Prop({
    required: true,
    type: Boolean,
    default: false,
  })
  enabled: boolean;
}

export const UsdkStakeGlobalAutoCompoundSchema = SchemaFactory.createForClass(
  UsdkStakeGlobalAutoCompound,
);
