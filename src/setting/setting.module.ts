import { Module } from '@nestjs/common';
import { SettingService } from './setting.service';
import { PlatformSettingController } from './controllers/platform-setting.controller';
import {
  PlatformSetting,
  PlatformSettingSchema,
} from './schemas/platform.setting.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { CacheService } from '../cache/cache.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PlatformSetting.name, schema: PlatformSettingSchema },
    ]),
  ],
  controllers: [PlatformSettingController],
  providers: [SettingService, CacheService],
})
export class SettingsModule {}
