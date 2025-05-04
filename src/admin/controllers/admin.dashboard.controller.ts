import { ACTION, PERMISSION_MODULE } from '@/src/enums/permission';
import {
  Controller,
  Get,
  Param,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Permissions } from '../auth/decorators/permissions';
import { AdminGuard } from '../auth/guards/admin.guard';
import { AdminService } from '../admin.service';
import ApiResponse from '@/src/utils/api-response.util';
import { GraphTimelineDto } from '@/src/supernode/dto/graph-query.dto';
import { setDecimalPlaces } from '@/src/utils/helpers';
import { AmountType } from '@/src/global/enums/amount.type.enum';
import { Types } from 'mongoose';
import { CloudKFilterDTO, PaginateDTO } from '../global/dto/paginate.dto';
import { TelegramNotificationInterceptor } from '@/src/interceptor/telegram.notification';
@Controller('admin/dashboard')
@UseGuards(AdminGuard)
@UseInterceptors(TelegramNotificationInterceptor)
export class AdminDashboardController {
  constructor(private readonly adminService: AdminService) {}

  @Get('all-stats')
  @Permissions([{ action: [ACTION.READ], module: PERMISSION_MODULE.ADMIN }])
  async getAllStats() {
    const stats = await this.adminService.getAllStats();
    return new ApiResponse(stats, 'All stats retrieved successfully');
  }

  @Get('wallets-summary')
  @Permissions([{ action: [ACTION.READ], module: PERMISSION_MODULE.ADMIN }])
  async calculateTotalTransactionSummary() {
    const result = await this.adminService.calculateTotalTransactionSummary();

    return new ApiResponse(
      result,
      'Total wallets summary (deposits, withdrawals, swaps) retrieved successfully',
    );
  }

  @Get('nodeK-rewards')
  @Permissions([{ action: [ACTION.READ], module: PERMISSION_MODULE.ADMIN }])
  async getCloudKRewards(@Query() query: GraphTimelineDto) {
    const { timeline } = query;
    const result = await this.adminService.getCloudKRewards(timeline);

    return new ApiResponse(
      result,
      'Aggregated transaction data retrieved successfully',
    );
  }

  @Get('supernode')
  async getTokenAmountsForAllTimeRanges(@Query() query: GraphTimelineDto) {
    const { timeline } = query;
    const data =
      await this.adminService.getSupernodeTokenAmountsForTimeline(timeline);
    return new ApiResponse(data, 'Supernode data retrieved successfully');
  }

  @Get('usdk-totals')
  @Permissions([{ action: [ACTION.READ], module: PERMISSION_MODULE.ADMIN }])
  async getUsdkTotals() {
    const [usdkOldTotal, usdkTotal] = await Promise.all([
      this.adminService.calculateUsdkOldTotal(),
      this.adminService.calculateUsdkTotal(),
    ]);

    return new ApiResponse(
      {
        usdkOld: usdkOldTotal.totalAmount,
        usdk: usdkTotal.totalAmount,
      },
      'USDK totals calculated successfully',
    );
  }

  @Get('usdkTomlyk-swap-total')
  @Permissions([{ action: [ACTION.READ], module: PERMISSION_MODULE.ADMIN }])
  async getUsdkSwapTotal() {
    const stats = await this.adminService.calculateUsdkToMlykSwapTotal();
    return new ApiResponse(stats, 'USDK swap totals calculated successfully');
  }

  @Get('usdkOldTomlyk-swap-total')
  @Permissions([{ action: [ACTION.READ], module: PERMISSION_MODULE.ADMIN }])
  async getUsdkOldSwapTotal() {
    const stats = await this.adminService.calculateUsdkOldToMlykSwapTotal();
    return new ApiResponse(stats, 'USDK swap totals calculated successfully');
  }
}
