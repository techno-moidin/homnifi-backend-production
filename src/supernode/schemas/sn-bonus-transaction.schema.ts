export class Supernode {}
import { User } from '@/src/users/schemas/user.schema';
import { TransactionFlow } from '@/src/wallet/enums/transcation.flow.enum';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Types } from 'mongoose';
import { SN_BONUS_TYPE } from '../enums/sn-bonus-type.enum';
import { LostReason } from '../enums/sn-lost-reason.enum';
import { CloudKMachine } from '@/src/cloud-k/schemas/cloudk-machine.schema';
import { CloudKReward } from '@/src/cloud-k/schemas/cloudk-reward.schema';
import { CloudKTransactions } from '@/src/cloud-k/schemas/cloudk-transactions.schema';
import { CloudKDailyJob } from '@/src/cloud-k/schemas/cloudk-reward-job.schema';
import { DepositTransaction } from '@/src/wallet/schemas/deposit.transaction.schema';
@Schema({ timestamps: true, versionKey: false })
export class SNBonusTransaction extends Document {
  @Prop({ type: Types.ObjectId, ref: User.name, required: true })
  user: User;
  @Prop({ type: Types.ObjectId, ref: User.name, required: true })
  fromUser: User;
  @Prop({ enum: SN_BONUS_TYPE, required: true })
  type: SN_BONUS_TYPE;

  @Prop({ type: Number, required: true })
  amount: number;

  @Prop({ type: Number, required: true })
  tokenAmount: number;

  @Prop({ type: Number })
  tokenPrice: number;

  @Prop({ type: Boolean, default: true })
  receivable: boolean;

  @Prop({ enum: LostReason })
  lostReason?: LostReason;

  @Prop({ required: true })
  gaskRemaining: number;

  @Prop({ required: true })
  loss: number;

  @Prop({ type: Number, default: 0 })
  lossInToken: number;

  @Prop({ type: Boolean, default: false })
  claimed: boolean;

  @Prop({ type: Object })
  rewardData: object;

  @Prop({ type: Types.ObjectId, ref: CloudKTransactions.name, required: true })
  cloudkTrx: CloudKTransactions;

  @Prop({ type: Object })
  builderReferralData: object;

  @Prop({ default: null, type: Date })
  deletedAt: Date;

  @Prop({ type: Types.ObjectId, ref: CloudKDailyJob.name })
  job: CloudKDailyJob;

  @Prop({ type: String })
  note?: string;

  @Prop({ type: String })
  claimNote?: string;

  @Prop({ type: mongoose.Schema.Types.Mixed, default: {} })
  meta?: Record<string, any>;

  @Prop({ type: Boolean, default: false })
  isMachingBonus?: boolean;

  @Prop({ type: String, default: null })
  machingBonusStatus?: boolean;

  @Prop({ type: Types.ObjectId, ref: 'deposittransactions' })
  claimableID: DepositTransaction;

  @Prop({ type: Types.ObjectId, ref: CloudKMachine.name, required: false })
  machine: CloudKMachine;
}
export const SNBonusTransactionSchema =
  SchemaFactory.createForClass(SNBonusTransaction);
