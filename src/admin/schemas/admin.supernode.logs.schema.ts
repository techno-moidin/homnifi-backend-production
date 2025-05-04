import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Types } from 'mongoose';

@Schema({ timestamps: true, versionKey: false })
export class SupernodeAdminLog extends Document {
  @Prop({ required: true })
  type: string;

  @Prop({ type: mongoose.Schema.Types.Mixed, required: true })
  previousData: any;

  @Prop({ default: Date.now })
  timestamp: Date;
}

export const SupernodeAdminLogsSchema =
  SchemaFactory.createForClass(SupernodeAdminLog);
