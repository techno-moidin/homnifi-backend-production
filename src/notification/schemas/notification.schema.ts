import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Types } from 'mongoose';
import { NotificationStatusEnum } from '../enums/notification.status.enum';
import { NotificationTypeEnum } from '../enums/notification.type.enum';

export type NotificationDocument = Notification & Document;

@Schema({ timestamps: true, versionKey: false })
export class Notification {
  @Prop({ required: true })
  user: Types.ObjectId;

  @Prop({ required: true })
  message: string;

  @Prop({ default: false })
  read?: boolean;

  @Prop({
    enum: NotificationTypeEnum,
  })
  type: NotificationTypeEnum;

  @Prop({
    enum: NotificationStatusEnum,
    default: NotificationStatusEnum.PENDING,
  })
  code: NotificationStatusEnum;

  @Prop({ type: mongoose.Schema.Types.Mixed })
  data?: Record<string, any>;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
