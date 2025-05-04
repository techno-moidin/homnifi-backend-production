import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  InternalServerErrorException,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UnprocessableEntityException,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { TokenService } from '@/src/token/token.service';
import { UpdateTokenSettingsDto } from '@/src/token/dto/update-token-settings.dto';
import { Types } from 'mongoose';
import { UpdateTrxSettingsDto } from '@/src/token/dto/update-trx-settings.dto';
import { TrxType } from '@/src/global/enums/trx.type.enum';
import ApiResponse from '@/src/utils/api-response.util';
import { AdminGuard } from '../auth/guards/admin.guard';
import { UpdateTokenDto } from '@/src/token/dto/update-token.dto';
import { CreateSwapSettingDto } from '@/src/token/dto/create-swap-setting.dto';
import { CreateDepositSettingDto } from '@/src/token/dto/create-deposit-setting.dto';
import { CreateWithdrawSettingDto } from '@/src/token/dto/create-withdraw-setting.dto';
import { CreateNetworkDto } from '@/src/token/dto/create-network.dto';
import { UpdateWithdrawSettingDto } from '@/src/token/dto/update-withdraw-setting.dto';
import { UpdateSwapSettingDto } from '@/src/token/dto/update-swap-setting.dto';
import { UpdateDepositSettingDto } from '@/src/token/dto/update-deposit-setting.dto';
import { AppRequest } from '@/src/utils/app-request';
import { CreateTokenDto } from '@/src/token/dto/create-token.dto';
import { Permissions } from '../auth/decorators/permissions';
import { ACTION, PERMISSION_MODULE } from '@/src/enums/permission';
import {
  PaginateDTO,
  SpecialSwapSettingsDTO,
  WithdrawSettingsDTO,
  DepositAndStakeSettingsFilterDTO,
} from '../global/dto/paginate.dto';
import { CreateSpecialSwapSettingDto } from '@/src/token/dto/create-special-swap-setting.dto';
import { UpdateSpecialSwapSettingDto } from '@/src/token/dto/update-special-swap-setting.dto';
import { CreateDepositAndStakeSettingsDto } from '@/src/token/dto/create-deposit-and-stake-settings.dto';
import { UpdateDepositAndStakeSettingsDto } from '@/src/token/dto/update-deposit-and-stack-settings.dto';
import { TFAGuard } from '../auth/guards/TFA.guard';
import { TelegramNotificationInterceptor } from '@/src/interceptor/telegram.notification';
import { CONVERSION_TYPES, TOKEN_TYPES } from '@/src/global/enums/wallet.enum';

@UseGuards(AdminGuard)
@UseInterceptors(TelegramNotificationInterceptor)
@Controller('admin/tokens/')
export class AdminTokenController {
  constructor(private readonly tokenService: TokenService) {}

  @Permissions([{ action: [ACTION.WRITE], module: PERMISSION_MODULE.TOKEN }])
  @Post()
  async createToken(@Req() req: AppRequest, @Body() body: CreateTokenDto) {
    const adminId = req.admin.id;
    const token = await this.tokenService.createToken(adminId, body);
    return new ApiResponse(token, 'Token created successfully');
  }

  @Get('all')
  @Permissions([{ action: [ACTION.READ], module: PERMISSION_MODULE.TOKEN }])
  async findAll(
    @Query() paginateDto: PaginateDTO,
    @Query('symbol') symbol?: string,
    @Query('withdrawType') withdrawType?: string,
    @Query('conversionType') conversionType?: CONVERSION_TYPES,
  ) {
    const allTokens = await this.tokenService.findAllTokens(
      paginateDto,
      symbol,
      withdrawType,
      conversionType,
    );
    return new ApiResponse(allTokens, 'Tokens retrieved successfully');
  }

  @Get('get-pair-values')
  @Permissions([{ action: [ACTION.READ], module: PERMISSION_MODULE.TOKEN }])
  async getPairValues(
    @Query('symbol') symbol: string,
    @Query('type') type: TOKEN_TYPES,
  ) {
    const allPairValues = await this.tokenService.getPairValues(symbol, type);
    return new ApiResponse(
      allPairValues,
      'All pair values fetched successfully',
    );
  }

  @Get('on-chain/all')
  @Permissions([{ action: [ACTION.READ], module: PERMISSION_MODULE.TOKEN }])
  async findOnChainAllTokens(
    @Query() paginateDto: PaginateDTO,
    @Query('symbol') symbol?: string,
  ) {
    const allTokens = await this.tokenService.findOnChainAllTokens(
      paginateDto,
      symbol,
    );
    return new ApiResponse(allTokens, 'Tokens retrieved successfully');
  }

  @Post('networks')
  @Permissions([{ action: [ACTION.WRITE], module: PERMISSION_MODULE.TOKEN }])
  async createNetwork(@Body() createNetworkDto: CreateNetworkDto) {
    const createdNetwork =
      await this.tokenService.createNetwork(createNetworkDto);

    return new ApiResponse(
      createdNetwork,
      'The networks has been created successfully',
    );
  }

  @Get('networks')
  @Permissions([{ action: [ACTION.READ], module: PERMISSION_MODULE.TOKEN }])
  async findAllNetworks() {
    const allNetworks = await this.tokenService.findAllNetworks();
    return new ApiResponse(allNetworks, 'All networks found successfully');
  }

  @Put('networks/:networkId')
  @Permissions([{ action: [ACTION.UPDATE], module: PERMISSION_MODULE.TOKEN }])
  async updateNetwork(
    @Param('networkId') networkId: Types.ObjectId,
    @Body() createNetworkDto: CreateNetworkDto,
  ) {
    const updatedNetwork = await this.tokenService.updateNetwork(
      networkId,
      createNetworkDto,
    );

    return new ApiResponse(
      updatedNetwork,
      'The networks has been updated successfully',
    );
  }

  @Get('networks/supported-tokens/:id')
  @Permissions([{ action: [ACTION.READ], module: PERMISSION_MODULE.TOKEN }])
  async findSupportedNetworkByTokenId(@Param('id') token: Types.ObjectId) {
    const supportedNetworks =
      await this.tokenService.findSupportedNetworkByTokenId(token);
    return new ApiResponse(
      supportedNetworks,
      'Supported networks found successfully',
    );
  }

  @Get(':id')
  @Permissions([{ action: [ACTION.READ], module: PERMISSION_MODULE.TOKEN }])
  async findTokenSettingsById(@Param('id') id: Types.ObjectId) {
    const tokenSettings = await this.tokenService.findTokenSettingsById(id);
    return new ApiResponse(tokenSettings, 'Token settings found successfully');
  }

  @Put(':id')
  @Permissions([{ action: [ACTION.UPDATE], module: PERMISSION_MODULE.TOKEN }])
  async updateTokenById(
    @Req() req: any,
    @Param('id') id: Types.ObjectId,
    @Body() body: UpdateTokenDto,
  ) {
    const userId = req.id;
    // Validate conversionType related fields
    if (body.conversionType === CONVERSION_TYPES.CUSTOM && !body.customRate) {
      throw new BadRequestException(
        'customRate is required for custom conversionType',
      );
    }
    const updatedToken = await this.tokenService.updateTokenById(
      userId,
      id,
      body,
    );
    return new ApiResponse(updatedToken, 'Token updated successfully');
  }

  @Put(':id/settings')
  @Permissions([{ action: [ACTION.UPDATE], module: PERMISSION_MODULE.TOKEN }])
  async updateTokenSettingsByTokenId(
    @Req() req: any,
    @Param('id') tokenId: Types.ObjectId,
    @Body() updateTokenSettingsDto: UpdateTokenSettingsDto,
  ) {
    const userId = req.user.userId;
    const updatedSettings =
      await this.tokenService.updateTokenSettingsByTokenId(
        userId,
        tokenId,
        updateTokenSettingsDto,
      );
    return new ApiResponse(
      updatedSettings,
      'Token settings updated successfully',
    );
  }

  @Get('swap/setting')
  @Permissions([{ action: [ACTION.READ], module: PERMISSION_MODULE.TOKEN }])
  async getSwapSetting(@Query() paginateDto: WithdrawSettingsDTO) {
    const data = await this.tokenService.getAdminSwapSettingsList(paginateDto);
    return new ApiResponse(data, 'success');
  }

  @Get('special-swap/setting')
  @Permissions([{ action: [ACTION.READ], module: PERMISSION_MODULE.TOKEN }])
  async getSpecialSwapSetting(@Query() paginateDto: SpecialSwapSettingsDTO) {
    const data =
      await this.tokenService.getAdminSpecialSwapSettingsList(paginateDto);
    return new ApiResponse(data, 'success');
  }

  @Put('swap/setting/:id/toggle-enable')
  // @Permissions([{ action: [ACTION.UPDATE], module: PERMISSION_MODULE.TOKEN }])
  async toggleSwapSettingEnable(@Param('id') id: Types.ObjectId) {
    const data = await this.tokenService.toggleSwapSettingEnable(id);
    return new ApiResponse(data, 'success');
  }

  @Put('special-swap/setting/:id/toggle-enable')
  @Permissions([{ action: [ACTION.UPDATE], module: PERMISSION_MODULE.TOKEN }])
  async toggleSpecialSwapSettingEnable(@Param('id') id: Types.ObjectId) {
    const data = await this.tokenService.toggleSpecialSwapSettingEnable(id);
    return new ApiResponse(data, 'success');
  }

  @Put('deposit/setting/:id/visibility-enable')
  @Permissions([{ action: [ACTION.UPDATE], module: PERMISSION_MODULE.TOKEN }])
  async visibilityToggleDepositSettingEnable(@Param('id') id: Types.ObjectId) {
    const data =
      await this.tokenService.visibilityToggleDepositSettingEnable(id);
    return new ApiResponse(data, 'success');
  }

  @Get('deposit/setting')
  @Permissions([{ action: [ACTION.READ], module: PERMISSION_MODULE.TOKEN }])
  async getDepositSetting(@Query() paginateDto: WithdrawSettingsDTO) {
    const data =
      await this.tokenService.getAdminDepositSettingsList(paginateDto);
    return new ApiResponse(data, 'success');
  }

  @Put('deposit/setting/:id/toggle-enable')
  @Permissions([{ action: [ACTION.WRITE], module: PERMISSION_MODULE.TOKEN }])
  async toggleDepostSettingEnable(@Param('id') id: Types.ObjectId) {
    const data = await this.tokenService.toggleDepostSettingEnable(id);
    return new ApiResponse(data, 'success');
  }

  @Get('withdraw/setting')
  @Permissions([{ action: [ACTION.READ], module: PERMISSION_MODULE.TOKEN }])
  async getWithdrawSetting(@Query() paginationDto: WithdrawSettingsDTO) {
    const data =
      await this.tokenService.getAdminWithdrawSettingsList(paginationDto);
    return new ApiResponse(data, 'success');
  }

  @Put('withdraw/setting/:id/toggle-enable')
  @Permissions([{ action: [ACTION.UPDATE], module: PERMISSION_MODULE.TOKEN }])
  async toggleWithdrawSettingEnable(@Param('id') id: Types.ObjectId) {
    const data = await this.tokenService.toggleWithdrawSettingEnable(id);
    return new ApiResponse(data, 'success');
  }

  @Put('withdraw/setting/:id/visibility-enable')
  @Permissions([{ action: [ACTION.UPDATE], module: PERMISSION_MODULE.TOKEN }])
  async visibilityToggleWithdrawSettingEnable(@Param('id') id: Types.ObjectId) {
    const data =
      await this.tokenService.visibilityToggleWithdrawSettingEnable(id);
    return new ApiResponse(data, 'success');
  }

  @Post('swap/setting')
  @Permissions([{ action: [ACTION.WRITE], module: PERMISSION_MODULE.TOKEN }])
  async createSwapSetting(@Body() createSwapSettingDto: CreateSwapSettingDto) {
    const data =
      await this.tokenService.createSwapSetting(createSwapSettingDto);
    return new ApiResponse(data, 'success');
  }

  @Post('special-swap/setting')
  @Permissions([{ action: [ACTION.WRITE], module: PERMISSION_MODULE.TOKEN }])
  async createSpecialSwapSetting(
    @Body() createSpecialSwapSettingDto: CreateSpecialSwapSettingDto,
  ) {
    const data = await this.tokenService.createSpecialSwapSetting(
      createSpecialSwapSettingDto,
    );
    return new ApiResponse(data, 'success');
  }

  @Post('deposit/setting')
  @Permissions([{ action: [ACTION.WRITE], module: PERMISSION_MODULE.TOKEN }])
  async createDepositSetting(
    @Body() createDepositSettingDto: CreateDepositSettingDto,
  ) {
    const data = await this.tokenService.createDepositSetting(
      createDepositSettingDto,
    );
    return new ApiResponse(data, 'success');
  }

  @Post('withdraw/setting')
  @Permissions([{ action: [ACTION.WRITE], module: PERMISSION_MODULE.TOKEN }])
  async createWithdrawSetting(
    @Body() createWithdrawSettingDto: CreateWithdrawSettingDto,
  ) {
    const data = await this.tokenService.createWithdrawSetting(
      createWithdrawSettingDto,
    );
    return new ApiResponse(data, 'success');
  }

  @Put('swap/setting/:id')
  @Permissions([{ action: [ACTION.UPDATE], module: PERMISSION_MODULE.TOKEN }])
  async updateSwapSetting(
    @Req() req: AppRequest,
    @Param('id') id: Types.ObjectId,
    @Body() updateSwapSettingDto: UpdateSwapSettingDto,
  ) {
    const adminId = req.admin.id;
    const data = await this.tokenService.updateSwapSetting(
      id,
      adminId,
      updateSwapSettingDto,
    );
    return new ApiResponse(data, 'success');
  }

  @Put('special-swap/setting/:id')
  @Permissions([{ action: [ACTION.UPDATE], module: PERMISSION_MODULE.TOKEN }])
  async updateSpecialSwapSetting(
    @Req() req: AppRequest,
    @Param('id') id: Types.ObjectId,
    @Body() updateSwapSettingDto: UpdateSpecialSwapSettingDto,
  ) {
    const adminId = req.admin.id;
    const data = await this.tokenService.updateSpecialSwapSetting(
      id,
      adminId,
      updateSwapSettingDto,
    );
    return new ApiResponse(data, 'success');
  }

  @Put('deposit/setting/:id')
  @Permissions([{ action: [ACTION.UPDATE], module: PERMISSION_MODULE.TOKEN }])
  async updateDepositSetting(
    @Req() req: AppRequest,
    @Param('id') id: Types.ObjectId,
    @Body() updateDepositSettingDto: UpdateDepositSettingDto,
  ) {
    const adminId = req.admin.id;
    const data = await this.tokenService.updateDepositSetting(
      id,
      adminId,
      updateDepositSettingDto,
    );
    return new ApiResponse(data, 'success');
  }

  @Put('withdraw/setting/:id')
  @Permissions([{ action: [ACTION.UPDATE], module: PERMISSION_MODULE.TOKEN }])
  async updateWithdrawSetting(
    @Req() req: AppRequest,
    @Param('id') id: Types.ObjectId,
    @Body() updateWithdrawSettingDto: UpdateWithdrawSettingDto,
  ) {
    const adminId = req.admin.id;
    const data = await this.tokenService.updateWithdrawSetting(
      id,
      adminId,
      updateWithdrawSettingDto,
    );
    return new ApiResponse(data, 'success');
  }

  @Get('deposit/summary')
  @Permissions([{ action: [ACTION.READ], module: PERMISSION_MODULE.TOKEN }])
  async getDepositSummary(
    @Query('token') token?: string,
    @Query('network') network?: string,
  ) {
    const depositSummary = await this.tokenService.getDepositSummary(
      token,
      network,
    );
    return new ApiResponse(depositSummary, 'Deposit Summary');
  }

  @Get('withdraw/summary')
  @Permissions([{ action: [ACTION.READ], module: PERMISSION_MODULE.TOKEN }])
  async getWithdrawSummary(
    @Query('token') token?: string,
    @Query('network') network?: string,
    @Query('withdrawType') withdrawType?: string,
  ) {
    const withdrawSummary = await this.tokenService.getWithdrawSummary(
      token,
      network,
      withdrawType,
    );
    return new ApiResponse(withdrawSummary, 'Withdraw Summary');
  }

  @Get('swap/summary')
  @Permissions([{ action: [ACTION.READ], module: PERMISSION_MODULE.TOKEN }])
  async getSwapSummary(
    @Query('fromToken') fromToken?: string,
    @Query('toToken') toToken?: string,
  ) {
    const withdrawSummary = await this.tokenService.getSwapSummary(
      fromToken,
      toToken,
    );
    return new ApiResponse(withdrawSummary, 'Swap Summary');
  }

  @Get('withdraw/detail-summary')
  @Permissions([{ action: [ACTION.READ], module: PERMISSION_MODULE.TOKEN }])
  async getDetailedWithdrawSummary(
    @Query('token') token?: string,
    @Query('network') network?: string,
  ) {
    const detailedWithdrawSummary =
      await this.tokenService.getDetailedWithdrawSummary(token, network);
    return new ApiResponse(
      detailedWithdrawSummary,
      'Detailed Withdraw Summary',
    );
  }

  @Get('withdraw/detail-summary/token')
  @Permissions([{ action: [ACTION.READ], module: PERMISSION_MODULE.TOKEN }])
  async getDetailedWithdrawSummaryByToken(
    @Query('token') token?: string,
    @Query('network') network?: string,
  ) {
    const detailedWithdrawSummary =
      await this.tokenService.getWithdrawalAmountByToken(token, network);
    return new ApiResponse(
      detailedWithdrawSummary,
      'Detailed Withdraw Summary',
    );
  }

  @Get('withdraw/detail-summary/network')
  @Permissions([{ action: [ACTION.READ], module: PERMISSION_MODULE.TOKEN }])
  async getDetailedWithdrawSummaryByWithdraw(
    @Query('token') token?: string,
    @Query('network') network?: string,
  ) {
    const detailedWithdrawSummary =
      await this.tokenService.getNetworkWithdrawalSummary(token, network);
    return new ApiResponse(
      detailedWithdrawSummary,
      'Detailed Withdraw Summary',
    );
  }

  @Get('withdraw/detail-summary/amount-status')
  @Permissions([{ action: [ACTION.READ], module: PERMISSION_MODULE.TOKEN }])
  async getDetailedWithdrawSummaryByStatus(
    @Query('token') token?: string,
    @Query('network') network?: string,
  ) {
    const detailedWithdrawSummary =
      await this.tokenService.getTotalWithdrawAmountByStatus(token, network);
    return new ApiResponse(
      detailedWithdrawSummary,
      'Detailed Withdraw Summary',
    );
  }

  @Get('withdraw/detail-summary/count-status')
  @Permissions([{ action: [ACTION.READ], module: PERMISSION_MODULE.TOKEN }])
  async getWithdrawCountsByCountStatus(@Query('token') token?: string) {
    const detailedWithdrawSummary =
      await this.tokenService.getWithdrawCountsByStatus(token);
    return new ApiResponse(
      detailedWithdrawSummary,
      'Detailed Withdraw Summary',
    );
  }

  @Post('deposit-and-stake-settings')
  @Permissions([{ action: [ACTION.READ], module: PERMISSION_MODULE.TOKEN }])
  async createDepositAndStakeSetting(
    @Req() req: AppRequest,
    @Body() createDepositAndStakeDto: CreateDepositAndStakeSettingsDto,
  ) {
    const adminId: string = req.admin.id;
    const createdSetting = await this.tokenService.createDepositAndStackSetting(
      createDepositAndStakeDto,
      adminId,
    );

    return new ApiResponse(
      createdSetting,
      'Deposit and stack setting added successfully',
    );
  }

  @Get('depositAndStack/settings')
  @Permissions([{ action: [ACTION.READ], module: PERMISSION_MODULE.TOKEN }])
  async getDepositAndStackSettings(
    @Query() filterDto: DepositAndStakeSettingsFilterDTO,
  ) {
    try {
      const data =
        await this.tokenService.getDepositAndStackSettingsList(filterDto);
      return new ApiResponse(data, 'Success');
    } catch (error) {
      console.error('Error fetching deposit and stack settings:', error);
      throw new InternalServerErrorException('Failed to fetch settings');
    }
  }

  @Put('deposit-and-stake/setting/:id/toggle-enable')
  @Permissions([{ action: [ACTION.UPDATE], module: PERMISSION_MODULE.TOKEN }])
  async depositAndStackToggleEnable(@Param('id') id: Types.ObjectId) {
    const data = await this.tokenService.depositAndStackToggleEnable(id);
    return new ApiResponse(data, 'success');
  }

  @Put('deposit-and-stake/setting/:id/visibility-enable')
  @Permissions([{ action: [ACTION.UPDATE], module: PERMISSION_MODULE.TOKEN }])
  async depositAndStackToggleVisible(@Param('id') id: Types.ObjectId) {
    const data = await this.tokenService.depositAndStackToggleVisible(id);
    return new ApiResponse(data, 'success');
  }

  @Put('deposit-and-stake-settings/:id')
  @Permissions([{ action: [ACTION.UPDATE], module: PERMISSION_MODULE.TOKEN }])
  async updateDepositAndStakeSettings(
    @Req() req: AppRequest,
    @Param('id') depositAndStakeSettingsId: Types.ObjectId,
    @Body() updateDepositAndStakeDto: UpdateDepositAndStakeSettingsDto,
  ) {
    const adminId = req.admin.id;
    const updatedSetting = await this.tokenService.updateDepositAndStakeSetting(
      depositAndStakeSettingsId,
      updateDepositAndStakeDto,
      adminId,
    );
    return new ApiResponse(
      updatedSetting,
      'Deposit and stake setting updated successfully',
    );
  }

  @Permissions([
    {
      module: PERMISSION_MODULE.ADMIN,
      action: [ACTION.DELETE],
    },
  ])
  @UseGuards(TFAGuard)
  @Delete('withdraw/setting/:id')
  async deleteWithdrawSetting(@Param('id') id: string, @Req() req: AppRequest) {
    if (!req.admin.isSuperAdmin) {
      throw new UnprocessableEntityException(
        'You are not authorized to delete admin',
      );
    }
    const admin = await this.tokenService.softDeleteWithdrawSetting(id);
    return new ApiResponse(admin, 'Withdraw Setting removed successfully!');
  }

  @Permissions([
    {
      module: PERMISSION_MODULE.ADMIN,
      action: [ACTION.DELETE],
    },
  ])
  @UseGuards(TFAGuard)
  @Delete('deposit/setting/:id')
  async deleteDepositSetting(@Param('id') id: string, @Req() req: AppRequest) {
    if (!req.admin.isSuperAdmin) {
      throw new UnprocessableEntityException(
        'You are not authorized to delete admin',
      );
    }
    const admin = await this.tokenService.softDeleteDepositSetting(id);
    return new ApiResponse(admin, 'Deposit Setting removed successfully!');
  }

  @Permissions([
    {
      module: PERMISSION_MODULE.ADMIN,
      action: [ACTION.DELETE],
    },
  ])
  @UseGuards(TFAGuard)
  @Delete('deposit-and-stake/setting/:id')
  async deleteDepositAndStakeSetting(
    @Param('id') id: string,
    @Req() req: AppRequest,
  ) {
    if (!req.admin.isSuperAdmin) {
      throw new UnprocessableEntityException(
        'You are not authorized to delete admin',
      );
    }
    const admin = await this.tokenService.softDeleteDepositAndStakeSetting(id);
    return new ApiResponse(
      admin,
      'Deposit and stake setting removed successfully!',
    );
  }

  @Permissions([
    {
      module: PERMISSION_MODULE.ADMIN,
      action: [ACTION.DELETE],
    },
  ])
  @UseGuards(TFAGuard)
  @Delete('swap/setting/:id')
  async deleteSwapSetting(@Param('id') id: string, @Req() req: AppRequest) {
    if (!req.admin.isSuperAdmin) {
      throw new UnprocessableEntityException(
        'You are not authorized to delete admin',
      );
    }
    const admin = await this.tokenService.softDeleteSwapSetting(id);
    return new ApiResponse(admin, 'Swap setting removed successfully!');
  }

  @Permissions([
    {
      module: PERMISSION_MODULE.ADMIN,
      action: [ACTION.DELETE],
    },
  ])
  @UseGuards(TFAGuard)
  @Delete('special-swap/setting/:id')
  async deleteSpecialSwapSetting(
    @Param('id') id: string,
    @Req() req: AppRequest,
  ) {
    if (!req.admin.isSuperAdmin) {
      throw new UnprocessableEntityException(
        'You are not authorized to delete admin',
      );
    }
    const admin = await this.tokenService.softDeleteSpecialSwapSetting(id);
    return new ApiResponse(admin, 'Special swap setting removed successfully!');
  }

  @Put('deposit/setting/:id/reset-on-chain')
  @Permissions([{ action: [ACTION.WRITE], module: PERMISSION_MODULE.TOKEN }])
  async resetUserOnChainAttempts(@Param('id') id: Types.ObjectId) {
    const data = await this.tokenService.resetUserOnChainAttempts(id);
    return new ApiResponse(data, 'On-Chain attempts reset successfully!');
  }

  @Put('deposit/setting/:id/min-amount-validation')
  @Permissions([{ action: [ACTION.UPDATE], module: PERMISSION_MODULE.TOKEN }])
  async depositSettingToggleMinAmountValidation(
    @Param('id') id: Types.ObjectId,
  ) {
    const data =
      await this.tokenService.depositSettingToggleMinAmountValidation(id);
    return new ApiResponse(data, 'success');
  }
  @Get('deposit/setting/:id/conversion-rate-update')
  @Permissions([{ action: [ACTION.UPDATE], module: PERMISSION_MODULE.TOKEN }])
  async getConversionRate(@Param('id') id: Types.ObjectId) {
    const data =
      await this.tokenService.getConversionRateOnChainDepositSettings(id);
    return new ApiResponse(data, 'success');
  }
  @Put('isdebitEnable/:id/toggle-enable')
  @Permissions([{ action: [ACTION.UPDATE], module: PERMISSION_MODULE.TOKEN }])
  async toggleTokenIsDebitEnable(@Param('id') id: Types.ObjectId) {
    const data = await this.tokenService.toggleTokenIsDebitEnable(id);
    return new ApiResponse(data, 'success');
  }
}
