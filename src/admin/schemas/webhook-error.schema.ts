import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';

export enum WEBHOOK_STATUS {
  INITIATED = 'intiated',
  SUCCESS = 'success',
  FAILED = 'failed',
}

@Schema({ timestamps: true, versionKey: false })
export class WebhookStatus extends Document {
  @Prop({
    required: true,
    type: String,
  })
  path: string;

  @Prop({
    required: true,
    type: String,
  })
  name: string;

  @Prop({
    default: WEBHOOK_STATUS.INITIATED,
    enum: WEBHOOK_STATUS,
    type: String,
  })
  status: string;

  @Prop({ type: String, default: '' })
  payload: string;

  @Prop({ type: String, default: '' })
  error: string;
}

export const WebhookStatusSchema = SchemaFactory.createForClass(WebhookStatus);
