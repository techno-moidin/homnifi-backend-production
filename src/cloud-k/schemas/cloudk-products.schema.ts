import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { setDecimalPlaces } from '@/src/utils/helpers';
import { AmountType } from '@/src/global/enums/amount.type.enum';

import { GenExtraRewardHistory } from './gen-extra-reward-history.schema';

@Schema({ timestamps: true, versionKey: false })
export class CloudKProduct extends Document {
  @Prop({
    required: true,
    type: String,
  })
  name: string;

  @Prop({
    required: true,
    type: String,
  })
  url: string;

  @Prop({
    required: true,
    type: String,
  })
  imageUrl: string;

  @Prop({
    required: true,
    type: String,
    unique: true,
  })
  externalProductId: string;

  @Prop({
    required: true,
    type: Number,
    set: (value) => setDecimalPlaces(value, AmountType.DOLLAR),
  })
  price: number; // in dollars

  // LAYER K Values

  @Prop({
    required: true,
    type: Number,
    set: (value) => setDecimalPlaces(value, AmountType.DOLLAR),
  })
  mintingPowerPerc: number; // in percentage

  @Prop({
    required: true,
    type: Number,
    set: (value) => setDecimalPlaces(value, AmountType.DOLLAR),
  })
  stakeLimit: number;

  @Prop({
    default: false,
    type: Boolean,
  })
  stakeUnlimited: boolean;

  @Prop({ required: true, type: Boolean })
  defiPortal: boolean;

  @Prop({
    required: true,
    type: Number,
  })
  airdropPromo: number; // in dollars

  @Prop({
    required: true,
    type: Number,
  })
  launchpadAirdrop: number; // in dollars

  // Quantwise Values
  @Prop({
    required: true,
    type: String,
  })
  licenseName: string;

  @Prop({
    required: true,
    type: Number,
  })
  profitSplitFee: number;

  @Prop({
    required: false,
    type: Number,
  })
  quantwiseCapping: number;

  /**
   * Value should be in Dollar. using for daily superNodeCapping
   */
  @Prop({
    required: false,
    type: Number,
    default: 0,
  })
  superNodeCapping: number;

  @Prop({
    required: true,
    type: String,
  })
  aiTradingSoftwareName: string;

  // Supernode values

  @Prop({
    type: Number,
  })
  superNodeLevel: number;
  @Prop({
    type: Number,
  })
  globalPool: number;

  @Prop({
    type: Number,
  })
  countryPoints: boolean;

  @Prop({
    type: Number,
  })
  bonus: number;

  @Prop({
    type: Boolean,
  })
  bestValue: boolean;

  @Prop({
    type: String,
    default: null,
    required: false,
  })
  remark: string;

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
}

export const CloudKProductSchema = SchemaFactory.createForClass(CloudKProduct);
