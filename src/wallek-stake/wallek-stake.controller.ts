import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import mongoose, { Types } from 'mongoose';
import { Request } from 'express';
import { PaginateDTO } from '../admin/global/dto/paginate.dto';
import ApiResponse from '../utils/api-response.util';
import { WallekStakeService } from './wallek-stake.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AppRequest } from '../utils/app-request';

@Controller('wallek-stake')
@UseGuards(JwtAuthGuard)
export class WallekStakeController {
  constructor(private readonly wallekStakeService: WallekStakeService) {}

  @Get('balance')
  async getStakingBalance(
    @Req() req: AppRequest,
    @Query() paginateDTO: PaginateDTO,
  ) {
    const userId = req.user.userId;
    console.log(userId);
    const data = await this.wallekStakeService.getStakingBalance(
      new mongoose.Types.ObjectId(userId),
      paginateDTO,
    );
    return new ApiResponse(data, 'Staking Balance Retrieved Successfully');
  }

  @Post('claim/:stakeId')
  async claimBalance(
    @Req() req: AppRequest,
    @Param('stakeId') stakeId: string,
  ) {
    const userId = req.user.userId;
    const result = await this.wallekStakeService.claimBalance(
      new mongoose.Types.ObjectId(stakeId),
      new mongoose.Types.ObjectId(userId),
    );

    return new ApiResponse(result, 'Stake Claimed Successfully');
  }

  @Get('claim-history')
  async getClaimHistory(
    @Req() req: AppRequest,
    @Query() paginateDTO: PaginateDTO,
  ) {
    const userId = req.user.userId;
    console.log(userId);
    const result = await this.wallekStakeService.getClaimHistory(
      new Types.ObjectId(userId),
      paginateDTO,
    );

    return new ApiResponse(result, 'Claim History Retrieved Successfully');
  }
}
