import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { IsObjectId } from 'class-validator-mongo-object-id';
import mongoose, { Types } from 'mongoose';

export class BaseRefLevelDto {
  @IsNumber()
  @IsNotEmpty()
  level: number;

  @IsNumber()
  @IsNotEmpty()
  firstLevelNodes: number;

  @IsNumber()
  @IsNotEmpty()
  percentage: number;
}

export class CreateBasRefSettingDto {
  @IsOptional()
  @IsString()
  note?: string | undefined;

  @IsArray()
  @Type(() => BaseRefLevelDto)
  @ValidateNested({ each: true })
  levels: BaseRefLevelDto[];
}

export class BuilderGenerationDto {
  @IsNotEmpty()
  @IsObjectId({ message: 'Invalid product id' })
  product: Types.ObjectId;

  @IsNumber()
  @IsNotEmpty()
  percentage: number;
}

export class CreateBuilderGenerationSettingDto {
  @IsOptional()
  @IsString()
  note?: string | undefined;

  @IsArray()
  @Type(() => BuilderGenerationDto)
  @ValidateNested({ each: true })
  products: BuilderGenerationDto[];

  @IsNumber()
  @IsNotEmpty()
  matchingBonus: number;
}

export class UpdateBuilderGenerationSettingDto {
  @IsString()
  productId: string;

  @IsNumber()
  percentage: number;
}
export class CreateMatchingBonusSettingDto {
  @IsNumber()
  matchingBonus: number;
}

export class DistributionDto {
  @IsOptional()
  @IsString()
  note?: string | undefined;

  @IsObjectId({ message: 'Invalid object id' })
  @IsNotEmpty()
  sngpDistribution: mongoose.Types.ObjectId;
}
