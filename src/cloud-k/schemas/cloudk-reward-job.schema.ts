import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { CloudKMachine } from './cloudk-machine.schema';

export enum CLOUDK_JOBS_STATUS {
  INITIATED = 'intiated',
  NOT_INITIATED = 'not-initiated',
  SUCCESS = 'success',
  FAILED = 'failed',
  ACTIVE = 'active',

  PARTIAL_SUCCESS = 'partial-success',
}

@Schema({ timestamps: true, versionKey: false })
export class CloudKDailyJob extends Document {
  @Prop({
    required: true,
    type: Date,
    default: new Date(),
  })
  startTime: Date;

  @Prop({
    type: Date,
  })
  endTime: Date;

  @Prop({
    required: true,
    type: Number,
  })
  tokenPrice: number;

  @Prop({
    default: CLOUDK_JOBS_STATUS.INITIATED,
    enum: CLOUDK_JOBS_STATUS,
    type: String,
  })
  status: string;

  @Prop({
    required: true,
    type: Number,
  })
  totalMachines: number;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: CloudKMachine.name })
  failedMachine: mongoose.Types.ObjectId;

  @Prop({ type: String, default: '' })
  error: string;

  @Prop({ type: String, default: '' })
  note: string;

  @Prop({ type: String, default: '' })
  timeTaken: string;

  @Prop({ type: Boolean, default: false })
  supernode: boolean;

  @Prop({
    type: Date,
  })
  baseReferralStartTime: Date;

  @Prop({
    type: Date,
  })
  baseReferralEndTime: Date;

  @Prop({ type: String })
  baseReferralTimeTaken: string;

  @Prop({
    type: Date,
  })
  builderGenerationStartTime: Date;

  @Prop({
    type: Date,
  })
  builderGenerationEndTime: Date;

  @Prop({ type: String })
  builderGenerationTimeTaken: string;

  @Prop({
    type: Date,
  })
  matchingBonusStartTime: Date;

  @Prop({
    type: Date,
  })
  matchingBonusEndTime: Date;

  @Prop({ type: String })
  matchingBonusTimeTaken: string;
}

export const CloudKDailyJobSchema =
  SchemaFactory.createForClass(CloudKDailyJob);
