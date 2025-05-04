import { Token } from '@/src/token/schemas/token.schema';
import { User } from '@/src/users/schemas/user.schema';
import { setDecimalPlaces } from '@/src/utils/helpers';
import { Wallet } from '@/src/wallet/schemas/wallet.schema';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { CloudKProduct } from './cloudk-products.schema';
import { AmountType } from '@/src/global/enums/amount.type.enum';
import { CloudKInflation } from './cloudk-inflation.schema';
import {
  MachineTrack,
  MAHCINE_CONNECTION_STATUS,
  MAHCINE_TRACK_API_STATUS,
} from '@/src/machine-tracking/schema/machine-tracking.schema';
import { UsdkStakeSettings } from '@/src/usdk-stake/schemas/usdkStakeSettings.schema';
export enum CLOUDK_MACHINE_STATUS {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  COMPLETED = 'completed',
  TERMINATED = 'terminated',
  PAUSED = 'paused',
}
export enum MACHINE_TRACK_HOMNIFI_LABELS {
  IN_HOUSE = 'In-House',
  IN_TRANSIT = 'In-Transit',
  DELIVERED = 'Delivered',
}

export enum STAKING_PERIOD_ENUM {
  TWO = '2',
  THREE = '3',
  FOUR = '4',
  FIVE = '5',
  MAX = 'max',
}

@Schema({ timestamps: true, versionKey: false })
export class CloudKMachine extends Document {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  user: mongoose.Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: CloudKProduct.name })
  product: mongoose.Types.ObjectId;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: CloudKInflation.name,
    required: false,
  })
  rule: mongoose.Types.ObjectId;

  @Prop({ type: Number })
  serialNumber: number;

  @Prop({ unique: true, type: String })
  uniqueName: string;

  @Prop({ type: String })
  idempotencyKey: string;

  @Prop({ type: String })
  orderId: string;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String })
  externalOrderId: string;

  @Prop({ type: String, required: true })
  imageUrl: string;

  @Prop({ type: String, required: true })
  externalMachineId: string;

  @Prop({ type: Number, default: null, nullable: true })
  stakeLimit: number;

  @Prop({ type: Number, default: null, nullable: true })
  productPrice: number;

  @Prop({ type: Boolean, default: false })
  stakeUnlimited: boolean;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: Wallet.name })
  rewardWallet?: mongoose.Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: Token.name })
  stakeToken?: Token;

  @Prop({
    default: CLOUDK_MACHINE_STATUS.ACTIVE,
    enum: CLOUDK_MACHINE_STATUS,
    type: String,
  })
  status: string;

  @Prop({
    default: false,
    type: Boolean,
  })
  autoCompound: boolean;

  @Prop({
    required: true,
    type: Number,
    set: (value) => setDecimalPlaces(value, AmountType.DOLLAR),
  })
  lockedPrice: number;

  @Prop({
    required: true,
    type: Number,
    set: (value) => setDecimalPlaces(value, AmountType.DOLLAR),
  })
  allTimeHigh: number;

  @Prop({
    required: false,
    type: Number,
    set: (value) => setDecimalPlaces(value, AmountType.DOLLAR),
  })
  oldATH?: number;

  @Prop({
    required: true,
    type: Number,
    set: (value) => setDecimalPlaces(value, AmountType.DOLLAR),
  })
  dlp: number;

  @Prop({
    type: Number,
    set: (value) => setDecimalPlaces(value, AmountType.DOLLAR),
  })
  oldDLP?: number;

  @Prop({
    required: false,
    type: Number,
    default: 0,
    set: (value) => setDecimalPlaces(value, AmountType.DOLLAR),
  })
  percentageFallFromToken?: number;

  @Prop({ required: true, type: Number })
  mintingPower: number;

  @Prop({ required: true, type: Number })
  boost: number;

  @Prop({ required: true, type: Date })
  startDate: Date;
  @Prop({ required: true, type: Date })
  endDate: Date;

  @Prop({
    type: Boolean,
    default: false,
  })
  isSimulater: boolean;

  @Prop({
    type: Object,
  })
  airDrops: object;

  @Prop({
    type: Number,
    default: 0,
    set: (value) => setDecimalPlaces(value, AmountType.DOLLAR),
  })
  collatoral: number;

  @Prop({
    type: Number,
    default: 0,
  })
  stakedTokenAmount: number;

  @Prop({
    type: Number,
    default: 0,
  })
  lifetimeReward: number;

  @Prop({
    type: Number,
    default: 0,
  })
  claimableRewards: number;

  @Prop({
    type: Number,
    default: 0,
  })
  prevDayPrice: number;

  @Prop({
    type: Date,
    default: null,
  })
  deletedAt: Date;

  @Prop({
    type: Number,
    default: null,
  })
  mintingPowerPerc: number;

  @Prop({
    type: Number,
    default: null,
    set: (value) => setDecimalPlaces(value, AmountType.DOLLAR),
  })
  testDlp: number;

  // batch

  // machine track based fields
  @Prop({
    type: String,
    enum: MAHCINE_TRACK_API_STATUS,
    default: MAHCINE_TRACK_API_STATUS.IN_HOUSE,
  })
  shipmentStatus: MAHCINE_TRACK_API_STATUS;

  @Prop({
    type: String,
  })
  shipmentItemIdentifier: string;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: MachineTrack.name,
  })
  latestTracking: mongoose.Schema.Types.ObjectId;

  @Prop({
    type: String,
    index: true,
  })
  assignedSerialNumber: string;

  @Prop({
    type: Boolean,
    default: false,
  })
  isMachineConnected: boolean;

  @Prop({
    type: Date,
    default: null,
  })
  deliveryDate: Date;

  @Prop({
    type: Date,
    default: null,
  })
  serialNumberConnectedDate: Date;

  @Prop({
    type: Date,
    default: null,
  })
  gracePeriodEndDate: Date;

  @Prop({
    type: Date,
    default: null,
  })
  gracePeriodStartDate: Date;

  @Prop({
    type: String,
    enum: MAHCINE_CONNECTION_STATUS,
  })
  connectionStatus: MAHCINE_CONNECTION_STATUS;

  @Prop({
    type: Boolean,
    default: false,
  })
  deliveryFeePaid: boolean;

  @Prop({
    type: Boolean,
    default: false,
  })
  shippingOrderPaid: boolean;

  @Prop({
    type: String,
    default: null,
  })
  trackingId: string;

  @Prop({
    type: Date,
    default: null,
  })
  trackingTimestamp: Date;
  // For usdk Staking
  @Prop({
    type: Number,
    default: null,
  })
  usdkStakeRewardRate: number;

  @Prop({
    type: Number,
    default: null,
  })
  usdkMultipler: number;

  @Prop({
    default: false,
    type: Boolean,
  })
  usdkAutoCompound: boolean;

  @Prop({
    type: Number,
    default: 0,
  })
  usdkColletral: number;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: UsdkStakeSettings.name,
    default: null,
  })
  usdkStakeSetting: mongoose.Types.ObjectId;

  @Prop({ default: null, type: Date })
  usdkStakeperiodStartDate: Date;

  @Prop({ default: null, type: Date })
  usdkStakeperiodEndDate: Date;

  @Prop({
    type: String,
    enum: STAKING_PERIOD_ENUM,
    default: null,
  })
  usdkStakeperiod: string;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: Token.name,
    default: null,
  })
  usdkStakeToken?: mongoose.Types.ObjectId;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: Token.name,
    default: null,
  })
  usdkStakeRewardToken?: mongoose.Types.ObjectId;
}

export const CloudKMachineSchema = SchemaFactory.createForClass(CloudKMachine);
