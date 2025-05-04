import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import moment from 'moment';
import { v4 as uuidv4 } from 'uuid';

export enum IMPERSONALTE_STATUS {
  INIT = 'INIT',
  LOGGED_IN = 'LOGGED_IN',
}

@Schema({ timestamps: true, versionKey: false })
export class ImpersonateHistroty extends Document {
  @Prop({ type: mongoose.Schema.Types.ObjectId, required: true })
  user: mongoose.Schema.Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, required: true })
  admin: mongoose.Schema.Types.ObjectId;

  @Prop({ type: String, required: true })
  reason: string;

  @Prop({
    type: String,
    enum: IMPERSONALTE_STATUS,
    default: IMPERSONALTE_STATUS.INIT,
  })
  status: string;
}
export const ImpersonateHistrotySchema =
  SchemaFactory.createForClass(ImpersonateHistroty);
