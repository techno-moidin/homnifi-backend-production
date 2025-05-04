import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { IsObjectId } from 'class-validator-mongo-object-id';
import mongoose from 'mongoose';
import { PaginateDTO } from 'src/admin/global/dto/paginate.dto';
import { SortSearchEnum } from 'src/admin/global/enums/sort.search.enum';

export class PaginateAdminsDto extends PaginateDTO {
  @IsString()
  @IsOptional()
  query?: string;

  @IsEnum(SortSearchEnum)
  @IsOptional()
  sort: SortSearchEnum;

  @IsObjectId({ message: 'Invalid object id' })
  @IsOptional()
  id: mongoose.Types.ObjectId;
}
