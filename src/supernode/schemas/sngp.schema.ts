import { Admin } from '@/src/admin/schemas/admin.schema';
import { Token } from '@/src/token/schemas/token.schema';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Types } from 'mongoose';
import { POOL_TYPE, STATUS_TYPE } from '../enums/sngp-type.enum';

@Schema({ timestamps: true, versionKey: false })
export class Sngp extends Document {
  @Prop({
    type: String,
    required: true,
  })
  name: string;

  @Prop({
    type: Number,
    required: true,
  })
  totalPoints: number;

  @Prop({
    type: Number,
    required: true,
  })
  rewardAmount: number;

  @Prop({
    type: Number,
    required: true,
  })
  multiplier: number;

  @Prop({ enum: STATUS_TYPE, default: STATUS_TYPE.INACTIVE })
  status: STATUS_TYPE;

  @Prop({ type: Types.ObjectId, ref: Admin.name, required: true })
  admin: Admin;

  @Prop({
    type: Number,
    required: true,
  })
  remainingPoints: number;

  @Prop({
    type: Date,
    required: true,
  })
  startDate: Date;

  @Prop({
    type: Date,
    default: null,
  })
  deletedAt: Date;

  @Prop({
    type: String,
  })
  countryCode: string;

  @Prop({
    type: String,
    default: POOL_TYPE.COUNTRY_POOL,
  })
  type: string;
}

export const SngpSchema = SchemaFactory.createForClass(Sngp);
