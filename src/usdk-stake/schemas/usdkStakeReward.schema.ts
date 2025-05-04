import { CloudKMachine } from '@/src/cloud-k/schemas/cloudk-machine.schema';
import { Token } from '@/src/token/schemas/token.schema';
import { User } from '@/src/users/schemas/user.schema';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Types } from 'mongoose';

@Schema({ timestamps: true, versionKey: false })
export class UsdkStakeReward extends Document {
  @Prop({
    required: true,
    type: Number,
  })
  usdkColletral: number;

  @Prop({
    default: false,
    type: Boolean,
  })
  usdkAutoCompound: boolean;

  @Prop({
    type: Number,
    default: null,
  })
  usdkStakeRewardRate: number;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: Token.name,
    default: null,
  })
  usdkStakeToken?: mongoose.Types.ObjectId; // collatrol is in which token

  @Prop({
    required: true,
    type: Boolean,
    default: false,
  })
  isClaimed: boolean;

  @Prop({
    type: Number,
    default: 0,
  })
  rewardAmount: number; // In lyk

  @Prop({
    type: Number,
    default: 0,
  })
  currentLykPrice: number;

  @Prop({ type: mongoose.Schema.Types.Mixed, default: null, required: false })
  meta?: Record<string, any>;

  @Prop({ default: null, type: Date })
  deletedAt: Date;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'cloudktransactions',
  })
  cloudKTransaction: Types.ObjectId;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: CloudKMachine.name,
    default: null,
  })
  machine: mongoose.Types.ObjectId;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: User.name,
    default: null,
  })
  user: mongoose.Types.ObjectId;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: Token.name,
    default: null,
  })
  rewardGeneratedToken: mongoose.Types.ObjectId;
}

export const UsdkStakeRewardSchema =
  SchemaFactory.createForClass(UsdkStakeReward);
