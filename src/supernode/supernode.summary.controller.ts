import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Types } from 'mongoose';
import ApiResponse from '../utils/api-response.util';
import { SupernodeSummaryService } from './supernode.summary.service';
import {
  GetBonusSummaryDto,
  GetBonusSummaryTransactionDto,
  GetUserDetailsDto,
} from './dto/bonus-summary.dto';

@Controller('supernode')
@UseGuards(JwtAuthGuard)
export class SupernodeSummaryController {
  constructor(
    private readonly supernodeSummaryService: SupernodeSummaryService,
  ) {}

  @Get('summary/bonus/report')
  async getAllBonusReport(@Req() req: any, @Query() query: GetBonusSummaryDto) {
    const userId = req.user.userId;

    const result = await this.supernodeSummaryService.getBonusReportService(
      userId,
      query,
    );
    return new ApiResponse(result);
  }

  @Get('summary/user/details')
  async getUserDetails(@Req() req: any, @Query() query: GetUserDetailsDto) {
    const result =
      await this.supernodeSummaryService.getUserDetailsService(query);
    return new ApiResponse(result);
  }

  @Get('summary/user/personalStakeAndMechineList')
  async getPersonalStakeAndMachineList(
    @Req() req: any,
    @Query() query: GetUserDetailsDto,
  ) {
    const result =
      await this.supernodeSummaryService.getPersonalStakeAndMachineList(query);
    return new ApiResponse(result);
  }

  @Get('summary/transaction')
  async getUserTransaction(
    @Req() req: any,
    @Query() query: GetBonusSummaryTransactionDto,
  ) {
    const userId = req.user.userId;

    const result =
      await this.supernodeSummaryService.getUserBonusTransactionService(
        userId,
        query,
      );
    return new ApiResponse(result);
  }

  @Get('summary/bonus/total')
  async getTotalBonusTransaction(
    @Req() req: any,
    @Query() query: GetBonusSummaryTransactionDto,
  ) {
    const userId = req.user.userId;

    const result = await this.supernodeSummaryService.getUserBonusTotalService(
      userId,
      query,
    );
    return new ApiResponse(result);
  }

  @Get('summary/mycommunity')
  async getMyCommunitySuperNode(@Query('userId') userId: Types.ObjectId) {
    const result =
      await this.supernodeSummaryService.getMyCommunitySuperNode(userId);
    return new ApiResponse(result);
  }
}
