import { STAKING_PERIOD_ENUM } from '@/src/cloud-k/schemas/cloudk-machine.schema';
import { IsEnum, IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { IsObjectId } from 'class-validator-mongo-object-id';
import { Types } from 'mongoose';

export class UsdkStakeDto {
  @IsObjectId({ message: 'Invalid machine id' })
  @IsNotEmpty()
  machine: Types.ObjectId;

  @IsNotEmpty()
  @IsString()
  @IsEnum(STAKING_PERIOD_ENUM, {
    message: 'Invalid stake period. Allowed values: 2, 3, 4, max',
  })
  stakePeriod: STAKING_PERIOD_ENUM;

  @IsObjectId({ message: 'Invalid token id' })
  @IsNotEmpty()
  token: Types.ObjectId;

  @IsNumber()
  @IsNotEmpty()
  amount: number;
}
