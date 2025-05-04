import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { IsOptional } from 'class-validator';
import mongoose, { Document } from 'mongoose';

@Schema({ timestamps: true, versionKey: false })
export class UserBlockAdminLogs extends Document {
  @Prop({ type: mongoose.Schema.Types.ObjectId, required: true })
  userId: mongoose.Schema.Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, required: true })
  adminId: mongoose.Schema.Types.ObjectId;

  @Prop({ default: false, type: Boolean })
  isBlocked: boolean;

  @IsOptional()
  blockedReason?: string;

  @IsOptional()
  unblockedReason?: string;

  @Prop({ required: true })
  type: string;
}

export const UserBlockAdminLogsSchema =
  SchemaFactory.createForClass(UserBlockAdminLogs);
