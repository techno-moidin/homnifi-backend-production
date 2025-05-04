import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import ApiResponse from '../utils/api-response.util';
import { PlatformVoucherService } from './platform-voucher.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('platform-voucher')
export class PlatformVoucherController {
  constructor(
    private readonly platformVoucherService: PlatformVoucherService,
  ) {}

  @Get('/get-user-vouchers/:userBID')
  async getVouchersByUserBID(@Param('userBID') userBID: string) {
    const vouchers =
      await this.platformVoucherService.getVouchersByUserBID(userBID);
    return new ApiResponse(vouchers, 'Platform Voucher retreived successfully');
  }
}
