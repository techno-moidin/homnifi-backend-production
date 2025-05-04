import { User } from '../../users/schemas/user.schema';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Model, Types } from 'mongoose';
import { Wallet } from './wallet.schema';
import { WalletTransaction } from './wallet.transaction.schema.';
import { TransactionStatus } from '../../global/enums/transaction.status.enum';
import { setDecimalPlaces } from '@/src/utils/helpers';
import { OnChainWallet } from './on.chain.wallet.schema';
import { DepositSetting } from '@/src/token/schemas/deposit.settings.schema';
import { AmountType } from '@/src/global/enums/amount.type.enum';
import {
  Platform,
  PlatformSchema,
} from '@/src/platform/schemas/platform.schema';
import { Token } from '@/src/token/schemas/token.schema';
import { Network } from '@/src/token/schemas/network.schema';
import { DepositAndStakeSettings } from '@/src/token/schemas/depositAndStackSettings.schema';
import { Deposit_Transaction_Type } from '@/src/global/enums/trx.type.enum';
import { SNBonusTransaction } from '@/src/supernode/schemas/sn-bonus-transaction.schema';

@Schema({
  timestamps: true,
  versionKey: false,
  toJSON: {
    virtuals: true,
    transform(doc, ret, options) {
      delete ret._id;
      delete ret.createdAt;
      delete ret.updatedAt;
      delete ret.toWalletTrx;
      delete ret.externalTransactionId;
      delete ret.hash;
    },
  },
})
export class DepositTransactionHistory extends Document {
  @Prop({
    default: null,
    type: mongoose.Schema.Types.ObjectId,
  })
  deposit_id: mongoose.Schema.Types.ObjectId;

  @Prop({ default: null, type: Number })
  serialNumber: number;

  @Prop({ default: null, type: String })
  requestId: string;

  @Prop({
    default: null,
    type: mongoose.Schema.Types.ObjectId,
    ref: User.name,
    immutable: true,
  })
  user: mongoose.Schema.Types.ObjectId;

  @Prop({
    default: null,
    type: mongoose.Schema.Types.ObjectId,
    ref: Token.name,
  })
  fromToken: Types.ObjectId;

  @Prop({
    default: null,
    type: mongoose.Schema.Types.ObjectId,
    ref: User.name,
  })
  fromUser: mongoose.Schema.Types.ObjectId;

  @Prop({ type: String })
  depositAddress: string;

  @Prop({
    default: null,
    type: mongoose.Schema.Types.ObjectId,
    ref: Wallet.name,
    immutable: true,
  })
  toWallet: mongoose.Schema.Types.ObjectId;

  //Deposit and Stack Schema Properties Start =================================================================
  @Prop({
    default: null,
    type: mongoose.Schema.Types.ObjectId,
    ref: Token.name,
  })
  toToken: Types.ObjectId;

  @Prop({
    default: null,
    type: Number,
    set: (value) => setDecimalPlaces(value, AmountType.TOKEN),
  })
  totalAmount: number;

  @Prop({
    default: null,
    type: String,
  })
  status: string;

  @Prop({
    default: null,
    type: mongoose.Schema.Types.ObjectId,
    ref: DepositAndStakeSettings.name,
  })
  depositAndStakeSettings: Types.ObjectId;

  @Prop({
    default: null,
    type: Object,
  })
  meta: object;

  @Prop({ default: null, type: Date })
  expiredAt: Date;

  // Deposit and Stake transactions END =================================================================

  @Prop({
    default: null,
    type: mongoose.Schema.Types.ObjectId,
    ref: OnChainWallet.name,
  })
  onChainWallet: OnChainWallet;

  @Prop({
    default: null,
    type: mongoose.Schema.Types.ObjectId,
    ref: WalletTransaction.name,
    immutable: true,
  })
  toWalletTrx: mongoose.Schema.Types.ObjectId;

  @Prop({
    default: null,
    type: mongoose.Schema.Types.ObjectId,
    ref: Token.name,
  })
  token?: mongoose.Schema.Types.ObjectId;

  @Prop({
    default: null,
    type: mongoose.Schema.Types.ObjectId,
    ref: Network.name,
  })
  network?: mongoose.Schema.Types.ObjectId;

  @Prop({
    default: null,
    type: String,
    enum: Deposit_Transaction_Type,
  })
  from: string;

  @Prop({
    default: null,
    type: String,
  })
  type?: string;

  @Prop({
    default: null,
    type: String,
    required: false,
    index: true,
  })
  blockchainId: string;

  @Prop({
    required: false,
    type: Number,
    default: 0,
    set: (value) => setDecimalPlaces(value, AmountType.TOKEN),
  })
  fromAmount: number;

  @Prop({
    required: false,
    default: null,
    type: Number,
    set: (value) => setDecimalPlaces(value, AmountType.TOKEN),
  })
  amount: number;

  @Prop({
    required: false,
    default: 0,
    type: Number,
    set: (value) => setDecimalPlaces(value, AmountType.TOKEN),
  })
  currentRateInUSD: number;

  @Prop({
    required: false,
    default: 0,
    type: Number,
    set: (value) => setDecimalPlaces(value, AmountType.TOKEN),
  })
  convertedRateInUSD: number;

  @Prop({
    enum: TransactionStatus,
    default: null,
    type: String,
  })
  transactionStatus: string;

  @Prop({
    // required: true,
    default: null,
    type: String,
  })
  confirmation: string;

  @Prop({
    default: null,
    type: mongoose.Schema.Types.Mixed,
  })
  hash: string | string[];

  @Prop({
    default: null,
    type: String,
  })
  remarks: string;

  @Prop({
    type: String,
  })
  note?: string;

  @Prop({
    default: null,
    type: mongoose.Schema.Types.ObjectId,
    ref: DepositSetting.name,
  })
  settingsUsed: DepositSetting;

  @Prop({ default: null, type: Number })
  newBalance: number;

  @Prop({
    default: null,
    type: mongoose.Schema.Types.ObjectId,
    ref: Platform.name,
  })
  platform: mongoose.Schema.Types.ObjectId;

  @Prop({ default: null, type: Number })
  previousBalance: number;

  @Prop({ type: Boolean, default: false })
  isOnChainDeposit: boolean;

  @Prop({ type: String, default: '', required: false })
  optionalRemarks: string;

  @Prop({ default: null })
  deletedAt?: Date;
}

export const DepositTransactionHistorySchema = SchemaFactory.createForClass(
  DepositTransactionHistory,
);

DepositTransactionHistorySchema.index({ user: 1, createdAt: -1 });
DepositTransactionHistorySchema.index({ toWallet: 1, createdAt: -1 });
DepositTransactionHistorySchema.index({ token: 1, createdAt: -1 });
DepositTransactionHistorySchema.index({ network: 1, createdAt: -1 });
DepositTransactionHistorySchema.index({ transactionStatus: 1, createdAt: -1 });
DepositTransactionHistorySchema.index({ user: 1, token: 1, createdAt: -1 });
DepositTransactionHistorySchema.index({
  user: 1,
  transactionStatus: 1,
  createdAt: -1,
});
DepositTransactionHistorySchema.index({ blockchainId: 1 });

DepositTransactionHistorySchema.index({ requestId: 1 }); // index on requestId for quick lookups
DepositTransactionHistorySchema.index({ status: 1 }); // index on status for faster filtering by transaction status
