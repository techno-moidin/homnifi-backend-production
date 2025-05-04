import { EncryptionService } from '@/src/encryption/encryption.service';
import { Transform } from 'class-transformer';
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
} from 'class-validator';
import mongoose from 'mongoose';

export class RegisterUserDto {
  @Transform(({ value }) => {
    const encryptionService = new EncryptionService();
    return encryptionService.decryptData(value);
  })
  @IsString()
  @Matches(/^[a-z0-9.+_-]+$/)
  @Length(1, 150)
  username: string;

  @Transform(({ value }) => {
    const encryptionService = new EncryptionService();
    return encryptionService.decryptData(value);
  })
  @IsString()
  @Length(1, 128)
  password: string;

  @Transform(({ value }) => {
    const encryptionService = new EncryptionService();
    return encryptionService.decryptData(value);
  })
  @IsEmail()
  @Length(1, 150)
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  referralUpline?: string;

  @IsString()
  @Length(1, 10000)
  captchaToken: string;

  @IsString()
  @IsNotEmpty()
  country: string;
}
export class LoginDto {
  @Transform(({ value }) => {
    const encryptionService = new EncryptionService();
    return encryptionService.decryptData(value);
  })
  @IsString()
  @IsNotEmpty({ message: 'username/email is required' })
  username: string;

  @Transform(({ value }) => {
    const encryptionService = new EncryptionService();
    return encryptionService.decryptData(value);
  })
  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @Length(1, 10000)
  captchaToken: string;
}

export class ResetPasswordRequestDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  password: string;

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
