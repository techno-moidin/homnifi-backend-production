import { User } from '@/src/users/schemas/user.schema';
import { setDecimalPlaces } from '@/src/utils/helpers';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Types } from 'mongoose';
import { CloudKMachine } from './cloudk-machine.schema';
import { Token } from '@/src/token/schemas/token.schema';
import { AmountType } from '@/src/global/enums/amount.type.enum';
import { CloudKMachineStake } from './cloudk-machine-stakes.schema';
import { CloudKReward } from './cloudk-reward.schema';
import { WithdrawTransaction } from '@/src/wallet/schemas/withdraw.transaction.schema';
import { GenExtraRewardHistory } from './gen-extra-reward-history.schema';
import { UsdkStakeReward } from '@/src/usdk-stake/schemas/usdkStakeReward.schema';
import { UsdkStakeTransactions } from '@/src/usdk-stake/schemas/usdkStakeTransaction.schema';

export enum CloudKTransactionTypes {
  DAILY_REWARD = 'daily-reward',
  AC_DEBIT = 'ac-debit',
  REWARDS_CLAIMED = 'rewards-claimed',
  ADD_STAKE = 'add-stake',
  STAKE_AND_BURN = 'stake-and-burn',
  REMOVE_STAKE = 'remove-stake',
  MACHINE_PURCHASE = 'machine-purchase',
  SWAPPED = 'swapped',
  // New
  DAILY_REWARD_OVERREACHED = 'daily-reward-limit-reached',
  TRANSFER_REWARD = 'transfer-reward',
  DAILY_REWARDS_EXHAUSTED = 'daily-reward-exhausted',
  TRANSFER_REWARD_OVERREACHED = 'transfer-reward-limit-reached',

  // Minter connect
  MINTER_CONNECTED = 'minter-connected',
  //Additional Minting Power
  ADDITIONAL_MINTING_POWER_REWARD = 'additional-minting-power-reward',

  ACTIVE_GEN_REWARD = 'active-gen-reward',
  T_BALANCE_PURCHASED = 't-balance-purchased',
  USDK_DAILY_REWARD = 'usdk-daily-reward',
  USDK_CLAIMED_REWARD = 'usdk-claimed-reward',
  USDK_CLAIMED_REWARD_SWAPPED = 'usdk-claimed-reward-swapped',
}

export enum cloudKTransactionRemarks {
  DAILY_REWARDS_EXHAUSTED = 'All your machines have exhausted their linking limits. Purchase a new machine to continue earning 100% rewards.',
}

@Schema({ timestamps: true, versionKey: false })
export class CloudKTransactions extends Document {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: User.name,
    required: true,
  })
  user: User;

  @Prop({
    enum: CloudKTransactionTypes,
    required: true,
  })
  type: CloudKTransactionTypes;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: CloudKMachine.name,
    required: false,
  })
  machine: CloudKMachine;

  @Prop({
    type: Types.ObjectId,
    ref: CloudKMachine.name,
    required: false,
    default: null,
  })
  fromMachine: CloudKMachine;

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
    ref: CloudKMachineStake.name,
  })
  stake: CloudKMachineStake;

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
    type: String,
    default: null,
  })
  stakeType?: string;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: CloudKReward.name,
  })
  reward: CloudKReward;

  // Additional Minting parameters
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    default: null,
    required: false,
  })
  additionalMintingRewardId?: mongoose.Schema.Types.ObjectId;

  @Prop({
    type: Number,
    default: null,
    required: false,
  })
  additionalMintingPowerPercentage: number;

  // Gen Active Reward

  @Prop({
    type: Number,
    default: null,
    required: false,
  })
  genRewardPercentage: number;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    default: null,
    required: false,
  })
  actveGenRewardId: mongoose.Schema.Types.ObjectId;
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: UsdkStakeReward.name,
  })
  usdkReward: UsdkStakeReward;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: UsdkStakeTransactions.name,
  })
  usdkStake: UsdkStakeTransactions;

  @Prop({ default: null, type: Date })
  deletedAt: Date;

  @Prop({ type: mongoose.Schema.Types.Mixed, default: null, required: false })
  meta?: Record<string, any>;
}

export const CloudKTransactionsSchema =
  SchemaFactory.createForClass(CloudKTransactions);

// Add indexes
CloudKTransactionsSchema.index({ user: 1 }); // Index for user lookups
CloudKTransactionsSchema.index({ type: 1 }); // Index for transaction type queries
CloudKTransactionsSchema.index({ machine: 1 }); // Index for machine lookups
CloudKTransactionsSchema.index({ fromMachine: 1 }); // Index for fromMachine lookups
CloudKTransactionsSchema.index({ token: 1 }); // Index for token lookups
CloudKTransactionsSchema.index({ stake: 1 }); // Index for stake lookups
CloudKTransactionsSchema.index({ reward: 1 }); // Index for reward lookups
CloudKTransactionsSchema.index({ createdAt: -1 }); // Index for timestamp sorting
CloudKTransactionsSchema.index({ deletedAt: 1 }); // Index for soft delete queries

// Compound indexes for common query patterns
CloudKTransactionsSchema.index({ user: 1, type: 1 }); // For getting specific transaction types for a user
CloudKTransactionsSchema.index({ user: 1, createdAt: -1 }); // For getting user's transactions by date
CloudKTransactionsSchema.index({ machine: 1, type: 1 }); // For getting specific transaction types for a machine
