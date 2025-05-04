import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Types } from 'mongoose';
import { NotificationTypeEnum } from '../enums/notification-type.enum';
import { NotificationStatusEnum } from '../enums/notification-status.enum';
import { NotificationEventEnum } from '../enums/notification-event.enum';
import { NotificationCodeEnum } from '../enums/notification-code.enum';

export type NotificationSchemaDocument = Notification & Document;

@Schema({ timestamps: true, versionKey: false })
export class NotificationModule {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  type: NotificationTypeEnum;

  @Prop({
    enum: NotificationStatusEnum,
    default: NotificationStatusEnum.ACTIVE,
  })
  status: NotificationStatusEnum;

  @Prop({
    enum: NotificationEventEnum,
  })
  event: NotificationEventEnum;

  @Prop({
    enum: NotificationCodeEnum,
  })
  code: NotificationCodeEnum;

  @Prop({})
  deletedAt: Date;
}

export const NotificationModuleSchema =
  SchemaFactory.createForClass(NotificationModule);
