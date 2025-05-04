import { User } from '../../users/schemas/user.schema';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Wallet } from './wallet.schema';
import { WalletTransaction } from './wallet.transaction.schema.';
import { ChargesType } from '../../global/enums/charges.type.enum';
import { setDecimalPlaces } from '@/src/utils/helpers';
import { SwapSetting } from '@/src/token/schemas/swap.settings.schema';
import { AmountType } from '@/src/global/enums/amount.type.enum';

@Schema({ timestamps: true, versionKey: false })
export class SpecialSwapTransaction extends Document {
  @Prop({ unique: true, type: Number })
  serialNumber: number;

  @Prop({ unique: true, type: String })
  requestId: string;

  @Prop({
    type: Types.ObjectId,
    ref: User.name,
    required: true,
    immutable: true,
  })
  user: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: Wallet.name,
    required: true,
    immutable: true,
  })
  fromWallet: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: Wallet.name,
    required: true,
    immutable: true,
  })
  toWallet: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: WalletTransaction.name,
    required: true,
    immutable: true,
  })
  fromWalletTrx: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: WalletTransaction.name,
    required: true,
    immutable: true,
  })
  toWalletTrx: Types.ObjectId;

  @Prop({
    required: true,
    type: Number,
    set: (value) => setDecimalPlaces(value, AmountType.TOKEN),
  })
  amount: number;

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

  @Prop({ type: Types.ObjectId, ref: SwapSetting.name })
  settingsUsed: SwapSetting;

  @Prop({ type: Number })
  newBalance: number;

  @Prop({ type: Number })
  previousBalance: number;

  @Prop({ type: Number })
  newBalanceOfToToken: number;

  @Prop({ type: Number })
  previousBalanceOfToToken: number;

  @Prop({ default: null })
  deletedAt?: Date;
}

export const SpecialSwapTransactionSchema = SchemaFactory.createForClass(
  SpecialSwapTransaction,
);
// Add indexes
SpecialSwapTransactionSchema.index({ requestId: 1 }, { unique: true }); // Unique index for requestId
SpecialSwapTransactionSchema.index({ user: 1 }); // Index for user
SpecialSwapTransactionSchema.index({ fromWallet: 1, toWallet: 1 }); // Compound index for fromWallet and toWallet
SpecialSwapTransactionSchema.index({ createdAt: 1 }); // Index for createdAt to optimize queries involving timestamps
SpecialSwapTransactionSchema.index({ deletedAt: 1 }); // Soft delete index
