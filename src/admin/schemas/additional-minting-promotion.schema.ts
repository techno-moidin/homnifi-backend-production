import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum AdditionalMintingPromotionStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  STOPPED = 'stopped',
  DELETED = 'deleted',
}

@Schema({ timestamps: true, versionKey: false })
export class AdditionalMintingPromotion extends Document {
  @Prop({ required: true })
  promotionName: string;

  @Prop({ required: true })
  startDate: Date;

  @Prop({ required: true })
  endDate: Date;

  @Prop({
    type: String,
    enum: AdditionalMintingPromotionStatus,
    default: AdditionalMintingPromotionStatus.ACTIVE,
  })
  status: AdditionalMintingPromotionStatus;

  @Prop({ type: Date, default: null })
  stoppedDate: Date;

  @Prop({ type: Date, default: null })
  expiredDate: Date;

  @Prop({
    type: Date,
    default: null,
  })
  deletedAt: Date;

  @Prop({
    type: String,
    default: null,
    required: false,
  })
  note: string;
}

export const AdditionalMintingPromotionSchema = SchemaFactory.createForClass(
  AdditionalMintingPromotion,
);
