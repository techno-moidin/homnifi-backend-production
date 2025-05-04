import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({
  timestamps: true,
  toJSON: {
    transform(doc, ret, options) {},
  },
})
export class Device extends Document {
  @Prop({ required: true })
  deviceId: string;

  @Prop()
  browserName: string;

  @Prop()
  deviceName: string;

  @Prop()
  token: string;

  @Prop({ required: true, default: true })
  isLoggedIn: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  user: Types.ObjectId;

  @Prop({ required: true })
  ipAddress: string;

  @Prop()
  location: Map<string, string>;

  @Prop({ required: true })
  recentActivity: Date;

  @Prop()
  deviceType: string;

  @Prop()
  os: string;

  @Prop()
  osVersion: string;
}

export const DeviceSchema = SchemaFactory.createForClass(Device);
