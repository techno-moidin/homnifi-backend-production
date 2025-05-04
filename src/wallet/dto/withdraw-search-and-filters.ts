import { TransactionStatus } from '@/src/global/enums/transaction.status.enum';
import { WITHDRAW_TYPES } from '@/src/token/enums/withdraw-types.enum';
import { IsEnum, IsNumber, IsString } from 'class-validator';

export class SearchAndFiltersWithdrawDto {
  @IsNumber()
  page: number;

  @IsNumber()
  limit: number;

  @IsString()
  query: string;

  @IsEnum(TransactionStatus)
  status: TransactionStatus;

  @IsEnum(WITHDRAW_TYPES)
  type: WITHDRAW_TYPES;

  @IsString()
  date: string;
}
