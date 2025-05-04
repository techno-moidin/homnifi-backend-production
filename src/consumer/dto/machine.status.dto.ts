import { SN_BONUS_SUMMARY_TYPE } from '@/src/supernode/enums/sn-bonus-type.enum';
import {
  IsNotEmpty,
  IsEnum,
  IsString,
  IsDateString,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { IsObjectId } from 'class-validator-mongo-object-id';
import { Types } from 'mongoose';

export class MessageUpdatedDto {
  @IsNotEmpty()
  @IsObjectId({ message: 'Invalid machine id' })
  machineId: Types.ObjectId;

  @IsNotEmpty()
  @IsBoolean()
  status: boolean;
}
