import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  Req,
  Res,
  UnprocessableEntityException,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import ApiResponse from '@/src/utils/api-response.util';
import { AdminGuard } from '../auth/guards/admin.guard';
import { AdminService } from '../admin.service';
import { Permissions } from '../auth/decorators/permissions';
import { ACTION, PERMISSION_MODULE } from '@/src/enums/permission';
import { Types } from 'mongoose';
import { PaginateDTO, usersFilterDTO } from '../global/dto/paginate.dto';
import { AuthService } from '../../auth/auth.service';
import { UsersService } from '../../users/users.service';
import { AppRequest } from '@/src/utils/app-request';
import { ImpersonateDto } from '../dto/impersonate.dto';
import { WalletService } from '../../wallet/wallet.service';
import { SupernodeService } from '@/src/supernode/supernode.service';
import { CloudKService } from '@/src/cloud-k/cloud-k.service';
import { DateFilter } from '@/src/global/enums/date.filter.enum';
import { ImpersonateService } from '@/src/impersonate/impersonate.service';
import { CloudKTransactionTypes } from '@/src/cloud-k/schemas/cloudk-transactions.schema';
import { GraphTimelineDto } from '@/src/supernode/dto/graph-query.dto';
import { SNGlogbalPollService } from '@/src/supernode/sn-global-poll.service';
import { BlockSupernodeUserDto } from '../dto/block.user.dto';
import { MyBlockchainIdService } from '@/src/my-blockchain-id/my-blockchain-id.service';
import { TIME_PERIOD } from '@/src/utils/constants';
import { TelegramNotificationInterceptor } from '@/src/interceptor/telegram.notification';
import { UserStatusDTO } from '@/src/users/dto/update-user.dto';
import { validateOrReject } from 'class-validator';
import { CountriesService } from '@/src/countries/countries.service';
@Controller('admin/user')
@UseGuards(AdminGuard)
@UseInterceptors(TelegramNotificationInterceptor)
export class AdminUserController {
  constructor(
    private readonly adminService: AdminService,
    private authService: AuthService,
    private usersService: UsersService,
    private walletService: WalletService,
    private supernodeService: SupernodeService,
    private cloudKService: CloudKService,
    private impersonateService: ImpersonateService,
    private sngpGlobalPoll: SNGlogbalPollService,
    private myBidService: MyBlockchainIdService,
    private countriesService: CountriesService,
  ) { }

  // * ---------------- User Management APIs ---------------- //

  @Get()
  @Permissions([{ action: [ACTION.READ], module: PERMISSION_MODULE.USER }])
  async getAllUsers(@Query() paginateDTO: usersFilterDTO) {
    const paginatedUsers = await this.usersService.getAllUsers(paginateDTO);
    return new ApiResponse(paginatedUsers);
  }

  @Get(':id/profile')
  @Permissions([{ action: [ACTION.READ], module: PERMISSION_MODULE.USER }])
  async findUserProfileById(@Req() req: any, @Param('id') id: string) {
    const userId = new Types.ObjectId(id);
    const userData = await this.usersService.findUserById(userId);
    if (!userData) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }
    const admin: any = await this.adminService.findByEmail(userData.email);

    const response = {
      email: userData.email,
      blockchainId: userData.blockchainId,
      uplineBID: userData.uplineBID,
      uplineId: userData.uplineId,
      username: userData.username,
      firstName: userData.firstName,
      lastName: userData.lastName,
      isBuilderGenerationActive: userData.isBuilderGenerationActive,
      isBaseReferralActive: userData.isBaseReferralActive,
      profilePicture: userData.profilePicture,
      dateJoined: userData.dateJoined,
      rewardMultiplier: userData.rewardMultiplier,
      lastLogin: userData.lastLogin,
      isBaseReferralEnabled: userData.isBaseReferralEnabled,
      isBuilderGenerationEnabled: userData.isBuilderGenerationEnabled,
      isBuilderReferralEnabled: userData.isBuilderReferralEnabled,
      isUserEverPurchasedMachine: userData.isUserEverPurchasedMachine,
      products: userData.products,
      totalBuilderGenarational: userData.totalBuilderGenarational,
      firstLineBuilderGenerational: userData.firstLineBuilderGenerational,
      totalUserwithMachine: userData.totalUserwithMachine,
      totalUserwithMembership: userData.totalUserwithMembership,
      totalUserwithoutMachine: userData.totalUserwithoutMachine,
      totalUserwithoutMembership: userData.totalUserwithoutMembership,
      totalBaseReferral: userData.totalBaseReferral,
      firstLineBaseReferral: userData.firstLineBaseReferral,
      firstLineNode: userData.firstLineNode,
      totalNode: userData.totalNode,
      isMembership: userData.isMembership,
      referralCode: userData.referralCode,
      trustpilotReviewed: userData.trustpilotReviewed,
      isTomoConditionAccepted: userData.isTomoConditionAccepted,
      isBlocked: userData.isBlocked,
      blockReason: userData.blockedReason,
      unblockedReason: userData.unblockedReason,
      role: admin.role,
    };

    return new ApiResponse(
      response,
      'User profile details fetched successfully',
    );
  }

  // * ---------------- User Wallet APIs ---------------- //

  @Get('/:id/wallet')
  @Permissions([{ action: [ACTION.READ], module: PERMISSION_MODULE.USER }])
  async getUserWalletDetails(@Param('id') userId: string) {
    const balance = await this.walletService.getTotalBalance(
      new Types.ObjectId(userId),
    );
    // const tokenBalances = await this.walletService.getTotalBalance(
    //   new Types.ObjectId(userId),
    // );
    const responseData = {
      balance,
      // tokenBalances,
    };
    return new ApiResponse(
      responseData,
      'User wallet details with balances fetched successfully',
    );
  }

  @Get('/:id/wallets/withdraws')
  @Permissions([{ action: [ACTION.READ], module: PERMISSION_MODULE.USER }])
  async getWithdrawsPaginated(
    @Req() req: any,
    @Param('id') userId: Types.ObjectId,
    @Query() paginateDTO: PaginateDTO,
  ) {
    const paginatedWithdraws = await this.walletService.getWithdrawsPaginated(
      userId,
      paginateDTO,
    );
    return new ApiResponse(paginatedWithdraws, 'Paginated Withdraws');
  }

  @Get('/:id/wallets/deposits')
  @Permissions([{ action: [ACTION.READ], module: PERMISSION_MODULE.USER }])
  async getDepositsPaginated(
    @Req() req: any,
    @Param('id') userId: Types.ObjectId,
    @Query() paginateDTO: PaginateDTO,
  ) {
    const paginatedDeposits = await this.walletService.getDepositsPaginated2(
      userId,
      paginateDTO,
    );
    return new ApiResponse(paginatedDeposits, 'Paginated Deposits');
  }

  @Get('/:id/wallets/swaps')
  @Permissions([{ action: [ACTION.READ], module: PERMISSION_MODULE.USER }])
  async getSwapsPaginated(
    @Req() req: any,
    @Param('id') userId: Types.ObjectId,
    @Query() paginateDTO: PaginateDTO,
  ) {
    const paginatedSwaps = await this.walletService.getSwapsPaginated(
      userId,
      paginateDTO,
    );
    return new ApiResponse(paginatedSwaps, 'Paginated Swaps');
  }

  // * ---------------- Admin Supernode API ---------------- //

  @Get('/:id/supernode/childrens')
  @Permissions([{ action: [ACTION.READ], module: PERMISSION_MODULE.USER }])
  async getAllChildren(
    @Param('id') userId: string,
    @Query('depth') depth: string,
  ) {
    const userid = userId;
    const data = await this.supernodeService.getUserWithChildren(
      userid,
      userid,
      Number(depth),
    );
    return new ApiResponse(data);
  }

  @Get('/:id/supernode/rewards/list')
  @Permissions([{ action: [ACTION.READ], module: PERMISSION_MODULE.USER }])
  async getSuperNodeRewards(
    @Param('id') userId: string,
    @Query() paginateDTO: PaginateDTO,
  ) {
    const paginatedSuperNodeReward =
      await this.supernodeService.getSuperNodeRewards(userId, paginateDTO);
    return new ApiResponse(
      paginatedSuperNodeReward,
      'Paginated rewards fetched successfully',
    );
  }

  @Get('/:id/supernode/production')
  @Permissions([{ action: [ACTION.READ], module: PERMISSION_MODULE.USER }])
  async getTotalProduction(@Param('id') userId: string) {
    const result = await this.supernodeService.getTeamTotalProduction(
      new Types.ObjectId(userId),
    );
    return new ApiResponse(result);
  }
  @Get('/:id/supernode/reward/loss')
  @Permissions([{ action: [ACTION.READ], module: PERMISSION_MODULE.USER }])
  async getCurrentLoss(
    @Param('id') userId: string,
    @Query('period') period: TIME_PERIOD,
  ) {
    const result = await this.supernodeService.getCurrentLoss(
      new Types.ObjectId(userId),
      period,
    );
    return new ApiResponse(result);
  }

  @Get('/:id/supernode/reward-analytics')
  @Permissions([{ action: [ACTION.READ], module: PERMISSION_MODULE.USER }])
  async getSupernodeRewardAnalytics(@Param('id') id: any) {
    const result = await this.supernodeService.getSupernodeRewardsByUserId(id);
    return new ApiResponse(result);
  }

  // * ---------------- Admin CloudK API ---------------- //

  @Get('/:id/cloud-k/products')
  @Permissions([{ action: [ACTION.READ], module: PERMISSION_MODULE.USER }])
  async findAllProducts() {
    const data = await this.cloudKService.getAllProducts();
    return new ApiResponse(data);
  }

  @Get('/:id/cloud-k/auto-compound')
  @Permissions([{ action: [ACTION.READ], module: PERMISSION_MODULE.USER }])
  async getUserGlobalAutoComplete(
    @Req() req: any,
    @Param('id') userId: Types.ObjectId,
  ) {
    const data = await this.cloudKService.getUserGlobalAutoComplete(userId);
    return new ApiResponse(data);
  }

  @Get('/:id/cloud-k/machines')
  @Permissions([{ action: [ACTION.READ], module: PERMISSION_MODULE.USER }])
  async userMachinesData(@Req() req: any, @Param('id') userId: Types.ObjectId) {
    const data = await this.cloudKService.getUserMachinesData(userId);
    return new ApiResponse(data);
  }

  @Get('/:id/cloud-k/machines/rewards')
  @Permissions([{ action: [ACTION.READ], module: PERMISSION_MODULE.USER }])
  async getUserMachineRewards(
    @Req() req: AppRequest,
    @Param('id') userId: Types.ObjectId,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('date') date: DateFilter,
    @Query('claimed') claimed: boolean,
    @Query('machine') machineId: string,
  ) {
    const data = await this.cloudKService.getUserMachineRewards(userId, {
      page,
      limit,
      claimed,
      date,
      machineId: machineId,
    });
    return new ApiResponse(data);
  }

  @Get('/:id/cloud-k/rewards')
  @Permissions([{ action: [ACTION.READ], module: PERMISSION_MODULE.USER }])
  async getUserTotalRewards(@Param('id') userId: Types.ObjectId) {
    const data = await this.cloudKService.getUserTotalRewards(userId);
    return new ApiResponse(data);
  }

  @Get('/:id/cloud-k/transactions')
  async getTransactionsPaginated(
    @Query() paginateDTO: PaginateDTO,
    @Query('machine') machine: string,
    @Query('token') token: string,
    @Query('type') type: CloudKTransactionTypes,
    @Query('fromDate') from: string,
    @Query('toDate') to: string,
    @Param('id') userId: Types.ObjectId,
    @Req() req: AppRequest,
  ) {
    const data = await this.cloudKService.getTransactionsPaginated(
      new Types.ObjectId(userId),
      paginateDTO,
      {
        machine,
        token,
        type,
        from,
        to,
      },
    );
    return new ApiResponse(data);
  }

  @Post('block')
  @Permissions([{ action: [ACTION.WRITE], module: PERMISSION_MODULE.USER }])
  async blockSupernodeUser(
    @Body() blockSupernodeUserDto: BlockSupernodeUserDto,
  ) {
    const updateResponse = await this.myBidService.updateSupernodeUserStatus(
      blockSupernodeUserDto,
    );
    if (!updateResponse) {
      throw new HttpException(
        'Failed to update supernode user status in external service.',
        HttpStatus.BAD_REQUEST,
      );
    }
    const blockedUser = await this.usersService.blockSupernodeUser(
      blockSupernodeUserDto,
    );

    return new ApiResponse(
      blockedUser,
      'User SuperNode status updated successfully.',
    );
  }

  // * ---------------- Admin Impersonation API ---------------- //
  @Post('impersonate')
  @Permissions([{ action: [ACTION.WRITE], module: PERMISSION_MODULE.USER }])
  async generateImpersonateTokens(
    @Req() req: AppRequest,
    @Body() impersonateDto: ImpersonateDto,
  ) {
    const adminId = req.admin.id;
    impersonateDto.admin = adminId;
    const token = await this.authService.getImpersonateToken(impersonateDto);
    const redirectUrl = `${process.env.FRONTEND_URL}/impersonate?token=${token}`;
    return new ApiResponse({ redirectUrl });
  }

  @Get('impersonate/log-history/:id?')
  @Permissions([{ action: [ACTION.READ], module: PERMISSION_MODULE.USER }])
  async getImpersonateLogHistory(
    @Param('id') id: string,
    @Query() paginateDTO: PaginateDTO,
  ) {
    const paginatedLogHistory =
      await this.impersonateService.getImpersonateLogHistory(paginateDTO, id);

    return new ApiResponse(
      paginatedLogHistory,
      'Paginated Impersonate Log History',
    );
  }

  @Get('/:id/sngp/community/reward-graph')
  async getUserComunitySngpProductionGraph(
    @Req() req: AppRequest,
    @Query() data: GraphTimelineDto,
    @Param('id') userId: any,
  ) {
    // To get the daily total rewards of the user
    const dailyTotalReward = await this.sngpGlobalPoll.getUserProductionGraph(
      userId,
      data.timeline,
    );
    return new ApiResponse(
      dailyTotalReward ?? [],
      dailyTotalReward ? 'OK' : 'SNGP not found',
    );
  }

  @Get('/:id/sngp/score-history')
  async getScoreHistory(
    @Req() req: any,
    @Query() paginateDTO: PaginateDTO,
    @Param('id') userId: Types.ObjectId,
  ) {
    const result = await this.sngpGlobalPoll.getScoreHistory(
      userId,
      paginateDTO,
    );
    return new ApiResponse(result ?? [], result ? 'OK' : 'SNGP not found');
  }

  @Get('/:id/sngp/total-activity')
  async getSngpActivityPool(
    @Req() req: AppRequest,
    @Param('id') userId: string,
  ) {
    const result = await this.sngpGlobalPoll.getSngpActivityPool(userId);
    return new ApiResponse(result ?? [], result ? 'OK' : 'SNGP not found');
  }

  @Get('/:id/country/get-token')
  async getAllToken() {
    const result = await this.sngpGlobalPoll.getAllToken();
    return new ApiResponse(result);
  }

  @Get('/:id/sngp/banner')
  async getSngpBanner(@Req() req: any, @Param('id') userId: Types.ObjectId) {
    const result = await this.sngpGlobalPoll.getSngpBanner(userId);
    return new ApiResponse(result);
  }

  @Get('/:id/country/pool/banner')
  async getCountryPoolBanner(
    @Req() req: any,
    @Param('id') userId: Types.ObjectId,
  ) {
    const result = await this.sngpGlobalPoll.getCountryPoolBanner(userId);
    return new ApiResponse(result);
  }

  @Get('/:id/country/active-pools')
  async getCountryActivePools(
    @Req() req: any,
    @Query() paginateDTO: PaginateDTO,
  ) {
    const result = await this.sngpGlobalPoll.getCountryActivePools(paginateDTO);
    return new ApiResponse(result);
  }

  @Get('/:id/country/poolscore-history')
  async getCountryPoolScoreHistory(
    @Req() req: any,
    @Query() paginateDTO: PaginateDTO,
    @Param('id') userId: Types.ObjectId,
  ) {
    // const userId = req.user.userId;
    const result = await this.sngpGlobalPoll.getCountryPoolScoreHistory(
      userId,
      paginateDTO,
    );
    return new ApiResponse(result);
  }

  @Get('/:id/country/myscore')
  async getCountryMyScoe(
    @Req() req: any,
    @Param('year') year: number,
    @Param('id') userId: Types.ObjectId,
  ) {
    // const userId = req.user.userId;
    const result = await this.sngpGlobalPoll.getCountryMyScoe(userId, year);
    return new ApiResponse(result);
  }

  @Get('/:id/country/pool-reward-history')
  async getCountryPoolRewardHistory(
    @Req() req: any,
    @Query() paginateDTO: PaginateDTO,
    @Param('id') userId: Types.ObjectId,
  ) {
    // const userId = req.user.userId;
    const result = await this.sngpGlobalPoll.getCountryPoolRewardHistory(
      userId,
      paginateDTO,
    );
    return new ApiResponse(result);
  }

  @Get('/:id/country/upcoming-pools')
  async getCountryUpcomingPools(
    @Req() req: AppRequest,
    @Query() paginateDTO: PaginateDTO,
  ) {
    const result =
      await this.sngpGlobalPoll.getCountryUpcomingPools(paginateDTO);
    return new ApiResponse(result);
  }

  @Permissions([
    {
      module: PERMISSION_MODULE.ADMIN,
      action: [ACTION.WRITE],
    },
  ])
  @Post('status')
  async updateUserStatus(
    @Body() userStatusDto: UserStatusDTO,
    @Req() req: AppRequest,
  ) {
    // Verify the admin has elevated privileges.
    if (!req.admin.isSuperAdmin && !req.admin.isSubSuperAdmin) {
      throw new UnprocessableEntityException(
        'You are not authorized to block the user',
      );
    }
    const adminDetails = req.admin;
    const data = await this.adminService.handleUserStatus(
      userStatusDto,
      adminDetails,
    );

    return new ApiResponse(
      data,
      data?.isBlocked
        ? 'User has been blocked successfully.'
        : 'User has been unblocked successfully.',
    );
  }

  @Get('countries/options')
  async getAllCountriesOptions() {
    const countries = await this.countriesService.getAllCountriesOptions();
    return new ApiResponse(countries, 'All countries fetched successfully');
  }
}
