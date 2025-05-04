import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  Query,
  UseGuards,
} from '@nestjs/common';
import { MyFriendsService } from './myfriends.service';
import { AppRequest } from '../utils/app-request';
import { PaginateDTO } from '../admin/global/dto/paginate.dto';
import { Types } from 'mongoose';
import ApiResponse from '../utils/api-response.util';
import { BONUS_TYPES } from './enums/bonus-types.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CHART_TIMELIME_TYPES } from './enums/chart-timelines.enum';

@Controller('my-friends')
@UseGuards(JwtAuthGuard)
export class MyFriendsController {
  constructor(private readonly myFriendsService: MyFriendsService) {}

  @Get('bonus/history')
  async getBonusHistory(
    @Query() paginateDTO: PaginateDTO,
    @Query('token') token: string,
    @Query('fromDate') from: string,
    @Query('toDate') to: string,
    @Query('search') query: string,
    @Query('type') type: BONUS_TYPES,
    @Req() req: AppRequest,
  ) {
    const data = await this.myFriendsService.getBonusHistory(
      new Types.ObjectId(req.user.userId),
      paginateDTO,
      {
        token,
        type,
        from,
        to,
        query,
      },
    );

    return new ApiResponse(data);
  }

  @Get('total-rewards')
  async getTotalRewards(@Req() req: AppRequest) {
    const data = await this.myFriendsService.getTotalRewards(
      new Types.ObjectId(req.user.userId),
    );
    return new ApiResponse(data);
  }

  @Get('rewards/chart')
  async getRewardsChartData(
    @Req() req: AppRequest,
    @Query('timeline')
    timeline: CHART_TIMELIME_TYPES = CHART_TIMELIME_TYPES.MONTHLY,
  ) {
    const data = await this.myFriendsService.getRewardsChartData(
      new Types.ObjectId(req.user.userId),
      timeline,
    );
    return new ApiResponse(data);
  }
}
