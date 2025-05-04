import { isNumber, IsOptional, IsString } from 'class-validator';

export class tBalanceLogPaginateDTO {
  @IsOptional()
  page?: number = 1;

  @IsOptional()
  limit?: number = 10;

  sortOrder: number = 1;
}

export class tBalanceReportLogPaginateDTO {
  @IsOptional()
  page?: number = 1;

  @IsOptional()
  limit?: number = 10;

  @IsOptional()
  sortOrder: number = 1;

  @IsOptional()
  @IsString()
  query: string;
}
