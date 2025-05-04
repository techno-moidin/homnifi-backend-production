import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Types, Document } from 'mongoose';
import { Network } from './network.schema';
import { Token } from './token.schema';
import { Admin } from '@/src/admin/schemas/admin.schema';
import { Platform } from '@/src/platform/schemas/platform.schema';
import { number } from 'zod';

import {
  NetworkSettingsSchema,
  NetworkSettingsType,
} from '@/src/platform/schemas/network-settings.schema';

@Schema({
  timestamps: true,
  versionKey: false,
})
export class DepositAndStakeSettings extends Document {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: Token.name,
    required: true,
    immutable: true,
  })
  fromToken: Types.ObjectId;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: Token.name,
    required: true,
    immutable: true,
  })
  toToken: Token;

  @Prop({ type: [NetworkSettingsSchema], required: true })
  networks: NetworkSettingsType[];

  @Prop({ required: false, type: Number, default: 0 })
  minAmount: number;

  @Prop({ required: false, type: Number, default: 0 })
  minDisplayAmount: number;

  @Prop({ required: true, type: Boolean, default: true })
  isEnable: boolean;

  @Prop({ type: Boolean, default: false })
  isVisible: boolean;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: Platform.name })
  platform: Types.ObjectId;

  @Prop({ type: number })
  validityHours: number;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: Admin.name })
  updatedBy: Types.ObjectId;

  @Prop({ type: Date, default: null })
  deletedAt: Date;
}

export const DepositAndStakeSettingsSchema = SchemaFactory.createForClass(
  DepositAndStakeSettings,
);
