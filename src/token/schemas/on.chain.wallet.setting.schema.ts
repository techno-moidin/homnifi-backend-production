import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Types } from 'mongoose';

export enum OnChainWalletSettingStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

@Schema({ timestamps: true, versionKey: false })
export class OnChainWalletSetting extends Document {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  })
  depositSetting: Types.ObjectId;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  })
  token: Types.ObjectId;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  })
  network: Types.ObjectId;

  @Prop({ required: false, type: Number, default: 5 })
  maxAttempts: number;

  @Prop({
    type: String,
    enum: OnChainWalletSettingStatus,
    default: OnChainWalletSettingStatus.ACTIVE,
  })
  status: OnChainWalletSettingStatus;

  @Prop({ type: Date, default: null })
  deletedAt: Date;
}

export const OnChainWalletSettingSchema =
  SchemaFactory.createForClass(OnChainWalletSetting);
