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

@Schema({ timestamps: true, versionKey: false })
export class SwapTransaction extends Document {
  @Prop({ unique: true, type: Number })
  serialNumber: number;

  @Prop({ unique: true, type: String })
  requestId: string;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: User.name,
    required: true,
    immutable: true,
  })
  user: mongoose.Schema.Types.ObjectId;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: Wallet.name,
    required: true,
    immutable: true,
  })
  fromWallet: mongoose.Schema.Types.ObjectId;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: Wallet.name,
    required: true,
    immutable: true,
  })
  toWallet: mongoose.Schema.Types.ObjectId;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: WalletTransaction.name,
    required: true,
    immutable: true,
  })
  fromWalletTrx: mongoose.Schema.Types.ObjectId;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: WalletTransaction.name,
    required: true,
    immutable: true,
  })
  toWalletTrx: mongoose.Schema.Types.ObjectId;

  @Prop({
    required: true,
    type: Number,
    set: (value) => setDecimalPlaces(value, AmountType.TOKEN),
  })
  amount: number;

  @Prop({
    type: Number,
  })
  bonus: number;

  @Prop({
    type: Number,
  })
  actualAmount: number;

  @Prop({
    type: Number,
    set: (value) => setDecimalPlaces(value, AmountType.TOKEN),
  })
  swapAmount?: number;

  @Prop({
    required: true,
    type: Number,
    set: (value) => setDecimalPlaces(value, AmountType.TOKEN),
  })
  total: number;

  @Prop({
    required: true,
    type: Number,
    set: (value) => setDecimalPlaces(value, AmountType.TOKEN),
    default: 0,
  })
  fee: number;

  @Prop({ enum: ChargesType, type: String })
  feeType: string;

  @Prop({
    required: true,
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
    // required: true,
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

export const SwapTransactionSchema =
  SchemaFactory.createForClass(SwapTransaction);
