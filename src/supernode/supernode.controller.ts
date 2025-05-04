import {
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { SupernodeService } from './supernode.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import ApiResponse from '../utils/api-response.util';
import { AppRequest } from '../utils/app-request';
import { PaginateDTO } from '../admin/global/dto/paginate.dto';
import { GraphQueryDto, GraphTimelineDto } from './dto/graph-query.dto';
import { BuilderReferralService } from './builder-referral.service';
import { Types } from 'mongoose';
import { getYear } from 'date-fns';
import { SNGlogbalPollService } from './sn-global-poll.service';
import { SNGlobalClaimService } from './sn-global-pool-claim-service';
import { SN_BONUS_TYPE } from './enums/sn-bonus-type.enum';
import { TwoAccessService } from '../two-access/two-access.service';

import { TIME_PERIOD } from '../utils/constants';
import { throwError } from 'rxjs';
import { GetFirstLineTwoUserAccessDto } from '../two-access/dto/two-access.dto';

@Controller('supernode')
@UseGuards(JwtAuthGuard)
export class SupernodeController {
  constructor(
    private readonly supernodeService: SupernodeService,
    private readonly builderReferralService: BuilderReferralService,
    private readonly sngpGlobalPoll: SNGlogbalPollService,
    private readonly snGlobalClaimService: SNGlobalClaimService,
    private readonly twoAccessService: TwoAccessService,
  ) {}

  @Get('gask/balance')
  async getGasKController(@Req() req: any) {
    const userId = req.user.userId;
    const result: any =
      await this.supernodeService.fetchGasKServiceAll_Yesterday(userId);
    return new ApiResponse({
      totalGaskAmout: result?.netTotal || 0,
      lastDay: result?.lastDay || { totalGaskAmout: 0 },
    });
  }

  @Get('reward-analytics')
  async getSupernodeRewardAnalytics(@Req() req: any) {
    const userId = req.user.userId;
    const result =
      await this.supernodeService.getSupernodeRewardsByUserId(userId);
    return new ApiResponse(result);
  }

  @Get('total-rewards-claimed')
  async getTotalClaimedRewards(@Req() req: any) {
    const userId = req.user.userId;
    const userObjectId = new Types.ObjectId(userId);
    const result =
      await this.supernodeService.getTotalClaimedRewards(userObjectId);
    return new ApiResponse(result);
  }

  @Get('reward/loss')
  async getCurrentLoss(@Req() req: any, @Query('period') period: TIME_PERIOD) {
    const userId = req.user.userId;

    const result = await this.supernodeService.getCurrentLoss(userId, period);
    return new ApiResponse(result);
  }

  @Get('production')
  async getTotalProduction(@Req() req: any) {
    const userId = req.user.userId;
    const result = await this.supernodeService.getTeamTotalProduction(userId);
    return new ApiResponse(result);
  }

  @Get('checkfirstLine')
  async checkFirstLine(@Req() req: any) {
    const userId = req.user.userId;
    const result = await this.supernodeService.checkUserFirstLineEligibilty(
      userId,
      1,
    );
    return new ApiResponse(result);
  }
  @Get('daily/reward')
  async getDailyRewards(@Req() req: any) {
    const userId = req.user.userId;
    const result = await this.supernodeService.getDailyRewards(userId);
    return new ApiResponse(result);
  }

  @Get('global-pool')
  async getGlobalPool(@Req() req: any) {
    const userId = req.user.userId;
    const result = await this.sngpGlobalPoll.getGlobalPool(userId);
    return new ApiResponse(result);
  }
  @Get('sngp/total-activity')
  async getSngpActivityPool(@Req() req: AppRequest) {
    const result = await this.sngpGlobalPoll.getSngpActivityPool(
      req.user.userId,
    );
    return new ApiResponse(result ?? [], result ? 'OK' : 'SNGP not found');
  }

  //Api for getting to active pools in the system(homnify).
  @Get('country/active-pools')
  async getCountryActivePools(
    @Req() req: any,
    @Query() paginateDTO: PaginateDTO,
  ) {
    const result = await this.sngpGlobalPoll.getCountryActivePools(paginateDTO);
    return new ApiResponse(result);
  }
  @Get('country/poolscore-history')
  async getCountryPoolScoreHistory(
    @Req() req: any,
    @Query() paginateDTO: PaginateDTO,
  ) {
    const userId = req.user.userId;
    const result = await this.sngpGlobalPoll.getCountryPoolScoreHistory(
      userId,
      paginateDTO,
    );
    return new ApiResponse(result);
  }
  @Get('country/pool-reward-history')
  async getCountryPoolRewardHistory(
    @Req() req: any,
    @Query() paginateDTO: PaginateDTO,
  ) {
    const userId = req.user.userId;
    const result = await this.sngpGlobalPoll.getCountryPoolRewardHistory(
      userId,
      paginateDTO,
    );
    return new ApiResponse(result);
  }
  @Get('country/myscore')
  async getCountryMyScoe(@Req() req: any, @Param('year') year: number) {
    const userId = req.user.userId;
    const result = await this.sngpGlobalPoll.getCountryMyScoe(userId, year);
    return new ApiResponse(result);
  }
  @Get('country/upcoming-pools')
  async getCountryUpcomingPools(
    @Req() req: AppRequest,
    @Query() paginateDTO: PaginateDTO,
  ) {
    const result =
      await this.sngpGlobalPoll.getCountryUpcomingPools(paginateDTO);
    return new ApiResponse(result);
  }
  @Post('claim')
  async claimRewards(@Req() req: AppRequest) {
    // return throwError('Work in Progress . You can claim  after some times');

    const data = await this.supernodeService.claimRewards(req.user.userId);
    // const data = [];
    return new ApiResponse(data);
  }
  @Get('firstline-users')
  async getFirstLineUsers(@Req() req: any) {
    const userId = req.user.userId;
    const result = await this.supernodeService.getFirstLineActiveUsers(userId);
    // const result = [];
    return new ApiResponse(result);
  }

  @Get('firstline-user-list')
  async getPaginatedFirstLineUsers(
    @Req() req: any,
    @Query() paginateDTO: PaginateDTO,
    //
  ) {
    const userId = req.user.userId;

    const result = await this.supernodeService.getPaginatedFirstLineUsers(
      userId,
      paginateDTO,
    );
    return new ApiResponse(result);
  }

  // @Get('firstline-user-list-twoaccess')
  // async getPaginatedFirstLineUsersTwoAccess(
  //   @Req() req: any,
  //   @Query() getFirstLineTwoUserAccessDto: GetFirstLineTwoUserAccessDto,
  // ) {
  //   const { bid, page, limit, query, type } = getFirstLineTwoUserAccessDto;

  //   const users =
  //     await this.twoAccessService.findByUplineIdTwoAccessUsersPaginated(
  //       bid,
  //       page,
  //       limit,
  //       query,
  //       type,
  //     );
  //   return users;
  // }

  @Get('childrens')
  async getAllChildren(
    @Query('userId') userId: string,
    @Query('depth') depth: string,
    @Req() req: any,
  ) {
    const userid = userId || req.user.userId;
    const data = await this.supernodeService.getUserWithChildren(
      req.user.userId,
      userid,
      Number(depth),
    );

    // const data = [];
    return new ApiResponse(data);
  }

  @Get('rewards/list')
  async getSuperNodeRewards(
    @Req() req: any,
    @Query() paginateDTO: PaginateDTO,
  ) {
    const userId = req.user.userId;
    const paginatedSuperNodeReward =
      await this.supernodeService.getSuperNodeRewards(userId, paginateDTO);
    return new ApiResponse(
      paginatedSuperNodeReward,
      'Paginated rewards fetched successfully',
    );
  }
  @Get('tree')
  async getUserNodeTree(@Req() req: AppRequest) {
    const userId = req.user.userId;
    const data = await this.supernodeService.getUserWithChildrenCounts(userId);
    return new ApiResponse(data);
  }
  @Get('community/users/:id')
  async getuserRewardDetails(@Req() req: AppRequest, @Param('id') id: string) {
    const dailyTotalReward = await this.supernodeService.getUserRewards(
      id,
      req.user.userId,
    );
    return new ApiResponse(dailyTotalReward);
  }

  @Get('community/production-graph')
  async getUserProductionGraph(
    @Req() req: AppRequest,
    @Query() data: GraphQueryDto,
  ) {
    // To get the daily total rewards of the user
    const dailyTotalReward = await this.supernodeService.getUserProductionGraph(
      data.id,
      data.timeline,
    );
    return new ApiResponse(dailyTotalReward);
  }

  @Get('community/rewards/:userId')
  async getCommunityUserRewardHistory(
    @Param('userId') userId: string,
    @Query() paginateDTO: PaginateDTO,
    @Req() req: AppRequest,
  ) {
    const paginatedSuperNodeReward =
      await this.supernodeService.getCommunityUserRewardHistory(
        userId,
        req.user.userId,
        paginateDTO,
      );
    return new ApiResponse(
      paginatedSuperNodeReward,
      'Paginated rewards fetched successfully',
    );
  }

  @Get('is-active')
  async isUserActive(@Query('userId') userId: string, @Req() req: any) {
    const userid = userId || req.user.userId;
    const data = await this.supernodeService.isUserActiveNode(userid);
    return new ApiResponse({
      isActive: data ? true : false,
    });
  }

  @Get('builder-referral/:userId')
  async builderBefferal(@Param('userId') userId: Types.ObjectId) {
    const userObjId = new Types.ObjectId(userId);
    const data =
      await this.builderReferralService.setBuilderReferralEligibility(
        userObjId,
      );
    return data;
  }

  @Get('builder-referral/growth/:userId')
  async builderRefferalGrowth(@Param('userId') userId: Types.ObjectId) {
    const userObjId = new Types.ObjectId(userId);
    const data =
      await this.builderReferralService.getBuilderReferralGrowth(userObjId);
    return data;
  }

  @Get('builder-referral')
  async genarateBuilderRefferalEligibility() {
    const response =
      await this.builderReferralService.genarateBuilderRefferalEligibility();
    return new ApiResponse(response);
  }

  @Get('sngp/community/reward-graph')
  async getUserComunitySngpProductionGraph(
    @Req() req: AppRequest,
    @Query() data: GraphTimelineDto,
  ) {
    // To get the daily total rewards of the user
    const dailyTotalReward = await this.sngpGlobalPoll.getUserProductionGraph(
      req.user.userId,
      data.timeline,
    );
    return new ApiResponse(
      dailyTotalReward ?? [],
      dailyTotalReward ? 'OK' : 'SNGP not found',
    );
  }

  @Get('sngp/score-history')
  async getScoreHistory(@Req() req: any, @Query() paginateDTO: PaginateDTO) {
    const userId = req.user.userId;
    const result = await this.sngpGlobalPoll.getScoreHistory(
      userId,
      paginateDTO,
    );
    return new ApiResponse(result ?? [], result ? 'OK' : 'SNGP not found');
  }

  @Get('country/get-token')
  async getAllToken() {
    const result = await this.sngpGlobalPoll.getAllToken();
    return new ApiResponse(result);
  }

  @Get('sngp/banner')
  async getSngpBanner(@Req() req: any) {
    const userId = req.user.userId;
    const result = await this.sngpGlobalPoll.getSngpBanner(userId);
    return new ApiResponse(result);
  }

  @Get('country/pool/banner')
  async getCountryPoolBanner(@Req() req: any) {
    const userId = req.user.userId;
    const result = await this.sngpGlobalPoll.getCountryPoolBanner(userId);
    return new ApiResponse(result);
  }

  @Post('claim/country-pool-reward')
  async claimCountryPoolReward(@Req() req: any) {
    const userId = req.user.userId;
    const result =
      await this.snGlobalClaimService.claimCountryPoolReward(userId);
    return new ApiResponse(result);
  }

  @Post('claim/sngp-pool-reward')
  async claimSNGPPoolReward(@Req() req: any) {
    const userId = req.user.userId;
    const result = await this.snGlobalClaimService.claimSNGPPoolReward(userId);
    return new ApiResponse(result);
  }

  @Get('machine/highest')
  async getHighestValidMachine(@Req() req: any) {
    const userId = req.user.userId;
    const result = await this.supernodeService.getHighestValidMachine(userId);
    return new ApiResponse(result);
  }

  @Get('reward-summary')
  async getUserSnRewardSummary(
    @Req() req: any,
    @Query('type') type: SN_BONUS_TYPE,
    @Query('period') period: TIME_PERIOD,
  ) {
    const userId = req.user.userId;
    console.log('userId', userId);
    const result = await this.supernodeService.getUserSnRewardSummary(
      userId,
      type,
      period,
    );
    return new ApiResponse(result);
  }

  @Get('total-reward-summary')
  async getUserTotalSnRewardSummary(
    @Req() req: any,
    @Query('period') period: TIME_PERIOD,
  ) {
    const userId = req.user.userId;
    const result = await this.supernodeService.getUserTotalSnRewardSummary(
      userId,
      period,
    );
    return new ApiResponse(result);
  }

  @Get('total-production-summary')
  async getUserTotalProducationSummary(
    @Req() req: any,
    @Query('period') period: TIME_PERIOD,
  ) {
    const userId = req.user.userId;
    const result = await this.supernodeService.getUserTotalProducationSummary(
      userId,
      period,
    );
    return new ApiResponse(result);
  }
  // User Tree Section

  @Put('update-depth')
  async updateDepth(): Promise<string> {
    console.log('update depth process started');
    await this.supernodeService.updateUserDepth();
    return 'User depths updated successfully';
  }

  @Put('update-paths')
  async updatePaths(): Promise<{ message: string }> {
    await this.supernodeService.updateUserPaths();
    return { message: 'User paths updated successfully' };
  }

  @Get('with-children')
  async getUserWithChildrenTree(
    @Req() req: any,
    @Query('id') id: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    const userId = id || req.user.userId;
    // const userId = '66c5d5b8814a911986f5a499'; // Debugging
    page = Math.max(1, Number(page)); // Ensure page is at least 1
    limit = Math.max(1, Number(limit)); // Ensure limit is at least 1
    if (id) {
      id = req.user.userId;
    }

    return this.supernodeService.getUserWithChildrenTree(userId, page, limit);
  }

  @Get('/v1/with-children')
  async getUserWithChildrenTreeV1(
    @Req() req: any,
    @Query('id') id: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    const userId = id || req.user.userId;
    page = Math.max(1, Number(page)); // Ensure page is at least 1
    limit = Math.max(1, Number(limit)); // Ensure limit is at least 1

    return this.supernodeService.getUserWithChildrenTreeV1(userId, page, limit);
  }

  // User Tree details with membership and expiry date

  @Get('user-tree-details')
  async getUserTreeDetails(@Req() req: any, @Query('bid') bid: any) {
    const vBid = bid;
    return this.twoAccessService.getUserHierarchyByBid(vBid);
  }

  @Get('search')
  async getUserSearch(
    @Req() req: any,
    @Query('id') id: string,
    @Query('searchQuery') searchQuery: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    // console.log('req', req);

    const userId = id || req.user.userId;
    page = Math.max(1, Number(page)); // Ensure page is at least 1
    limit = Math.max(1, Number(limit)); // Ensure limit is at least 1

    return this.supernodeService.getUserSearch(
      userId,
      searchQuery,
      page,
      limit,
    );
  }

  @Get('firstline-user-list-twoaccess')
  async getPaginatedFirstLineUsersTwoAccess(
    @Req() req: any,
    @Query() getFirstLineTwoUserAccessDto: GetFirstLineTwoUserAccessDto,
  ) {
    const { bid, page, limit, query, type } = getFirstLineTwoUserAccessDto;
    const users =
      await this.twoAccessService.findByUplineIdTwoAccessUsersPaginated(
        bid,
        page,
        limit,
        query,
        type,
      );
    return users;
  }
}
