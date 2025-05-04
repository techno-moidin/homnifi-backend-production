import { User } from '@/src/users/schemas/user.schema';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, ObjectId } from 'mongoose';
import { CloudKMachine } from './cloudk-machine.schema';
import { setDecimalPlaces } from '@/src/utils/helpers';
import { WalletTransaction } from '@/src/wallet/schemas/wallet.transaction.schema.';
import { CloudKDailyJob } from './cloudk-reward-job.schema';
import { AmountType } from '@/src/global/enums/amount.type.enum';
import { CloudKTransactions } from './cloudk-transactions.schema';
import { CloudKRewardGenerationType } from '../interfaces/cloudk-reward.interface';
import { GenExtraRewardHistory } from './gen-extra-reward-history.schema';
import { AdditionalCountryLevelSetting } from '@/src/admin/schemas/additional.product.minting.Schema';
import { AdditionalMintingPromotion } from '@/src/admin/schemas/additional-minting-promotion.schema';

export enum FROM_REWARD_TYPE {
  NODE_K = 'NODE_K',
  USDK_STAKE = 'USDK_STAKE',
}

@Schema({ timestamps: true, versionKey: false })
export class CloudKReward extends Document {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: CloudKMachine.name })
  machine: mongoose.Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: User.name })
  user: mongoose.Types.ObjectId;

  @Prop({
    required: true,
    type: Number,
    set: (value) => setDecimalPlaces(value, AmountType.TOKEN),
  })
  tokenAmount: number;

  @Prop({
    required: false,
    default: null,
    type: Number,
    set: (value) => setDecimalPlaces(value, AmountType.TOKEN),
  })
  additionalMintingToken: number;

  @Prop({
    enum: CloudKRewardGenerationType,
    required: false,
    default: CloudKRewardGenerationType.REWARD,
  })
  type?: CloudKRewardGenerationType;

  @Prop({
    required: true,
    type: Number,
    set: (value) => setDecimalPlaces(value, AmountType.DOLLAR),
  })
  totalPrice: number;

  @Prop({
    required: true,
    type: Number,
    set: (value) => setDecimalPlaces(value, AmountType.TOKEN),
  })
  expectedRewardTokens: number;

  @Prop({ required: true, type: Date })
  forDate: Date;

  @Prop({
    required: true,
    type: Number,
  })
  dlp: number;

  @Prop({
    required: true,
    type: Number,
    set: (value) => setDecimalPlaces(value, AmountType.DOLLAR),
  })
  allTimeHigh: number;

  @Prop({
    required: true,
    type: Number,
  })
  capPrice: number;

  @Prop({
    required: true,
    type: Number,
  })
  collatoral: number;

  @Prop({
    required: true,
    type: Number,
  })
  tokenPrice: number;

  @Prop({
    required: false,
    type: Number,
  })
  prevReward: number;

  @Prop({
    required: true,
    type: Number,
    set: (value) => setDecimalPlaces(value, AmountType.TOKEN),
  })
  productionPenalty: number;

  @Prop({
    required: true,
    type: Number,
    set: (value) => setDecimalPlaces(value, AmountType.TOKEN),
  })
  autoCompoundPenalty: number;

  @Prop({
    required: true,
    type: Boolean,
  })
  autoCompounded: boolean;

  @Prop({
    type: Number, // Explicitly define the type
    required: false,
    default: 0, // Optional: set a default value to avoid undefined issues
  })
  oldLogicReward: number;

  @Prop({
    type: Number, // Explicitly define the type
    required: false,
    default: 0, // Optional: set a default value to avoid undefined issues
  })
  priceDropPercentage: number;

  @Prop({
    type: Object, // Allows storing any object
    required: false,
    default: null, // Prevents undefined issues
  })
  currentRule: Record<string, any>; // Allows any key-value pair

  @Prop({
    default: false,
    type: Boolean,
  })
  claimed: boolean;

  @Prop({
    enum: FROM_REWARD_TYPE,
    default: FROM_REWARD_TYPE.NODE_K,
  })
  rewardFrom: FROM_REWARD_TYPE;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: WalletTransaction.name,
  })
  claimedTrx: boolean;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: CloudKDailyJob.name,
  })
  job: CloudKDailyJob;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'cloudktransactions',
  })
  cloudKTransaction: ObjectId;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: CloudKReward.name,
    default: null,
    required: false,
  })
  rewardId: mongoose.Types.ObjectId;

  // Additional Minting parameters

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: AdditionalMintingPromotion.name,
    default: null,
    required: false,
  })
  additionalMintingPowerId: mongoose.Types.ObjectId;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: AdditionalCountryLevelSetting.name,
    default: null,
    required: false,
  })
  additionalMintingCountryLevelId: mongoose.Types.ObjectId;

  @Prop({
    type: Number,
    default: 0,
    required: false,
  })
  additionalMintingPowerPercentage: number;

  @Prop({
    type: String,
    default: null,
  })
  additionalMintingCountryCode: string;

  // Gen Active Reward

  @Prop({
    type: Number,
    default: null,
    required: false,
  })
  genRewardPercentage: number;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: GenExtraRewardHistory.name,
    default: null,
    required: false,
  })
  actveGenRewardPercentageId: mongoose.Types.ObjectId;

  @Prop({ default: null, type: Date })
  deletedAt: Date;

  @Prop({
    type: String,
    default: null,
    required: false,
  })
  note: string;
}

export const CloudKRewardSchema = SchemaFactory.createForClass(CloudKReward);
