import { IsString, IsNotEmpty, IsEnum } from 'class-validator';
import { NotificationTypeEnum } from '../enums/notification.type.enum';

export class CreateNotificationByBidDto {
  @IsString()
  @IsNotEmpty()
  userBid: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsNotEmpty()
  @IsEnum(NotificationTypeEnum)
  type: NotificationTypeEnum;
}
