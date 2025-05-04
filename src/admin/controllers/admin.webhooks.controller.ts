import {
  CreateUserMachineDto,
  CreateUserMachineV2Dto,
} from '@/src/cloud-k/dto/cloudk.dto';
import { UsersService } from '@/src/users/users.service';
import { AppRequest } from '@/src/utils/app-request';
import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Post,
  Req,
  UseGuards,
  Param,
  Query,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AdminService } from '../admin.service';
import { CloudKService } from '@/src/cloud-k/cloud-k.service';
import ApiResponse from '@/src/utils/api-response.util';
import { CreateDepositDto } from '@/src/wallet/dto/create-depost.dto';
import { WalletService } from '@/src/wallet/wallet.service';
import { WebhookGuard } from '../auth/guards/webhook.guard';
import { WithdrawCallbackDto } from '@/src/wallet/dto/withdraw-callback-dto';
import { ExternalAppRequestStatus } from '@/src/wallet/enums/external-app-request-status.enum';
import { CreateNotificationByBidDto } from '@/src/notification/dto/create.notification.by.bid.dto';
import { TasksService } from '@/src/tasks/tasks.service';
import { CLOUDK_JOBS_STATUS } from '@/src/cloud-k/schemas/cloudk-reward-job.schema';
import { BuilderReferralService } from '@/src/supernode/builder-referral.service';
import { AdminGuard } from '../auth/guards/admin.guard';
import { WithdrawSettingsDTO } from '../global/dto/paginate.dto';
import { TokenService } from '@/src/token/token.service';
import { ClaimRewardsDto } from '@/src/wallet/dto/claim_rewards.dto.dto';
import { CacheService } from '@/src/cache/cache.service';
import { SupernodeService } from '@/src/supernode/supernode.service';

@Controller('webhooks')
export class WebhookController {
  constructor(
    private readonly walletService: WalletService,
    private readonly cloudKService: CloudKService,
    private readonly userService: UsersService,
    private readonly adminService: AdminService,
    private readonly taskService: TasksService,
    private readonly configService: ConfigService,
    private readonly builderReferralService: BuilderReferralService,
    private readonly tokenService: TokenService,
    private readonly cacheService: CacheService,
    private readonly superNodeService: SupernodeService,
  ) {}

  @Post('wallets/withdraws/callback')
  // @UseGuards(WebhookGuard('WS_HOMNIFI_SECRET_KEY'))
  async withdrawCallback(
    @Req() req: AppRequest,
    @Body() withdrawCallbackDto: WithdrawCallbackDto,
  ) {
    const webhook = await this.adminService.createWebhook({
      path: req.path,
      name: 'Withdraw Callback',
      payload: withdrawCallbackDto,
    });
    try {
      const isAccepted =
        withdrawCallbackDto.status === ExternalAppRequestStatus.COMPLETED;
      if (isAccepted) {
        const { requestId, txHash } = withdrawCallbackDto;
        await this.walletService.acceptWithdraw(requestId, txHash);
      } else if (!isAccepted) {
        await this.walletService.rejectWithdraw(withdrawCallbackDto.requestId);
      }
    } catch (error) {
      this.adminService.setWebhookStatus(
        webhook._id,
        true,
        JSON.stringify({
          message: error.message,
          stack: error.stack,
          name: error.name,
        }),
      );
      throw error;
    }
    this.adminService.setWebhookStatus(webhook._id, false);
    return new ApiResponse('Withdraw callback received successfully');
  }

  @Post('wallets/deposits')
  @UseGuards(WebhookGuard('WS_HOMNIFI_SECRET_KEY'))
  async newDeposit(
    @Req() req: AppRequest,
    @Body() createDepositDto: CreateDepositDto,
  ) {
    const webhook = await this.adminService.createWebhook({
      path: req.path,
      name: 'Deposit Webhook',
      payload: createDepositDto,
    });

    try {
      const { status }: any =
        await this.walletService.newDeposit(createDepositDto);
      if (!status)
        throw new HttpException(
          'The amount should be greater than minimum amount. ',
          400,
        );
    } catch (error) {
      this.adminService.setWebhookStatus(
        webhook._id,
        true,
        JSON.stringify({
          message: error.message,
          stack: error.stack,
          name: error.name,
        }),
      );
      throw error;
    }
    this.adminService.setWebhookStatus(webhook._id, false);
    return new ApiResponse('Deposit created successfully');
  }

  @Post('wallets/claim_rewards')
  @UseGuards(WebhookGuard('HOMNIFI_CLOUDK_SECRET_KEY'))
  async claimRewards(@Body() claimRewardsDto: ClaimRewardsDto) {
    const data = await this.cloudKService.newClaimRewards(claimRewardsDto);
    return new ApiResponse(data);
  }

  @Post('cloud-k/machines')
  @UseGuards(WebhookGuard('HORYS_HOMNIFI_SECRET_KEY'))
  async createMachine(
    @Req() req: AppRequest,
    @Body() createMachineDto: CreateUserMachineDto,
  ) {
    const webhook = await this.adminService.createWebhook({
      path: req.path,
      name: '',
      payload: createMachineDto,
    });

    const maxRetries = 3;
    let attempt = 0;
    let result;
    while (attempt < maxRetries) {
      try {
        result = await this.cloudKService.createNewMachineV2(
          createMachineDto.productId,
          createMachineDto.userBid,
          1,
          null,
          null,
        );
        // await this.cloudKService.createNewMachine(
        //   createMachineDto.productId,
        //   createMachineDto.userBid,
        // );
        break; // If successful, break out of the loop
      } catch (error) {
        if (attempt < maxRetries - 1) {
          attempt++;
        } else {
          this.adminService.setWebhookStatus(
            webhook._id,
            true,
            JSON.stringify({
              message: error.message,
              stack: error.stack,
              name: error.name,
            }),
          );
          throw error;
        }
      }
    }

    this.adminService.setWebhookStatus(webhook._id, false);

    return new ApiResponse(`Machine Added - ${result[0]}`);
  }

  @Post(`cloud-k/machines/v2`)
  @UseGuards(WebhookGuard('HORYS_HOMNIFI_SECRET_KEY'))
  async createMachines(
    @Req() req: AppRequest,
    @Body() createMachineDto: CreateUserMachineV2Dto,
  ) {
    const webhook = await this.adminService.createWebhook({
      path: req.path,
      name: 'Purchase Machine Webhook',
      payload: createMachineDto,
    });

    const maxRetries = 1;
    let attempt = 0;
    let result;
    while (attempt < maxRetries) {
      try {
        result = await this.cloudKService.createNewMachineV2(
          createMachineDto.productId,
          createMachineDto.userBid,
          createMachineDto.quantity,
          createMachineDto.orderId,
          createMachineDto.idempotencyKey,
          createMachineDto.platform,
        );
        break; // If successful, break out of the loop
      } catch (error) {
        if (attempt < maxRetries - 1) {
          attempt++;
        } else {
          this.adminService.setWebhookStatus(
            webhook._id,
            true,
            JSON.stringify({
              message: error.message,
              stack: error.stack,
              name: error.name,
            }),
          );
          throw error;
        }
      }
    }

    this.adminService.setWebhookStatus(webhook._id, false);

    return new ApiResponse(result, 'Machine Added Successfully');
  }

  @Get('cloud-k/boost')
  @UseGuards(WebhookGuard('HORYS_HOMNIFI_SECRET_KEY'))
  async getCurrentBoostForMachines(@Req() req: AppRequest) {
    const data = await this.cloudKService.getCurrentBoostForMachines();
    return new ApiResponse(data);
  }

  @Get('users/import-user-tree')
  @UseGuards(WebhookGuard('HORYS_HOMNIFI_SECRET_KEY'))
  async getExportUserList(@Body('bids') bids: string[] | null) {
    const data = await this.taskService.runUserImport(bids);
    return new ApiResponse(data, 'Users tree details retrieved successfully');
  }

  @Post('machines/update-date')
  @UseGuards(WebhookGuard('HORYS_HOMNIFI_SECRET_KEY'))
  async updateMachineDate() {
    const data = await this.cloudKService.updateMachineDate();
    return new ApiResponse(data, 'Machine Date updated successfully');
  }

  @Get('rewards/run')
  @UseGuards(WebhookGuard('HORYS_HOMNIFI_SECRET_KEY'))
  async runRewards(
    @Req() req: AppRequest,
    @Query('bid') bid: any,
    @Query('price') price: any,
  ) {
    const lastJob = await this.cloudKService.checkLastJob();
    if (lastJob && lastJob.status === CLOUDK_JOBS_STATUS.INITIATED) {
      throw new HttpException('Wait for previous job to complete', 400);
    }
    // Resetting the cache before running the rewards job
    // await this.cacheService.resetCache();
    this.taskService.runRewards(bid, price);
    return new ApiResponse('Rewards job inititiated');
  }

  @Get('rewards/run/user-producation')
  @UseGuards(WebhookGuard('HORYS_HOMNIFI_SECRET_KEY'))
  async runProducationRewards(
    @Req() req: AppRequest,
    @Query('bid') bid: any,
    @Query('price') price: any,
  ) {
    const data = await this.superNodeService.userActiveProducation();
    const data2 = await this.superNodeService.userActiveSuperNode();

    this.taskService.runRewards(bid, price);
    return new ApiResponse('Rewards job inititiated');
  }

  @Get('rewards/run/user-supernode')
  @UseGuards(WebhookGuard('HORYS_HOMNIFI_SECRET_KEY'))
  async runProducationSupernode(
    @Req() req: AppRequest,
    @Query('bid') bid: any,
    @Query('price') price: any,
  ) {
    this.taskService.processSuperNodeRewards(bid);
    return new ApiResponse('Rewards job inititiated');
  }

  @Get('import/user-hierarchy')
  @UseGuards(WebhookGuard('HORYS_HOMNIFI_SECRET_KEY'))
  async AddUserHierarchyToRedis() {
    const data = await this.taskService.AddUserHierarchyToRedis();
    return new ApiResponse('User Hierarchy data added to Redis successfully');
  }

  @Get('builder-referral/run')
  @UseGuards(WebhookGuard('HORYS_HOMNIFI_SECRET_KEY'))
  async runBuilderRefferalEligibility() {
    const response =
      await this.builderReferralService.genarateBuilderRefferalEligibility();
    return new ApiResponse(response);
  }
}
