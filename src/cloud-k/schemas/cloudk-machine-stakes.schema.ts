import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, ObjectId, Types } from 'mongoose';
import { CloudKMachine } from './cloudk-machine.schema';
import { setDecimalPlaces } from '@/src/utils/helpers';
import { User } from '@/src/users/schemas/user.schema';
import { AmountType } from '@/src/global/enums/amount.type.enum';
import { WalletTransaction } from '@/src/wallet/schemas/wallet.transaction.schema.';
import { CloudKReward } from './cloudk-reward.schema';

export enum CLOUDK_MACHINE_STAKE_TYPE {
  STAKE = 'stake',
  UNSTAKE = 'unstake',
}

export enum STAKE_FROM {
  AIRDROP = 'AIRDROP',
  MORE_STAKE = 'MORE_STAKE',
  AUTO_COMPOUND = 'AUTO_COMPOUND',
  PHASE_DEPOSIT = 'PHASE_DEPOSIT',
  DEPOSIT_AND_STAKE = 'DEPOSIT_AND_STAKE',
  ADDITIONAL_MINTING_CLOUDK_REWARD = 'ADDITIONAL_MINTING_CLOUDK_REWARD',
  ACTIVE_GEN_REWARD = 'active-gen-reward',
}

@Schema({ timestamps: true, versionKey: false })
export class CloudKMachineStake extends Document {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: CloudKMachine.name,
    required: true,
  })
  machine: mongoose.Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: CloudKMachine.name,
    required: false,
    default: null,
  })
  fromMachine: CloudKMachine;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: User.name,
    required: true,
  })
  user: User;

  @Prop({
    required: true,
    enum: CLOUDK_MACHINE_STAKE_TYPE,
    type: String,
  })
  type: string;

  @Prop({
    enum: STAKE_FROM,
    type: String,
    default: STAKE_FROM.AIRDROP,
  })
  from: string;

  @Prop({
    required: true,
    type: Number,
    set: (value) => setDecimalPlaces(value, AmountType.TOKEN),
  })
  tokenAmount: number; // total token || how many token stake

  @Prop({
    required: true,
    type: Number,
    set: (value) => setDecimalPlaces(value, AmountType.DOLLAR),
  })
  totalPrice: number; // dollar amount

  @Prop({
    required: true,
    type: Number,
    set: (value) => setDecimalPlaces(value, AmountType.DOLLAR),
  })
  perTokenPrice: number; // lyk price per dollar

  @Prop({
    type: String,
  })
  note: string;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: WalletTransaction.name,
  })
  walletTransaction: mongoose.Schema.Types.ObjectId;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: CloudKReward.name,
  })
  rewardTransection: mongoose.Schema.Types.ObjectId;

  @Prop({ default: null })
  createdAt?: Date;

  @Prop({ default: null })
  deletedAt?: Date;

  @Prop({ type: Number })
  burnValue?: number;

  @Prop({ type: Number })
  actualValue?: number;

  @Prop({ type: String })
  remarks?: string;

  @Prop({
    required: false,
    default: 0,
    type: Number,
    set: (value) => setDecimalPlaces(value, AmountType.TOKEN),
  })
  actualTokenAmount: number; // total token || how many token stake

  @Prop({
    required: false,
    default: 0,
    type: Number,
    set: (value) => setDecimalPlaces(value, AmountType.DOLLAR),
  })
  actualTotalPrice: number; // dollar amount

  @Prop({ type: Number, default: 0 })
  bonusAmount?: number;
}

export const CloudKMachineStakeSchema =
  SchemaFactory.createForClass(CloudKMachineStake);
