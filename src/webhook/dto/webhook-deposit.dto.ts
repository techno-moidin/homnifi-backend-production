import { transformToLowerCase } from '@/src/utils/helpers';
import { Prop } from '@nestjs/mongoose';
import { Transform } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsObject,
  IsEnum,
  IsNumber,
  Min,
  IsBoolean,
  ValidateIf,
  IsArray,
} from 'class-validator';
import mongoose from 'mongoose';

export class WebhookDepositDto {
  @IsOptional()
  @IsNotEmpty()
  address: string;

  @IsOptional()
  @IsString()
  bid: string;

  @Prop({
    type: mongoose.Schema.Types.Mixed,
    required: true,
  })
  hash: string | string[];

  @Transform(transformToLowerCase)
  @IsNotEmpty()
  @IsString()
  token: string;

  @IsNotEmpty({ message: 'Amount is required.' })
  @IsNumber({}, { message: 'The amount must be a valid number.' })
  // @Min(0.01, { message: 'The amount must be greater than zero.' })
  amount: number;

  @IsNotEmpty()
  @IsString()
  platform: string;

  @IsString()
  @IsOptional()
  note?: string;

  @IsBoolean()
  @IsOptional()
  isBid: string;
}
