import { IsEnum, IsString } from 'class-validator';
import { SettingTypeEnum } from '../enums/setting-type-enum';
import { SettingCategoryEnum } from '../enums/setting-category-enum';

export class UpdateSettingDto {
  @IsString()
  name: string;

  @IsString()
  value: string;

  @IsString()
  description: string;

  @IsEnum(SettingTypeEnum)
  type: SettingTypeEnum;

  @IsEnum(SettingCategoryEnum)
  category: SettingCategoryEnum;
}
