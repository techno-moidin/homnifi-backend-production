import {
  IsString,
  IsBoolean,
  IsOptional,
  IsArray,
  IsNotEmpty,
  IsEnum,
} from 'class-validator';
import { NotificationTypeEnum } from '../enums/notification.type.enum';
import { IsObjectId } from 'class-validator-mongo-object-id';
import { Types } from 'mongoose';

export class CreateNotificationDto {
  @IsArray()
  @IsObjectId({ each: true })
  @IsOptional()
  userIds?: Types.ObjectId[];

  @IsString()
  title: string;

  @IsString()
  message: string;

  @IsBoolean()
  @IsOptional()
  read?: boolean;

  @IsNotEmpty()
  @IsEnum(NotificationTypeEnum)
  type: NotificationTypeEnum;
}
