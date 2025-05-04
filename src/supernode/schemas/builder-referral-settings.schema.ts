import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';

@Schema({ timestamps: true, versionKey: false })
export class BuilderReferralSetting extends Document {
  @Prop({
    type: Number,
    required: true,
    default: 30,
  })
  bonusThresholdPercentage: number;

  @Prop({
    type: Number,
    required: true,
    default: 1.0,
  })
  bonusMultiplier: number;

  @Prop({
    type: Number,
    required: true,
    default: 2.0,
  })
  fiftyPercentRuleMultiplier: number;

  @Prop({
    type: Boolean,
    default: false,
  })
  isActive: boolean;

  @Prop({ default: null, type: Date })
  deletedAt: Date;
}

export const BuilderReferralSettingSchema = SchemaFactory.createForClass(
  BuilderReferralSetting,
);
