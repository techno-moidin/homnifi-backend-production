import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsObject,
  IsEnum,
  IsNumber,
  Min,
} from 'class-validator';
import { WebhookDataStatus, WebhookPlatform } from '../enums/webhook.enum';
import { Transform } from 'class-transformer';
import { transformToLowerCase } from '@/src/utils/helpers';

export class WebhookDto {
  @IsNotEmpty()
  @IsString()
  bid: string;

  @IsNotEmpty()
  @IsString()
  order_id: string;

  @Transform(transformToLowerCase)
  @IsNotEmpty()
  @IsString()
  token: string;

  @IsNotEmpty({ message: 'Invalid Amount' })
  @IsNumber({}, { message: 'Amount must be a number' })
  // @Min(0.01, { message: 'Amount must be greater than 0' })
  amount: number;

  @IsNotEmpty()
  @IsString()
  platform: string;

  @IsString()
  @IsOptional()
  note?: string;
}
