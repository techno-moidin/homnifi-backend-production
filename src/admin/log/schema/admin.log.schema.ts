import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { Admin } from '../../schemas/admin.schema';
import { AdminLogApiCode } from '../../global/enums/admin.log-api-code.enum';
import { AdminModuleType } from '../../global/enums/admin.log-module-type.enum';

@Schema({
  timestamps: true,
  toJSON: {
    versionKey: false,
  },
  toObject: {
    versionKey: false,
  },
})
export class AdminLog extends Document {
  @Prop({
    type: String,
    //  enum: AdminModuleType,
    default: null,
  })
  module: AdminModuleType;

  @Prop({ type: String, default: null })
  note: string;

  @Prop({ type: String, default: null })
  ipAddress: string;

  @Prop({ type: String, default: null })
  macAddress: string;

  @Prop({ type: String, default: null })
  method: string;

  @Prop({ type: String, required: true })
  endPoint: string;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: Admin.name,
  })
  admin: mongoose.Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.Mixed, default: null })
  deviceData: Record<string, any>;

  @Prop({ type: mongoose.Schema.Types.Mixed, default: null })
  location: Record<string, any>;

  @Prop({ type: mongoose.Schema.Types.Mixed, default: null })
  payload: Record<string, any>;
  
  @Prop({ type: String, required: false })
  username: string;
  @Prop({ type: String, required: false })
  email: string;
}

export const AdminLogModel = SchemaFactory.createForClass(AdminLog);
