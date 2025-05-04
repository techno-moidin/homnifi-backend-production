import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { IsObjectId } from 'class-validator-mongo-object-id';
import { Types } from 'mongoose';

export class MachineConnectDto {
  @IsObjectId({ message: 'Invalid machine id' })
  machine: Types.ObjectId;

  @IsNotEmpty()
  @IsString()
  serialNumber: string;
}
export class MachineActiveStatusDto {
  @IsObjectId({ message: 'Invalid machine id' })
  machine: Types.ObjectId;

  @IsOptional()
  @IsString()
  fromDate?: string;

  @IsOptional()
  @IsString()
  toDate?: string;
}
