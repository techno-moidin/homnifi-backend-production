import { Type } from 'class-transformer';
import { IsString, IsNotEmpty, IsDate, IsOptional } from 'class-validator';

export class MachineTrackingWebhookDto {
  @IsNotEmpty()
  @IsString()
  orderId: string;

  @IsString()
  @IsNotEmpty()
  userBID: string;

  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsString()
  assignedSerialNumber: string;

  @IsString()
  @IsNotEmpty()
  shipmentStatus: string;

  @IsString()
  @IsNotEmpty()
  shipmentItemIdentifier: string;

  // @IsOptional()
  @Type(() => Date)
  @IsDate()
  timestamp: Date;

  @IsOptional()
  @IsString()
  trackingId: string;

  @IsOptional()
  @IsString()
  remark: string;
}
