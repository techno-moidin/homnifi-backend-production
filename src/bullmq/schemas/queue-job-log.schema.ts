import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { QueueJobStatus } from '../enums/queue-job-status.enum';

@Schema({ timestamps: true })
export class QueueJobLog extends Document {
  @Prop({ required: true })
  queueName: string;

  @Prop({ required: true })
  jobId: string;

  @Prop({ required: true, enum: QueueJobStatus })
  status: QueueJobStatus;

  @Prop()
  errorMessage?: string;

  @Prop({ type: Object })
  jobData: Record<string, any>;

  @Prop({ type: String })
  stackTrace?: string;

  @Prop({ default: false })
  resolved: boolean;
}

export const QueueJobLogSchema = SchemaFactory.createForClass(QueueJobLog);
