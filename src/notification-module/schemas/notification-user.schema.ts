import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Types } from 'mongoose';
import { NotificationTypeEnum } from '../enums/notification-type.enum';
import { NotificationStatusEnum } from '../enums/notification-status.enum';
import { IsObjectId } from 'class-validator-mongo-object-id';
import { User } from '@/src/users/schemas/user.schema';
import { NotificationModule } from './notification-module.schema';

export type NotificationSchemaDocument = Notification & Document;

@Schema({ timestamps: true, versionKey: false })
export class NotificationUser {
  @Prop({ required: true, ref: User.name })
  user: Types.ObjectId;

  @Prop({ required: true, ref: NotificationModule.name })
  notification: Types.ObjectId;

  @Prop({})
  deletedAt: Date;
}

export const NotificationUserSchema =
  SchemaFactory.createForClass(NotificationUser);
