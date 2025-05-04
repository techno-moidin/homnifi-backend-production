import { Admin } from '@/src/admin/schemas/admin.schema';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Types } from 'mongoose';
import { DepositSettingsType } from '../enums/depositSettings-type-enum';
import { Network } from './network.schema';
import { Token } from './token.schema';

import {
  NetworkSettingsSchema,
  NetworkSettingsType,
} from '@/src/platform/schemas/network-settings.schema';
import { Platform } from '@/src/platform/schemas/platform.schema';

@Schema({
  timestamps: true,
  versionKey: false,
  toJSON: {
    versionKey: false,
    transform: function (doc, ret) {
      delete ret.__v;
      delete ret.createdAt;
      delete ret.updatedAt;
    },
  },
})
export class DepositSetting extends Document {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: Token.name,
    required: true,
    immutable: true,
  })
  fromToken: Types.ObjectId; // this will be onchain

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: Token.name,
    required: true,
    immutable: true,
  })
  toToken: Token;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: Platform.name,
    required: true,
  })
  platform: mongoose.Schema.Types.ObjectId;

  @Prop({ required: false, type: Number, default: 0 })
  minAmount: number;

  /**
   * If it -1 that means unlimited amount can be received
   */
  @Prop({ required: false, type: Number, default: -1 })
  maxAmount: number;

  @Prop({ required: false, type: Number, default: 0 })
  minDisplayAmount: number;

  @Prop({ type: [NetworkSettingsSchema], required: true })
  networks: NetworkSettingsType[];

  @Prop({ required: true, type: Boolean, default: true })
  isEnable: boolean;

  @Prop({ type: Boolean, default: false })
  isVisible: boolean;

  @Prop({ type: Boolean, default: true })
  isValidateMinAmount: boolean;

  @Prop({ type: Boolean, default: false })
  isOnChainDeposit: boolean;

  @Prop({ type: Boolean, default: false })
  isResetOnChainAttemps: boolean;

  @Prop({ type: Date, default: null })
  resetOnChainAt: Date;

  @Prop({ type: Number, default: 0 })
  onChainAttemptCount: number;

  @Prop({ type: Number, default: 0 })
  conversionRate: number;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: Admin.name })
  updatedBy: Types.ObjectId;

  @Prop({ type: Date, default: null })
  deletedAt: Date;

  @Prop({
    type: String,
    enum: DepositSettingsType,
    default: DepositSettingsType.DEPOSIT_AND_KEEP,
  })
  type: DepositSettingsType;
}

export const DepositSettingSchema =
  SchemaFactory.createForClass(DepositSetting);
