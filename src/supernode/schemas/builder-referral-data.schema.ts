import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';

@Schema({ timestamps: true, versionKey: false })
export class BuilderReferralData extends Document {
  @Prop({ required: true })
  user: mongoose.Types.ObjectId;

  @Prop({ required: true })
  totalCollatoral: number;

  @Prop({ required: true })
  yearMonth: string;

  @Prop({ required: true, default: false })
  bonusEligibility: boolean;

  @Prop({ type: Number, default: 1 })
  bonusMultiplier: number;

  @Prop({ type: Number, default: null })
  prevHighestCollateral?: number;

  @Prop({ type: String, default: null })
  prevHighestCollYearMonth?: string;
}

export const BuilderReferralDataSchema =
  SchemaFactory.createForClass(BuilderReferralData);
