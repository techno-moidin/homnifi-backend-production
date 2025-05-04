import { PartialType } from '@nestjs/mapped-types';
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
import { IsObjectId } from 'class-validator-mongo-object-id';
import mongoose, { Types } from 'mongoose';

export class PurchaseTProductDto {
  @IsObjectId({ message: 'Invalid machine id' })
  @IsNotEmpty()
  product: Types.ObjectId;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsEmail({}, { message: 'Please provide a valid email address.' })
  @IsNotEmpty({ message: 'Email is required.' })
  email: string;
}

export class AddTProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @IsNotEmpty()
  price: number;

  @IsNumber()
  @IsNotEmpty()
  levarage: number;

  @IsNumber()
  @IsNotEmpty()
  returnAmount: number;

  @IsBoolean()
  @IsNotEmpty()
  isVisible: boolean;
}

export class UpdateTProductsDto extends PartialType(AddTProductDto) {}

export class PurchaseTProductUpdateDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;
}
