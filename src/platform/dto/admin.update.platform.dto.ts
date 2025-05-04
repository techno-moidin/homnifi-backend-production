import {
  IsBoolean,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { AdminDeletePlatformDto } from './admin.delete.platform.dto';
import { PlatformCategoryEnum } from '../enums/platform.category.enum';

export class AdminUpdatePlatformDto extends AdminDeletePlatformDto {
  @IsNotEmpty()
  @IsMongoId()
  id: string;

  @IsOptional()
  @IsString()
  title: string;

  @IsOptional()
  @IsEnum(PlatformCategoryEnum)
  category: PlatformCategoryEnum;

  @IsOptional()
  @IsString()
  description: string;

  @IsOptional()
  @IsBoolean()
  isFeatured: boolean;

  @IsOptional()
  @IsString()
  image: string;
}
