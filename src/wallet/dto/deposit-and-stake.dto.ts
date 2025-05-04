import { Types } from 'mongoose';
import { IsObjectId } from 'class-validator-mongo-object-id';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
class MachineDetail {
  @IsNotEmpty({ message: 'Product ID cannot be empty' })
  @IsObjectId({ message: 'Invalid product ID' })
  machine: Types.ObjectId;

  // TODO: Uncomment when Multiple Product comes to picture
  //   @IsNotEmpty({ message: 'Amount cannot be empty' })
  //   amount: number;
}

export class CreateDepositAndStakeDto {
  @IsObjectId({ message: 'Invalid to token id' })
  @IsNotEmpty()
  token: Types.ObjectId;

  @IsObjectId({ message: 'Invalid from network id' })
  @IsNotEmpty()
  network: Types.ObjectId;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MachineDetail)
  machineDetails: MachineDetail[];
}
