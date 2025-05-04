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
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Permissions } from '../auth/decorators/permissions';
import { AdminGuard } from '../auth/guards/admin.guard';
import ApiResponse from '@/src/utils/api-response.util';
import { Types } from 'mongoose';
import { PlatformVoucherService } from '@/src/platform-voucher/platform-voucher.service';
import { ACTION, PERMISSION_MODULE } from '@/src/enums/permission';
import {
  CreatePlatformVoucherDTO,
  VoucherStatus,
} from '@/src/platform-voucher/dto/create.platform-voucher.dto';
import { PaginateDTO } from '../global/dto/paginate.dto';
import { TelegramNotificationInterceptor } from '@/src/interceptor/telegram.notification';

@UseGuards(AdminGuard)
@UseInterceptors(TelegramNotificationInterceptor)
@Controller('admin/platform-voucher')
export class AdminPlatformVoucherController {
  constructor(
    private readonly platformVoucherService: PlatformVoucherService,
  ) {}

  @Post()
  @Permissions([
    { action: [ACTION.WRITE], module: PERMISSION_MODULE.PLATFORM_VOUCHER },
  ])
  async createPlatformVoucher(
    @Body() createPlatformVoucherDTO: CreatePlatformVoucherDTO,
  ) {
    const createdPlatformVoucher =
      await this.platformVoucherService.createPlatformVoucher(
        createPlatformVoucherDTO,
      );
    return new ApiResponse(
      createdPlatformVoucher,
      'Platform Voucher created successfully',
    );
  }

  @Get()
  async getPlatformVouchers(@Query() paginateDTO?: PaginateDTO) {
    const platformVouchers =
      await this.platformVoucherService.getPlatformVouchers(paginateDTO);
    return new ApiResponse(platformVouchers, 'Platform Vouchers in pagination');
  }

  @Get(':id')
  async getPlatformVoucherById(@Param('id') id: string) {
    const platformVoucher =
      await this.platformVoucherService.getPlatformVoucherById(id);
    return new ApiResponse(
      platformVoucher,
      'Platform Voucher fetched successfully',
    );
  }
  @Put(':id')
  @Permissions([
    { action: [ACTION.UPDATE], module: PERMISSION_MODULE.PLATFORM_VOUCHER },
  ])
  async updatePlatformVoucher(
    @Param('id') id: string,
    @Body() updatePlatformVoucherDTO: CreatePlatformVoucherDTO,
  ) {
    const updatedPlatformVoucher =
      await this.platformVoucherService.updatePlatformVoucher(
        id,
        updatePlatformVoucherDTO,
      );

    return new ApiResponse(
      updatedPlatformVoucher,
      'Platform Voucher updated successfully',
    );
  }

  @Delete(':id')
  @Permissions([
    { action: [ACTION.DELETE], module: PERMISSION_MODULE.PLATFORM_VOUCHER },
  ])
  async deletePlatformVoucher(@Param('id') id: string) {
    await this.platformVoucherService.deletePlatformVoucher(id);
    return new ApiResponse(null, 'Platform Voucher deleted successfully');
  }
}
