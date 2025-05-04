import { User } from '../../users/schemas/user.schema';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Model } from 'mongoose';
import { Wallet } from './wallet.schema';
import { WalletTransaction } from './wallet.transaction.schema.';
import { ChargesType } from '../../global/enums/charges.type.enum';
import { setDecimalPlaces } from '@/src/utils/helpers';
import { SwapSetting } from '@/src/token/schemas/swap.settings.schema';
import { AmountType } from '@/src/global/enums/amount.type.enum';
import { Platform } from '@/src/platform/schemas/platform.schema';
import { Swap_SpecialSwap_Type } from '../enums/swap-specialSwap.enum';

@Schema({ timestamps: true, versionKey: false })
export class SwapTransactionHistory extends Document {
  @Prop({ default: null, type: mongoose.Schema.Types.ObjectId })
  swap_id: mongoose.Schema.Types.ObjectId;

  @Prop({ default: null, type: Number })
  serialNumber: number;

  @Prop({ default: null, type: String })
  requestId: string;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: User.name,
    default: null,
    immutable: true,
  })
  user: mongoose.Schema.Types.ObjectId;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: Wallet.name,
    default: null,
    immutable: true,
  })
  fromWallet: mongoose.Schema.Types.ObjectId;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: Wallet.name,
    default: null,
    immutable: true,
  })
  toWallet: mongoose.Schema.Types.ObjectId;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: WalletTransaction.name,
    default: null,
    immutable: true,
  })
  fromWalletTrx: mongoose.Schema.Types.ObjectId;

  @Prop({
    type: String,
    enum: Swap_SpecialSwap_Type,
  })
  type: string;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: WalletTransaction.name,
    default: null,
    immutable: true,
  })
  toWalletTrx: mongoose.Schema.Types.ObjectId;

  @Prop({
    default: 0,
    type: Number,
    set: (value) => setDecimalPlaces(value, AmountType.TOKEN),
  })
  amount: number;

  @Prop({
    type: Number,
    default: 0,
  })
  bonus: number;

  @Prop({
    type: Number,
    default: 0,
  })
  actualAmount: number;

  @Prop({
    type: Number,
    set: (value) => setDecimalPlaces(value, AmountType.TOKEN),
    default: 0,
  })
  swapAmount?: number;

  @Prop({
    default: 0,
    type: Number,
    set: (value) => setDecimalPlaces(value, AmountType.TOKEN),
  })
  total: number;

  @Prop({
    type: Number,
    set: (value) => setDecimalPlaces(value, AmountType.TOKEN),
    default: 0,
  })
  fee: number;

  @Prop({ enum: ChargesType, type: String, default: null })
  feeType: string;

  @Prop({
    type: Number,
    set: (value) => setDecimalPlaces(value, AmountType.TOKEN),
    default: 0,
  })
  commission: number;

  @Prop({ enum: ChargesType, type: String })
  commissionType: string;

  @Prop({ type: Number })
  tokenPrice: number;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: SwapSetting.name })
  settingsUsed: SwapSetting;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: Platform.name,
    default: null,
  })
  platform: mongoose.Schema.Types.ObjectId;

  @Prop({ type: Number })
  newBalance: number;

  @Prop({ type: Number })
  previousBalance: number;

  @Prop({ type: Number, default: null })
  newBalanceOfToToken: number;

  @Prop({ type: Number, default: null })
  previousBalanceOfToToken: number;

  @Prop({ default: null })
  deletedAt?: Date;
}

export const SwapTransactionHistorySchema = SchemaFactory.createForClass(
  SwapTransactionHistory,
);
