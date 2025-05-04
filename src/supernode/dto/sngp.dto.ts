import { Type } from 'class-transformer';
import {
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { POOL_TYPE, STATUS_TYPE } from '../enums/sngp-type.enum';
import { IsObjectId } from 'class-validator-mongo-object-id';
import { Types } from 'mongoose';

export class SngpDto {
  @IsString()
  @IsOptional()
  name: string;

  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  totalPoints: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  rewardAmount: number;

  @IsOptional()
  @Type(() => Date)
  startDate: Date;

  @IsString()
  @IsOptional()
  countryCode: string;

  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  multiplier: number;

  @IsNotEmpty()
  type: POOL_TYPE;
}

export class UpdateSngpDto {
  @IsString()
  @IsOptional()
  name: string;

  @IsNumber()
  @IsNotEmpty()
  totalPoints: number;

  @IsNumber()
  @IsNotEmpty()
  rewardAmount: number;

  @IsOptional()
  @Type(() => Date)
  startDate: Date;

  @IsString()
  @IsOptional()
  countryCode: string;

  @IsNumber()
  @IsNotEmpty()
  multiplier: number;
}

export type SngpQueryFilters = {
  status?: STATUS_TYPE;
  page: number;
  limit: number;
};
