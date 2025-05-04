import { User } from '@/src/users/schemas/user.schema';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Date, Document, Types } from 'mongoose';
import { REWARD_STATUS_TYPE } from '../enums/sngp-rewards.enum';
import { Sngp } from './sngp.schema';
import { Wallet } from '@/src/wallet/schemas/wallet.schema';
import { WalletTransaction } from '@/src/wallet/schemas/wallet.transaction.schema.';
import { number } from 'zod';
import { LostReason } from '../enums/sngp-lost-reason.enum';

@Schema({ timestamps: true, versionKey: false })
export class SngpRewards extends Document {
  @Prop({ type: Types.ObjectId, ref: User.name, required: true })
  user: User;

  @Prop({ type: Types.ObjectId, ref: Sngp.name, required: true })
  sngp: Sngp;

  @Prop({
    type: Number,
    required: true,
  })
  totalSngpPoints: number;

  @Prop({
    type: Number,
    required: true,
  })
  reward: number;

  @Prop({
    type: Number,
    required: true,
  })
  tokenPrice: number;

  @Prop({
    type: Number,
    required: true,
  })
  rewardAmountUSD: number;

  @Prop({ enum: REWARD_STATUS_TYPE, required: true })
  status: REWARD_STATUS_TYPE;

  @Prop({ type: Types.ObjectId, ref: Wallet.name, default: null })
  toWallet: Wallet;

  @Prop({ type: Types.ObjectId, ref: WalletTransaction.name, default: null })
  walletTrx: WalletTransaction;

  @Prop({
    type: Object,
    required: true,
  })
  meta: object;

  @Prop({
    type: Date,
    default: null,
  })
  claimedAt: Date;

  @Prop({ type: Boolean, default: true })
  receivable: boolean;

  @Prop({ enum: LostReason })
  lostReason?: LostReason;

  @Prop({
    type: String,
    required: false,
  })
  remark?: string;

  @Prop({
    type: Date,
    default: null,
  })
  deletedAt: Date;
}

export const SngpRewardsSchema = SchemaFactory.createForClass(SngpRewards);
