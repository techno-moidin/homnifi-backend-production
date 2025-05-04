import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Permissions } from '../auth/decorators/permissions';
import { PlatformService } from '@/src/platform/platform.service';
import { AdminGuard } from '../auth/guards/admin.guard';
import { AdminCreatePlatformDto } from '@/src/platform/dto/admin.create.platform.dto';
import { ACTION, PERMISSION_MODULE } from '@/src/enums/permission';
import { AdminDeletePlatformDto } from '@/src/platform/dto/admin.delete.platform.dto';
import { AdminUpdatePlatformDto } from '@/src/platform/dto/admin.update.platform.dto';
import { CreateAdDto } from '@/src/platform/dto/create-ad.dto';
import ApiResponse from '@/src/utils/api-response.util';
import { Types } from 'mongoose';
import { TelegramNotificationInterceptor } from '@/src/interceptor/telegram.notification';

@UseGuards(AdminGuard)
@UseInterceptors(TelegramNotificationInterceptor)
@Controller('admin/platform')
export class AdminPlatformController {
  constructor(private readonly platformService: PlatformService) {}

  @Post('')
  @Permissions([{ action: [ACTION.WRITE], module: PERMISSION_MODULE.PLATFORM }])
  async createPlatform(
    @Req() req: any,
    @Body() createPlatformDto: AdminCreatePlatformDto,
  ): Promise<any> {
    return this.platformService.createPlatform(createPlatformDto);
  }

  @Put(':id')
  @Permissions([
    { action: [ACTION.UPDATE], module: PERMISSION_MODULE.PLATFORM },
  ])
  async updatePlatform(
    @Req() req: any,
    @Body() updatePlatformDto: AdminCreatePlatformDto,
    @Param('id') id: string,
  ): Promise<any> {
    return this.platformService.updatePlatform(id, updatePlatformDto);
  }

  @Delete(':id')
  @Permissions([
    { action: [ACTION.DELETE], module: PERMISSION_MODULE.PLATFORM },
  ])
  async deletePlatform(@Param('id') id: string): Promise<any> {
    return this.platformService.deletePlatform(id);
  }

  @Get('ads')
  @Permissions([{ action: [ACTION.READ], module: PERMISSION_MODULE.PLATFORM }])
  async getPlatformAds() {
    const data = await this.platformService.getPlatformAds(true);
    return new ApiResponse(data);
  }

  @Post('ads')
  @Permissions([{ action: [ACTION.READ], module: PERMISSION_MODULE.PLATFORM }])
  async createPlatformAds(@Body() createAdDto: CreateAdDto) {
    const data = await this.platformService.createPlatformAd(createAdDto);
    return new ApiResponse(data);
  }

  @Put('ads/:id')
  @Permissions([
    { action: [ACTION.UPDATE], module: PERMISSION_MODULE.PLATFORM },
  ])
  async editPlatformAds(
    @Body() createAdDto: CreateAdDto,
    @Param('id') adId: Types.ObjectId,
  ) {
    const data = await this.platformService.editPlatformAd(adId, createAdDto);
    return new ApiResponse(data);
  }

  @Get('')
  @Permissions([{ action: [ACTION.READ], module: PERMISSION_MODULE.PLATFORM }])
  async getPlatforms() {
    const data = await this.platformService.getAllPlatforms();
    return new ApiResponse(data);
  }
}
