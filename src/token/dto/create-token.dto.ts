import {
  CONVERSION_TYPES,
  TOKEN_TYPES,
  TOKEN_WITHDRAW_TYPES,
} from '@/src/global/enums/wallet.enum';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';
import { ValueType } from '../schemas/token.schema';
import { Transform } from 'class-transformer';
import { transformToLowerCase } from '@/src/utils/helpers';

export class CreateTokenDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @Transform(transformToLowerCase)
  @IsString()
  @IsNotEmpty()
  symbol: string;

  @IsEnum(TOKEN_TYPES)
  @IsNotEmpty()
  type: TOKEN_TYPES;

  @IsEnum(TOKEN_WITHDRAW_TYPES)
  @IsNotEmpty()
  withdrawType: TOKEN_WITHDRAW_TYPES;

  @IsString()
  @IsNotEmpty()
  color: string;

  @IsBoolean()
  @IsOptional()
  isDebitEnable?: boolean;

  /**
   * @deprecated
   */
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  networks?: string[];

  @IsString()
  @IsNotEmpty()
  iconUrl: string;

  @Transform(transformToLowerCase)
  @IsEnum(ValueType)
  @IsNotEmpty()
  valueType?: ValueType;

  @IsBoolean()
  @IsOptional()
  showZeroBalance?: boolean;

  @IsEnum(CONVERSION_TYPES)
  @IsNotEmpty()
  conversionType: CONVERSION_TYPES;

  @ValidateIf((o) => o.conversionType === CONVERSION_TYPES.CUSTOM)
  @IsNumber()
  @IsNotEmpty()
  customRate?: number;

  @IsString()
  @IsOptional()
  pairValue?: string;
}
