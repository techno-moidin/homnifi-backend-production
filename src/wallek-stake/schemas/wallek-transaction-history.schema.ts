import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import * as mongoose from 'mongoose';
import { TransactionStatus } from '../../global/enums/transaction.status.enum';
import { WallekStake } from './wallek-stake.schema';
import { Token } from '@/src/token/schemas/token.schema';
import { StakeSettings } from './stake-settings.schema';

@Schema({ timestamps: true, versionKey: false })
export class WallekTransactionHistory extends Document {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  })
  user: mongoose.Schema.Types.ObjectId;

  @Prop({
    type: String,
    required: true,
  })
  bid: string;

  @Prop({
    default: null,
    type: String,
  })
  deposit_id: string;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: Token.name,
    required: true,
  })
  toToken: mongoose.Types.ObjectId;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: Token.name,
    required: true,
  })
  fromToken: mongoose.Types.ObjectId;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: StakeSettings.name,
    required: true,
  })
  stakeSettings: mongoose.Types.ObjectId;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: WallekStake.name,
    required: true,
  })
  stake: mongoose.Types.ObjectId;

  @Prop({
    type: Date,
    required: true,
  })
  stakeExpiryDate: Date;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Wallet',
    required: true,
  })
  wallek: mongoose.Schema.Types.ObjectId;

  @Prop({
    type: Date,
    required: true,
    default: Date.now,
  })
  claimDate: Date;

  @Prop({
    type: String,
    enum: TransactionStatus,
    default: TransactionStatus.SUCCESS,
  })
  status: string;

  @Prop({
    type: Number,
    required: true,
  })
  amount: number;

  @Prop({ type: Date, default: null })
  deletedAt: Date;
  @Prop({ type: mongoose.Schema.Types.Mixed, default: {} })
  meta?: Record<string, any>;
}

export const WallekTransactionHistorySchema = SchemaFactory.createForClass(
  WallekTransactionHistory,
);
