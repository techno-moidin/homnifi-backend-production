import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class TrustpilotWebhookModel extends Document {
  @Prop({ required: true })
  consumerId: string;

  @Prop({ required: true })
  businessUnitId: string;

  @Prop({ required: false })
  reviewBody: string;

  @Prop({ required: false })
  language: string;

  @Prop({ required: false, type: Object })
  metadata: Record<string, any>;

  @Prop({ required: false })
  referenceId: string;

  @Prop({ default: null, type: Date })
  deletedAt: Date;

  @Prop({ default: null })
  starRating: string;

  @Prop({ required: false, type: Object })
  errResp: Record<string, any>;
}

export const TrustpilotWebhookModelSchema = SchemaFactory.createForClass(
  TrustpilotWebhookModel,
);
