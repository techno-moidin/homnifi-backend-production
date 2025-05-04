import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { UsdkStakeTypeEnum } from '../enums/db.enums';
import { User } from '@/src/users/schemas/user.schema';
import { CloudKMachine } from '@/src/cloud-k/schemas/cloudk-machine.schema';
import { Token } from '@/src/token/schemas/token.schema';
import { Wallet } from '@/src/wallet/schemas/wallet.schema';
import { WalletTransaction } from '@/src/wallet/schemas/wallet.transaction.schema.';

@Schema({ timestamps: true, versionKey: false })
export class UsdkStakeTransactions extends Document {
  @Prop({
    enum: UsdkStakeTypeEnum,
    required: true,
  })
  type: UsdkStakeTypeEnum;

  @Prop({
    required: true,
    type: Number,
  })
  amount: number;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: User.name })
  user: mongoose.Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: CloudKMachine.name })
  machine: mongoose.Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: Token.name })
  fromToken: mongoose.Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: Wallet.name })
  fromWallet: mongoose.Types.ObjectId;

  @Prop({
    // required: true,
    type: Number,
  })
  previousWalletBalance: number;

  @Prop({
    // required: true,
    type: Number,
  })
  newWalletBalance: number;

  @Prop({
    // required: true,
    type: Number,
  })
  currentgasUsdkLimit: number;

  @Prop({
    // required: true,
    type: Number,
  })
  usedGasUsdkBefore: number;

  @Prop({
    // required: true,
    type: Number,
  })
  mlykColletral: number;

  @Prop({
    // required: true,
    type: Number,
  })
  previousUsdKColletral: number;

  @Prop({
    // required: true,
    type: Number,
  })
  newUsdKColletral: number;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: WalletTransaction.name })
  walletTransaction: mongoose.Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.Mixed, default: null, required: false })
  meta?: Record<string, any>;

  @Prop({ default: null, type: Date })
  deletedAt: Date;
}

export const UsdkStakeTransactionsSchema = SchemaFactory.createForClass(
  UsdkStakeTransactions,
);
