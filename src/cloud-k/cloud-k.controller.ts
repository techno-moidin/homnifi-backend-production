import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PaginateDTO } from '../admin/global/dto/paginate.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DateFilter } from '../global/enums/date.filter.enum';
import { User } from '../users/schemas/user.schema';
import ApiResponse from '../utils/api-response.util';
import { AppRequest } from '../utils/app-request';
import { CloudKDepositV4Service } from './cloud-k-deposit-v4.service';
import { CloudKDepositService } from './cloud-k-deposit.service';
import { CloudKService } from './cloud-k.service';
import {
  GetUserMachineDto,
  GlobalAutoCompoundDto,
  MachineAutoCompoundDto,
  StakeTokensDto,
} from './dto/cloudk.dto';
import { CloudKTransactionTypes } from './schemas/cloudk-transactions.schema';
import { throwError } from 'rxjs';
import {
  MachineActiveStatusDto,
  MachineConnectDto,
} from './dto/machine-connect.dto';
import { CloudKCommunicationService } from './cloudk-communication.service';
@UseGuards(JwtAuthGuard)
@Controller('cloud-k')
export class CloudKController {
  constructor(
    private readonly cloudKService: CloudKService,
    private readonly cloudKDepositV4Service: CloudKDepositV4Service,
    private readonly cloudKDepositService: CloudKDepositService,
    private readonly cloudKCommunicationService: CloudKCommunicationService,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  @Get('price')
  async getCurrentPrice() {
    const data = await this.cloudKService.getCurrentPrice('CLFIUSDT');
    return new ApiResponse(data);
  }

  @Get('machines')
  async userMachinesData(
    @Req() req: any,
    @Query() getUserMachineDto: GetUserMachineDto,
  ) {
    const data = await this.cloudKService.getUserMachinesData(
      req.user.userId,
      getUserMachineDto,
    );
    return new ApiResponse(data);
  }

  @Get('machines/campaign-banner')
  async getUserMachinesCampaign(@Req() req: any) {
    const data = await this.cloudKService.getUserMachinesCampaign({
      userId: req.user.userId,
    });
    return new ApiResponse(data);
  }

  @Get('auto-compound')
  async getUserGlobalAutoComplete(@Req() req: any) {
    const data = await this.cloudKService.getUserGlobalAutoComplete(
      req.user.userId,
    );
    return new ApiResponse(data);
  }

  @Post('auto-compound')
  async setUserGlobalAutoCompound(
    @Req() req: any,
    @Body() globalAutoCompoundDto: GlobalAutoCompoundDto,
  ) {
    const data = await this.cloudKService.setUserGlobalAutoCompound(
      req.user.userId,
      globalAutoCompoundDto.enabled,
    );
    return new ApiResponse(data);
  }

  @Get('machines/details')
  async getMachineDetails(
    @Req() req: any,
    @Query('machine') machine: Types.ObjectId,
  ) {
    const data = await this.cloudKService.getMachineDetails(machine);
    return new ApiResponse(data);
  }

  @Post('machines/auto-compound')
  async setMachineAutoCompound(
    @Req() req: AppRequest,
    @Body() machineAutoCompoundDto: MachineAutoCompoundDto,
  ) {
    const data = await this.cloudKService.setMachineAutoCompound(
      req.user.userId,
      machineAutoCompoundDto.machine,
      machineAutoCompoundDto.enabled,
    );
    return new ApiResponse(data);
  }

  @Post('claim')
  async claimRewards(@Req() req: AppRequest) {
    // return throwError('Work in Progress . You can claim  after some times');
    const data = await this.cloudKService.claimRewards(req.user.userId);
    return new ApiResponse(data);
  }

  @Post('machines/stake')
  async stakeIntoMachine(
    @Req() req: AppRequest,
    @Body() stakeDto: StakeTokensDto,
  ) {
    const data = await this.cloudKService.stakeIntoMachine(
      String(stakeDto.machine),
      req.user.userId,
      stakeDto.amount,
    );
    return new ApiResponse(data);
  }

  @Get('machines/purchased')
  async isUserMachinePurshaed(@Req() req: AppRequest) {
    const data = await this.cloudKService.userMachinePurshaed(req.user.userId);
    return new ApiResponse(data);
  }

  @Get('boost')
  async getCurrentBoostForMachines() {
    const data = await this.cloudKService.getCurrentBoostForMachines();
    return new ApiResponse(data);
  }

  @Get('products')
  async findAllProducts() {
    const data = await this.cloudKService.getAllProducts2();
    return new ApiResponse(data);
  }

  @Get('rewards')
  async getUserTotalRewards(@Req() req: AppRequest) {
    const data = await this.cloudKService.getUserTotalRewards(req.user.userId);
    return new ApiResponse(data);
  }

  @Get('rewards/lifetime')
  async getUserTotalRewardsLifeTme(@Req() req: AppRequest) {
    const data = await this.cloudKService.getUserTotalRewardsResult(
      req.user.userId,
    );
    return new ApiResponse(data);
  }

  @Get('rewards/claimable')
  async getUserTotalRewardsClaimable(@Req() req: AppRequest) {
    const data = await this.cloudKService.getUserClaimTotalRewardsResult(
      req.user.userId,
    );
    return new ApiResponse(data);
  }

  @Get('machines/rewards')
  async getUserMachineRewards(
    @Req() req: AppRequest,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('date') date: DateFilter,
    @Query('claimed') claimed: boolean,
    @Query('machine') machineId: string,
  ) {
    const data = await this.cloudKService.getUserMachineRewards(
      req.user.userId,
      { page, limit, claimed, date, machineId: machineId },
    );
    return new ApiResponse(data);
  }

  @Get('machines/stakes')
  async getMachineStakes(
    @Req() req: any,
    @Query('machine') machine: Types.ObjectId,
  ) {
    const data = await this.cloudKService.getMachineStakes(machine);
    return new ApiResponse(data);
  }

  @Get('claims')
  async getClaimsHistory(
    @Query() paginateDTO: PaginateDTO,
    @Req() req: AppRequest,
  ) {
    const data = await this.cloudKService.getClaimsHistory(
      new Types.ObjectId(req.user.userId),
      paginateDTO,
    );
    return new ApiResponse(data);
  }

  @Get('transactions')
  async getTransactionsPaginated(
    @Query() paginateDTO: PaginateDTO,
    @Query('machine') machine: string,
    @Query('token') token: string,
    @Query('type') type: CloudKTransactionTypes,
    @Query('fromDate') from: string,
    @Query('toDate') to: string,
    @Req() req: AppRequest,
  ) {
    const data = await this.cloudKService.getTransactionsPaginated(
      new Types.ObjectId(req.user.userId),
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

  @Get('settings')
  async getCurrentKillSettings() {
    const settings = await this.cloudKService.getCurrentKillSettings();
    return new ApiResponse(settings);
  }

  @Get('active-node')
  async iSUSerActiveNode(@Query('userId') userId: string) {
    const data = await this.cloudKService.findActiveParent(userId);
    return new ApiResponse(data);
  }

  @Post('machines/stake/v2')
  async stakeIntoMachineV2(
    @Req() req: AppRequest,
    @Body() stakeDto: StakeTokensDto,
  ) {
    const data = await this.cloudKDepositV4Service.stakeIntoMachineService(
      String(stakeDto.machine),
      req.user.userId,
      stakeDto.amount,
      stakeDto.isPhaseEnabled,
      stakeDto.HundredPercentClicked,
      stakeDto.token || null,
      stakeDto.stakePeriod || null,
    );
    return new ApiResponse(data);
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
    @Req() req: AppRequest,
  ) {
    const userId = new Types.ObjectId(req.user.userId);

    const data = await this.cloudKService.getUserInflationRulesV1(
      userId,
      new Types.ObjectId(machine),
      new Types.ObjectId(reward),
    );
    return new ApiResponse(data);
  }

  // connect the machine with serial number
  @Post('machines/connect')
  async connectMachineWithSerialNumber(
    @Req() req: AppRequest,
    @Body() machineConnect: MachineConnectDto,
  ) {
    const userId = new Types.ObjectId(req.user.userId);

    const data =
      await this.cloudKCommunicationService.connectMachineWithSerialNumber(
        machineConnect,
        userId,
      );
    return new ApiResponse(data);
  }

  @Get('active/status')
  async getActiveStatus(
    @Query() machineActiveStatusDto: MachineActiveStatusDto,
    @Req() req: AppRequest,
  ) {
    console.log('in api');
    const userId = new Types.ObjectId(req?.user?.userId);
    const data = await this.cloudKCommunicationService.getActiveStatus(
      machineActiveStatusDto,
      userId,
    );
    return new ApiResponse(data);
  }
}
