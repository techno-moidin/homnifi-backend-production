import {
  IsArray,
  IsDateString,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export enum SuperNodeBlockField {
  BASE_REFERRAL = 'Base Referral',
  BUILDER_GENERAL = 'Builder General',
  BUILDER_REFERRAL = 'Builder Referral',
}
export class BlockSupernodeUserDto {
  @IsOptional()
  @IsNotEmpty()
  blockedAt: string;

  @IsString()
  @IsNotEmpty()
  blockedBy: string;

  @IsArray()
  @IsString({ each: true })
  blockedFor: string[];

  @IsString()
  @IsNotEmpty()
  blockedReason: string;

  @IsString()
  @IsNotEmpty()
  userId: string;
}
