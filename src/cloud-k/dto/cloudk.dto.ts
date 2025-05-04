import { YesOrNo } from '@/src/enums/common.enums';
import { PLATFORMS } from '@/src/global/enums/wallet.enum';
import { Optional } from '@nestjs/common';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsPositive,
  IsString,
  registerDecorator,
  ValidateNested,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';
import { IsObjectId } from 'class-validator-mongo-object-id';
import { Types } from 'mongoose';
import { STAKING_PERIOD_ENUM } from '../schemas/cloudk-machine.schema';

export function IsNumberOrNull(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isNumberOrNull',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          return typeof value === 'number' || value === null;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a number or null`;
        },
      },
    });
  };
}

export class CreateUserMachineDto {
  @IsString()
  productId: string;

  @IsString()
  userBid: string;
}

export class CreateUserMachineV2Dto {
  @IsString()
  productId: string;

  @IsString()
  userBid: string;

  @IsNumber()
  quantity: number;

  @IsString()
  orderId: string;

  @IsString()
  idempotencyKey: string;

  @IsEnum(PLATFORMS)
  @IsOptional()
  platform?: PLATFORMS;
}

export class StakeTokensDto {
  @IsObjectId({ message: 'Invalid machine id' })
  machine: Types.ObjectId;

  @IsNumber()
  @IsPositive({ message: 'Amount must be greater than zero' })
  amount: number;

  @IsOptional()
  @IsBoolean()
  isPhaseEnabled;

  @IsOptional()
  @IsBoolean()
  HundredPercentClicked;

  @IsOptional()
  @IsObjectId({ message: 'Invalid token id' })
  token?: Types.ObjectId;

  @IsOptional()
  @IsString()
  @IsEnum(STAKING_PERIOD_ENUM, {
    message: 'Invalid stake period. Allowed values: 2, 3, 4, max',
  })
  stakePeriod?: STAKING_PERIOD_ENUM;
}

interface IInflationRule {
  dropPercentage: number;
  productionDecreasePercentage: number;
  increaseDLPPercentage: number;
  mintingBoost: number;
}

export class InflationRulesDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  adminNote: string;

  @IsArray()
  @IsNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => InflationRule)
  rules: IInflationRule[];
}

class InflationRule implements IInflationRule {
  @IsNotEmpty()
  dropPercentage: number;

  @IsNotEmpty()
  productionDecreasePercentage: number;

  @IsNotEmpty()
  increaseDLPPercentage: number;

  @IsNotEmpty()
  mintingBoost: number;
}

export class GlobalAutoCompoundDto {
  @IsBoolean()
  @IsNotEmpty()
  enabled: boolean;
}

export class MachineAutoCompoundDto {
  @IsBoolean()
  @IsNotEmpty()
  enabled: boolean;

  @IsMongoId()
  @IsNotEmpty()
  machine: Types.ObjectId;
}

export class CloudKSettingsDto {
  @IsMongoId()
  @IsNotEmpty()
  stakeToken: Types.ObjectId;

  @IsMongoId()
  @IsNotEmpty()
  rewardToken: Types.ObjectId;

  @IsMongoId()
  @IsNotEmpty()
  bunInToken: Types.ObjectId;
}

export class CreateAutoCompoundPenaltyDto {
  @IsNumber()
  @IsNotEmpty()
  percentage: number;
}
export class GetUserMachineDto {
  @IsEnum(YesOrNo)
  @IsOptional()
  doNotShowExpired: YesOrNo;

  @IsEnum(YesOrNo)
  @IsString()
  @IsOptional()
  doNotShowLimitExceeded: YesOrNo;
}
  