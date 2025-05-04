import {
  BadRequestException,
  HttpException,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Wallet } from './schemas/wallet.schema';
import mongoose, {
  ClientSession,
  Connection,
  Model,
  PipelineStage,
  Types,
} from 'mongoose';
import { HttpService } from '@nestjs/axios';
import { v4 as uuidv4 } from 'uuid';

import { WalletI } from './interfaces/wallet.interface';
import { WalletTransaction } from './schemas/wallet.transaction.schema.';
import { WalletTransactionI } from './interfaces/wallet-transaction.interface';
import { WithdrawTransaction } from './schemas/withdraw.transaction.schema';
import { TrxType } from '../global/enums/trx.type.enum';
import { TransactionFlow } from './enums/transcation.flow.enum';
import {
  PaginateDTO,
  SpecialSwapPaginateDTO,
  WalletFilterDTO,
} from '../admin/global/dto/paginate.dto';
import { aggregatePaginate } from '../utils/pagination.service';
import { ChargesType } from '../global/enums/charges.type.enum';
import { KMallService } from '../k-mall/kmall.service';
import { CreateWalletTransactionDto } from './dto/create-transaction.dto';
import { CreateWithdrawDto } from './dto/create-withdraw.dto';
import { TransferTransactionI } from './interfaces/transfer-transaction.interface';
import { SwapTransactionI } from './interfaces/swap-transaction.interface';
import { CreateDepositDto } from './dto/create-depost.dto';
import { DepositTransaction } from './schemas/deposit.transaction.schema';
import { DepositTransactionI } from './interfaces/deposit-transaction.interface';
import { TokenI } from '../token/interfaces/token.interface';
import { OnChainWallet } from './schemas/on.chain.wallet.schema';
import { OnChainWalletI } from './interfaces/on.chain.wallet.interface';
import {
  DUE_WALLET_SYMBOL,
  Token,
  ValueType,
} from '../token/schemas/token.schema';
import { CreateOnChainWalletDto } from './dto/create-on-chain-wallet.dto';
import { RequestStatus } from './enums/request.status.enum';
import { Network } from '../token/schemas/network.schema';
import { NetworkI } from '../token/interfaces/network.interface';
import { User } from '../users/schemas/user.schema';
import { TransactionStatus } from '../global/enums/transaction.status.enum';
import { OnChainAddressDto } from './dto/on-chain-address.dto';
import { DepositSetting } from '../token/schemas/deposit.settings.schema';
import { WithdrawSetting } from '../token/schemas/withdraw.settings.schema';
import { WITHDRAW_TYPES } from '../token/enums/withdraw-types.enum';
import { TokenService } from '../token/token.service';
import {
  generateUniqueString,
  getDateRange,
  pagination,
  setDecimalPlaces,
} from '../utils/helpers';

import { ApproveWithdrawDto } from './dto/approve-withdraw.dto';
import { EmailService } from '../email/email.service';
import { MyBlockchainIdService } from '../my-blockchain-id/my-blockchain-id.service';
import { NotificationService } from '../notification/notification.service';
import { NotificationTypeEnum } from '../notification/enums/notification.type.enum';
import Web3 from 'web3';
import { TransferTransaction } from './schemas/transfer.transaction.schema';
import { SwapTransaction } from './schemas/swap.transaction.schema';
import { CreateSwapDto } from './dto/create-swap.dto';
import { AmountType } from '../global/enums/amount.type.enum';
import { GatewayService } from '../gateway/gateway.service';
import {
  DEPOSIT_AND_STAKE_FAILURE_MESSAGE,
  DEPOSIT_AND_STAKE_MESSAGE,
  DEPOSIT_MESSAGE,
  STAKE_FAILURE_MESSAGE,
  STAKE_MESSAGE,
  WITHDRAW_FAILURE_MESSAGE,
  WITHDRAW_SUCCESS_MESSAGE,
} from '../gateway/Constants/socket.messages';
import { SOCKET_EVENT_NAMES } from '../gateway/Constants/socket.event.messages';
import { CreateWalletSettingsDto } from './dto/create-wallet-settings.dto';
import { WalletSetting } from './schemas/wallet.settings.schema';
import {
  WalletSettingsType,
  WithdrawSummaryType,
} from './enums/wallet-settings-type.schema';
import { TrxCounter } from './schemas/trx-counter.schema';
import { WebhookDto } from '../webhook/dto/webhook.dto';
import {
  WebhookDataStatus,
  WebhookMessages,
  WebhookType,
} from '../webhook/enums/webhook.enum';
import { WebhookService } from '../webhook/webhook.service';
import { CHART_TIMELIME_TYPES } from '../myfriends/enums/chart-timelines.enum';
import { DAY_OF_WEEK_SHORT_NAMES, MONTH_SHORT_NAMES } from '../utils/constants';
import { CloudKSetting } from '../cloud-k/schemas/cloudk-setting.schema';
import { CloudKMachineStake } from '../cloud-k/schemas/cloudk-machine-stakes.schema';
import {
  CLOUDK_MACHINE_STATUS,
  CloudKMachine,
} from '../cloud-k/schemas/cloudk-machine.schema';
import { AxiosResponse } from 'axios';
import { WebhookDepositDto } from '../webhook/dto/webhook-deposit.dto';
import { firstValueFrom } from 'rxjs';
import { Platform } from '../platform/schemas/platform.schema';
import {
  CreateWithdrawSettingsDto,
  GetDepositSettingsDto,
} from '../admin/dto/wallet.dto';
import { PLATFORMS } from '../global/enums/wallet.enum';
import { NetworkSettingsType } from '../platform/schemas/network-settings.schema';
import { SpecialSwapTransaction } from '@/src/wallet/schemas/special.swap.transaction.schema';
import { WalletDepositService } from './wallet.deposit.service';
import { PlatformService } from '../platform/platform.service';
import { DepositAndStakeTransaction } from './schemas/depositAndStakeTransaction';
import { OnChainWalletStatus } from './enums/on-chain-status.';
import { OnChainWalletSetting } from '../token/schemas/on.chain.wallet.setting.schema';
import { WebhookModel } from '../webhook/schemas/webhookModel.schema';
import { CloudKWalletBalanceDto } from '../webhook/dto/cloudk-webhook.dto';
import { CloudKWalletTransactionDto } from '../webhook/dto/cloudk-wallet-transaction.dto';
import { UsersService } from '../users/users.service';

import TronWeb from 'tronweb';
import { GetAllowApprovalWithdrawDto } from './dto/get-allow-approval-withdraw.dto';
import { aggregatePaginate2 } from '../utils/pagination2.service';
import { aggregatePaginate3 } from '../utils/pagination3.service';
import { WithdrawSummary } from './schemas/withdraw.summary.schema';
import { WalletService } from './wallet.service';
import { log } from 'console';
@Injectable()
export class WalletBalanceService {
  private readonly tronWeb: any;
  constructor(
    private readonly httpService: HttpService,
    private readonly walletServices: WalletService,

    @InjectModel(CloudKSetting.name)
    private cloudKSettingsModel: Model<CloudKSetting>,
    @InjectModel(CloudKMachineStake.name)
    private machineStakesModel: Model<CloudKMachineStake>,
    @InjectModel(CloudKMachine.name)
    private cloudKMachine: Model<CloudKMachine>,
    @InjectModel(Wallet.name)
    private readonly walletModel: Model<WalletI>,
    @InjectModel(OnChainWallet.name)
    private readonly onChainWalletModel: Model<OnChainWalletI>,
    @InjectModel(Token.name)
    private readonly tokenModel: Model<TokenI>,
    @InjectModel(WalletTransaction.name)
    readonly walletTransactionModel: Model<WalletTransactionI>,
    @InjectModel(WithdrawTransaction.name)
    private readonly withdrawTransactionModel: Model<WithdrawTransaction>,
    @InjectModel(TransferTransaction.name)
    private readonly transferTransactionModel: Model<TransferTransactionI>,
    @InjectModel(SwapTransaction.name)
    private readonly swapTransactionModel: Model<SwapTransactionI>,
    @InjectModel(SpecialSwapTransaction.name)
    private readonly specialSwapTransactionModel: Model<SpecialSwapTransaction>,
    @InjectModel(DepositTransaction.name)
    readonly depositTransactionModel: Model<DepositTransactionI>,
    @InjectModel(Network.name)
    private readonly networkModel: Model<NetworkI>,
    @InjectModel(DepositSetting.name)
    private readonly depositSettingModel: Model<DepositSetting>,
    @InjectModel(WithdrawSetting.name)
    private readonly withdrawSettingModel: Model<WithdrawSetting>,
    @InjectModel(Platform.name)
    private readonly platformModel: Model<Platform>,
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    private readonly kmallService: KMallService,
    private readonly tokenService: TokenService,
    @InjectConnection() private readonly connection: Connection,
    private readonly notificationService: NotificationService,
    private readonly emailService: EmailService,
    private readonly myBlockchainIdService: MyBlockchainIdService,
    private readonly gatewayService: GatewayService,
    @InjectModel(WalletSetting.name)
    private readonly walletSettingsModel: Model<WalletSetting>,
    @InjectModel(TrxCounter.name)
    private readonly trxCounterModel: Model<TrxCounter>,
    private readonly webhookmodelservice: WebhookService,
    private readonly platformService: PlatformService,
    private readonly walletDepositService: WalletDepositService,
    @InjectModel(DepositAndStakeTransaction.name)
    private depositAndStakeTransactionModel: Model<DepositAndStakeTransaction>,
    @InjectModel(OnChainWalletSetting.name)
    private readonly onChainWalletSettingModel: Model<OnChainWalletSetting>,
    @InjectModel(WebhookModel.name)
    private readonly webhookModel: Model<WebhookModel>,

    @InjectModel(WithdrawSummary.name)
    private readonly withdrawSummaryModal: Model<WithdrawSummary>,

    private readonly usersService: UsersService,
    private readonly wallet: WalletService,
  ) {
    this.tronWeb = new TronWeb.TronWeb({
      fullHost: 'https://api.trongrid.io',
    });
  }

  async getBalanceByWallet(userId: Types.ObjectId, walletId: Types.ObjectId) {
    try {
      const balanceAggregation = await this.walletTransactionModel.aggregate([
        {
          $match: {
            wallet: walletId,
            user: new Types.ObjectId(userId),
            deletedAt: { $eq: null },
          },
        },
        {
          $group: {
            _id: null,
            incomingBalance: {
              $sum: {
                $cond: [
                  { $eq: ['$transactionFlow', TransactionFlow.IN] },
                  '$amount',
                  0,
                ],
              },
            },
            outgoingBalance: {
              $sum: {
                $cond: [
                  { $eq: ['$transactionFlow', TransactionFlow.OUT] },
                  '$amount',
                  0,
                ],
              },
            },
            totalStaked: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ['$trxType', 'stake'] },
                      { $eq: ['$transactionFlow', TransactionFlow.OUT] },
                    ],
                  },
                  '$amount',
                  0,
                ],
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            balance: {
              $round: [
                { $subtract: ['$incomingBalance', '$outgoingBalance'] },
                10,
              ],
            },
            totalStaked: 1,
          },
        },
      ]);

      const walletBalance = balanceAggregation[0]?.balance || 0;
      const totalStaked = balanceAggregation[0]?.totalStaked || 0;

      // return walletBalance;
      return { walletBalance, totalStaked };
    } catch (error) {
      console.error('Failed to get wallet balance:', error);
      throw new Error('Error calculating wallet balance.');
    }
  }

  async getTokenBySymbol(symbol: string) {
    return await this.tokenModel.findOne({
      symbol: new RegExp(`^${symbol}$`, 'i'),
    });
  }

  async getCurrentCloudKSettings(): Promise<CloudKSetting> {
    return await this.cloudKSettingsModel.findOne({}).sort({
      createdAt: -1,
    });
  }

  async getTotalBalance(userId: any) {
    //
    const cloudKSettings = await this.getCurrentCloudKSettings();

    const [wallets] = await Promise.all([
      this.walletModel.aggregate([
        {
          $match: {
            user: new Types.ObjectId(userId),
            deletedAt: { $eq: null },
          },
        },
        {
          $lookup: {
            from: 'tokens',
            localField: 'token',
            foreignField: '_id',
            as: 'token',
          },
        },
        { $unwind: '$token' },
      ]),
    ]);

    if (!wallets || wallets.length === 0) {
      return {
        totalTokenAmount: 0,
        totalDollarValue: 0,
        wallets: [],
      };
    }

    const { price } = await this.wallet.getCurrentPrice();

    let totalTokenAmount = 0;
    let totalDollarValue = 0;

    const tokenData = await Promise.all(
      wallets.map(async (wallet) => {
        const tokenTrxSettings =
          await this.tokenService.getAvailableTransactionSettings(
            wallet.token._id,
          );

        const tokenBalance = wallet.totalBalanceinToken;
        const dollarBalance =
          wallet.token.valueType.toLowerCase() === ValueType.USD.toLowerCase()
            ? tokenBalance
            : tokenBalance * price;

        totalTokenAmount += tokenBalance;
        totalDollarValue += dollarBalance;

        return {
          token: {
            ...wallet.token,
            trxSettings: tokenTrxSettings,
            showZeroBalance: wallet.token.showZeroBalance || false,
          },
          tokenBalance,
          dollarBalance,
          id: wallet._id,
        };
      }),
    );

    const totalPercentage = tokenData.reduce((sum, data) => {
      const percentage =
        totalTokenAmount > 0 ? (data.tokenBalance / totalTokenAmount) * 100 : 0;
      return sum + percentage;
    }, 0);

    const tokenDataWithPercentage = tokenData.map((data) => {
      const percentage =
        totalTokenAmount > 0 ? (data.tokenBalance / totalTokenAmount) * 100 : 0;
      const normalizedPercentage = (percentage / totalPercentage) * 100;

      const result = Math.max(0, parseFloat(normalizedPercentage?.toFixed(2)));
      return {
        ...data,
        percentage: result?.toFixed(2),
      };
    });
    const roundingError =
      100 -
      tokenDataWithPercentage.reduce(
        (sum, data) => sum + parseFloat(data?.percentage),
        0,
      );
    if (roundingError !== 0) {
      tokenDataWithPercentage[0].percentage = (
        parseFloat(tokenDataWithPercentage[0]?.percentage) + roundingError
      ).toFixed(2);
    }

    const formattedTokenDataWithPercentage = tokenDataWithPercentage.map(
      (data) => ({
        ...data,
        percentage: Math.max(0, parseFloat(data?.percentage)).toFixed(2),
      }),
    );

    return {
      totalTokenAmount,
      totalDollarValue,
      wallets: formattedTokenDataWithPercentage,
    };
  }

  // Optimized version of getTotalMachinesStakeByUser using .find() and .reduce()
  async getTotalMachinesStakeByUser(userId: Types.ObjectId): Promise<number> {
    const pipeline: PipelineStage[] = [
      {
        $match: {
          user: new Types.ObjectId(userId),
          status: CLOUDK_MACHINE_STATUS.ACTIVE,
          endDate: { $gte: new Date() },
        },
      },
      {
        $group: {
          _id: null,
          maxStake: { $sum: '$stakeLimit' },
        },
      },
      { $unwind: '$maxStake' },
    ];

    const query = await this.cloudKMachine.aggregate(pipeline);

    return (query[0] && query[0].maxStake) || 0;
  }

  async getMachineTotalStaked(userId: Types.ObjectId): Promise<number> {
    const pipeline: PipelineStage[] = [
      {
        $match: { user: new Types.ObjectId(userId), deletedAt: { $eq: null } },
      },
      {
        $group: {
          _id: null,
          totalStaked: { $sum: '$tokenAmount' },
        },
      },
    ];

    const result = await this.machineStakesModel.aggregate(pipeline).exec();
    return result[0] ? result[0].totalStaked : 0;
  }

  async getAvaialbleStake(userId: any, walledId: any) {
    const cloudKSettings = await this.getCurrentCloudKSettings();
    const wallet: any = await this.walletModel
      .find({
        _id: new Types.ObjectId(walledId),
      })
      .populate('token');

    const [machinesMaxStake, userTotalMachineStakes] = await Promise.all([
      this.getTotalMachinesStakeByUser(userId),
      this.getMachineTotalStaked(userId),
    ]);

    //

    const totalStaked = await this.walletTransactionModel.aggregate([
      {
        $match: {
          wallet: wallet._id,
          user: new Types.ObjectId(userId),
          deletedAt: { $eq: null },
        },
      },
      {
        $group: {
          _id: null,
          totalStaked: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$trxType', 'stake'] },
                    { $eq: ['$transactionFlow', TransactionFlow.OUT] },
                  ],
                },
                '$amount',
                0,
              ],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          totalStaked: 1,
        },
      },
    ]);
    const totalStakedValue = totalStaked[0]?.totalStaked ?? 0;
    return {
      totalStaked:
        wallet[0].token._id.toString() === cloudKSettings.stakeToken.toString()
          ? userTotalMachineStakes
          : totalStakedValue,

      totalAvailableToStake:
        wallet[0].token._id.toString() === cloudKSettings.stakeToken.toString()
          ? machinesMaxStake - userTotalMachineStakes
          : 0,
    };
  }

  async getDueBalance(userId: any) {
    const tokenData = await this.tokenModel.findOne({
      symbol: DUE_WALLET_SYMBOL,
      deletedAt: null,
    });

    const userWallet = await this.wallet.findUserWalletByTokenSymbol(
      DUE_WALLET_SYMBOL,
      userId,
    );

    if (!userWallet) {
      throw new HttpException('There is No Wallet for the user', 400);
    }
    const { walletBalance } = await this.wallet.getBalanceByWallet(
      userId,
      userWallet._id,
    );

    return {
      token: tokenData,
      balance: walletBalance,
    };
  }
}
