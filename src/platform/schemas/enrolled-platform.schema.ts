import { Admin } from '@/src/admin/schemas/admin.schema';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '@/src/users/schemas/user.schema';
import { Platform } from './platform.schema';

@Schema({
  timestamps: true,
  toJSON: {
    transform(doc, ret, options) {},
  },
})
export class EnrolledPlatform extends Document {
  @Prop({ type: Types.ObjectId, ref: User.name })
  user: User;

  @Prop({ type: Types.ObjectId, ref: Platform.name })
  platform: Platform;

  @Prop({ type: Types.ObjectId, ref: Admin.name })
  deletedBy: Admin;

  @Prop({ default: null })
  deletedAt: Date;
}

export const EnrolledPlatformSchema =
  SchemaFactory.createForClass(EnrolledPlatform);
