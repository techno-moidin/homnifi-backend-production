import { Controller, Get, Body, Patch, Param, Put } from '@nestjs/common';
import { SettingService } from '../setting.service';
import { UpdateSettingDto } from '../dto/update-setting.dto';
import ApiResponse from '@/src/utils/api-response.util';
import { Types } from 'mongoose';

@Controller('platform-settings')
export class PlatformSettingController {
  constructor(private readonly settingService: SettingService) {}

  @Get()
  async findAllPlatformSettings() {
    const settings = await this.settingService.findAllPlatformSettings();
    return new ApiResponse(settings, 'Platform settings fetched successfully');
  }

  @Put(':id')
  async update(
    @Param('id') id: Types.ObjectId,
    @Body() updateSettingDto: UpdateSettingDto,
  ) {
    const updatedSetting = await this.settingService.update(
      id,
      updateSettingDto,
    );

    return new ApiResponse(
      updatedSetting,
      'Platform settings fetched successfully',
    );
  }
}
