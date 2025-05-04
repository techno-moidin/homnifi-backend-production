import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UsdkStakeService } from './usdk-stake.service';
import ApiResponse from '../utils/api-response.util';
import { AppRequest } from '../utils/app-request';
import { UsdkStakeDto } from './dtos/uskdStake.dto';
import { ObjectId, Types } from 'mongoose';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsdkStakeRewardService } from './usdk-stake-reward.service';
import { PaginateDTO } from '../admin/global/dto/paginate.dto';
import {
  UsdkCliamRewardByMachineDto,
  UsdkCliamRewardDto,
} from './dto/claim-reward.dto';
import { UsdkTransactionTypes } from './schemas/usdkStakeTransactionHistory';

@Controller('usdk-stake')
@UseGuards(JwtAuthGuard)
export class UsdkStakeController {
  constructor(
    private readonly usdkStakeService: UsdkStakeService,
    private readonly usdkStakeRewardService: UsdkStakeRewardService,
  ) {}
  // Get all products
  @Post('')
  async usdkStakeController(
    @Req() req: AppRequest,
    @Body() usdkStakeDto: UsdkStakeDto,
  ) {
    const user = new Types.ObjectId(req.user.userId);
    const resp = await this.usdkStakeService.usdkStake(user, usdkStakeDto);
    return new ApiResponse(resp);
  }

  @Get('details/:id')
  async UsdkStakeDetails(
    @Req() req: AppRequest,
    @Param('id') machineId: string,
  ) {
    const user = new Types.ObjectId(req.user.userId);
    const resp = await this.usdkStakeService.getMachineUsdkStakeDetails(
      user,
      new Types.ObjectId(machineId),
    );

    return new ApiResponse(resp, 'Usdk stake details fetched.');
  }
  @Get('token/list/:id')
  async usdkStakeTokenList(
    @Req() req: AppRequest,
    @Param('id') machineId: string,
  ) {
    const user = new Types.ObjectId(req.user.userId);
    const resp = await this.usdkStakeService.usdkStakeTokenList(
      user,
      new Types.ObjectId(machineId),
    );

    return new ApiResponse(resp, 'Usdk stake token list fetched.');
  }

  @Get('rewardTest/:id')
  async testReward(@Param('id') machineId: string) {
    // const user = new Types.ObjectId(req.user.userId);
    const resp = await this.usdkStakeRewardService.testReward(
      new Types.ObjectId(machineId),
    );

    return new ApiResponse(resp, 'Usdk stake token list fetched.');
  }

  @Get('reward/details/:id')
  async getRewardDetails(
    @Req() req: AppRequest,
    @Param('id') machineId: string,
  ) {
    const user = new Types.ObjectId(req.user.userId);
    const resp = await this.usdkStakeService.getRewardDetails(
      user,
      new Types.ObjectId(machineId),
    );

    return new ApiResponse(resp, 'Usdk stake details fetched.');
  }

  @Put('toggle/auto-compound')
  async machineAutoCompoundToggle(
    @Req() req: AppRequest,
    // @Param('id') machineId: string,
  ) {
    const user = new Types.ObjectId(req.user.userId);
    const resp = await this.usdkStakeService.machineAutoCompoundToggle(
      user,
      // new Types.ObjectId(machineId),
    );

    return new ApiResponse(resp, 'Usdk stake details fetched.');
  }
  @Get('transactions')
  async usdkStakeTransaction(
    @Query() paginateDTO: PaginateDTO,
    @Query('machineId') machineId: string,
    @Query('fromDate') from: string,
    @Query('toDate') to: string,
    @Query('token') token: string,
    @Query('type') type: UsdkTransactionTypes,
    @Req() req: AppRequest,
  ) {
    const user = new Types.ObjectId(req.user.userId);
    const machine = new Types.ObjectId(machineId);
    const resp = await this.usdkStakeService.getMachineUsdkTransaction(
      user,
      paginateDTO,
      {
        machineId,
        token,
        type,
        from,
        to,
      },
    );

    return new ApiResponse(resp, 'Usdk stake transaction fetched.');
  }

  @Post('claim')
  async claimReward(@Req() req: AppRequest, @Body() dto: UsdkCliamRewardDto) {
    const user = new Types.ObjectId(req.user.userId);
    const resp = await this.usdkStakeService.claimReward(dto, user);
    return new ApiResponse(resp, 'Reward claimed.');
  }

  @Post('claim-by-machine')
  async claimRewardByMachine(
    @Req() req: AppRequest,
    @Body() dto: UsdkCliamRewardByMachineDto,
  ) {
    const user = new Types.ObjectId(req.user.userId);
    const resp = await this.usdkStakeService.claimRewardByMachineId(dto, user);
    return new ApiResponse(resp, 'Reward claimed.');
  }
  @Get('reward/balance')
  async rewardDetails(
    @Query('machineId') machineId: string,
    @Req() req: AppRequest,
  ) {
    const user = new Types.ObjectId(req.user.userId);
    const resp = await this.usdkStakeService.rewardDetails(user);

    return new ApiResponse(resp, 'Usdk stake transaction fetched.');
  }

  @Put('machine/toggle/auto-compound/:id')
  async autoCompoundToggleForMachine(
    @Req() req: AppRequest,
    @Param('id') machineId: string,
  ) {
    const user = new Types.ObjectId(req.user.userId);
    const resp = await this.usdkStakeService.autoCompoundToggleForMachine(
      user,
      new Types.ObjectId(machineId),
    );

    return new ApiResponse(resp, 'Usdk stake details fetched.');
  }
}
