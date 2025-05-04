import { InjectConnection, InjectModel } from '@nestjs/mongoose';

import {
  Connection,
  Model,
  PipelineStage,
  Types,
  Schema,
  ClientSession,
  ObjectId,
} from 'mongoose';

import {
  forwardRef,
  HttpException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { aggregatePaginate } from '../utils/pagination.service';
import { GlobalPoolResponseDto } from './dto/global-pool.dto';
import { POOL_TYPE, STATUS_TYPE } from './enums/sngp-type.enum';
import { SNBonusTransaction } from './schemas/sn-bonus-transaction.schema';
import { GlobalPool } from './schemas/sn-global-pool.schema';
import { Sngp } from './schemas/sngp.schema';
import { UserSngp } from './schemas/user-sngp.schema';
import { SngpDistribution } from './schemas/sngp-distribution.schema';
import { DistributionDto } from './dto/create-base-ref-setting.dto';
import { REWARD_STATUS_TYPE } from './enums/sngp-rewards.enum';
import { SngpRewards } from './schemas/sngp-rewards.schema';
import { WalletService } from '../wallet/wallet.service';

import { DISTRIBUTION_STATUS_TYPE } from './enums/sngp-distribution.enum';
import { UsersService } from '../users/users.service';
import { CHART_TIMELIME_TYPES } from '../myfriends/enums/chart-timelines.enum';
import {
  eachDayOfInterval,
  endOfWeek,
  format,
  getDay,
  startOfWeek,
} from 'date-fns';
import { Token } from '../token/schemas/token.schema';
import { CloudKMachine } from '../cloud-k/schemas/cloudk-machine.schema';
import { PaginateDTO } from '../admin/global/dto/paginate.dto';
import { CloudKProduct } from '../cloud-k/schemas/cloudk-products.schema';
import { CloudKService } from '../cloud-k/cloud-k.service';
import { CloudKSetting } from '../cloud-k/schemas/cloudk-setting.schema';
import { TransactionFlow } from '../wallet/enums/transcation.flow.enum';
import {
  Deposit_Transaction_Type,
  TrxType,
} from '../global/enums/trx.type.enum';
import { TransactionStatus } from '../global/enums/transaction.status.enum';

@Injectable()
export class SNGlobalClaimService {
  constructor(
    @InjectModel(CloudKSetting.name)
    private cloudKSettingModel: Model<CloudKSetting>,
    @InjectModel(Sngp.name)
    private readonly sngpModel: Model<Sngp>,
    @InjectModel(UserSngp.name)
    private readonly userSngpModel: Model<UserSngp>,
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(GlobalPool.name)
    private readonly globalPoolModel: Model<GlobalPool>,
    @InjectModel(SngpDistribution.name)
    private readonly sngpDistributionModel: Model<SngpDistribution>,
    @InjectModel(SngpRewards.name)
    private readonly sngpRewardsModel: Model<SngpRewards>,
    @Inject(forwardRef(() => WalletService))
    private walletService: WalletService,
    private userService: UsersService,

    @InjectModel(CloudKMachine.name)
    public machineModel: Model<CloudKMachine>,
    @InjectModel(CloudKProduct.name)
    public productModel: Model<CloudKProduct>,
    @InjectModel(Token.name)
    private readonly token: Model<Token>,
    @Inject(forwardRef(() => CloudKService))
    private cloudKService: CloudKService,
  ) {}
  // Claim the country pool rewards
  async claimCountryPoolReward(userId: Types.ObjectId) {
    const matchQuery: any[] = [
      {
        deletedAt: {
          $eq: null,
        },
        user: new Types.ObjectId(userId),
        status: 'un-claimed',
        receivable: true,
      },
    ];
    const sngpData = await this.sngpModel
      .findOne({
        type: POOL_TYPE.SNGP,
        status: STATUS_TYPE.ACTIVE,
        deletedAt: null,
      })
      .select('_id');
    if (sngpData) {
      matchQuery.push({ sngp: { $nin: [sngpData._id] } });
    }

    const matchConditions: any[] = [
      {
        $match: { $and: matchQuery },
      },
      {
        $group: {
          _id: null,
          totalPoints: {
            $sum: '$reward',
          },
        },
      },
    ];
    const data = await this.sngpRewardsModel.aggregate(matchConditions);
    if (!data.length) {
      return 'There is no rewards to claim.';
    }

    const cloudkSetting = await this.cloudKSettingModel
      .findOne()
      .populate('rewardToken');

    if (!cloudkSetting) {
      throw new NotFoundException('Setting Not Found');
    }

    const wallet = await this.walletService.findUserWalletByTokenSymbol(
      cloudkSetting.rewardToken.symbol,
      userId,
    );
    if (!wallet)
      throw new HttpException(
        `${cloudkSetting.rewardToken.symbol} wallet not found`,
        400,
      );
    const session = await this.connection.startSession();
    await session.startTransaction();
    try {
      const { walletBalance } = await this.walletService.getBalanceByWallet(
        new Types.ObjectId(userId),
        wallet._id,
      );
      await this.walletService.createRawWalletTransaction(
        {
          amount: data[0].totalPoints,
          wallet: wallet._id,
          transactionFlow: TransactionFlow.IN,
          trxType: TrxType.COUNTRY_POOL_REWARD,
          user: userId,
        },
        session,
      );
      const { serialNumber: sN, requestId } =
        await this.walletService.generateUniqueRequestId(
          TrxType.SUPERNODE_REWARD,
        );

      const userData = await this.userService.findUserById(
        new Types.ObjectId(userId),
      );
      const newDeposit = new this.walletService.depositTransactionModel({
        user: userId,
        toWallet: wallet._id,
        toWalletTrx: null,
        amount: data[0].totalPoints,
        confirmation: '0',
        hash: TrxType.COUNTRY_POOL_REWARD,
        onChainWallet: null,
        serialNumber: sN,
        requestId,
        transactionStatus: TransactionStatus.SUCCESS,
        newBalance: walletBalance + data[0].totalPoints,
        previousBalance: walletBalance,
        token: wallet?.token || null,
        network: null,
        remarks: `${data[0].totalPoints} ${cloudkSetting.rewardToken.name} claim processed successfully`,
        note: `From Amount: ${data[0].totalPoints} - ${TrxType.COUNTRY_POOL_REWARD} - Receivable Amount: ${data[0].totalPoints} ${cloudkSetting.rewardToken.name} - After Wallet Balance: ${walletBalance + data[0].totalPoints} ${cloudkSetting.rewardToken.name}`,
        blockchainId: userData?.blockchainId || null,
      });
      await newDeposit.save({ session });
      const newDepositTransactionHistory =
        new this.walletService.depositTransactionHistoryModel({
          deposit_id: newDeposit._id,
          from: Deposit_Transaction_Type.Deposit,
          type: 'deposit',
          user: userId,
          toWallet: wallet._id,
          toWalletTrx: null,
          amount: data[0].totalPoints,
          confirmation: '0',
          hash: TrxType.COUNTRY_POOL_REWARD,
          onChainWallet: null,
          serialNumber: sN,
          requestId,
          transactionStatus: TransactionStatus.SUCCESS,
          newBalance: walletBalance + data[0].totalPoints,
          previousBalance: walletBalance,
          token: wallet?.token || null,
          network: null,
          remarks: `${data[0].totalPoints} ${cloudkSetting.rewardToken.name} claim processed successfully`,
          note: `From Amount: ${data[0].totalPoints} - ${TrxType.COUNTRY_POOL_REWARD} - Receivable Amount: ${data[0].totalPoints} ${cloudkSetting.rewardToken.name} - After Wallet Balance: ${walletBalance + data[0].totalPoints} ${cloudkSetting.rewardToken.name}`,
          blockchainId: userData?.blockchainId || null,
        });
      await newDepositTransactionHistory.save({ session });
      //updated sngpRewardsModel
      await this.sngpRewardsModel.updateMany(
        { $and: matchQuery },
        {
          status: REWARD_STATUS_TYPE.CLAIMED,
          claimedAt: new Date(),
        },
        { session },
      );

      await session.commitTransaction();
      return 'Successfully reward claimed.';
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
  async claimSNGPPoolReward(userId: Types.ObjectId) {
    const sngpData = await this.sngpModel
      .findOne({
        type: POOL_TYPE.SNGP,
        status: STATUS_TYPE.ACTIVE,
        deletedAt: null,
      })
      .select('_id');

    if (!sngpData) {
      throw new NotFoundException('There is no active sngp to claim.');
    }

    const matchConditions: any[] = [
      {
        $match: {
          sngp: sngpData._id,
          deletedAt: {
            $eq: null,
          },
          user: new Types.ObjectId(userId),
          status: REWARD_STATUS_TYPE.UNCLAIMED,
          receivable: true,
        },
      },
      {
        $group: {
          _id: null,
          totalPoints: {
            $sum: '$reward',
          },
        },
      },
    ];
    const data = await this.sngpRewardsModel.aggregate(matchConditions);
    if (!data.length) {
      return 'There is no rewards to claim.';
    }

    const cloudkSetting = await this.cloudKSettingModel
      .findOne()
      .populate('rewardToken');

    if (!cloudkSetting) {
      throw new NotFoundException('Setting Not Found');
    }

    const wallet = await this.walletService.findUserWalletByTokenSymbol(
      cloudkSetting.rewardToken.symbol,
      userId,
    );
    if (!wallet)
      throw new HttpException(
        `${cloudkSetting.rewardToken.symbol} wallet not found`,
        400,
      );
    const session = await this.connection.startSession();
    await session.startTransaction();
    try {
      const { walletBalance } = await this.walletService.getBalanceByWallet(
        new Types.ObjectId(userId),
        wallet._id,
      );
      await this.walletService.createRawWalletTransaction(
        {
          amount: data[0].totalPoints,
          wallet: wallet._id,
          transactionFlow: TransactionFlow.IN,
          trxType: TrxType.SNGP_REWARD,
          user: new Types.ObjectId(userId),
        },
        session,
      );

      const { serialNumber: sN, requestId } =
        await this.walletService.generateUniqueRequestId(
          TrxType.SUPERNODE_REWARD,
        );

      const userData = await this.userService.findUserById(
        new Types.ObjectId(userId),
      );
      const newDeposit = new this.walletService.depositTransactionModel({
        user: new Types.ObjectId(userId),
        toWallet: wallet._id,
        toWalletTrx: null,
        amount: data[0].totalPoints,
        confirmation: '0',
        hash: TrxType.SNGP_REWARD,
        onChainWallet: null,
        serialNumber: sN,
        requestId,
        transactionStatus: TransactionStatus.SUCCESS,
        newBalance: walletBalance + data[0].totalPoints,
        previousBalance: walletBalance,
        token: wallet?.token || null,
        network: null,
        blockchainId: userData?.blockchainId || null,
      });
      await newDeposit.save({ session });
      const newDepositTransactionHistory =
        new this.walletService.depositTransactionHistoryModel({
          deposit_id: newDeposit._id,
          from: Deposit_Transaction_Type.Deposit,
          type: 'deposit',
          user: new Types.ObjectId(userId),
          toWallet: wallet._id,
          toWalletTrx: null,
          amount: data[0].totalPoints,
          confirmation: '0',
          hash: TrxType.SNGP_REWARD,
          onChainWallet: null,
          serialNumber: sN,
          requestId,
          transactionStatus: TransactionStatus.SUCCESS,
          newBalance: walletBalance + data[0].totalPoints,
          previousBalance: walletBalance,
          token: wallet?.token || null,
          network: null,
          blockchainId: userData?.blockchainId || null,
        });
      await newDepositTransactionHistory.save({ session });
      // updated sngpRewardsModel
      await this.sngpRewardsModel.updateMany(
        {
          sngp: sngpData._id,
          deletedAt: {
            $eq: null,
          },
          user: new Types.ObjectId(userId),
          status: REWARD_STATUS_TYPE.UNCLAIMED,
        },
        {
          status: REWARD_STATUS_TYPE.CLAIMED,
          claimedAt: new Date(),
        },
        { session },
      );

      await session.commitTransaction();
      return 'Successfully reward claimed.';
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}
