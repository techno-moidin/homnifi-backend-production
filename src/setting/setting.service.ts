import { Injectable } from '@nestjs/common';
import { UpdateSettingDto } from './dto/update-setting.dto';
import { PlatformSetting } from './schemas/platform.setting.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PlatformSettingI } from './interface/platform-setting.interface';
import { CACHE_TYPE } from '../cache/Enums/cache.enum';
import { CacheService } from '../cache/cache.service';

@Injectable()
export class SettingService {
  constructor(
    @InjectModel(PlatformSetting.name)
    private readonly platformSettingModel: Model<PlatformSettingI>,
    private cacheService: CacheService,
  ) {}

  async findAllPlatformSettings() {
    const platformSettingCacheData = await this.cacheService.getCacheUser({
      type: CACHE_TYPE.PLATFORM_SETTINGS,
      user: String('platform-settings'),
    });

    if (platformSettingCacheData) return platformSettingCacheData;
    const platformSettings = await this.platformSettingModel.find();
    await this.cacheService.setCacheUser(
      {
        type: CACHE_TYPE.PLATFORM_SETTINGS,
        user: String('platform-settings'),
        data: platformSettings,
      },
      86400,
    );

    return platformSettings;
  }

  async update(id: Types.ObjectId, updateSettingDto: UpdateSettingDto) {
    const platformSettings = await this.platformSettingModel.findByIdAndUpdate(
      id,
      updateSettingDto,
    );

    if (platformSettings) {
      await this.cacheService.deleteUserCache({
        type: CACHE_TYPE.PLATFORM_SETTINGS,
        user: String('platform-settings'),
      });
    }
  }
}
