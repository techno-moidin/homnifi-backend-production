import {
  IsString,
  IsBoolean,
  IsOptional,
  IsArray,
  IsMongoId,
  IsNotEmpty,
  IsEnum,
} from 'class-validator';
import { IsObjectId } from 'class-validator-mongo-object-id';
import { Types } from 'mongoose';
import { NotificationTypeEnum } from '../enums/notification-type.enum';
import { NotificationStatusEnum } from '../enums/notification-status.enum';
import { NotificationEventEnum } from '../enums/notification-event.enum';
import { NotificationCodeEnum } from '../enums/notification-code.enum';

export class CreateNotificationDto {
  @IsArray()
  @IsObjectId({ each: true })
  userIds?: Types.ObjectId[];

  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsNotEmpty()
  @IsEnum(NotificationTypeEnum)
  type: NotificationTypeEnum;

  @IsNotEmpty()
  @IsEnum(NotificationStatusEnum)
  status: NotificationStatusEnum;

  @IsNotEmpty()
  @IsEnum(NotificationEventEnum)
  event: NotificationEventEnum;

  @IsNotEmpty()
  @IsEnum(NotificationCodeEnum)
  code: NotificationCodeEnum;
}
