import { Token } from '@/src/token/schemas/token.schema';
import { User } from '@/src/users/schemas/user.schema';
import { Wallet } from '@/src/wallet/schemas/wallet.schema';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import * as mongoose from 'mongoose';
import { TransactionStatus } from '../../global/enums/transaction.status.enum';

@Schema({ timestamps: true, versionKey: false })
export class WallekStake extends Document {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: User.name,
    required: true,
  })
  user: mongoose.Types.ObjectId;

  @Prop({
    type: String,
    required: true,
  })
  userBid: string;

  @Prop({
    type: Number,
    required: true,
  })
  amount: number;

  @Prop({
    type: Number,
    required: true,
  })
  tokenPrice: number;
  @Prop({
    type: Number,
    required: true,
  })
  tokenAmount: number;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: Token.name,
    required: true,
  })
  token: mongoose.Types.ObjectId;

  @Prop({
    type: Boolean,
    default: false,
  })
  isClaimed: boolean;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: Wallet.name,
    required: true,
  })
  wallet: mongoose.Types.ObjectId;

  @Prop({
    type: Date,
    required: true,
  })
  expiryDate: Date;

  //! Number Of Months
  @Prop({
    type: Number,
    required: true,
    default: 0,
  })
  stakedPeriod: number | null;

  @Prop({
    type: Date,
    required: true,
    default: Date.now,
  })
  startStakedDate: Date;

  @Prop({
    type: Date,
    required: true,
    default: Date.now,
  })
  endStakedDate: Date;

  //! Number Of Months
  @Prop({
    type: Number,
    default: 0,
  })
  lockupPeriod: number;

  @Prop({
    type: String,
    enum: TransactionStatus,
  })
  status: string;

  @Prop({ type: Date, default: null })
  deletedAt: Date;

  @Prop({ type: mongoose.Schema.Types.Mixed, default: {} })
  meta?: Record<string, any>;
}

export const WallekStakeSchema = SchemaFactory.createForClass(WallekStake);
