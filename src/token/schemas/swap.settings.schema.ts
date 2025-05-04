import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Types } from 'mongoose';
import { Token } from './token.schema';
import { Admin } from '@/src/admin/schemas/admin.schema';
import { ChargesType } from '@/src/global/enums/charges.type.enum';
import { PLATFORMS } from '@/src/global/enums/wallet.enum';
import {
  NetworkSettingsSchema,
  NetworkSettingsType,
} from '@/src/platform/schemas/network-settings.schema';
import { Platform } from '@/src/platform/schemas/platform.schema';

@Schema({
  timestamps: true,
  versionKey: false,
})
export class SwapSetting extends Document {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: Token.name,
    required: true,
    immutable: true,
  })
  fromToken: Token;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: Token.name,
    required: true,
    immutable: true,
  })
  toToken: Token;

  // No longer used. since we are using this on platforms. it should be removed from the logical script.
  @Prop({ required: false, type: Number, default: 0 })
  minAmount: number;

  @Prop({ required: false, type: Number, default: 0 })
  maxAmount: number;

  @Prop({ required: true, type: Number, default: 0 })
  commission: number;

  @Prop({
    enum: ChargesType,
    required: true,
  })
  commissionType: ChargesType;

  @Prop({
    required: true,
    type: Number,
    default: 1,
  })
  rate: number;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: Admin.name })
  updatedBy: Types.ObjectId;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: Platform.name,
    required: true,
  })
  platform: mongoose.Schema.Types.ObjectId;

  @Prop({ required: true, type: Boolean, default: true })
  isEnable: boolean;

  @Prop({ type: Date, default: null })
  deletedAt: Date;
}

export const SwapSettingSchema = SchemaFactory.createForClass(SwapSetting);
