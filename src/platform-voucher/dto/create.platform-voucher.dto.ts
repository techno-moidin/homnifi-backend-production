import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEnum,
  IsUrl,
  IsBoolean,
} from 'class-validator';

export enum VoucherStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export class CreatePlatformVoucherDTO {
  @IsOptional()
  @IsString()
  readonly name?: string;

  @IsString()
  @IsNotEmpty()
  readonly code: string;

  @IsUrl()
  @IsNotEmpty()
  readonly image: string;

  @IsEnum(VoucherStatus)
  @IsNotEmpty()
  readonly status: VoucherStatus;

  @IsBoolean()
  @IsOptional()
  readonly isRedeemed?: boolean;

  @IsBoolean()
  @IsOptional()
  readonly isExpired?: boolean;
}
