import { TransactionStatus } from '@/src/global/enums/transaction.status.enum';
import { WITHDRAW_TYPES } from '@/src/token/enums/withdraw-types.enum';
import { IsEnum, IsNumber, IsString } from 'class-validator';

export class SearchAndFiltersDepositsDto {
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
