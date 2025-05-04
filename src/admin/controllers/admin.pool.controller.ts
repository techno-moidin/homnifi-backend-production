import { ACTION, PERMISSION_MODULE } from '@/src/enums/permission';
import { CreateBuilderReferralSettingsDto } from '@/src/supernode/dto/builder-referral-settings.schema.dto';
import {
  CreateBasRefSettingDto,
  CreateBuilderGenerationSettingDto,
  DistributionDto,
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
import { SNGlogbalPollAdminService } from '@/src/supernode/sn-global-poll.admin.service';
import { PaginateDTO } from '../global/dto/paginate.dto';
import { DISTRIBUTION_STATUS_TYPE } from '@/src/supernode/enums/sngp-distribution.enum';
import { Types } from 'mongoose';
import { SNGlogbalPollService } from '@/src/supernode/sn-global-poll.service';
import { string } from 'zod';
import { TelegramNotificationInterceptor } from '@/src/interceptor/telegram.notification';

@Controller('admin/supernode')
@UseInterceptors(TelegramNotificationInterceptor)
@UseGuards(AdminGuard)
export class AdminSupernodePoolController {
  constructor(
    private readonly supernodeService: SupernodeService,
    private readonly sNGlogbalPollAdminService: SNGlogbalPollAdminService,
    private readonly sNGlogbalPollService: SNGlogbalPollService,
  ) {}

  @Get('sngp/list')
  @Permissions([
    { action: [ACTION.READ], module: PERMISSION_MODULE.SUPER_NODE },
  ])
  async getSngpList() {
    const sngp = await this.sNGlogbalPollAdminService.getSngpList();
    return new ApiResponse(sngp);
  }

  @Get('sngps/country-pools')
  @Permissions([
    { action: [ACTION.READ], module: PERMISSION_MODULE.SUPER_NODE },
  ])
  async getCountry(@Query() paginateDTO: PaginateDTO) {
    const sngp =
      await this.sNGlogbalPollAdminService.getCountryPools(paginateDTO);
    return new ApiResponse(sngp);
  }

  @Get('sngps/distribution-list')
  async getDistributionList(
    @Query()
    paginateDTO: PaginateDTO,
  ) {
    const result =
      await this.sNGlogbalPollService.getDistributionList(paginateDTO);
    return new ApiResponse(result);
  }

  @Get('sngps/distributed')
  async getDistributedList(
    @Query()
    paginateDTO: PaginateDTO,
  ) {
    const result =
      await this.sNGlogbalPollAdminService.getDistributedList(paginateDTO);
    return new ApiResponse(result);
  }

  @Get('sngps/distribution/status')
  async getSNGPDistributionStatus() {
    const result = await this.sNGlogbalPollService.getSNGPDistributionStatus();
    return new ApiResponse(result);
  }

  @Get('first-sngp')
  async getFirstSngp() {
    return await this.sNGlogbalPollAdminService.findFirstSngp();
  }

  @Get('sngp/distrubtion')
  async getAllSngpDistributions() {
    return await this.sNGlogbalPollAdminService.findAllSngpDistributions();
  }

  @Get('sngp/distrubted')
  async getAllSngpDistributed() {
    return await this.sNGlogbalPollAdminService.findAllSngpDistributed();
  }
}
