import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { PlatformCategoryEnum } from '../enums/platform.category.enum';

export class UserFilterPlatformDTO {
  @IsEnum(PlatformCategoryEnum)
  @IsOptional()
  category: PlatformCategoryEnum;

  @IsOptional()
  @IsString()
  query: string;
}
