import { ACTION, PERMISSION_MODULE } from '@/src/enums/permission';
import { CreateBuilderGenerationSettingDto } from '@/src/supernode/dto/create-base-ref-setting.dto';
import { SupernodeService } from '@/src/supernode/supernode.service';

import ApiResponse from '@/src/utils/api-response.util';
import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Permissions } from '../auth/decorators/permissions';
import { AdminGuard } from '../auth/guards/admin.guard';
import { SNGlogbalPollService } from '@/src/supernode/sn-global-poll.service';
import { TierSettingsDto } from '@/src/supernode/dto/tier.dto';
import { TierService } from '@/src/supernode/tier.service';
import { TelegramNotificationInterceptor } from '@/src/interceptor/telegram.notification';

@Controller('admin/supernode')
@UseGuards(AdminGuard)
@UseInterceptors(TelegramNotificationInterceptor)
export class AdminTierController {
  constructor(private readonly tierService: TierService) {}

  @Post('tier/settings')
  @Permissions([
    { action: [ACTION.WRITE], module: PERMISSION_MODULE.SUPER_NODE },
  ])
  async createTeirSettings(
    @Req() req: any,
    @Body() settingsDto: TierSettingsDto,
  ) {
    const settings = await this.tierService.createTeirSettings(
      settingsDto,
      req.id,
    );

    return new ApiResponse(settings);
  }

  @Get('tier/settings')
  @Permissions([
    { action: [ACTION.READ], module: PERMISSION_MODULE.SUPER_NODE },
  ])
  async getBuilderGenerationSettings() {
    const settings = await this.tierService.getTeirSettings();

    return new ApiResponse(settings);
  }
}
