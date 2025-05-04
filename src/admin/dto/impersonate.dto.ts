import {
  IsBoolean,
  IsArray,
  IsNumber,
  IsMongoId,
  IsString,
  IsOptional,
} from 'class-validator';

export class ImpersonateDto {
  @IsString()
  bid: string;

  @IsString()
  @IsOptional()
  admin: string;

  @IsString()
  @IsOptional()
  reason: string;
}
