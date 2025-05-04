import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';

@Schema({ timestamps: true, versionKey: false })
export class ImpersonateLog extends Document {
  @Prop({ type: mongoose.Schema.Types.ObjectId, required: true })
  user: mongoose.Schema.Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, required: true })
  admin: mongoose.Schema.Types.ObjectId;

  @Prop({ type: String })
  path: string;

  @Prop({ type: String })
  module: string;

  @Prop({
    type: String,
  })
  method: string;

  @Prop({
    type: mongoose.Schema.Types.Mixed,
  })
  payload: any;

  @Prop({
    type: String,
  })
  reason: string;
}
export const ImpersonateLogSchema =
  SchemaFactory.createForClass(ImpersonateLog);
