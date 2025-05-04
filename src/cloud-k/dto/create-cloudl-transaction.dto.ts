import {
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsNotEmpty,
} from 'class-validator';
import { CloudKTransactionTypes } from '../schemas/cloudk-transactions.schema';

export class CreateCloudKTransactionDto {
  @IsMongoId()
  @IsNotEmpty()
  user: string;

  @IsEnum(CloudKTransactionTypes)
  @IsNotEmpty()
  type: CloudKTransactionTypes;

  @IsOptional()
  @IsMongoId()
  machine?: string;

  @IsNumber()
  @IsNotEmpty()
  tokenAmount: number;

  @IsOptional()
  @IsNumber()
  totalTokenPrice?: number;
}
