import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  Req,
  Request,
  Res,
  UnauthorizedException,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { CloudKService } from '@/src/cloud-k/cloud-k.service';
import {
  CloudKSettingsDto,
  CreateAutoCompoundPenaltyDto,
  CreateUserMachineDto,
  InflationRulesDto,
  MachineAutoCompoundDto,
} from '@/src/cloud-k/dto/cloudk.dto';
import { UsersService } from '@/src/users/users.service';
import { CloudKRewardService } from '@/src/cloud-k/cloudk-reward.service';
import ApiResponse from '@/src/utils/api-response.util';
import { AppRequest } from '@/src/utils/app-request';
import { InjectModel } from '@nestjs/mongoose';
import { AdminService } from '../admin.service';
import {
  CreateCloudKProductDto,
  CreateCloudKProductGen2RewardPercentageDto,
} from '@/src/cloud-k/dto/create-product.dto';
import { CloudKSimulationDto } from '../dto/cloudk-simulation.dto';
import { Types } from 'mongoose';
import {
  CloudKFilterDTO,
  MachineFilterDTO,
  PaginateDTO,
  ProductPaginateDTO,
  PromotionDTO,
} from '../global/dto/paginate.dto';
import { CreateCloudKOverrideBoostDto } from '@/src/cloud-k/dto/cloudk-overrride-boost.dto';
import { CloudKSimulationService } from '@/src/cloud-k/cloudk-simulation.service';
import { CloudKKillSettingDTO } from '@/src/cloud-k/dto/cloudk-kill-settings.dto';
import { AdminGuard } from '../auth/guards/admin.guard';
import { Permissions } from '../auth/decorators/permissions';
import { ACTION, PERMISSION_MODULE } from '@/src/enums/permission';
import { updateCloudKGlobalPoolDto } from '@/src/cloud-k/dto/cloudk-product-globalpool';
import { CloudKTransactionTypes } from '@/src/cloud-k/schemas/cloudk-transactions.schema';
import { AdminCloudkService } from '../admin.cloudk.service';
import { TelegramNotificationInterceptor } from '@/src/interceptor/telegram.notification';
import { CreatePromotionDto, PromotionStatusDto } from '../dto/promotion.dto';
import { CreateProductPromotionDto } from '../dto/promotion.dto';
import { AdditionalMintingPromotionStatus } from '../schemas/additional-minting-promotion.schema';
import { UpdatePromotionAndSettingsDto } from '../dto/promotion.dto';

@Controller('admin/cloud-k')
// @Roles(UserRoleEnum.ADMIN)

@UseGuards(AdminGuard)
@UseInterceptors(TelegramNotificationInterceptor)
export class AdminCloudKController {
  constructor(
    private readonly cloudKService: CloudKService,
    private readonly userService: UsersService,
    private readonly cloudkRewardsService: CloudKRewardService,
    private readonly cloudkSimulationService: CloudKSimulationService,
    private readonly adminService: AdminService,
    private readonly adminCloudkService: AdminCloudkService,
  ) {}

  @Get('inflation-rules')
  @Permissions([{ action: [ACTION.READ], module: PERMISSION_MODULE.CLOUDK }])
  async getCurrentInflationRules() {
    const rules = await this.cloudKService.getCurrentInflationRulesData();
    return new ApiResponse(rules);
  }

  @Get('inflation-rules/history')
  @Permissions([{ action: [ACTION.READ], module: PERMISSION_MODULE.CLOUDK }])
  async getInflationRulesHistory() {
    const data = await this.cloudKService.getInflationRulesHistory();
    return new ApiResponse(data);
  }

  @Post('inflation-rules')
  async createInflationRules(@Body() inflationRulesDto: InflationRulesDto) {
    const data =
      await this.cloudKService.createInflationRules(inflationRulesDto);
    return new ApiResponse(data);
  }

  @Post('tokens/settings')
  @Permissions([{ action: [ACTION.WRITE], module: PERMISSION_MODULE.CLOUDK }])
  async createNewCloudKSettings(@Body() cloudKSettingsDto: CloudKSettingsDto) {
    const data =
      await this.cloudKService.createNewCloudKSettings(cloudKSettingsDto);
    return new ApiResponse(data);
  }

  @Get('products')
  @Permissions([{ action: [ACTION.READ], module: PERMISSION_MODULE.CLOUDK }])
  async findAllProducts(
    @Req() req: any,
    @Query() paginateDTO: ProductPaginateDTO,
  ) {
    const data = await this.cloudKService.getAllProductsWithSort(paginateDTO);
    return new ApiResponse(data);
  }

  @Get('products/options')
  @Permissions([{ action: [ACTION.READ], module: PERMISSION_MODULE.CLOUDK }])
  async getAllCloudkProducts() {
    const data = await this.cloudKService.getAllProducts2();
    return new ApiResponse(data);
  }

  @Get('products/:id')
  @Permissions([{ action: [ACTION.READ], module: PERMISSION_MODULE.CLOUDK }])
  async findProductById(@Param('id') productId: Types.ObjectId) {
    const data = await this.cloudKService.findProductById(productId);
    return new ApiResponse(data);
  }

  @Post('products')
  @Permissions([{ action: [ACTION.WRITE], module: PERMISSION_MODULE.CLOUDK }])
  async createProduct(@Body() createCloudKProductDto: CreateCloudKProductDto) {
    const data = await this.cloudKService.createProduct(createCloudKProductDto);
    return new ApiResponse(data);
  }

  @Put('products/:id')
  @Permissions([{ action: [ACTION.UPDATE], module: PERMISSION_MODULE.CLOUDK }])
  async updateProducts(
    @Param('id') productId: string,
    @Body() updateCloudKProductDto: CreateCloudKProductDto,
  ) {
    const data = await this.cloudKService.updateProductById(
      productId,
      updateCloudKProductDto,
    );
    return new ApiResponse(data, 'Product updated successfully');
  }

  @Get('rewards')
  @Permissions([{ action: [ACTION.READ], module: PERMISSION_MODULE.CLOUDK }])
  async getOverallUserTotalRewards() {
    const data = await this.cloudKService.getOverallUserTotalRewards();
    return new ApiResponse(data);
  }

  @Get('ac-penalty')
  @Permissions([{ action: [ACTION.READ], module: PERMISSION_MODULE.CLOUDK }])
  async getAcPenaltyHistory() {
    const data = await this.cloudKService.getAcPenaltyHistory();
    return new ApiResponse(data);
  }

  @Post('ac-penalty')
  @Permissions([{ action: [ACTION.WRITE], module: PERMISSION_MODULE.CLOUDK }])
  async createAcPenalty(@Body() acPenlatyDto: CreateAutoCompoundPenaltyDto) {
    const data = await this.cloudKService.createAcPenalty(
      acPenlatyDto.percentage,
    );
    return new ApiResponse(data);
  }

  @Get('simulation-machines')
  @Permissions([{ action: [ACTION.READ], module: PERMISSION_MODULE.CLOUDK }])
  async getSimulationMachinesList(@Query() paginateDTO: PaginateDTO) {
    const data =
      await this.cloudKService.getSimulationMachinesList(paginateDTO);
    return new ApiResponse(data);
  }

  @Post('test-simulation')
  @Permissions([{ action: [ACTION.READ], module: PERMISSION_MODULE.CLOUDK }])
  async createTestSimulation(@Body() testSimulationDto: CloudKSimulationDto) {
    const data =
      await this.cloudkSimulationService.runSimulation(testSimulationDto);

    return new ApiResponse(data, 'Simulation Created');
  }

  @Get('user-machines')
  @Permissions([{ action: [ACTION.READ], module: PERMISSION_MODULE.CLOUDK }])
  async getUserMachinesList(@Query() paginateDTO: MachineFilterDTO) {
    const data = await this.cloudKService.getAllUserMachinesListv2(paginateDTO);
    return new ApiResponse(data);
  }

  @Get('rewards/cronjobs')
  @Permissions([{ action: [ACTION.READ], module: PERMISSION_MODULE.CLOUDK }])
  async getDailyCronjobData(
    @Query() paginateDTO: PaginateDTO,
    @Query('status') status?: string,
  ) {
    const data = await this.cloudKService.getDailyCronjobData(
      paginateDTO,
      status,
    );
    return new ApiResponse(data);
  }

  @Get('user-machines/details/:id')
  @Permissions([{ action: [ACTION.READ], module: PERMISSION_MODULE.CLOUDK }])
  async getUserMachineDetails(@Param('id') machineId: Types.ObjectId) {
    const data = await this.cloudKService.getMachineDetails(machineId);
    return new ApiResponse(data);
  }

  @Get('user-machines/rewards/:id')
  @Permissions([{ action: [ACTION.READ], module: PERMISSION_MODULE.CLOUDK }])
  async getUserMachineRewards(
    @Param('id') machineId: string,
    @Query('page') page,
    @Query('limit') limit,
    @Query('search') search,
    @Query('date') date,
    @Query('status') status,
  ) {
    const data = await this.cloudKService.getAdminUserMachineRewards(
      machineId,
      { page, limit, search: search || '', status, date },
    );
    return new ApiResponse(data);
  }

  @Get('boost')
  @Permissions([{ action: [ACTION.READ], module: PERMISSION_MODULE.CLOUDK }])
  async getCurrentBoost() {
    const data = await this.cloudKService.getCurrentBoostForMachines();
    return new ApiResponse(data);
  }

  @Post('boost/override')
  @Permissions([{ action: [ACTION.WRITE], module: PERMISSION_MODULE.CLOUDK }])
  async overrideBoost(@Body() createBoostDto: CreateCloudKOverrideBoostDto) {
    const data = await this.cloudKService.createBoostOverride(createBoostDto);
    return new ApiResponse(data);
  }

  // TODO:
  // kill switch for cloudk
  // - stop add stake
  // - stop claim
  // - stop buy now
  // - stop cronjob
  @Get('settings')
  @Permissions([{ action: [ACTION.READ], module: PERMISSION_MODULE.CLOUDK }])
  async getCurrentKillSettings() {
    const settings = await this.cloudKService.getCurrentKillSettings();
    return new ApiResponse(settings);
  }

  @Post('settings')
  @Permissions([{ action: [ACTION.WRITE], module: PERMISSION_MODULE.CLOUDK }])
  async addKillSettings(
    @Body() killSettings: CloudKKillSettingDTO,
    @Req() req: AppRequest,
  ) {
    const settings = await this.cloudKService.addKillSettings(
      killSettings,
      req.admin.id,
    );
    return new ApiResponse(settings);
  }

  @Delete('user-machines/:id')
  @Permissions([{ action: [ACTION.DELETE], module: PERMISSION_MODULE.CLOUDK }])
  async terminateMachine(
    @Param('id') machineId: string,
    @Req() req: AppRequest,
  ) {
    await this.cloudKService.terminateMachine(machineId);
    return new ApiResponse('Machine terminated successfully');
  }

  @Put('products/global-pool/:id')
  @Permissions([{ action: [ACTION.UPDATE], module: PERMISSION_MODULE.CLOUDK }])
  async updateProductsGlobalPool(
    @Param('id') productId: string,
    @Body() updateCloudKGlobalPoolDto: updateCloudKGlobalPoolDto,
  ) {
    const data = await this.cloudKService.updateGlobalPoolById(
      productId,
      updateCloudKGlobalPoolDto,
    );
    return new ApiResponse(data, 'Global Pool updated successfully');
  }

  @Get('cloudk-transactions-summary')
  @Permissions([{ action: [ACTION.READ], module: PERMISSION_MODULE.CLOUDK }])
  async getCloudKTransactions(@Query() paginateDTO: CloudKFilterDTO) {
    console.log(paginateDTO);
    const stats =
      await this.adminCloudkService.getCloudKTransactionsStatsv3(paginateDTO);
    return new ApiResponse(stats, 'All transactions retrieved successfully');
  }

  @Get('cloudk-transactions')
  @Permissions([{ action: [ACTION.READ], module: PERMISSION_MODULE.CLOUDK }])
  async getAllTransactions(
    @Query() paginateDTO: PaginateDTO,
    @Query('machine') machine?: string,
    @Query('token') token?: string,
    @Query('type') type?: CloudKTransactionTypes,
    @Query('fromDate') from?: string,
    @Query('toDate') to?: string,
    @Query('query') query?: string,
    @Query('product') product?: string,
  ) {
    const data = await this.adminCloudkService.getAllTransactions(paginateDTO, {
      machine,
      token,
      type,
      from,
      to,
      query,
      product,
    });
    return data;
  }

  @Get('get-all-inflation-rules')
  async getAllInflationRules() {
    const data = await this.cloudKService.getAllInflationRules();
    return new ApiResponse(data);
  }

  @Get('get-user-inflation-rules')
  async getUserInflationRules(
    @Query('machine') machine: string,
    @Query('reward') reward: string,
    @Query('userId') userId: string,
  ) {
    const data = await this.cloudKService.getUserInflationRules(
      new Types.ObjectId(userId),
      new Types.ObjectId(machine),
      new Types.ObjectId(reward),
    );
    return new ApiResponse(data);
  }

  //

  @Post('products/gen/reward')
  @Permissions([{ action: [ACTION.WRITE], module: PERMISSION_MODULE.CLOUDK }])
  async createProductGen2RewardPercentage(
    @Req() req: AppRequest,
    @Body()
    updateProductGen2RewardDto: CreateCloudKProductGen2RewardPercentageDto,
  ) {
    const adminId = req.admin.id;
    const data = await this.cloudKService.createProductGen2RewardPercentage(
      updateProductGen2RewardDto,
      adminId,
    );
    return new ApiResponse(data, 'Product updated successfully');
  }

  @Get('products/gen/percentage/history/:id')
  @Permissions([{ action: [ACTION.WRITE], module: PERMISSION_MODULE.CLOUDK }])
  async getProductGen2RewardPercentageHistory(
    @Param('id') id: string,
    @Query() paginateDTO: PaginateDTO,
  ) {
    const { page, limit } = paginateDTO;
    const data = await this.cloudKService.getProductGen2RewardPercentageHistory(
      new Types.ObjectId(id),
      page,
      limit,
    );
    return new ApiResponse(data, 'Product fetched successfully');
  }

  @Get('additional-minting/promotions')
  @Permissions([{ action: [ACTION.READ], module: PERMISSION_MODULE.CLOUDK }])
  async getAllPromotions(@Query() paginateDTO: PromotionDTO) {
    const data = await this.adminCloudkService.getAllPromotions(paginateDTO);

    return new ApiResponse(data, 'promotions fetched successfully');
  }

  @Post('additional-minting/create-promotion')
  @Permissions([{ action: [ACTION.WRITE], module: PERMISSION_MODULE.CLOUDK }])
  async createPromotion(@Body() createPromotionDto: CreatePromotionDto) {
    const data =
      await this.adminCloudkService.createPromotion(createPromotionDto);
    return new ApiResponse(data, 'promotions created successfully');
  }

  @Patch('additional-minting/promotions/:id')
  @Permissions([{ action: [ACTION.UPDATE], module: PERMISSION_MODULE.CLOUDK }])
  async updatePromotionAndSettings(
    @Req() req: AppRequest,
    @Param('id') id: string,
    @Body() updateDto: UpdatePromotionAndSettingsDto,
  ) {
    const adminId = req?.admin?.id || '';

    const result = await this.adminCloudkService.updatePromotionAndSettings(
      id,
      updateDto,
      adminId,
    );

    const promotionUpdated =
      updateDto.promotionName !== undefined ||
      updateDto.startDate !== undefined ||
      updateDto.endDate !== undefined ||
      updateDto.status !== undefined;

    const settingsUpdated =
      updateDto.productSettings && updateDto.productSettings.length > 0;

    let message = '';

    if (promotionUpdated && settingsUpdated) {
      message = `Promotion and ${result.settingsResults.updated} product settings updated successfully`;
      if (result.settingsResults.failed.length > 0) {
        message += `. ${result.settingsResults.failed.length} product settings failed to update.`;
      }
    } else if (promotionUpdated) {
      message = 'Promotion updated successfully';
    } else if (settingsUpdated) {
      message = `${result.settingsResults.updated} product settings updated successfully`;
      if (result.settingsResults.failed.length > 0) {
        message += `. ${result.settingsResults.failed.length} product settings failed to update.`;
      }
    }

    if (updateDto.status === AdditionalMintingPromotionStatus.STOPPED) {
      message = `Promotion stopped successfully. ${result.settingsResults.updated} product settings updated.`;
    } else if (updateDto.status === AdditionalMintingPromotionStatus.ACTIVE) {
      message = `Promotion activated successfully. ${result.settingsResults.updated} product settings updated.`;
    }

    return new ApiResponse(result, message);
  }

  @Delete('additional-minting/delete-promotion/:id')
  @Permissions([{ action: [ACTION.DELETE], module: PERMISSION_MODULE.CLOUDK }])
  async remove(@Req() req: AppRequest, @Param('id') id: string) {
    const adminId = req?.admin?.id || '';

    const data = await this.adminCloudkService.removePromotion(id, adminId);
    return new ApiResponse(data, 'promotions deleted successfully');
  }

  @Post('additional-minting/promotions/create-product-promotion')
  @Permissions([{ action: [ACTION.WRITE], module: PERMISSION_MODULE.CLOUDK }])
  async createProductPromotionSchema(
    @Body() createDto: CreateProductPromotionDto,
  ) {
    const productPromotion =
      await this.adminCloudkService.createProductPromotion(createDto);

    return new ApiResponse(
      productPromotion,
      'Product promotion created successfully',
    );
  }

  @Get('additional-minting/promotions/:id')
  @Permissions([{ action: [ACTION.READ], module: PERMISSION_MODULE.CLOUDK }])
  async getProductsByPromotion(@Param('id') id: string) {
    const result = await this.adminCloudkService.getProductsByPromotion(id);

    return new ApiResponse(
      result,
      'Addetional settings for all products assosciated to the promotion retreived succesfully',
    );
  }

  @Put('additional-minting/promotions/status/:id')
  @Permissions([{ action: [ACTION.READ], module: PERMISSION_MODULE.CLOUDK }])
  async stopProductByPromotion(
    @Req() req: AppRequest,
    @Param('id') id: string,
    @Body() promotionStatusDto: PromotionStatusDto,
  ) {
    const adminId = req?.admin?.id || '';

    const data = await this.adminCloudkService.promotionStatusUpdate(
      id,
      promotionStatusDto,
      adminId,
    );
    return new ApiResponse(
      data,
      `promotions ${promotionStatusDto.status} successfully`,
    );
  }
  @Get('all-products')
  @Permissions([{ action: [ACTION.READ], module: PERMISSION_MODULE.CLOUDK }])
  async findAllPromotionProducts(@Req() req: any) {
    const data = await this.cloudKService.getAllProducts();
    return new ApiResponse(data);
  }
}
