import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';

export enum EmailSendStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
}
@Schema({ timestamps: true, versionKey: false })
export class TBalanceUploadFilesLogHistory extends Document {
  @Prop({
    required: true,
    type: Number,
  })
  processedTransactionCount: number;

  @Prop({
    required: false,
    type: String,
  })
  receiverEmail: string;

  @Prop({
    required: false,
    type: String,
    enum: EmailSendStatus,
  })
  emailSendStatus: string;

  @Prop({
    required: true,
    type: Date,
  })
  createdAt: Date;

  @Prop({ type: mongoose.Schema.Types.Mixed, default: null, required: false })
  meta?: Record<string, any>;
}

export const TBalanceUploadFilesLogHistorySchema = SchemaFactory.createForClass(
  TBalanceUploadFilesLogHistory,
);
