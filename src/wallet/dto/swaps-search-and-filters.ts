import { TransactionStatus } from '@/src/global/enums/transaction.status.enum';
import { IsEnum, IsNumber, IsString } from 'class-validator';

export class SearchAndFiltersSwapsDto {
  @IsNumber()
  page: number;

  @IsNumber()
  limit: number;

  @IsString()
  query: string;

  @IsEnum(TransactionStatus)
  status: TransactionStatus;

  @IsString()
  date: string;
}
