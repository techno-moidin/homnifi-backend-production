import {
  ChangeVisibilityUsdkStakeSettingsDto,
  CreateUsdkStakeSettingsDto,
} from '@/src/usdk-stake/dto/create-usdk-stake-settings.dto';
import { UsdkStakeService } from '@/src/usdk-stake/usdk-stake.service';
import ApiResponse from '@/src/utils/api-response.util';
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../auth/guards/admin.guard';
import { Permissions } from '../auth/decorators/permissions';
import { ACTION, PERMISSION_MODULE } from '@/src/enums/permission';

@Controller('admin/usdk-stake')
@UseGuards(AdminGuard)
export class AdminUsdstakeController {
  constructor(private readonly UsdkStakeService: UsdkStakeService) {}

  @Get('usdk-stake-settings')
  @Permissions([
    { action: [ACTION.READ], module: PERMISSION_MODULE.USDK_STAKE },
  ])
  async getUsdkStakeSettings() {
    try {
      const result = await this.UsdkStakeService.getUsdkStakeSettings();
      return new ApiResponse(result);
    } catch (error) {
      throw error;
    }
  }

  @Post('usdk-stake-settings')
  @Permissions([
    { action: [ACTION.WRITE], module: PERMISSION_MODULE.USDK_STAKE },
  ])
  async createUsdkStakeSettings(@Body() dto: CreateUsdkStakeSettingsDto) {
    try {
      const result = await this.UsdkStakeService.createUsdkStakeSettings(dto);
      console.log({ result });
      return new ApiResponse(result, `USDK-Stake setting created successfully`);
    } catch (error) {
      throw error;
    }
  }

  @Put('usdk-stake-settings/:id')
  @Permissions([
    { action: [ACTION.UPDATE], module: PERMISSION_MODULE.USDK_STAKE },
  ])
  async updateUsdkStakeSettings(
    @Param('id') id: string,
    @Body() dto: CreateUsdkStakeSettingsDto,
  ) {
    try {
      const result = await this.UsdkStakeService.updateUsdkStakeSettings(
        id,
        dto,
      );
      return new ApiResponse(result, 'USDK-Stake setting updated successfully');
    } catch (error) {
      throw error;
    }
  }

  @Patch('usdk-stake-settings/visibility/:id')
  @Permissions([
    { action: [ACTION.UPDATE], module: PERMISSION_MODULE.USDK_STAKE },
  ])
  async enableOrDisableUsdkStakeSettings(
    @Param('id') id: string,
    @Body() dto: ChangeVisibilityUsdkStakeSettingsDto,
  ) {
    try {
      const result =
        await this.UsdkStakeService.enableOrDisableUsdkStakeSettings(id, dto);
      return new ApiResponse(
        result,
        'USDK-Stake setting visibility changed successfully',
      );
    } catch (error) {
      throw error;
    }
  }
}
