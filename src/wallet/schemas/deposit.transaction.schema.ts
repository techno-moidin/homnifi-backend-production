import { User } from '../../users/schemas/user.schema';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Model, Types } from 'mongoose';
import { Wallet } from './wallet.schema';
import { WalletTransaction } from './wallet.transaction.schema.';
import { TransactionStatus } from '../../global/enums/transaction.status.enum';
import { setDecimalPlaces } from '@/src/utils/helpers';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '@/src/app.module';
import { OnChainWallet } from './on.chain.wallet.schema';
import { DepositSetting } from '@/src/token/schemas/deposit.settings.schema';
import { AmountType } from '@/src/global/enums/amount.type.enum';
import {
  Platform,
  PlatformSchema,
} from '@/src/platform/schemas/platform.schema';
import { PLATFORMS } from '@/src/global/enums/wallet.enum';
import { array, boolean } from 'zod';
import { Token } from '@/src/token/schemas/token.schema';
import { Network } from '@/src/token/schemas/network.schema';
import { SNBonusTransaction } from '@/src/supernode/schemas/sn-bonus-transaction.schema';
function transformToArray(value: string | string[]): string[] {
  return Array.isArray(value) ? value : [value];
}
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
export class DepositTransaction extends Document {
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
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: Token.name })
  fromToken: Types.ObjectId;
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: User.name,
  })
  fromUser: mongoose.Schema.Types.ObjectId;
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: Wallet.name,
    required: true,
    immutable: true,
  })
  toWallet: mongoose.Schema.Types.ObjectId;
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: OnChainWallet.name,
  })
  onChainWallet: OnChainWallet;
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: WalletTransaction.name,
    immutable: true,
  })
  toWalletTrx: mongoose.Schema.Types.ObjectId;
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: Token.name,
    default: null,
  })
  token?: mongoose.Schema.Types.ObjectId;
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: Network.name,
    default: null,
  })
  network?: mongoose.Schema.Types.ObjectId;
  // Search Keys Start
  @Prop({
    type: String,
    required: false,
    index: true,
    default: null,
  })
  blockchainId: string;
  // @Prop({
  //   type: String,
  //   default: null,
  // })
  // email: string;
  // @Prop({
  //   type: String,
  //   default: null,
  // })
  // firstName: string;
  // @Prop({
  //   type: String,
  //   default: null,
  // })
  // lastName: string;
  // Search Keys End
  @Prop({
    required: false,
    default: 0,
    type: Number,
    set: (value) => setDecimalPlaces(value, AmountType.TOKEN),
  })
  fromAmount: number;

  @Prop({
    required: true,
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
    required: true,
    enum: TransactionStatus,
    default: TransactionStatus.PENDING,
    type: String,
  })
  transactionStatus: string;
  @Prop({
    // required: true,
    type: String,
  })
  confirmation: string;
  @Prop({
    type: mongoose.Schema.Types.Mixed,
  })
  hash: string | string[];
  @Prop({
    type: String,
  })
  remarks: string;
  @Prop({
    type: String,
  })
  note?: string;
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: DepositSetting.name })
  settingsUsed: DepositSetting;

  @Prop({ type: Number })
  newBalance: number;
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: Platform.name,
    default: null,
  })
  platform: mongoose.Schema.Types.ObjectId;
  @Prop({ type: Number })
  previousBalance: number;

  @Prop({ type: Boolean, default: false })
  isOnChainDeposit: boolean;

  @Prop({ type: String, default: '', required: false })
  optionalRemarks: string;

  @Prop({
    default: null,
    type: Object,
  })
  meta: object;

  @Prop({
    type: Types.ObjectId,
    ref: 'SNBonusTransaction',
    default: null,
    required: false,
  })
  @Prop({ type: Types.ObjectId, ref: 'SNBonusTransaction' })
  claimableList: Types.ObjectId[];

  @Prop({ default: null })
  deletedAt?: Date;
}
export const DepositTransactionSchema =
  SchemaFactory.createForClass(DepositTransaction);
DepositTransactionSchema.index({ user: 1, createdAt: -1 });
DepositTransactionSchema.index({ toWallet: 1, createdAt: -1 });
DepositTransactionSchema.index({ token: 1, createdAt: -1 });
DepositTransactionSchema.index({ network: 1, createdAt: -1 });
DepositTransactionSchema.index({ transactionStatus: 1, createdAt: -1 });
DepositTransactionSchema.index({ user: 1, token: 1, createdAt: -1 });
DepositTransactionSchema.index({
  user: 1,
  transactionStatus: 1,
  createdAt: -1,
});
DepositTransactionSchema.index(
  { blockchainId: 1 },
  { unique: true, sparse: true },
);
