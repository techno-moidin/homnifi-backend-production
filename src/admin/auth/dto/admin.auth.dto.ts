import { ACTION, PERMISSION_MODULE } from '@/src/enums/permission';
import { Transform, Type } from 'class-transformer';
import { EncryptionService } from '../../../encryption/encryption.service';

import {
  IsEmail,
  IsMongoId,
  IsNotEmpty,
  IsString,
  Validate,
  IsOptional,
  Length,
  Matches,
  MaxLength,
  MinLength,
  IsArray,
  ValidateNested,
  IsEnum,
  ArrayNotEmpty,
  IsBoolean,
} from 'class-validator';

import mongoose from 'mongoose';

export class RegisterUserDto {
  @IsString()
  @Matches(/^[a-z0-9.+_-]+$/)
  @Length(1, 150)
  username: string;

  @IsString()
  @Length(1, 128)
  password: string;

  @IsEmail()
  @Length(1, 150)
  email: string;
}

export class AdminSigninDto {
  @Transform(({ value }) => {
    const encryptionService = new EncryptionService();
    return encryptionService.decryptData(value, true);
  })
  @IsString()
  @IsNotEmpty({ message: 'email is required' })
  email: string;

  @Transform(({ value }) => {
    const encryptionService = new EncryptionService();
    return encryptionService.decryptData(value, true);
  })
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class AdminSignupDto {
  @Transform(({ value }) => {
    const encryptionService = new EncryptionService();
    return encryptionService.decryptData(value, true);
  })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @Transform(({ value }) => {
    const encryptionService = new EncryptionService();
    return encryptionService.decryptData(value, true);
  })
  @IsString()
  @IsOptional()
  username?: string;

  @Transform(({ value }) => {
    const encryptionService = new EncryptionService();
    return encryptionService.decryptData(value, true);
  })
  @IsString()
  @IsNotEmpty()
  @IsString()
  password: string;

  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsBoolean()
  @IsOptional()
  isSuperAdmin?: boolean;

  @IsBoolean()
  @IsOptional()
  isSubSuperAdmin: boolean;

  @IsMongoId()
  @IsOptional()
  role?: string; // Role ID

  @Type(() => Date)
  @IsOptional()
  passwordChangedAt?: Date;
}

export class AdminVerifyDto {
  /**
   * @deprecated We will use token for authentication for login.
   */
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsNotEmpty()
  token?: string;

  @IsString()
  @IsNotEmpty()
  code: string;
}

export class ResetPasswordRequestDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
export class ResetPasswordDto {
  @Transform(({ value }) => {
    const encryptionService = new EncryptionService();
    return encryptionService.decryptData(value, true);
  })
  @IsString()
  @IsNotEmpty()
  password: string;

  @Transform(({ value }) => {
    const encryptionService = new EncryptionService();
    return encryptionService.decryptData(value, true);
  })
  @IsString()
  @IsNotEmpty()
  @Validate((value, args) => value === args.object.password)
  confirmPassword: string;
}

export class VerifyEmailDto {
  @IsString()
  @IsNotEmpty()
  otp: string;
}

export class ForgotPasswordRequestDto {
  email: string;
}

// reset-password.dto.ts
export class ForgotPasswordDto {
  token: string;

  @Transform(({ value }) => {
    const encryptionService = new EncryptionService();
    return encryptionService.decryptData(value, true);
  })
  newPassword: string;

  @Transform(({ value }) => {
    const encryptionService = new EncryptionService();
    return encryptionService.decryptData(value, true);
  })
  confirmPassword: string;
}
