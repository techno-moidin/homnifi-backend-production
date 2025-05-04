import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsObject,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class CurrencyMapDto {
  @IsString()
  name: string;

  @IsString()
  symbol: string;
}

export class CreateCountryDto {
  @IsString()
  @IsNotEmpty()
  countryCode: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  flag: string;

  @IsString()
  @IsNotEmpty()
  region: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Object)
  @IsObject({ each: true })
  currencies: Record<string, CurrencyMapDto>[];

  @IsString({ each: true })
  phoneCodes: string[];

  @IsString()
  @IsNotEmpty()
  countryCodeAlpha3: string;
}
