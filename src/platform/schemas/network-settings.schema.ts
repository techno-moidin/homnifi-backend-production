import mongoose, { Document, InferSchemaType, Types } from 'mongoose';
import { Platform } from './platform.schema';
import { ChargesType } from '@/src/global/enums/charges.type.enum';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Network } from '@/src/token/schemas/network.schema';

@Schema({
  timestamps: false,
})
export class NetworkSettings extends Document {
  @Prop({
    type: Types.ObjectId,
    required: true,
    ref: Network.name,
  })
  networkId: Types.ObjectId;

  @Prop({
    type: String,
    enum: ChargesType,
    required: true,
  })
  commissionType: ChargesType;

  @Prop({
    type: Number,
    required: false,
    default: null,
  })
  commissionFixedValue: number;

  @Prop({
    type: Number,
    required: true,
  })
  commissionValue: number;

  @Prop({
    type: String,
    enum: ChargesType,
    required: true,
  })
  feeType: ChargesType;

  @Prop({
    type: Number,
    required: true,
  })
  feeValue: number;

  @Prop({
    type: Number,
    required: false,
    default: null,
  })
  feeFixedValue: number;
}
export const NetworkSettingsSchema =
  SchemaFactory.createForClass(NetworkSettings);

export type NetworkSettingsType = InferSchemaType<typeof NetworkSettingsSchema>;
