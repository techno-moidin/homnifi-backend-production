import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Types } from 'mongoose';
import { User } from './user.schema';
import {
  ScenarioAnalyticsPointType,
  StatusAnalyticsPointType,
} from '../dto/update.analytics.dto';

// this a dummy schema for temporary purposes

@Schema({ timestamps: true, versionKey: false })
export class UserAnalyticsLog extends Document {
  @Prop({ type: Types.ObjectId, ref: User.name, required: true })
  userId: Types.ObjectId;

  @Prop({
    default: ScenarioAnalyticsPointType.NEW_USER,
    enum: ScenarioAnalyticsPointType,
    type: String,
    required: true,
  })
  scenario: string;

  @Prop({
    type: String,
    required: false,
    default: StatusAnalyticsPointType.PENDING,
  })
  status?: string;

  @Prop({
    type: String,
    default: null,
  })
  note: string;

  @Prop({ default: null, type: Date, required: false })
  deletedAt: Date;
}

export const UserAnalyticsLogSchema =
  SchemaFactory.createForClass(UserAnalyticsLog);
