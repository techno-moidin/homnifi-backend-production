import {
  IsNotEmpty,
  IsString,
  IsDate,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  IsNumber,
  Min,
  Max,
  IsArray,
  ValidateNested,
  ArrayNotEmpty,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { AdditionalMintingPromotionStatus } from '../schemas/additional-minting-promotion.schema';

export class CreatePromotionDto {
  @IsString()
  @IsNotEmpty()
  promotionName: string;

  @IsNotEmpty()
  @Type(() => Date)
  @IsDate()
  startDate: Date;

  @IsNotEmpty()
  @Type(() => Date)
  @IsDate()
  endDate: Date;

  @IsOptional()
  @IsEnum(AdditionalMintingPromotionStatus)
  status?: AdditionalMintingPromotionStatus;

  @IsString()
  @IsOptional()
  stoppedDate?: Date;
}

export class CountryItemDto {
  @IsString()
  countryId: string;

  @IsString()
  name: string;

  @IsString()
  countryCodeAlpha3: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  percentage: number;
}

export class ProductPromotionItemDto {
  @IsNotEmpty()
  @IsString()
  productId: string;

  @ValidateNested({ each: true })
  @Type(() => CountryItemDto)
  countryList: CountryItemDto[];
}

export class CreateProductPromotionDto {
  @IsNotEmpty()
  @IsString()
  promotionId: string;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => ProductPromotionItemDto)
  products: ProductPromotionItemDto[];
}

export class UpdateCountryItemDto {
  @IsString()
  @IsOptional()
  countryId: string;

  @IsString()
  @IsOptional()
  name: string;

  @IsString()
  @IsOptional()
  countryCodeAlpha3: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  percentage: number;
}

export class UpdateProductSettingDto {
  @IsString()
  productId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateCountryItemDto)
  countryList: UpdateCountryItemDto[];
}

export class UpdatePromotionAndSettingsDto {
  @IsString()
  @IsOptional()
  promotionName?: string;

  @IsOptional()
  startDate?: Date;

  @IsOptional()
  endDate?: Date;

  @IsEnum(AdditionalMintingPromotionStatus)
  @IsOptional()
  status?: AdditionalMintingPromotionStatus;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UpdateProductSettingDto)
  productSettings?: UpdateProductSettingDto[];
}

export class PromotionStatusDto {
  @IsString()
  @IsEnum(AdditionalMintingPromotionStatus)
  status: AdditionalMintingPromotionStatus;

  @IsString()
  date: Date;
}
