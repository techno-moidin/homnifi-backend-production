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
  UseInterceptors,
} from '@nestjs/common';
import ApiResponse from '@/src/utils/api-response.util';
import { CreateOnChainWalletDto } from '@/src/wallet/dto/create-on-chain-wallet.dto';
import { AppRequest } from '@/src/utils/app-request';
import { AdminGuard } from '../auth/guards/admin.guard';
import {
  OnChainWalletSettingsDTO,
  PaginateDTO,
  SortDTO,
  SwapFilterDTO,
  TokenFilterDTO,
  WalletFilterDTO,
  WithdrawFilterDTO,
} from '../global/dto/paginate.dto';
import { WalletService } from '@/src/wallet/wallet.service';
import { TokenSymbol } from '@/src/token/enums/token-code.enum';
import { Types } from 'mongoose';
import { CreateWalletSettingsDto } from '@/src/wallet/dto/create-wallet-settings.dto';
import { Permissions } from '../auth/decorators/permissions';
import { ACTION, PERMISSION_MODULE } from '@/src/enums/permission';
import { TokenService } from '@/src/token/token.service';
import { UpdateWAlletTokenDto } from '@/src/token/dto/update-wallet-token.dto';
import { KMallService } from '@/src/k-mall/kmall.service';
import { GetAllowApprovalWithdrawDto } from '@/src/wallet/dto/get-allow-approval-withdraw.dto';
import { CreateOnChainWalletSettingsDto } from '@/src/wallet/dto/create-on-chain-wallet-settings.dto';
import { CloudKService } from '@/src/cloud-k/cloud-k.service';
import { CloudKTransactionTypes } from '@/src/cloud-k/schemas/cloudk-transactions.schema';
import { AdminWalletService } from '@/src/admin/admin.wallet.services';
import { TelegramNotificationInterceptor } from '@/src/interceptor/telegram.notification';
import { BadRequestException } from '@/src/exceptions/NotFoundException';

@Controller('admin/wallets')
@UseGuards(AdminGuard)
@UseInterceptors(TelegramNotificationInterceptor)
export class AdminWalletController {
  constructor(
    private readonly walletService: WalletService,
    private readonly adminWalletService: AdminWalletService,

    private readonly tokenService: TokenService,
    private readonly kmallService: KMallService,
    private readonly cloudKService: CloudKService,
  ) {}

  @Get('')
  @Permissions([{ action: [ACTION.READ], module: PERMISSION_MODULE.WALLET }])
  async getAllWalletPaginated(
    @Query() paginateDTO: WalletFilterDTO,
    @Query('joinDateFilter') joinDateFilter?: string,
  ) {
    const paginatedWithdraws =
      await this.adminWalletService.getAllWalletPaginated(
        paginateDTO,
        joinDateFilter,
      );
    return new ApiResponse(paginatedWithdraws, 'Paginated Withdraws');
  }

  @Get('wallet-transaction-summary')
  @Permissions([{ action: [ACTION.READ], module: PERMISSION_MODULE.WALLET }])
  async getWalletTotals() {
    return await this.adminWalletService.getWalletSummaryV1();
  }
  @Post('wallet/create')
  @Permissions([{ action: [ACTION.WRITE], module: PERMISSION_MODULE.WALLET }])
  async createWallet(
    @Body('userId') userId: Types.ObjectId,
    @Body('tokenSymbol') tokenSymbol: string,
  ) {
    const createdWallet = await this.walletService.createWalletByTokenSymbol(
      userId,
      tokenSymbol,
    );
    return new ApiResponse(createdWallet, 'Wallet created');
  }

  @Post('on-chain-wallet/create')
  @Permissions([{ action: [ACTION.WRITE], module: PERMISSION_MODULE.WALLET }])
  async createOnChainWallet(
    @Body() createOnChainWalletDto: CreateOnChainWalletDto,
  ) {
    return this.walletService.createOnChainWallet(createOnChainWalletDto);
  }

  // @Get('swaps')
  // @Permissions([{ action: [ACTION.READ], module: PERMISSION_MODULE.WALLET }])
  // async getAllSwapsPaginated(@Query() paginateDTO: WalletFilterDTO) {
  //   const paginatedSwaps =
  //     await this.walletService.getAllSwapsPaginated(paginateDTO);
  //   return new ApiResponse(paginatedSwaps, 'Paginated Swaps');
  // }

  // @Get('deposits')
  // @Permissions([{ action: [ACTION.READ], module: PERMISSION_MODULE.WALLET }])
  // async getAllDepositsPaginated(@Query() paginateDTO: WalletFilterDTO) {
  //   const paginatedDeposits =
  //     await this.walletService.getAllDepositsPaginated(paginateDTO);
  //   return new ApiResponse(paginatedDeposits, 'Paginated Deposits');
  // }

  @Get('onchain-deposits')
  @Permissions([{ action: [ACTION.READ], module: PERMISSION_MODULE.WALLET }])
  async getAllOnChainDeposits(@Query() paginateDTO: WalletFilterDTO) {
    const paginatedDeposits =
      await this.walletService.getAllOnChainDepositsV2(paginateDTO);
    return new ApiResponse(paginatedDeposits, 'Paginated Deposits');
  }

  // @Get('withdraws')
  // @Permissions([{ action: [ACTION.READ], module: PERMISSION_MODULE.WALLET }])
  // async getAllWithdrawsPaginated(@Query() paginateDTO: WalletFilterDTO) {
  //   const paginatedWithdraws =
  //     await this.walletService.getAllWithdrawsPaginated(paginateDTO);
  //   return new ApiResponse(paginatedWithdraws, 'Paginated Withdraws');
  // }

  @Get('transfers')
  @Permissions([{ action: [ACTION.READ], module: PERMISSION_MODULE.WALLET }])
  async getAllTransfersPaginated(@Query() paginateDTO: PaginateDTO) {
    const paginatedData =
      await this.walletService.getAllTransfersPaginated(paginateDTO);
    return new ApiResponse(paginatedData, 'Paginated Transfers');
  }

  @Post('withdraws/:requestId/accept')
  @Permissions([{ action: [ACTION.WRITE], module: PERMISSION_MODULE.WALLET }])
  async approveWithdraw(
    @Req() req: AppRequest,
    @Param('requestId') requestId: string,
    // @Body() body: { hash: string },
  ) {
    const adminId = req.admin.id;
    await this.walletService.approveForWithdraw(requestId, {
      adminId: adminId,
    });
    return new ApiResponse('Withdraw request approved');
  }

  @Post('withdraws/:requestId/reject')
  @Permissions([{ action: [ACTION.WRITE], module: PERMISSION_MODULE.WALLET }])
  async rejectWithdraw(
    @Req() req: AppRequest,
    @Param('requestId') id: string,
    @Body() rejectData,
  ) {
    const adminId = req.admin.id;
    await this.walletService.rejectWithdraw(
      id,
      rejectData.denialReason,
      adminId,
    );
    return new ApiResponse('Withdraw request rejected');
  }

  @Post('settings')
  @Permissions([{ action: [ACTION.WRITE], module: PERMISSION_MODULE.WALLET }])
  async createWalletSettings(
    @Body() createWalletSettingDto: CreateWalletSettingsDto,
  ) {
    const data = await this.walletService.createWalletSettings(
      createWalletSettingDto,
    );
    return new ApiResponse(data, 'success');
  }

  @Get('settings')
  @Permissions([{ action: [ACTION.READ], module: PERMISSION_MODULE.WALLET }])
  async getWalletSettings() {
    const data = await this.walletService.getWalletSettings();
    return new ApiResponse(data);
  }

  @Get('hot/balance')
  @Permissions([{ action: [ACTION.READ], module: PERMISSION_MODULE.WALLET }])
  async getHotWalletBalance() {
    const data = await this.kmallService.getHotWalletBalance();
    return new ApiResponse(data);
  }

  @Get('check-withdraws-approval')
  @Permissions([{ action: [ACTION.READ], module: PERMISSION_MODULE.WALLET }])
  async getWithdrawsApprovalCheck(
    @Query()
    GetAllowApprovalWithdrawDto: GetAllowApprovalWithdrawDto,
  ) {
    const WithdrawsApprovalCheck =
      await this.walletService.getWithdrawsApprovalCheck(
        GetAllowApprovalWithdrawDto,
      );
    return new ApiResponse(WithdrawsApprovalCheck, 'Withdraw Approval Status');
  }

  @Get('withdraw-transaction-summary')
  @Permissions([{ action: [ACTION.READ], module: PERMISSION_MODULE.WALLET }])
  async getWithdrawTotals(@Query() filterDTO: WithdrawFilterDTO) {
    return await this.adminWalletService.getWithdrawSummary(filterDTO);
  }

  @Get('withdraws')
  @Permissions([{ action: [ACTION.READ], module: PERMISSION_MODULE.WALLET }])
  async getAllWithdrawsPaginated(
    @Query() paginateDTO: WalletFilterDTO,
    @Query('joinDateFilter') joinDateFilter?: string,
  ) {
    const paginatedWithdraws =
      await this.adminWalletService.getAllWithdrawsPaginated(
        paginateDTO,
        joinDateFilter,
      );
    return new ApiResponse(paginatedWithdraws, 'Paginated Withdraws');
  }

  @Get('deposit-transaction-summary')
  @Permissions([{ action: [ACTION.READ], module: PERMISSION_MODULE.WALLET }])
  async getTokenTotals(@Query() filterDTO: TokenFilterDTO) {
    return await this.adminWalletService.getDepositSummary(filterDTO);
  }

  @Get('deposits')
  @Permissions([{ action: [ACTION.READ], module: PERMISSION_MODULE.WALLET }])
  async getAllDepositsPaginated(@Query() paginateDTO: WalletFilterDTO) {
    const paginatedDeposits =
      await this.adminWalletService.getAllDepositsPaginated(paginateDTO);
    return new ApiResponse(paginatedDeposits, 'Paginated Deposits');
  }

  @Get('swap-transaction-summary')
  @Permissions([{ action: [ACTION.READ], module: PERMISSION_MODULE.WALLET }])
  async getSwapTotals(@Query() filterDTO: SwapFilterDTO) {
    return await this.adminWalletService.getSwapSummary(filterDTO);
  }

  @Get('swaps')
  @Permissions([{ action: [ACTION.READ], module: PERMISSION_MODULE.WALLET }])
  async getAllSwapsPaginated(@Query() paginateDTO: WalletFilterDTO) {
    const paginatedSwaps =
      await this.adminWalletService.getAllSwapsPaginated(paginateDTO);
    return new ApiResponse(paginatedSwaps, 'Paginated Swaps');
  }

  @Get('get-all-wallet-balance')
  @Permissions([{ action: [ACTION.READ], module: PERMISSION_MODULE.WALLET }])
  async getAllUserWalletBalance(@Query() paginatSortDTO: SortDTO) {
    const paginatedSwaps =
      await this.adminWalletService.getAllUserWalletBalanceWithSorting(
        paginatSortDTO,
      );
    return new ApiResponse(paginatedSwaps, 'All User Wallet Balance');
  }
}
