import { ACTION, PERMISSION_MODULE } from '@/src/enums/permission';
import { Transform, Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  Validate,
  ValidateNested,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { IsDateOnly } from 'src/admin/global/dto/is.date.only.dto';
import { ADMIN_ACCOUNT_STATUS } from '../auth/enums/admin.account.status.enum';
import { Injectable } from '@nestjs/common';
import { IsObjectId } from 'class-validator-mongo-object-id';
import { EncryptionService } from '../../encryption/encryption.service';

export class UpdateAdminDTO {
  @IsOptional()
  @IsString()
  firstName: string;

  @IsOptional()
  @IsString()
  lastName: string;

  @IsOptional()
  @IsEmail({}, { message: 'Invalid Email format' })
  email: string;

  @IsOptional()
  @Transform(({ value }) => {
    const encryptionService = new EncryptionService();
    return encryptionService.decryptData(value, true);
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(50, { message: 'Password must be less than 50 characters long' })
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message: 'Password too weak',
  })
  password: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PermissionDTO)
  permissions: PermissionDTO[];

  @IsOptional()
  @IsObjectId()
  role: string;

  @IsOptional()
  @IsString()
  @IsEnum(ADMIN_ACCOUNT_STATUS)
  status: ADMIN_ACCOUNT_STATUS;
}

export class PermissionDTO {
  @IsNotEmpty()
  @IsEnum(PERMISSION_MODULE)
  source: PERMISSION_MODULE;

  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(ACTION, { each: true })
  actions: ACTION[];
}

@Injectable()
@ValidatorConstraint({ name: 'passwordMatch', async: false })
export class PasswordMatchConstraint implements ValidatorConstraintInterface {
  validate(confirmPassword: string, args: ValidationArguments) {
    const { password } = args.object as UpdateAdminPasswordDTO;
    return password === confirmPassword;
  }

  defaultMessage(args: ValidationArguments) {
    return 'Password and confirm password do not match';
  }
}

export class UpdateAdminPasswordDTO {
  @Transform(({ value }) => {
    const encryptionService = new EncryptionService();
    return encryptionService.decryptData(value, true);
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(50, { message: 'Password must be less than 50 characters long' })
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message: 'Password too weak',
  })
  password: string;

  @Transform(({ value }) => {
    const encryptionService = new EncryptionService();
    return encryptionService.decryptData(value, true);
  })
  @IsString()
  @Validate(PasswordMatchConstraint)
  confirmPassword: string;

  @IsBoolean()
  logoutFromAllDevices: boolean;

  @Transform(({ value }) => {
    const encryptionService = new EncryptionService();
    return encryptionService.decryptData(value, true);
  })
  @IsString()
  @IsOptional()
  currentPassword?: string;
}
