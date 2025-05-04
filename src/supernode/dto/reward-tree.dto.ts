import { IsOptional, IsInt, Min, IsString } from 'class-validator';

export class RewardTreePaginationDto {
  @IsOptional()
  page: number = 1;

  @IsOptional()
  limit: number = 10;

  @IsOptional()
  depth: number = 5;
}
