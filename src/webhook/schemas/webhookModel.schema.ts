import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import {
  WebhookDataStatus,
  WebhookMessages,
  WebhookType,
} from '../enums/webhook.enum';

export type WebhookModelDocument = WebhookModel & Document;

@Schema({ timestamps: true })
export class WebhookModel {
  @Prop({ required: false })
  webhookRequestId: Types.ObjectId;

  @Prop({ required: true })
  platform: string;

  @Prop({ required: true, default: WebhookType.INITIATED })
  type: string;

  @Prop({ required: true, type: Object })
  payload: Record<string, any>;

  @Prop({ required: true, default: WebhookDataStatus.SUCCESS })
  status: WebhookDataStatus.SUCCESS | WebhookDataStatus.FAILED;

  @Prop({ required: false, default: WebhookMessages.INITIATED })
  message: string;

  @Prop({ default: null, type: Date })
  deletedAt: Date;
}

export const WebhookModelSchema = SchemaFactory.createForClass(WebhookModel);
