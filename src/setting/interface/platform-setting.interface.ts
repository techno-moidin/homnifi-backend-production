import { SettingCategoryEnum } from '../enums/setting-category-enum';
import { SettingTypeEnum } from '../enums/setting-type-enum';

export interface PlatformSettingI {
  readonly name: string;
  readonly value: string;
  readonly description: string;
  readonly type: SettingTypeEnum;
  readonly options: string[];
  readonly category: SettingCategoryEnum;
}
