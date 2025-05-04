import {
  IsBoolean,
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IsObjectId } from 'class-validator-mongo-object-id';
import { Types } from 'mongoose';
import { CACHE_TYPE } from '../Enums/cache.enum';

export class GetCacheDto {
  @IsNotEmpty()
  @IsObjectId({ message: 'Invalid user id' })
  user: Types.ObjectId | string;

  @IsEnum(CACHE_TYPE)
  @IsNotEmpty()
  type: CACHE_TYPE;

  @IsOptional()
  @IsNotEmpty()
  other_Type?: string;
}
export class SetCacheDto {
  @IsNotEmpty()
  @IsObjectId({ message: 'Invalid user id' })
  user: Types.ObjectId | string;

  @IsEnum(CACHE_TYPE)
  @IsNotEmpty()
  type: CACHE_TYPE;

  @IsOptional()
  @IsNotEmpty()
  other_Type?: string;

  @IsObject()
  @IsNotEmpty()
  data: object;
}
