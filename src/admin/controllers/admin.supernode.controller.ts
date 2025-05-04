import { ACTION, PERMISSION_MODULE } from '@/src/enums/permission';
import { CreateBuilderReferralSettingsDto } from '@/src/supernode/dto/builder-referral-settings.schema.dto';
import {
  CreateBasRefSettingDto,
  CreateBuilderGenerationSettingDto,
  CreateMatchingBonusSettingDto,
  DistributionDto,
  UpdateBuilderGenerationSettingDto,
} from '@/src/supernode/dto/create-base-ref-setting.dto';
import { SngpDto, UpdateSngpDto } from '@/src/supernode/dto/sngp.dto';
import { POOL_TYPE, STATUS_TYPE } from '@/src/supernode/enums/sngp-type.enum';
import { SupernodeService } from '@/src/supernode/supernode.service';

import ApiResponse from '@/src/utils/api-response.util';
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
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Permissions } from '../auth/decorators/permissions';
import { AdminGuard } from '../auth/guards/admin.guard';
import { query } from 'express';
import { SNGlogbalPollService } from '@/src/supernode/sn-global-poll.service';
import {
  PaginateDTO,
  SupernodeTransactionDTO,
} from '../global/dto/paginate.dto';
import { DISTRIBUTION_STATUS_TYPE } from '@/src/supernode/enums/sngp-distribution.enum';
import { Types } from 'mongoose';
import { TelegramNotificationInterceptor } from '@/src/interceptor/telegram.notification';
import { AdminSupernodeService } from '@/src/supernode/admin.supernode.service';
import {
  GetBonusSummaryDto,
  GetBonusSummaryTransactionDto,
} from '@/src/supernode/dto/bonus-summary.dto';
import { SupernodeSummaryService } from '@/src/supernode/supernode.summary.service';
import { SN_BONUS_TYPE } from '@/src/supernode/enums/sn-bonus-type.enum';
import { TIME_PERIOD } from '@/src/utils/constants';

@Controller('admin/supernode')
@UseGuards(AdminGuard)
@UseInterceptors(TelegramNotificationInterceptor)
export class AdminSupernodeController {
  constructor(
    private readonly supernodeService: SupernodeService,
    private readonly supernodeSummeryService: SupernodeSummaryService,

    private readonly sNGlogbalPollService: SNGlogbalPollService,
    private readonly adminSupernodeService: AdminSupernodeService,
  ) {}

  @Get('sngps/active-pools')
  @Permissions([
    { action: [ACTION.READ], module: PERMISSION_MODULE.SUPER_NODE },
  ])
  async getSngps(
    @Query() paginateDTO: PaginateDTO,
    @Query('type') type: string,
  ) {
    paginateDTO.type = type === POOL_TYPE.SNGP ? type : POOL_TYPE.COUNTRY_POOL;
    const sngp =
      await this.sNGlogbalPollService.getCountryActivePools(paginateDTO); // Note: this function is used in platform API also
    return new ApiResponse(sngp);
  }

  @Get('sngps/distribute-rewards/:id')
  @Permissions([
    { action: [ACTION.READ], module: PERMISSION_MODULE.SUPER_NODE },
  ])
  async getDistributedRewards(
    @Query() paginateDTO: PaginateDTO,
    @Query('type') type: string,
    @Param('id') id: string,
  ) {
    paginateDTO.type = type === POOL_TYPE.SNGP ? type : POOL_TYPE.COUNTRY_POOL;
    const sngp = await this.sNGlogbalPollService.getDistributedRewards(
      paginateDTO,
      id,
    );
    return new ApiResponse(sngp);
  }

  @Get('sngps/upcoming-pools')
  async getCountryUpcomingPools(@Query() paginateDTO: PaginateDTO) {
    const result =
      await this.sNGlogbalPollService.getCountryUpcomingPools(paginateDTO);
    return new ApiResponse(result);
  }

  @Post('sngps')
  @Permissions([
    { action: [ACTION.WRITE], module: PERMISSION_MODULE.SUPER_NODE },
  ])
  async createSngp(@Req() req: any, @Body() sngpDto: SngpDto) {
    if (sngpDto.type === POOL_TYPE.SNGP) {
      sngpDto.name = POOL_TYPE.SNGP;
      sngpDto.startDate = new Date();
    } else {
      if (!sngpDto.name) {
        throw new HttpException(
          'Name should not be empty',
          HttpStatus.BAD_REQUEST,
        );
      }
      if (!sngpDto.startDate) {
        throw new HttpException(
          'Start date is required.',
          HttpStatus.BAD_REQUEST,
        );
      }
    }
    const sngp = await this.supernodeService.createSngp(req.admin, sngpDto);
    return new ApiResponse(sngp, `Pool created successfully.`);
  }

  @Get('sngps')
  @Permissions([
    { action: [ACTION.READ], module: PERMISSION_MODULE.SUPER_NODE },
  ])
  async getCountryPools(
    @Query() paginateDTO: PaginateDTO,
    @Query('type') type: POOL_TYPE,
  ) {
    paginateDTO.type = type === POOL_TYPE.SNGP ? type : POOL_TYPE.COUNTRY_POOL;
    const sngp = await this.sNGlogbalPollService.getSngps(paginateDTO);
    return new ApiResponse(sngp);
  }

  @Put('sngps/:id')
  @Permissions([
    { action: [ACTION.WRITE], module: PERMISSION_MODULE.SUPER_NODE },
  ])
  async updateSngp(
    @Body() updateSngpDto: UpdateSngpDto,
    @Param('id') id: string,
    @Req() req: any,
  ) {
    const sngp = await this.supernodeService.updateSngp(
      id,
      updateSngpDto,
      req.id,
    );
    return new ApiResponse(sngp, 'Pool has been successfully updated.');
  }

  @Delete('sngps/:id')
  @Permissions([
    { action: [ACTION.DELETE], module: PERMISSION_MODULE.PLATFORM },
  ])
  async deleteSngp(@Param('id') id: string): Promise<any> {
    const sngp = await this.supernodeService.deleteSngp(id);
    return new ApiResponse(sngp, 'Pool has been successfully deleted.');
  }

  @Get('base-referral/settings')
  @Permissions([
    { action: [ACTION.READ], module: PERMISSION_MODULE.SUPER_NODE },
  ])
  async getBaseReferralSettings() {
    const settings = await this.adminSupernodeService.getBaseReferralSettings();

    return new ApiResponse(settings);
  }

  @Post('base-referral/settings')
  @Permissions([
    { action: [ACTION.WRITE], module: PERMISSION_MODULE.SUPER_NODE },
  ])
  async createBaseRefSettings(@Body() settingsDto: CreateBasRefSettingDto) {
    const settings =
      await this.adminSupernodeService.createBaseReferralSetting(settingsDto);

    return new ApiResponse(settings);
  }

  // need to update the base referral setting
  @Put('base-referral/settings')
  @Permissions([
    { action: [ACTION.UPDATE], module: PERMISSION_MODULE.SUPER_NODE },
  ])
  async updateBaseRefSettings(@Body() settingsDto: CreateBasRefSettingDto) {
    const settings =
      await this.adminSupernodeService.updateBaseReferralSetting(settingsDto);
    return new ApiResponse(
      settings,
      'Base referral setting updated successfully.',
    );
  }

  @Post('builder-generation/settings')
  @Permissions([
    { action: [ACTION.WRITE], module: PERMISSION_MODULE.SUPER_NODE },
  ])
  async createBuilderGenerationSettings(
    @Req() req: any,
    @Body() settingsDto: CreateBuilderGenerationSettingDto,
  ) {
    const settings =
      await this.adminSupernodeService.createBuilderGenerationSettings(
        settingsDto,
        req.id,
      );

    return new ApiResponse(settings);
  }

  @Get('builder-generation/settings')
  @Permissions([
    { action: [ACTION.READ], module: PERMISSION_MODULE.SUPER_NODE },
  ])
  async getBuilderGenerationSettings() {
    const settings =
      await this.adminSupernodeService.getBuilderGenerationSettings();

    return new ApiResponse(settings);
  }

  @Put('builder-generation/settings')
  @Permissions([
    { action: [ACTION.UPDATE], module: PERMISSION_MODULE.SUPER_NODE },
  ])
  async updateBuilderGenerationSettings(
    @Body() updateDto: UpdateBuilderGenerationSettingDto,
  ) {
    const { productId, percentage } = updateDto;
    const updatedSetting =
      await this.adminSupernodeService.updateBuilderGenerationSettings(
        productId,
        percentage,
      );
    return new ApiResponse(
      updatedSetting,
      'Builder generation setting updated successfully.',
    );
  }

  @Post('builder-referral/settings')
  @Permissions([
    { action: [ACTION.WRITE], module: PERMISSION_MODULE.SUPER_NODE },
  ])
  async createBuilderReferralSettings(
    @Body() createBuilderReferralSettingsDto: CreateBuilderReferralSettingsDto,
  ) {
    const newSettings =
      await this.adminSupernodeService.createBuilderReferralSettings(
        createBuilderReferralSettingsDto,
      );

    return new ApiResponse(
      newSettings,
      'Builder referral settings have been successfully created.',
    );
  }

  @Get('builder-referral/settings')
  @Permissions([
    { action: [ACTION.READ], module: PERMISSION_MODULE.SUPER_NODE },
  ])
  async getBuilderReferralSettings() {
    const settings =
      await this.adminSupernodeService.getBuilderReferralSettings();

    return new ApiResponse(settings);
  }

  // put builder referral setting
  @Put('builder-referral/settings')
  @Permissions([
    { action: [ACTION.UPDATE], module: PERMISSION_MODULE.SUPER_NODE },
  ])
  async updateBuilderReferralSettings(
    @Body() createBuilderReferralSettingsDto: CreateBuilderReferralSettingsDto,
  ) {
    const updatedSettings =
      await this.adminSupernodeService.updateBuilderReferralSettings(
        createBuilderReferralSettingsDto,
      );

    return new ApiResponse(updatedSettings);
  }

  // Delete builder referral setting
  @Delete('builder-referral/settings/:id')
  @Permissions([
    { action: [ACTION.DELETE], module: PERMISSION_MODULE.SUPER_NODE },
  ])
  async deleteBuilderReferralSettings() {
    const deletedSettings =
      await this.adminSupernodeService.deleteBuilderReferralSettings();

    return new ApiResponse(deletedSettings);
  }

  @Post('sngp/distribute-reward')
  @Permissions([
    { action: [ACTION.READ], module: PERMISSION_MODULE.SUPER_NODE },
  ])
  async distributeSngpReward(
    @Req() req: any,
    @Body() distributionDto: DistributionDto,
  ) {
    const settings = await this.sNGlogbalPollService.distributeSngpReward(
      req.id,
      distributionDto,
    );

    return new ApiResponse(settings);
  }

  // Get matching bonus from the table builder generation setting
  @Get('matching-bonus/settings')
  @Permissions([
    { action: [ACTION.READ], module: PERMISSION_MODULE.SUPER_NODE },
  ])
  async getMatchingBonusSettings() {
    const newSettings =
      await this.adminSupernodeService.getMatchingBonusSettings();

    return new ApiResponse(
      newSettings,
      'Matching bonus settings have been successfully fetched.',
    );
  }

  //  POST THE MATCHING bonus into the table builder generation settings
  @Post('matching-bonus/settings')
  @Permissions([
    { action: [ACTION.WRITE], module: PERMISSION_MODULE.SUPER_NODE },
  ])
  async createMatchingBonusSettings(
    @Body() createMatchingBonusSettingDto: CreateMatchingBonusSettingDto,
  ) {
    const newSettings =
      await this.adminSupernodeService.createMatchingBonusSettings(
        createMatchingBonusSettingDto,
      );

    return new ApiResponse(
      newSettings,
      'Matching bonus settings have been successfully created.',
    );
  }

  @Post('gask/multiplier')
  @Permissions([
    { action: [ACTION.READ], module: PERMISSION_MODULE.SUPER_NODE },
  ])
  async createGaskSetting(
    @Body('multiplier') multiplier: number,
    @Body('status') status: STATUS_TYPE,
  ) {
    try {
      const newSetting = await this.supernodeService.createGaskSetting(
        multiplier,
        status,
      );

      return newSetting;
    } catch (error) {
      throw new HttpException(
        'Failed to create Sngp setting',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  @Get('gask/multiplier')
  @Permissions([
    { action: [ACTION.READ], module: PERMISSION_MODULE.SUPER_NODE },
  ])
  async getAllSngpSettings() {
    const data = await this.supernodeService.getAllSngpSettings();
    return new ApiResponse(data);
  }

  @Get('gask/multiplier:id')
  @Permissions([
    { action: [ACTION.READ], module: PERMISSION_MODULE.SUPER_NODE },
  ])
  async gaskSettings(@Req() req: any) {
    const data = await this.supernodeService.getGaskSetting(req.user.Id);
    return new ApiResponse(data);
  }

  @Put('gask/multiplier/:id')
  @Permissions([
    { action: [ACTION.UPDATE], module: PERMISSION_MODULE.SUPER_NODE },
  ])
  async updateSngpSetting(
    @Param('id') id: Types.ObjectId,
    @Body() updateData: { multiplier: number; status: STATUS_TYPE },
  ) {
    const updatedSetting = await this.supernodeService.updateGaskSetting(
      id,
      updateData,
    );

    return new ApiResponse(updatedSetting); // Return a structured response
  }

  @Delete('gask/multiplier/:id')
  @Permissions([
    { action: [ACTION.DELETE], module: PERMISSION_MODULE.SUPER_NODE },
  ])
  async deleteSngpSetting(@Param('id') id: Types.ObjectId) {
    const deletedSetting = await this.supernodeService.deleteSngpSetting(id);
    return new ApiResponse(deletedSetting);
  }

  @Get('transactions')
  @Permissions([
    { action: [ACTION.READ], module: PERMISSION_MODULE.SUPER_NODE },
  ])
  async getSuperNodeTransactions(
    @Query() paginateDTO: SupernodeTransactionDTO,
  ) {
    const superNodeTransactions =
      await this.supernodeService.getSuperNodeTransactions(paginateDTO);
    return new ApiResponse(superNodeTransactions);
  }

  @Get('transactions-summary')
  @Permissions([
    { action: [ACTION.READ], module: PERMISSION_MODULE.SUPER_NODE },
  ])
  async getSuperNodeBonusTransactions(
    @Query() paginateDTO: SupernodeTransactionDTO,
  ) {
    const superNodeTransactions =
      await this.supernodeService.getSuperNodeBonusTransactions(paginateDTO);
    return new ApiResponse(superNodeTransactions);
  }

  @Get('total-rewards')
  @Permissions([
    { action: [ACTION.READ], module: PERMISSION_MODULE.SUPER_NODE },
  ])
  async getSupernodeTotaRewards(@Query() paginateDTO: SupernodeTransactionDTO) {
    const superNodeTransactions =
      await this.supernodeService.getSupernodeTotaRewards(paginateDTO);
    return new ApiResponse(superNodeTransactions);
  }

  @Get('summary/transaction/:id')
  @Permissions([
    { action: [ACTION.READ], module: PERMISSION_MODULE.SUPER_NODE },
  ])
  async getUserTransaction(
    @Req() req: any,
    @Param('id') id: Types.ObjectId,
    @Query() query: GetBonusSummaryTransactionDto,
  ) {
    const userId = new Types.ObjectId(id);

    const result =
      await this.supernodeSummeryService.getUserBonusTransactionService(
        userId,
        query,
      );
    return new ApiResponse(result);
  }

  @Get('daily/reward/:id')
  @Permissions([
    { action: [ACTION.READ], module: PERMISSION_MODULE.SUPER_NODE },
  ])
  async getDailyRewards(@Req() req: any, @Param('id') id: Types.ObjectId) {
    const userId = new Types.ObjectId(id);
    const result = await this.supernodeService.getDailyRewards(userId);
    return new ApiResponse(result);
  }

  @Get('total-rewards-claimed/:id')
  @Permissions([
    { action: [ACTION.READ], module: PERMISSION_MODULE.SUPER_NODE },
  ])
  async getTotalClaimedRewards(
    @Req() req: any,
    @Param('id') id: Types.ObjectId,
  ) {
    const userObjectId = new Types.ObjectId(id);
    const result =
      await this.supernodeService.getTotalClaimedRewards(userObjectId);
    return new ApiResponse(result);
  }

  @Get('reward-summary/:id')
  @Permissions([
    { action: [ACTION.READ], module: PERMISSION_MODULE.SUPER_NODE },
  ])
  async getUserSnRewardSummary(
    @Param('id') id: Types.ObjectId,
    @Query('type') type: SN_BONUS_TYPE,
    @Query('period') period: TIME_PERIOD,
  ) {
    const userId = new Types.ObjectId(id);
    const result = await this.supernodeService.getUserSnRewardSummary(
      userId,
      type,
      period,
    );
    return new ApiResponse(result);
  }

  @Get('total-reward-summary/:id')
  @Permissions([
    { action: [ACTION.READ], module: PERMISSION_MODULE.SUPER_NODE },
  ])
  async getUserTotalSnRewardSummary(
    @Req() req: any,
    @Param('id') id: Types.ObjectId,
    @Query('period') period: TIME_PERIOD,
  ) {
    const userId = new Types.ObjectId(id);
    const result = await this.supernodeService.getUserTotalSnRewardSummary(
      userId,
      period,
    );
    return new ApiResponse(result);
  }

  @Get('reward/loss/:id')
  @Permissions([
    { action: [ACTION.READ], module: PERMISSION_MODULE.SUPER_NODE },
  ])
  async getCurrentLoss(
    @Req() req: any,
    @Param('id') id: Types.ObjectId,
    @Query('period') period: TIME_PERIOD,
  ) {
    const userId = new Types.ObjectId(id);
    const result = await this.supernodeService.getCurrentLoss(userId, period);
    return new ApiResponse(result);
  }

  @Get('reward-analytics/:id')
  @Permissions([
    { action: [ACTION.READ], module: PERMISSION_MODULE.SUPER_NODE },
  ])
  async getSupernodeRewardAnalytics(
    @Req() req: any,
    @Param('id') id: Types.ObjectId,
  ) {
    const userId = String(id);
    const result =
      await this.supernodeService.getSupernodeRewardsByUserId(userId);
    return new ApiResponse(result);
  }

  @Get('total-production-summary/:id')
  @Permissions([
    { action: [ACTION.READ], module: PERMISSION_MODULE.SUPER_NODE },
  ])
  async getUserTotalProducationSummary(
    @Req() req: any,
    @Param('id') id: Types.ObjectId,
    @Query('period') period: TIME_PERIOD,
  ) {
    const userId = new Types.ObjectId(id);
    const result = await this.supernodeService.getUserTotalProducationSummary(
      userId,
      period,
    );
    return new ApiResponse(result);
  }

  @Get('rewards/list/:id')
  async getSuperNodeRewards(
    @Req() req: any,
    @Param('id') id: Types.ObjectId,
    @Query() paginateDTO: PaginateDTO,
  ) {
    const userId = new Types.ObjectId(id);
    const paginatedSuperNodeReward =
      await this.supernodeService.getSuperNodeRewards(userId, paginateDTO);
    return new ApiResponse(
      paginatedSuperNodeReward,
      'Paginated rewards fetched successfully',
    );
  }

  @Get('summary/bonus/total/:id')
  @Permissions([
    { action: [ACTION.READ], module: PERMISSION_MODULE.SUPER_NODE },
  ])
  async getTotalBonusTransaction(
    @Req() req: any,
    @Param('id') id: Types.ObjectId,
    @Query() query: GetBonusSummaryTransactionDto,
  ) {
    const userId = new Types.ObjectId(id);
    const result = await this.supernodeSummeryService.getUserBonusTotalService(
      userId,
      query,
    );
    return new ApiResponse(result);
  }

  @Get('summary/bonus/report/:id')
  async getAllBonusReport(
    @Req() req: any,
    @Param('id') id: Types.ObjectId,
    @Query() query: GetBonusSummaryDto,
  ) {
    const userId = new Types.ObjectId(id);

    const result = await this.supernodeSummeryService.getBonusReportService(
      userId,
      query,
    );
    return new ApiResponse(result);
  }

  @Get('gask/balance/:id')
  async getGasKController(@Req() req: any, @Param('id') id: Types.ObjectId) {
    const userId = new Types.ObjectId(id);
    const result: any =
      await this.supernodeService.fetchGasKServiceAll_Yesterday(userId);
    return new ApiResponse({
      totalGaskAmout: result?.netTotal || 0,
      lastDay: result?.lastDay || { totalGaskAmout: 0 },
    });
  }
}
