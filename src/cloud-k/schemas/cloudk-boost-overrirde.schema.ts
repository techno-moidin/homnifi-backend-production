import { setDecimalPlaces } from '@/src/utils/helpers';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';

@Schema({ timestamps: true, versionKey: false })
export class CloudKOverrideBoost extends Document {
  @Prop({
    required: true,
    type: Date,
  })
  startTime: Date;

  @Prop({
    required: true,
    type: Date,
  })
  endTime: Date;

  @Prop({
    required: true,
    type: Boolean,
  })
  enabled: boolean;

  @Prop({
    required: true,
    type: Number,
  })
  boost: number;
}

export const CloudKOverrideBoostSchema =
  SchemaFactory.createForClass(CloudKOverrideBoost);
