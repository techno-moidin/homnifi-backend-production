import {
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  IsBoolean,
} from 'class-validator';

export class UpdateUserDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  username?: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  profilePicture?: string;

  @IsOptional()
  @IsString()
  dateJoined?: string;

  @IsOptional()
  @IsBoolean()
  rewardMultiplier?: boolean;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsBoolean()
  isMembership?: boolean;

  @IsOptional()
  @IsString()
  referralCode?: string;
}

export class TrustpilotUserDTO extends UpdateUserDto {
  @IsString()
  @IsNotEmpty()
  referenceId?: string; // this is user bid

  @IsString()
  @IsOptional()
  name?: string;

  @IsOptional()
  @IsString()
  locale?: string;

  @IsString()
  redirectUri?: string;
}

export class UserStatusDTO extends UpdateUserDto {
  @IsString()
  @IsNotEmpty()
  blockchainId: string;

  @IsBoolean()
  isBlocked: boolean;

  @IsOptional()
  @IsString()
  blockedReason?: string;

  @IsOptional()
  @IsString()
  unblockedReason?: string;
}
