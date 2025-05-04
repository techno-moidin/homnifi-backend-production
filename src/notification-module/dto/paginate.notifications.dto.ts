import { IsOptional } from 'class-validator';

export class PaginateNotificationsDTO {
  @IsOptional()
  page?: number;

  @IsOptional()
  limit?: number;
}
