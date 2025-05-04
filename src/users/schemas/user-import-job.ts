import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';

export enum USER_IMPORT_JOBS_STATUS {
  INITIATED = 'intiated',
  NOT_INITIATED = 'not-initiated',
  SUCCESS = 'success',
  FAILED = 'failed',
  PARTIAL_SUCCESS = 'partial-success',
}

@Schema({ timestamps: true, versionKey: false })
export class UserImportJob extends Document {
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
    default: USER_IMPORT_JOBS_STATUS.INITIATED,
    enum: USER_IMPORT_JOBS_STATUS,
    type: String,
  })
  status: string;

  @Prop({
    required: true,
    type: Number,
  })
  totalUsers: number;

  @Prop({ type: String, default: '' })
  error: string;

  @Prop({ type: String, default: '' })
  note: string;

  @Prop({ type: String, default: '' })
  timeTaken: string;
}

export const UserImportJobSchema = SchemaFactory.createForClass(UserImportJob);
