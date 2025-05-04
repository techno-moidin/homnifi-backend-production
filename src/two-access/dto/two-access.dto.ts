import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class FindPaginatedDto {
  @IsOptional()
  page?: number = 1;

  @IsOptional()
  limit?: number = 10;
}

export class FindByIdDto {
  @IsString()
  @IsNotEmpty()
  id: string;
}

export class FindByEmailDto {
  @IsString()
  @IsNotEmpty()
  email: string;
}

export class SearchDto {
  query?: any;
}

export class FindByStatusDto {
  @IsString()
  @IsNotEmpty()
  status: string;
}

export class FindByNameDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}

export class FindByDateRangeDto {
  @IsString()
  @IsNotEmpty()
  startDate: string;

  @IsString()
  @IsNotEmpty()
  endDate: string;
}
export class GetFirstLineTwoUserAccessDto {
  @IsNotEmpty({ message: 'bid is required' })
  @IsString({ message: 'bid must be a string' })
  bid: string;

  @IsOptional()
  query?: any;

  @IsOptional()
  type?: any;

  @IsOptional()
  page?: number = 1;

  @IsOptional()
  limit?: number = 10;
}

export class FindAllDto {}

export class FindActiveDto {}
