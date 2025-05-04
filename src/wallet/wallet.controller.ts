import {
  Body,
  Controller,
  Get,
  HttpException,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateWithdrawDto } from './dto/create-withdraw.dto';
import { Types } from 'mongoose';
import { CreateSwapDto } from './dto/create-swap.dto';
import ApiResponse from '../utils/api-response.util';
import { AppRequest } from '../utils/app-request';
import { WITHDRAW_TYPES } from '../token/enums/withdraw-types.enum';
import { OTPGuard } from '../global/guards/otp.guard';
import { WalletService } from './wallet.service';
import { TokenService } from '../token/token.service';
import {
  PaginateDTO,
  SpecialSwapPaginateDTO,
} from '../admin/global/dto/paginate.dto';
import { GraphTimelineDto } from '../supernode/dto/graph-query.dto';
import { CreateDepositAndStakeDto } from './dto/deposit-and-stake.dto';
import { WalletDepositService } from './wallet.deposit.service';
import {
  CreateWithdrawSettingsDto,
  GetDepositSettingsDto,
} from '../admin/dto/wallet.dto';
import { CreateSpecialSwapDto } from '@/src/wallet/dto/create-special-swap.dto';
import { WalletBalanceService } from './wallet.balance.service';

@Controller('wallets')
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(
    private readonly walletService: WalletService,
    private readonly walletBalanceService: WalletBalanceService,

    private readonly tokenService: TokenService,
    private readonly walletDepositService: WalletDepositService,
  ) {}

  @UseGuards(OTPGuard)
  @Post('withdraws/request')
  async requestWithdraw(
    @Req() req: any,
    @Body() createWithdrawDto: CreateWithdrawDto,
  ) {
    const userId = req.user.userId;
    await this.walletService.requestWithdraw(userId, createWithdrawDto);
    const msg =
      createWithdrawDto.type === WITHDRAW_TYPES.EXTERNAL
        ? 'Withdraw request created successfully'
        : 'Tokens Transferred successfully';
    return new ApiResponse(msg);
  }

  @Post('swaps')
  async newSwap(@Req() req: any, @Body() createSwapDto: CreateSwapDto) {
    const userId = req.user.userId;
    const createdSwap = await this.walletService.newSwap(userId, createSwapDto);
    return new ApiResponse('Your Swap is successfully completed');
  }

  @Get('withdraws/validate')
  async validateAddress(
    @Req() req: any,
    @Query('address') address: string,
    @Query('network') network: string,
  ) {
    const data = await this.walletService.validateAddress(address, network);

    return new ApiResponse({
      valid: data,
    });
  }

  @Get('swaps')
  async getSwapsPaginated(@Req() req: any, @Query() paginateDTO: PaginateDTO) {
    const userId = req.user.userId;
    const paginatedSwaps = await this.walletService.getSwapsPaginated(
      userId,
      paginateDTO,
    );
    return new ApiResponse(paginatedSwaps, 'Paginated Swaps');
  }

  @Get('swap/merged')
  async getMergedSwapsPaginated(
    @Req() req: any,
    @Query() paginateDTO: SpecialSwapPaginateDTO,
  ) {
    const userId = req.user.userId;
    const paginatedSwaps = await this.walletService.getMergedSwapsPaginated(
      userId,
      paginateDTO,
    );
    return new ApiResponse(paginatedSwaps, 'Paginated Swaps');
  }

  @Get('special-swaps')
  async getSpecialSwapsPaginated(
    @Req() req: any,
    @Query() paginateDTO: SpecialSwapPaginateDTO,
  ) {
    let userOId: Types.ObjectId;
    try {
      userOId = new Types.ObjectId(req.user.userId);
    } catch (e) {
      throw new HttpException('Invalid user id', 400);
    }
    const paginatedSwaps = await this.walletService.getSpecialSwapsPaginated(
      userOId,
      paginateDTO,
    );
    return new ApiResponse(paginatedSwaps, 'Paginated Special Swaps');
  }

  @Post('special-swaps')
  async newSpecialSwap(
    @Req() req: any,
    @Body() createSwapDto: CreateSpecialSwapDto,
  ) {
    let userId: Types.ObjectId;
    try {
      userId = new Types.ObjectId(req.user.userId);
    } catch (e) {
      throw new HttpException('Invalid user id', 400);
    }
    await this.walletService.newSpecialSwap(userId, createSwapDto);
    return new ApiResponse('Your special swap is successfully completed');
  }

  @Get('deposits')
  async getDepositsPaginated(
    @Req() req: any,
    @Query() paginateDTO: PaginateDTO,
  ) {
    const userId = req.user.userId;
    const paginatedDeposits = await this.walletService.getDepositsPaginated2(
      userId,
      paginateDTO,
    );
    return new ApiResponse(paginatedDeposits, 'Paginated Deposits');
  }

  @Get('withdraws')
  async getWithdrawsPaginated(
    @Req() req: any,
    @Query() paginateDTO: PaginateDTO,
  ) {
    const userId = req.user.userId;
    const paginatedWithdraws = await this.walletService.getWithdrawsPaginated(
      userId,
      paginateDTO,
    );
    return new ApiResponse(paginatedWithdraws, 'Paginated Withdraws');
  }

  @Get('balance')
  async getTotalBalance(@Req() req: any) {
    const userId = req.user.userId;
    const totalBalance = await this.walletService.getTotalBalance(userId);
    return new ApiResponse(totalBalance, 'Total Balance of User');
  }

  @Get('tokens/balance')
  async getBalanceOfEachToken(@Req() req: any) {
    const userId = req.user.userId;
    const tokenBalances =
      await this.walletService.getBalanceOfEachToken(userId);
    return new ApiResponse(tokenBalances, 'Balance of each token');
  }

  // @Get('balance-chart')
  // async getGraphOfToken(@Req() req: any, @Query() query: GraphTimelineDto) {
  //   const userId = req.user.userId;
  //   const { timeline } = query;
  //   const tokenBalances = await this.walletService.getGraphOfToken(
  //     userId,
  //     timeline,
  //   );
  //   return new ApiResponse(tokenBalances, 'Graph data for all token balance');
  // }

  @Get('deposit/address')
  async getUserOnChainAddress(
    @Req() req: AppRequest,
    @Query('token') token: Types.ObjectId,
    @Query('network') network: Types.ObjectId,
  ) {
    const onChainAddressDto = {
      userId: new Types.ObjectId(req.user.userId),
      networkId: network,
      onChainTokenId: token,
    };
    const data =
      await this.walletService.getUserOnChainAddress(onChainAddressDto);
    return new ApiResponse(data);
  }

  @Get('onChain/attemps')
  async getUserOnChainAttempsDetails(
    @Req() req: AppRequest,
    @Query('token') token: Types.ObjectId,
    @Query('network') network: Types.ObjectId,
  ) {
    const onChainAddressDto = {
      userId: new Types.ObjectId(req.user.userId),
      networkId: network,
      onChainTokenId: token,
    };
    const data =
      await this.walletService.getUserOnChainAttempsCounts(onChainAddressDto);
    return new ApiResponse(
      data,
      'On-Chain attemps details fetched successfully',
    );
  }

  @Get('deposit/settings')
  async getDepositSettings(@Query() requestQuery: GetDepositSettingsDto) {
    const token =
      await this.walletService.availableDepositWallets(requestQuery);
    return new ApiResponse(token);
  }

  @Get('withdraw/settings')
  async getWithdrawSettings(@Query() requestQuery: CreateWithdrawSettingsDto) {
    const data = await this.walletService.getAllWithdrawSettings(requestQuery);
    return new ApiResponse(data);
  }

  @Get('swap/settings')
  async getSwapSettingsForToken(
    @Query() getDepositSettingsDto: GetDepositSettingsDto,
  ) {
    const settings = await this.tokenService.getAllSwapSettings(
      getDepositSettingsDto,
    );
    return new ApiResponse(settings, 'Swap settings fetched successfully');
  }

  @Put('swap/tomo/accept/condition')
  async acceptTermAndCondition(@Req() req: AppRequest) {
    const settings = await this.tokenService.acceptTermAndCondition(
      new Types.ObjectId(req.user.userId),
    );
    return new ApiResponse(settings);
  }

  @Get('special-swap/settings')
  async getSpecialSwapSettingsForToken(
    @Query('countryCode') countryCode: string,
    @Query('platform') platform: string,
  ) {
    const specialSwapSettings =
      await this.tokenService.getAllSpecialSwapSettings(countryCode, platform);
    return new ApiResponse(
      specialSwapSettings,
      'Special swap settings fetched successfully',
    );
  }

  @Get('settings')
  async getWalletSettings() {
    const data = await this.walletService.getWalletSettings();
    return new ApiResponse(data);
  }

  @Get('balance-chart')
  async getGraphOfToken(@Req() req: any, @Query() query: GraphTimelineDto) {
    const userId = req.user.userId;
    const { timeline } = query;
    const tokenBalances = await this.walletService.getGraphOfTokenV2(
      userId,
      timeline,
    );
    return new ApiResponse(tokenBalances, 'Graph data for all token balance');
  }

  @Post('deposit-and-stake')
  async depositAndStake(
    @Req() req: any,
    @Body() createDepositAndStakeDto: CreateDepositAndStakeDto,
  ) {
    const userId = req.user.userId;
    const deposit = await this.walletDepositService.depositAndStake(
      userId,
      createDepositAndStakeDto,
    );
    return new ApiResponse(
      deposit,
      'Deposit request submitted successfully. Your transaction is now pending.',
    );
  }

  @Put('deposit-and-stake/cancel')
  async cancelTransactionRequest(@Req() req: any) {
    const userId: string = req.user.userId;
    const canceledRequest =
      await this.walletDepositService.cancelTransaction(userId);

    return new ApiResponse(
      canceledRequest,
      'Request tranction canceled successfully',
    );
  }

  @Get('deposit-and-stake')
  async getTransactionRequest(@Req() req: any) {
    const userId: string = req.user.userId;
    const canceledRequest =
      await this.walletDepositService.getTransaction(userId);

    return new ApiResponse(
      canceledRequest,
      'Request tranction canceled successfully',
    );
  }

  @Get('deposit-and-stake/settings')
  async getDepositAndStakeSettingsRequest(
    @Query() requestQuery: GetDepositSettingsDto,
  ) {
    const token =
      await this.walletDepositService.availableDepositAndStakeWallets(
        requestQuery,
      );
    return new ApiResponse(token);
  }
  @Get('deposit-and-stake/list')
  async getDepositAndStakePaginated(
    @Req() req: any,
    @Query() paginateDTO: PaginateDTO,
  ) {
    const userId = req.user.userId;
    const paginatedDeposits =
      await this.walletService.getDepositAndStakePaginated(userId, paginateDTO);
    return new ApiResponse(paginatedDeposits, 'Paginated Deposits');
  }

  @Get('balance/new')
  async getTotalBalanceNew(@Req() req: any) {
    const userId: string = req.user.userId;
    //
    const totalBalance =
      await this.walletBalanceService.getTotalBalance(userId);
    return new ApiResponse(totalBalance, 'Total Balance of Userss');
  }

  @Get('stake-available/new')
  async getTotalStakeAvailableNew(
    @Req() req: any,
    @Query('wallet') wallet: string, // Use @Query instead of @Param
  ) {
    //
    const userId: string = req.user.userId;
    const totalBalance = await this.walletBalanceService.getAvaialbleStake(
      userId,
      wallet,
    );

    return new ApiResponse(totalBalance, 'Total Stake of Users');
  }

  @Get('balance/:tokenSymbol')
  async getTotalBalanceByTokenSymbol(
    @Param('tokenSymbol') tokenSymbol: string,
    @Req() req: any,
  ) {
    const userId = req.user.userId;
    const totalBalance = await this.walletService.getTotalBalanceByTokenSymbol(
      userId,
      tokenSymbol,
    );

    return new ApiResponse(
      totalBalance,
      'Total Balance of Token: ' + tokenSymbol,
    );
  }
  @Get('due/balance')
  async getDueBalance(@Req() req: any) {
    const userId: string = req.user.userId;
    const totalBalance = await this.walletBalanceService.getDueBalance(userId);
    return new ApiResponse(totalBalance, 'Total Balance of Userss');
  }
}
