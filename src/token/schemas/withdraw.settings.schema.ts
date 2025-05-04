import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, InferSchemaType, Types } from 'mongoose';
import { Token } from './token.schema';
import { Admin } from '@/src/admin/schemas/admin.schema';
import { ChargesType } from '@/src/global/enums/charges.type.enum';
import { WITHDRAW_TYPES } from '../enums/withdraw-types.enum';
import { boolean } from 'zod';

import { Platform } from '@/src/platform/schemas/platform.schema';
import {
  NetworkSettingsSchema,
  NetworkSettingsType,
} from '@/src/platform/schemas/network-settings.schema';

@Schema({
  timestamps: true,
  versionKey: false,
})
export class WithdrawSetting extends Document {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: Token.name,
    required: true,
    immutable: true,
  })
  fromToken: Token;

  @Prop({
    enum: WITHDRAW_TYPES,
    required: true,
  })
  type: string;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: Token.name,
    required: true,
    immutable: true,
  })
  toToken: Token; // this will be onchain

  @Prop({ type: [NetworkSettingsSchema], required: true })
  networks: NetworkSettingsType[];

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: Token.name,
  })
  receiveToken: Token; // this will be onchain

  @Prop({ required: true, type: Number })
  minAmount: number; // in dollars

  /**
   * If it -1 that means unlimited amount can be received
   */
  @Prop({ required: false, type: Number, default: -1 })
  maxAmount: number; // in dollars

  @Prop({ required: true, type: Number })
  minDisplayAmount: number;

  @Prop({ required: true, type: Number, default: 300 })
  minWithdrawableAmount: number;

  /**
   * fee No longer using since we are storing the min amount under the Networks
   * Attribute will be removed
   * @deprecated
   */
  @Prop({ required: false, type: Number, default: 0 })
  fee: number; // in dollars

  /**
   * feeType No longer using since we are storing the min amount under the Networks
   * Attribute will be removed
   * @deprecated
   */
  @Prop({
    enum: ChargesType,
    required: false,
  })
  feeType: ChargesType;

  /**
   * commission No longer using since we are storing the min amount under the Networks
   * Attribute will be removed
   * @deprecated
   */
  @Prop({ required: false, type: Number, default: 0 })
  commission: number; // in dollars

  /**
   * commissionType No longer using since we are storing the min amount under the Networks
   * Attribute will be removed. and do use for any business logic
   * @deprecated
   */
  @Prop({
    enum: ChargesType,
    required: false,
  })
  commissionType: ChargesType;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: Platform.name,
    required: true,
  })
  platform: mongoose.Schema.Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: Admin.name })
  updatedBy: Types.ObjectId;

  @Prop({ type: boolean, default: true })
  isEnable: boolean;

  @Prop({ type: boolean, default: false })
  isVisible: boolean;

  @Prop({ type: Date, default: null })
  deletedAt: Date;

  @Prop({ type: Date, default: null })
  updatedAt: Date;
}

export const WithdrawSettingSchema =
  SchemaFactory.createForClass(WithdrawSetting);
