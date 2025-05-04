import { Model } from 'mongoose';
import { INestApplicationContext, Logger } from '@nestjs/common';
import { PlatformSetting } from '../setting/schemas/platform.setting.schema';
import { SettingTypeEnum } from '../setting/enums/setting-type-enum';
import { SettingCategoryEnum } from '../setting/enums/setting-category-enum';

const settings = [
  {
    name: 'featured-video-url',
    value: 'https://www.youtube.com/watch?v=iVHY0JlhjXk',
    description: 'Featured video URL',
    type: SettingTypeEnum.GENERAL,
    options: [],
    category: SettingCategoryEnum.DASHBOARD,
  },
];

export async function platformSettingsTokens(
  appContext: INestApplicationContext,
) {
  const logger = new Logger(platformSettingsTokens.name);

  const platformSettingModel = appContext.get<Model<PlatformSetting>>(
    PlatformSetting.name + 'Model',
  );

  try {
    const promises = settings.map(async (setting) => {
      const existingSetting = await platformSettingModel
        .findOne({ name: setting.name })
        .exec();
      if (!existingSetting) {
        const newSetting = new platformSettingModel(setting);
        return newSetting.save();
      } else {
        logger.log(`Setting already exists: ${setting.name}`);
      }
    });

    await Promise.all(promises);
    logger.log(`Platform settings seeded successfully.`);
  } catch (error) {
    logger.error(`Error seeding platform settings: ${error.message}`);
    throw error;
  }
}
