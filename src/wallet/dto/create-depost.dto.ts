import { transformToLowerCase } from '@/src/utils/helpers';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  isPositive,
  IsString,
  Min,
} from 'class-validator';

export class CreateDepositDto {
  @IsString()
  @IsNotEmpty()
  address: string;

  @IsString()
  @IsNotEmpty()
  hash: string;

  @Min(1)
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsString()
  @IsNotEmpty()
  confirmation: string;

  @Transform(transformToLowerCase)
  @IsString()
  @IsNotEmpty()
  coin: string;

  @IsBoolean()
  @IsNotEmpty()
  isBid: string;
}
