import { User } from '@/src/users/schemas/user.schema';
import { setDecimalPlaces } from '@/src/utils/helpers';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Types } from 'mongoose';

import { Token } from '@/src/token/schemas/token.schema';
import { AmountType } from '@/src/global/enums/amount.type.enum';

import { WithdrawTransaction } from '@/src/wallet/schemas/withdraw.transaction.schema';
import { UsdkStakeReward } from '@/src/usdk-stake/schemas/usdkStakeReward.schema';
import { UsdkStakeTransactions } from '@/src/usdk-stake/schemas/usdkStakeTransaction.schema';
import { CloudKMachine } from '@/src/cloud-k/schemas/cloudk-machine.schema';

export enum UsdkTransactionTypes {
  DAILY_REWARD = 'daily-reward',
  AC_DEBIT = 'ac-debit',
  REWARDS_CLAIMED = 'rewards-claimed',
  ADD_STAKE = 'add-stake',
  SWAPPED = 'swapped',
}

@Schema({ timestamps: true, versionKey: false })
export class UsdkStakeTransactionHistory extends Document {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: User.name,
    required: true,
  })
  user: User;

  @Prop({
    enum: UsdkTransactionTypes,
    required: true,
  })
  type: UsdkTransactionTypes;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: CloudKMachine.name,
    required: false,
  })
  machine: CloudKMachine;

  @Prop({
    type: Number,
    required: true,
    set: (value) => setDecimalPlaces(value, AmountType.TOKEN),
  })
  tokenAmount: number; // total token

  @Prop({
    type: Number,
    set: (value) => setDecimalPlaces(value, AmountType.DOLLAR),
  })
  totalTokenPrice: number; // dollar value of token

  @Prop({
    type: Number,
    default: null,
  })
  lykPrice: number; //

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: Token.name,
    required: false,
  })
  token: Token;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: UsdkStakeTransactions.name,
  })
  stake: UsdkStakeTransactions;

  @Prop({
    type: String,
  })
  note: string;

  @Prop({
    default: null,
    type: String,
  })
  remark?: string;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: UsdkStakeReward.name,
  })
  reward: UsdkStakeReward;

  @Prop({ default: null, type: Date })
  deletedAt: Date;

  @Prop({ type: mongoose.Schema.Types.Mixed, default: null, required: false })
  meta?: Record<string, any>;
}

export const UsdkStakeTransactionHistorySchema = SchemaFactory.createForClass(
  UsdkStakeTransactionHistory,
);

// Add indexes
UsdkStakeTransactionHistorySchema.index({ user: 1 }); // Index for user lookups
UsdkStakeTransactionHistorySchema.index({ type: 1 }); // Index for transaction type queries
UsdkStakeTransactionHistorySchema.index({ machine: 1 }); // Index for machine lookups
UsdkStakeTransactionHistorySchema.index({ token: 1 }); // Index for token lookups
UsdkStakeTransactionHistorySchema.index({ stake: 1 }); // Index for stake lookups
UsdkStakeTransactionHistorySchema.index({ reward: 1 }); // Index for reward lookups
UsdkStakeTransactionHistorySchema.index({ createdAt: -1 }); // Index for timestamp sorting
UsdkStakeTransactionHistorySchema.index({ deletedAt: 1 }); // Index for soft delete queries

// Compound indexes for common query patterns
UsdkStakeTransactionHistorySchema.index({ user: 1, type: 1 }); // For getting specific transaction types for a user
UsdkStakeTransactionHistorySchema.index({ user: 1, createdAt: -1 }); // For getting user's transactions by date
UsdkStakeTransactionHistorySchema.index({ machine: 1, type: 1 }); // For getting specific transaction types for a machine
