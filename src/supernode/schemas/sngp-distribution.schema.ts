import { Admin } from '@/src/admin/schemas/admin.schema';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Date, Document, Types } from 'mongoose';
import { DISTRIBUTION_STATUS_TYPE } from '../enums/sngp-distribution.enum';

import { Sngp } from './sngp.schema';

@Schema({ timestamps: true, versionKey: false })
export class SngpDistribution extends Document {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: Sngp.name,
    required: true,
  })
  sngp: Sngp;

  @Prop({
    type: Date,
  })
  drawDate: Date;

  @Prop({
    type: Number,
    required: true,
  })
  noOfParticipants: number;

  @Prop({ enum: DISTRIBUTION_STATUS_TYPE, required: true })
  status: DISTRIBUTION_STATUS_TYPE;

  @Prop({
    type: Types.ObjectId,
    ref: Admin.name,
  })
  admin: Admin;

  @Prop({
    type: Date,
    default: null,
  })
  deletedAt: Date;
}

export const SngpDistributionSchema =
  SchemaFactory.createForClass(SngpDistribution);
