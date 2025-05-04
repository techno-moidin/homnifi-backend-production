import { HttpException, Injectable } from '@nestjs/common';
import { TierSettingsDto } from './dto/tier.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TierLevelSetting } from './schemas/tier-level-settings.schema';
import { TierSetting } from './schemas/tier-setting.schema';

@Injectable()
export class TierService {
  connection: any;
  constructor(
    @InjectModel(TierLevelSetting.name)
    private readonly tierLevelSettingModel: Model<TierLevelSetting>,
    @InjectModel(TierSetting.name)
    private readonly tierSettingModel: Model<TierSetting>,
  ) {}
  async createTeirSettings(settingsDto: TierSettingsDto, userId) {
    const settingLevel = settingsDto.settingLevels;

    const session = await this.connection.startSession();
    await session.startTransaction();

    try {
      await this.tierSettingModel.updateMany(
        {
          isActive: true,
        },
        {
          isActive: false,
        },
      );
      const newSetting = await this.tierSettingModel.create({
        note: settingsDto.note,
        isActive: true,
        totalLevels: settingsDto.totalLevels,
        meta: {
          createdBy: userId,
        },
      });
      const newLevelSettings = settingLevel.map((levelSetting) => ({
        setting: newSetting[0]._id,
        ...levelSetting,
      }));

      await this.tierLevelSettingModel.create(newLevelSettings, {
        session,
      });
      await session.commitTransaction();
      return;
    } catch (error) {
      await session.abortTransaction();
      throw new HttpException(error.message, 500);
    } finally {
      session.endSession();
    }
  }

  async getTeirSettings() {
    const currentSetting = await this.tierSettingModel.findOne({
      isActive: true,
    });
    if (!currentSetting)
      throw new HttpException(
        'Admin does not add the settings for builder generation yet.',
        400,
      );

    const productSetting = await this.tierLevelSettingModel
      .find({
        setting: currentSetting._id,
      })
      .sort({
        from: -1,
      });

    if (!currentSetting) throw new HttpException('Something went wrong', 400);
    return {
      setting: currentSetting,
      levels: productSetting,
    };
  }
}
