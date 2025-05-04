import {
  forwardRef,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import mongoose, {
  ClientSession,
  Connection,
  FilterQuery,
  Model,
  ObjectId,
  Types,
} from 'mongoose';
import {
  CLOUDK_MACHINE_STATUS,
  CloudKMachine,
} from './schemas/cloudk-machine.schema';
import {
  CLOUDK_MACHINE_STAKE_TYPE,
  CloudKMachineStake,
  STAKE_FROM,
} from './schemas/cloudk-machine-stakes.schema';
import { HttpService } from '@nestjs/axios';
import { PipelineStage } from 'mongoose';
import { CloudKReward } from './schemas/cloudk-reward.schema';
import { TransactionFlow } from '../wallet/enums/transcation.flow.enum';
import {
  Deposit_Transaction_Type,
  TrxType,
} from '../global/enums/trx.type.enum';
import {
  getDateRange,
  generateUniqueString,
  getFilterByTimePeriodConfigs,
  setDecimalPlaces,
  pagination,
} from '../utils/helpers';
import { CloudKInflation } from './schemas/cloudk-inflation.schema';
import { CloudKInflationRules } from './schemas/cloudk-inflation-rules.schema';
import {
  CloudKSettingsDto,
  GetUserMachineDto,
  InflationRulesDto,
} from './dto/cloudk.dto';
import { updateCloudKGlobalPoolDto } from '@/src/cloud-k/dto/cloudk-product-globalpool';
import { InflationRulePayload } from '../interface/inflation-rule-payload';
import { CloudKGlobalAutoCompound } from './schemas/global-autocompound.schema';
import { aggregatePaginate } from '../utils/pagination.service';
import { CloudKSetting } from './schemas/cloudk-setting.schema';
import { TokenService } from '../token/token.service';
import { WalletService } from '../wallet/wallet.service';
import {
  CreateCloudKProductDto,
  CreateCloudKProductGen2RewardPercentageDto,
} from './dto/create-product.dto';
import { CloudKProduct } from './schemas/cloudk-products.schema';
import { CloudKAutoCompoundPenalty } from './schemas/ac-penalty.schema';
import { machine } from 'os';
import {
  AutoCompoundValues,
  MachineFilterDTO,
  PaginateDTO,
  ProductPaginateDTO,
} from '../admin/global/dto/paginate.dto';
import { AxiosResponse } from 'axios';
import { firstValueFrom, lastValueFrom, throwError } from 'rxjs';
import { CloudKDailyJob } from './schemas/cloudk-reward-job.schema';
import { DateFilter } from '../global/enums/date.filter.enum';
import {
  CloudKTransactions,
  CloudKTransactionTypes,
} from './schemas/cloudk-transactions.schema';
import { CreateCloudKTransactionDto } from './dto/create-cloudl-transaction.dto';
import { MyBlockchainIdService } from '../my-blockchain-id/my-blockchain-id.service';
import { CloudKOverrideBoost } from './schemas/cloudk-boost-overrirde.schema';
import { CreateCloudKOverrideBoostDto } from './dto/cloudk-overrride-boost.dto';
import { TransactionStatus } from '../global/enums/transaction.status.enum';
import { CloudKSimulationMachine } from './schemas/cloudk-simulation-machine.schema';
import { CloudKKillSetting } from './schemas/cloudk-kill.schema';
import { CloudKKillSettingDTO } from './dto/cloudk-kill-settings.dto';
import { MyFriendsService } from '../myfriends/myfriends.service';
import { AmountType } from '../global/enums/amount.type.enum';
import { UserGask } from '../supernode/schemas/user-gask.schema';
import { SuperNodeGaskSetting } from '../supernode/schemas/sn-gask-setting.schema';
import { ActiveUserTree } from '../users/schemas/active-user-tree.schema';
import { SupernodeService } from '../supernode/supernode.service';
import { GlobalPool } from '../supernode/schemas/sn-global-pool.schema';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { CacheService } from '../cache/cache.service';
import { CACHE_TYPE } from '../cache/Enums/cache.enum';
import { MachineCounter } from './schemas/machine-counter.schema';
import { User } from '../users/schemas/user.schema';
import { SNGlogbalPollService } from '../supernode/sn-global-poll.service';
import { POOL_TYPE, STATUS_TYPE } from '../supernode/enums/sngp-type.enum';
import { DISTRIBUTION_STATUS_TYPE } from '../supernode/enums/sngp-distribution.enum';

import { Platform } from '../platform/schemas/platform.schema';
import { PLATFORMS } from '../global/enums/wallet.enum';
import { PlatformService } from '../platform/platform.service';
import { CloudKMachineStakeTransaction } from './schemas/stake-history.schema';
import { DUE_WALLET_SYMBOL, ValueType } from '../token/schemas/token.schema';
import { PlatformVoucher } from '../platform-voucher/schemas/platform-voucher.schema';
import { KMallService } from '../k-mall/kmall.service';
import { GatewayService } from '../gateway/gateway.service';
import {
  DUEBALANCECLEARED,
  DUEBALANCEDEBT,
  MACHINE_PURCHASE_MESSAGE,
} from '../gateway/Constants/socket.messages';
import { SOCKET_EVENT_NAMES } from '../gateway/Constants/socket.event.messages';
import { ClaimRewardsDto } from '../wallet/dto/claim_rewards.dto.dto';
import { WalletI } from '../wallet/interfaces/wallet.interface';
import { Wallet } from '../wallet/schemas/wallet.schema';
import { UsersService } from '../users/users.service';
import {
  ScenarioAnalyticsPointType,
  StatusAnalyticsPointType,
} from '../users/dto/update.analytics.dto';
import { WalletBalanceService } from '../wallet/wallet.balance.service';
import { WalletDepositService } from '../wallet/wallet.deposit.service';
import { CloudKAutoCompoundSetting } from './schemas/cloudk-autoCompound-setting.schema';
import { DueRemarks, DueType } from '../wallet/enums/request.status.enum';
import { DueReferenceMetaData } from '../wallet/interfaces/withdraw-transaction.interface';
import { StaticToken } from '../token/interfaces/token.interface';
import {
  formatToFixed5,
  generateNoteTransactionDetails,
  getCurrentDay,
  getCustomRange,
  getCustomRangeOfEndDate,
  isPromotionExpired,
  processDateInput,
  truncateNumber,
} from '../utils/common/common.functions';

import { CloudKRewardGenerationType } from './interfaces/cloudk-reward.interface';
import { GenExtraRewardHistory } from './schemas/gen-extra-reward-history.schema';
import {
  AdditionalMintingPromotion,
  AdditionalMintingPromotionStatus,
} from '../admin/schemas/additional-minting-promotion.schema';
import { AdditionalCountryLevelSetting } from '../admin/schemas/additional.product.minting.Schema';
import { countriesAllOptions } from '../countries/schemas/country.schema';
import { UsdkStakeSettings } from '../usdk-stake/schemas/usdkStakeSettings.schema';

@Injectable()
export class CloudKService {
  constructor(
    @InjectModel(CloudKMachine.name)
    public machineModel: Model<CloudKMachine>,
    @InjectModel(CloudKSimulationMachine.name)
    private simulationMachineModel: Model<CloudKSimulationMachine>,
    @InjectModel(CloudKMachineStake.name)
    private machineStakesModel: Model<CloudKMachineStake>,
    @InjectModel(CloudKReward.name)
    private rewardModel: Model<CloudKReward>,
    @InjectModel(Wallet.name)
    private wallet: Model<Wallet>,
    @InjectModel(CloudKAutoCompoundPenalty.name)
    private autoCompoundPenaltyModel: Model<CloudKAutoCompoundPenalty>,
    private readonly httpService: HttpService,
    @Inject(forwardRef(() => WalletService))
    private walletService: WalletService,
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(CloudKInflation.name)
    private inflationModel: Model<CloudKInflation>,
    @InjectModel(CloudKInflationRules.name)
    private inflationRulesModel: Model<CloudKInflationRules>,
    @InjectModel(CloudKGlobalAutoCompound.name)
    private globalAutoCompoundModel: Model<CloudKGlobalAutoCompound>,
    @InjectModel(CloudKSetting.name)
    private cloudKSettingsModel: Model<CloudKSetting>,
    private tokenService: TokenService,
    @InjectModel(CloudKProduct.name)
    public productsModel: Model<CloudKProduct>,
    @InjectModel(CloudKDailyJob.name)
    private dailyJobModel: Model<CloudKDailyJob>,
    @InjectModel(CloudKTransactions.name)
    private cloudkTransactionModel: Model<CloudKTransactions>,
    @InjectModel(CloudKOverrideBoost.name)
    private overrideBoostModel: Model<CloudKOverrideBoost>,
    @InjectModel(UserGask.name)
    private userGaskModel: Model<UserGask>,
    @InjectModel(GlobalPool.name)
    private globalPoolModel: Model<GlobalPool>,
    @InjectModel(SuperNodeGaskSetting.name)
    private snGaskSettingModel: Model<SuperNodeGaskSetting>,
    @InjectModel(CloudKKillSetting.name)
    private killSettingsModel: Model<CloudKKillSetting>,
    private myBlockchainIdService: MyBlockchainIdService,
    private myFriendsService: MyFriendsService,
    @InjectModel(ActiveUserTree.name)
    private userActiveTreeModel: Model<ActiveUserTree>,
    @InjectModel(MachineCounter.name)
    private machineCounterModel: Model<MachineCounter>,
    @InjectModel(Platform.name)
    private platformModal: Model<Platform>,
    @InjectModel(User.name)
    private usermModel: Model<User>,
    @InjectModel(ActiveUserTree.name)
    private activeUserTreeModel: Model<ActiveUserTree>,
    @InjectModel(GenExtraRewardHistory.name)
    private genExtraRewardHistoryModel: Model<GenExtraRewardHistory>,

    @Inject(forwardRef(() => SupernodeService))
    private supernodeService: SupernodeService,
    private cacheService: CacheService,
    private snGlogbalPollService: SNGlogbalPollService,
    private platformService: PlatformService,
    @InjectModel(CloudKMachineStakeTransaction.name)
    private cloudKMachineStakeTransactionModel: Model<CloudKMachineStakeTransaction>,
    private readonly kMallService: KMallService,
    private readonly gatewayService: GatewayService, // Inject GatewayService
    @InjectModel(Wallet.name)
    private readonly walletModel: Model<Wallet>,
    private userServices: UsersService,
    @Inject(forwardRef(() => WalletDepositService))
    private walletDepositService: WalletDepositService,

    @InjectModel(CloudKAutoCompoundSetting.name)
    private cloudKAutoCompoundSettingModel: Model<CloudKAutoCompoundSetting>,

    @InjectModel(AdditionalMintingPromotion.name)
    private readonly additionalMintingPromotionModel: Model<AdditionalMintingPromotion>,

    @InjectModel(AdditionalCountryLevelSetting.name)
    private readonly additionalCountryLevelSettingModel: Model<AdditionalCountryLevelSetting>,

    @InjectModel(UsdkStakeSettings.name)
    private readonly usdkStakeSettings: Model<UsdkStakeSettings>,
  ) {}

  // async generateUniqueMachineId(
  //   trxType: TrxType,
  //   session?: ClientSession,
  // ): Promise<{ uniqueName: string; serialNumber: number }> {
  //   const lastTrx = await this.machineModel
  //     .findOne({})
  //     .session(session)
  //     .sort({ serialNumber: -1 });
  //   const serialNumber = lastTrx ? (lastTrx.serialNumber || 1000) + 1 : 1000;
  //   const uniqueName = await generateUniqueString(trxType, serialNumber);
  //   return {
  //     uniqueName,
  //     serialNumber,
  //   };
  // }

  async generateUniqueMachineId(
    trxType: TrxType,
    session?: ClientSession,
  ): Promise<{ uniqueName: string; serialNumber: number }> {
    const counter = await this.machineCounterModel.findOneAndUpdate(
      { _id: 'machineSerialNumber' }, // Use a specific ID for the machine serial number counter
      { $inc: { seq: 1 } }, // Atomically increment the sequence number
      {
        new: true,
        upsert: true,
        // session, // Include the session to ensure atomicity within a transaction
      },
    );

    const serialNumber = counter.seq;
    const uniqueName = await generateUniqueString(trxType, serialNumber);

    return {
      uniqueName,
      serialNumber,
    };
  }

  async getCurrentPrice(
    pair?: string,
  ): Promise<{ price: number; high: number }> {
    const pairValue = pair || process.env.LYK_PAIR_VALUE;
    try {
      const response: AxiosResponse<any> = await firstValueFrom(
        this.httpService.get(
          `https://openapi.koinbay.com/sapi/v1/ticker?symbol=${pairValue}`,
        ),
      );
      const data = {
        price: Number(response?.data?.sell || response?.data?.last),
        high: Number(response.data.high),
        // price: Number(1.09),

        // high: Number(1.09),
      };

      return data;
    } catch (error) {
      throw new Error(error.response.data);
    }
  }

  async deprecated_createNewMachine(productId, userBId, uuid = 1) {
    const product = await this.productsModel.findOne({
      externalProductId: productId,
    });

    if (!product) {
      throw new HttpException(
        `No product with id ${productId} found on homnifi`,
        400,
      );
    }
    const tokenPrice = await this.getCurrentPrice();

    let startDate = new Date();
    if (process.env.NODE_ENV === 'qa-server') {
      // only for qa envs for tesitin purpose
      const createdAt = new Date();
      const oneDayInMilliseconds = 24 * 60 * 60 * 1000;
      const oneDayAgo = new Date(createdAt.getTime() - oneDayInMilliseconds);
      startDate = oneDayAgo;
    }
    const endDate = new Date(startDate);
    endDate.setFullYear(endDate.getFullYear() + 5);

    const currentTokenSettings = await this.getCurrentCloudkSettings();

    const user = await this.myBlockchainIdService.syncUserByBid(userBId);
    const userId = user._id;
    const session = await this.connection.startSession();
    await session.startTransaction();

    const rewardWallet: any =
      await this.walletService.findUserWalletByTokenSymbol(
        currentTokenSettings.rewardToken.symbol,
        userId,
        session,
      );

    const boostData = await this.getCurrentBoostForMachines();
    const autoCompound = await this.globalAutoCompoundModel.findOne({
      user: userId,
    });

    const { uniqueName, serialNumber } = await this.generateUniqueMachineId(
      TrxType.MACHINE_PURCHASE,
      // session,
    );
    try {
      const userMachine = await this.machineModel.create(
        [
          {
            user: userId,
            name: product.name,
            product: product._id,
            uniqueName: uniqueName,
            serialNumber,
            stakeLimit: product.stakeLimit,
            stakeUnlimited: product.stakeUnlimited ? true : false,
            rewardWallet: rewardWallet._id,
            lockedPrice: tokenPrice.price,
            allTimeHigh: tokenPrice.price,
            dlp: tokenPrice.price,
            productPrice: product.price,
            mintingPower: product.mintingPowerPerc / 100,
            boost: boostData.boost / 100,
            stakeToken: currentTokenSettings.stakeToken._id,
            autoCompound: autoCompound?.enabled || false,
            startDate: startDate,
            endDate: endDate,
            imageUrl: product.imageUrl,
            externalMachineId: product.externalProductId,
          },
        ],
        { session },
      );
      await this.userServices.createUserAnalyticLog({
        userId: userId,
        scenario: ScenarioAnalyticsPointType.NEW_MACHINE,
        status: StatusAnalyticsPointType.PENDING,
      });
      const tokenAmount = product.airdropPromo / tokenPrice.price;

      const userDepositWallet =
        await this.walletService.findUserWalletByTokenSymbol(
          currentTokenSettings.stakeToken.symbol,
          userId,
          session,
        );

      const { walletBalance } = await this.walletService.getBalanceByWallet(
        userId,
        userDepositWallet._id,
      );

      await this.createCloudKTransaction(
        {
          tokenAmount: tokenAmount,
          type: CloudKTransactionTypes.MACHINE_PURCHASE,
          user: userId,
          machine: userMachine[0]._id as string,
          token: userDepositWallet.token,
          // totalTokenPrice: product.airdropPromo,
        },
        session,
      );

      if (tokenAmount > 0) {
        await this.walletService.createRawWalletTransaction(
          {
            amount: tokenAmount,
            wallet: userDepositWallet._id,
            transactionFlow: TransactionFlow.IN,
            trxType: TrxType.DEPOSIT,
            user: userId,
          },
          session,
        );
        await this.walletService.createRawWalletTransaction(
          {
            amount: tokenAmount,
            wallet: userDepositWallet._id,
            transactionFlow: TransactionFlow.OUT,
            trxType: TrxType.STAKE,
            user: userId,
          },
          session,
        );
      } else {
        userMachine[0].status = CLOUDK_MACHINE_STATUS.INACTIVE;
      }

      // * Add Transaction for launchpadAirdrop

      const launchpadAirdrop = product.launchpadAirdrop / tokenPrice.price;

      const userLaunchpadAirdropWallet =
        await this.walletService.findUserWalletByTokenSymbol(
          ValueType.sLYK,
          userId,
          session,
        );

      const rawWalletTransaction =
        await this.walletService.createRawWalletTransaction(
          {
            amount: launchpadAirdrop,
            wallet: userLaunchpadAirdropWallet._id,
            transactionFlow: TransactionFlow.IN,
            trxType: TrxType.LAUNCHPAD_AIRDROP,
            user: userId,
          },
          session,
        );
      const trx = rawWalletTransaction[0]?.['_id'];
      const { requestId, serialNumber: airdropSerialNumber } =
        await this.walletService.generateUniqueRequestId(
          TrxType.LAUNCHPAD_AIRDROP,
          // session,
        );

      const newDeposit =
        await this.walletService.depositTransactionModel.create(
          [
            {
              user: userId,
              toWallet: userLaunchpadAirdropWallet._id,
              toWalletTrx: trx,
              amount: launchpadAirdrop,
              confirmation: '',
              hash: '',
              onChainWallet: null,
              serialNumber: airdropSerialNumber,
              requestId,
              transactionStatus: TransactionStatus.SUCCESS,
              remarks: '',
              settingsUsed: null,
              newBalance: walletBalance + launchpadAirdrop,
              previousBalance: walletBalance,
              token: userLaunchpadAirdropWallet?.token || null,
              network: null,
              blockchainId: userBId || null,
            },
          ],
          { session },
        );

      await this.walletService.depositTransactionHistoryModel.create(
        [
          {
            deposit_id: newDeposit[0]._id,
            user: userId,
            toWallet: userLaunchpadAirdropWallet._id,
            toWalletTrx: trx,
            from: Deposit_Transaction_Type.Deposit,
            amount: launchpadAirdrop,
            confirmation: '',
            hash: '',
            type: rawWalletTransaction[0]?.['trxType'] || 'deposit',
            onChainWallet: null,
            serialNumber: airdropSerialNumber,
            requestId,
            transactionStatus: TransactionStatus.SUCCESS,
            remarks: '',
            settingsUsed: null,
            newBalance: walletBalance + launchpadAirdrop,
            previousBalance: walletBalance,
            token: userLaunchpadAirdropWallet?.token || null,
            network: null,
            blockchainId: userBId || null,
          },
        ],
        { session },
      );

      await this.machineStakesModel.create(
        [
          {
            tokenAmount: tokenAmount,
            totalPrice: product.airdropPromo,
            machine: userMachine[0]._id,
            perTokenPrice: tokenPrice.price,
            type: CLOUDK_MACHINE_STAKE_TYPE.STAKE,
            user: userId,
          },
        ],
        { session },
      );

      const snGaskSetting = await this.snGaskSettingModel.findOne(); // todo get updates one using supernoderService
      const multiplier = snGaskSetting.multiplier || 3;

      await this.userGaskModel.create(
        [
          {
            user: new Types.ObjectId(userId),
            amount: product.airdropPromo * multiplier,
            flow: TransactionFlow.IN,
          },
        ],
        { session },
      );
      await this.cacheService.deleteUserCache({
        type: CACHE_TYPE.ACTIVE_USER,
        user: userId,
      });

      await this.globalPoolModel.create(
        [
          {
            user: userId,
            amount: product.globalPool,
            flow: TransactionFlow.IN,
          },
        ],
        { session },
      );

      userMachine[0].collatoral = product.airdropPromo;
      await userMachine[0].save({ session });

      await this.createCloudKTransaction(
        {
          tokenAmount: tokenAmount,
          type: CloudKTransactionTypes.ADD_STAKE,
          user: userId,
          machine: userMachine[0]._id as string,
          totalTokenPrice: product.airdropPromo,
          token: userDepositWallet.token,
        },
        session,
      );

      // await this.myFriendsService.createProductPurchaseBonus(
      //   user,
      //   product,
      //   session,
      // );
      const user = await this.usermModel.findById(userId, {}, { session });
      if (user) {
        user.isBuilderGenerationActive =
          await this.supernodeService.isBuilderGenerationUserActiveNode(
            userId,
            session,
          );

        user.isBaseReferralActive =
          (
            await this.supernodeService.baseRefereralUserActiveMachine(
              new Types.ObjectId(userId),
              session,
            )
          )?.status ?? false;

        await user.save({ session });
      }

      await session.commitTransaction();
      return userMachine[0];
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async createNewMachineV2(
    productId,
    userBId,
    quantity,
    orderId,
    idempotencyKey,
    platform: PLATFORMS | '' = '',
  ) {
    const resultedArray = [];
    const product = await this.productsModel.findOne({
      externalProductId: productId,
    });

    if (!product) {
      throw new HttpException(
        `No product with id ${productId} found on homnifi`,
        400,
      );
    }
    if (idempotencyKey) {
      const idempotencyKeyIsExist = await this.machineModel.findOne({
        idempotencyKey,
      });

      if (idempotencyKeyIsExist) {
        throw new HttpException(
          `Already added this machine check the idempotency`,
          400,
        );
      }
    }

    const platformData = await this.platformService.getPlatformBySymbol(
      platform,
      true,
      true,
    );
    //

    const tokenPrice = await this.getCurrentPrice();

    let startDate = new Date();
    if (process.env.NODE_ENV === 'qa-server') {
      // only for qa envs for tesitin purpose
      const createdAt = new Date();
      const oneDayInMilliseconds = 24 * 60 * 60 * 1000;
      const oneDayAgo = new Date(createdAt.getTime() - oneDayInMilliseconds);
      startDate = oneDayAgo;
    }

    const endDate = new Date(startDate);
    endDate.setFullYear(endDate.getFullYear() + 5);
    // expaire year need to dynamic

    const currentTokenSettings = await this.getCurrentCloudkSettings();

    //

    const user = await this.myBlockchainIdService.syncUserByBid(userBId);

    const userId = user._id;
    let isNewMachine: boolean = false;
    //
    const isNewMachineCheck = await this.machineModel.findOne({
      user: userId,
      deletedAt: null,
    });
    if (!isNewMachineCheck) {
      isNewMachine = true;
    }
    const session = await this.connection.startSession();
    await session.startTransaction();

    const [rewardWallet, boostData, autoCompound] = await Promise.all([
      this.walletService.findUserWalletByTokenSymbolV2(
        currentTokenSettings.rewardToken,
        userId,
      ),

      this.getCurrentBoostForMachines(),
      this.globalAutoCompoundModel.findOne({
        user: userId,
      }),
    ]);
    //

    //New Implementation
    //Usdk-stake settings
    const usdkStakeSetting = await this.usdkStakeSettings.findOne({
      deletedAt: null,
      status: true,
      isVisible: true,
    });

    if (!usdkStakeSetting) {
      throw new HttpException(
        `You cannot stake usdk because admin not added the settings.`,
        400,
      );
    }

    try {
      for (let index = 0; index < quantity; index++) {
        const { uniqueName, serialNumber } = await this.generateUniqueMachineId(
          TrxType.MACHINE_PURCHASE,
          // session,
        );
        const tokenAmount = product.airdropPromo / tokenPrice.price;
        const launchpadAirdrop = product.launchpadAirdrop / tokenPrice.price;

        const [userMachine, userDepositWallet] = await Promise.all([
          this.machineModel.create(
            [
              {
                user: userId,
                name: product.name,
                product: product._id,
                uniqueName: uniqueName,
                serialNumber,
                stakeLimit: product.stakeLimit,
                stakeUnlimited: product.stakeUnlimited ? true : false,
                rewardWallet: rewardWallet._id,
                lockedPrice: tokenPrice.price,
                allTimeHigh: tokenPrice.price,
                dlp: tokenPrice.price,
                productPrice: product.price,
                mintingPowerPerc: product.mintingPowerPerc / 100,
                mintingPower: product.mintingPowerPerc / 100,
                boost: boostData.boost / 100,
                stakeToken: currentTokenSettings.stakeToken._id,
                autoCompound: autoCompound?.enabled || false,
                startDate: startDate,
                endDate: endDate,
                imageUrl: product.imageUrl,
                externalMachineId: product.externalProductId,
                orderId,
                idempotencyKey,
                airDrops: {
                  airdropPromo: product.airdropPromo,
                  launchpadAirdrop: product.launchpadAirdrop,
                  airdropPromoTokenAmount: tokenAmount,
                  launchpadAirdropTokenAmount: launchpadAirdrop,
                },
                usdkStakeRewardRate: usdkStakeSetting.rewardPercentage,
                usdkMultipler: usdkStakeSetting.multipler,
                usdkColletral: 0,
                usdkStakeSetting: usdkStakeSetting._id,
                usdkStakeRewardToken: currentTokenSettings.stakeToken._id,
              },
            ],
            { session },
          ),
          this.walletService.findUserWalletByTokenSymbolV2(
            currentTokenSettings.stakeToken,
            userId,
          ),
        ]);
        // create a supernode count
        if (isNewMachine) {
          await this.userServices.createUserAnalyticLog({
            userId: userId,
            scenario: ScenarioAnalyticsPointType.NEW_MACHINE,
            status: StatusAnalyticsPointType.PENDING,
          });
        }

        const cktrx = await this.createCloudKTransaction(
          {
            tokenAmount: tokenAmount,
            type: CloudKTransactionTypes.MACHINE_PURCHASE,
            user: userId,
            machine: userMachine[0]._id as string,
            token: userDepositWallet.token,
            // totalTokenPrice: product.airdropPromo,
          },
          session,
        );

        //

        let stakeTransactionOut;
        if (tokenAmount > 0) {
          //

          const inTrx = await this.walletService.createRawWalletTransaction(
            {
              amount: tokenAmount,
              wallet: userDepositWallet._id,
              transactionFlow: TransactionFlow.IN,
              trxType: TrxType.DEPOSIT,
              user: userId,
            },
            session,
          );
          const outTrx = await this.walletService.createRawWalletTransaction(
            {
              amount: tokenAmount,
              wallet: userDepositWallet._id,
              transactionFlow: TransactionFlow.OUT,
              trxType: TrxType.STAKE,
              user: userId,
            },
            session,
          );
          stakeTransactionOut = outTrx;
        } else {
          userMachine[0].status = CLOUDK_MACHINE_STATUS.INACTIVE;
        }
        // * Add Transaction for launchpadAirdrop
        //

        const userLaunchpadAirdropWallet =
          await this.walletService.findUserWalletByTokenSymbol(
            ValueType.sLYK,
            userId,
            session,
          );
        const { walletBalance } = await this.walletService.getBalanceByWallet(
          userId,
          userLaunchpadAirdropWallet._id,
        );
        //
        if (tokenAmount > 0) {
          const rawWalletTransaction =
            await this.walletService.createRawWalletTransaction(
              {
                amount: launchpadAirdrop,
                wallet: userLaunchpadAirdropWallet._id,
                transactionFlow: TransactionFlow.IN,
                trxType: TrxType.LAUNCHPAD_AIRDROP,
                user: userId,
                machine: userMachine[0]._id as string,
              },
              session,
            );
          //

          //
          const trx = rawWalletTransaction[0]?.['_id'] || null;
          //
          const { requestId, serialNumber: airdropSerialNumber } =
            await this.walletService.generateUniqueRequestId(
              TrxType.LAUNCHPAD_AIRDROP,
              // session,
            );

          // Due to using of session, bellow `walletBalance` will not return the balance of this loop. so, using `totalWalletAmountTemp` variable to store temp wallet balance.

          // totalWalletAmountTemp += launchpadAirdrop + walletBalance;
          const [depositTransactiondata] = await Promise.all([
            this.walletService.depositTransactionModel.create(
              [
                {
                  user: userId,
                  toWallet: userLaunchpadAirdropWallet._id,
                  toWalletTrx: trx,
                  amount: launchpadAirdrop,
                  confirmation: '',
                  hash: '',
                  onChainWallet: null,
                  serialNumber: airdropSerialNumber,
                  requestId,
                  transactionStatus: TransactionStatus.SUCCESS,
                  remarks: '',
                  settingsUsed: null,
                  newBalance: walletBalance + launchpadAirdrop,
                  previousBalance: walletBalance,
                  platform: platformData._id,
                  token: userLaunchpadAirdropWallet?.token || null,
                  network: null,
                  blockchainId: userBId || null,
                },
              ],
              { session },
            ),
          ]);
          await this.walletService.depositTransactionHistoryModel.create(
            [
              {
                deposit_id: depositTransactiondata[0]._id,
                from: Deposit_Transaction_Type.Deposit,
                user: userId,
                toWallet: userLaunchpadAirdropWallet._id,
                toWalletTrx: trx,
                amount: launchpadAirdrop,
                confirmation: '',
                hash: '',
                type: rawWalletTransaction[0]?.['trxType'] || 'deposit',
                onChainWallet: null,
                serialNumber: airdropSerialNumber,
                requestId,
                transactionStatus: TransactionStatus.SUCCESS,
                remarks: '',
                settingsUsed: null,
                newBalance: walletBalance + launchpadAirdrop,
                previousBalance: walletBalance,
                platform: platformData._id,
                token: userLaunchpadAirdropWallet?.token || null,
                network: null,
                blockchainId: userBId || null,
              },
            ],
            { session },
          );
          const stake = await this.machineStakesModel.create(
            [
              {
                tokenAmount: tokenAmount,
                totalPrice: product.airdropPromo,
                machine: userMachine[0]._id,
                perTokenPrice: tokenPrice.price,
                type: CLOUDK_MACHINE_STAKE_TYPE.STAKE,
                from: STAKE_FROM.AIRDROP,
                user: userId,
                walletTransaction: trx,
              },
            ],
            { session },
          );
          //
          if (tokenAmount > 0) {
            // Transaction History
            const bulkCreateArray = [
              {
                machine: userMachine[0]._id,
                stake: stake[0]._id,
                walletTransaction: stakeTransactionOut[0]?.['_id'],
                note: 'Transaction by purchase new machine.',
              },
            ];
            //
            await this.cloudKMachineStakeTransactionModel.insertMany(
              bulkCreateArray,
              { session },
            );
          }

          const snGaskSetting = await this.snGaskSettingModel.findOne(); // todo get updates one using supernoderService
          const multiplier = snGaskSetting.multiplier || 3;

          await this.userGaskModel.create(
            [
              {
                user: new Types.ObjectId(userId),
                amount: product.airdropPromo * multiplier,
                flow: TransactionFlow.IN,
                machine: userMachine[0]._id,
                stake: stake[0]._id,
                multiplier: multiplier,
              },
            ],
            { session },
          );
        }
        await Promise.all([
          await this.cacheService.deleteUserCache({
            type: CACHE_TYPE.ACTIVE_USER,
            user: userId,
          }),
          await this.cacheService.deleteUserCache({
            type: CACHE_TYPE.TOTAL_REWARD_RESULT,
            user: userId,
          }),
          await this.cacheService.deleteUserCache({
            type: CACHE_TYPE.REWARD_CLAIMABLE_RESULT,
            user: userId,
          }),

          // this.globalPoolModel.create(
          //   [
          //     {
          //       user: userId,
          //       amount: product.globalPool,
          //       flow: TransactionFlow.IN,
          //     },
          //   ],
          //   { session },
          // ),
        ]);
        userMachine[0].collatoral = product.airdropPromo;
        userMachine[0].stakedTokenAmount = tokenAmount;

        await userMachine[0].save({ session });

        if (tokenAmount > 0) {
          await this.createCloudKTransaction(
            {
              tokenAmount: tokenAmount,
              type: CloudKTransactionTypes.ADD_STAKE,
              user: userId,
              machine: userMachine[0]._id as string,
              totalTokenPrice: product.airdropPromo,
              token: userDepositWallet.token,
            },
            session,
          );
        }

        // await this.myFriendsService.createProductPurchaseBonus(
        //   user,
        //   product,
        //   session,
        // );
        const user: any = await this.usermModel.findById(
          userId,
          {},
          { session },
        );
        if (user) {
          user.isBuilderGenerationActive =
            await this.supernodeService.isBuilderGenerationUserActiveNode(
              userId,
              session,
            );

          user.isBaseReferralActive =
            (
              await this.supernodeService.baseRefereralUserActiveMachine(
                new Types.ObjectId(userId),
                session,
              )
            )?.status ?? false;
          //

          if (userMachine[0]?._id) {
            user.products.push(userMachine[0]._id);
          }

          await user.save({ session });
        }

        // sngp reward distribution
        await this.sngpPointDistributionService(
          product?.globalPool,
          product?.countryPoints,
          userMachine[0]._id,
          userId,
          session,
        );
        //loop the active and add the data and substact from remaining value
        resultedArray.push(userMachine[0].uniqueName);
      }

      if (user !== null && user.isUserEverPurchasedMachine !== true) {
        user.isUserEverPurchasedMachine = true;
        await user.save({ session });
      }

      // this.kMallService.callVoucherAPI(
      //   productId,
      //   userBId,
      //   quantity,
      //   orderId,
      //   idempotencyKey,
      // );
      this.gatewayService.emitSocketEventNotification({
        message: MACHINE_PURCHASE_MESSAGE,
        eventName: user.blockchainId,
        data: {
          eventAction: SOCKET_EVENT_NAMES.MACHINE_PURCHASE_SUCCESS,
          title: 'Machine Purchased',
          message: `Machine has been purchased Successfully`,
        },
      });

      await session.commitTransaction();

      return resultedArray;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  // async createNewMachineV2_Deprecated(
  //   productId,
  //   userBId,
  //   quantity,
  //   orderId,
  //   idempotencyKey,
  //   platform: PLATFORMS | '' = '',
  // ) {
  //   const resultedArray = [];
  //   const product = await this.productsModel.findOne({
  //     externalProductId: productId,
  //   });

  //   if (!product) {
  //     throw new HttpException(
  //       `No product with id ${productId} found on homnifi`,
  //       400,
  //     );
  //   }
  //   if (idempotencyKey) {
  //     const idempotencyKeyIsExist = await this.machineModel.findOne({
  //       idempotencyKey,
  //     });

  //     if (idempotencyKeyIsExist) {
  //       throw new HttpException(
  //         `Already added this machine check the idempotency`,
  //         400,
  //       );
  //     }
  //   }

  //   const platformData = await this.platformService.getPlatformBySymbol(
  //     platform,
  //     true,
  //     true,
  //   );
  //   //

  //   const tokenPrice = await this.getCurrentPrice();

  //   let startDate = new Date();
  //   if (process.env.NODE_ENV === 'qa-server') {
  //     // only for qa envs for tesitin purpose
  //     const createdAt = new Date();
  //     const oneDayInMilliseconds = 24 * 60 * 60 * 1000;
  //     const oneDayAgo = new Date(createdAt.getTime() - oneDayInMilliseconds);
  //     startDate = oneDayAgo;
  //   }

  //   const endDate = new Date(startDate);
  //   endDate.setFullYear(endDate.getFullYear() + 5);
  //   // expaire year need to dynamic

  //   const currentTokenSettings = await this.getCurrentCloudkSettings();

  //   //

  //   const user = await this.myBlockchainIdService.syncUserByBid(userBId);

  //   const userId = user._id;
  //   //

  //   const session = await this.connection.startSession();
  //   await session.startTransaction();

  //   const [rewardWallet, boostData, autoCompound] = await Promise.all([
  //     this.walletService.findUserWalletByTokenSymbolV2(
  //       currentTokenSettings.rewardToken,
  //       userId,
  //     ),

  //     this.getCurrentBoostForMachines(),
  //     this.globalAutoCompoundModel.findOne({
  //       user: userId,
  //     }),
  //   ]);
  //   //

  //   let totalWalletAmountTemp = 0;

  //   try {
  //     for (let index = 0; index < quantity; index++) {
  //       const { uniqueName, serialNumber } = await this.generateUniqueMachineId(
  //         TrxType.MACHINE_PURCHASE,
  //         // session,
  //       );
  //       const tokenAmount = product.airdropPromo / tokenPrice.price;
  //       const launchpadAirdrop = product.launchpadAirdrop / tokenPrice.price;

  //       const [userMachine, userDepositWallet] = await Promise.all([
  //         this.machineModel.create(
  //           [
  //             {
  //               user: userId,
  //               name: product.name,
  //               product: product._id,
  //               uniqueName: uniqueName,
  //               serialNumber,
  //               stakeLimit: product.stakeLimit,
  //               stakeUnlimited: product.stakeUnlimited ? true : false,
  //               rewardWallet: rewardWallet._id,
  //               lockedPrice: tokenPrice.price,
  //               allTimeHigh: tokenPrice.price,
  //               dlp: tokenPrice.price,
  //               productPrice: product.price,
  //               mintingPowerPerc: product.mintingPowerPerc / 100,
  //               mintingPower: product.mintingPowerPerc / 100,
  //               boost: boostData.boost / 100,
  //               stakeToken: currentTokenSettings.stakeToken._id,
  //               autoCompound: autoCompound?.enabled || false,
  //               startDate: startDate,
  //               endDate: endDate,
  //               imageUrl: product.imageUrl,
  //               externalMachineId: product.externalProductId,
  //               orderId,
  //               idempotencyKey,
  //               airDrops: {
  //                 airdropPromo: product.airdropPromo,
  //                 launchpadAirdrop: product.launchpadAirdrop,
  //                 airdropPromoTokenAmount: tokenAmount,
  //                 launchpadAirdropTokenAmount: launchpadAirdrop,
  //               },
  //             },
  //           ],
  //           { session },
  //         ),
  //         this.walletService.findUserWalletByTokenSymbolV2(
  //           currentTokenSettings.stakeToken,
  //           userId,
  //         ),
  //       ]);
  //       await this.userServices.createUserAnalyticLog({
  //         userId: userId,
  //         scenario: ScenarioAnalyticsPointType.NEW_MACHINE,
  //         status: StatusAnalyticsPointType.PENDING,
  //       });
  //       //

  //       const cktrx = await this.createCloudKTransaction(
  //         {
  //           tokenAmount: tokenAmount,
  //           type: CloudKTransactionTypes.MACHINE_PURCHASE,
  //           user: userId,
  //           machine: userMachine[0]._id as string,
  //           token: userDepositWallet.token,
  //           // totalTokenPrice: product.airdropPromo,
  //         },
  //         session,
  //       );

  //       //

  //       let stakeTransactionOut;
  //       if (tokenAmount > 0) {
  //         //

  //         const inTrx = await this.walletService.createRawWalletTransaction(
  //           {
  //             amount: tokenAmount,
  //             wallet: userDepositWallet._id,
  //             transactionFlow: TransactionFlow.IN,
  //             trxType: TrxType.DEPOSIT,
  //             user: userId,
  //           },
  //           session,
  //         );
  //         const outTrx = await this.walletService.createRawWalletTransaction(
  //           {
  //             amount: tokenAmount,
  //             wallet: userDepositWallet._id,
  //             transactionFlow: TransactionFlow.OUT,
  //             trxType: TrxType.STAKE,
  //             user: userId,
  //           },
  //           session,
  //         );
  //         stakeTransactionOut = outTrx;
  //       } else {
  //         userMachine[0].status = CLOUDK_MACHINE_STATUS.INACTIVE;
  //       }
  //       // * Add Transaction for launchpadAirdrop
  //       //

  //       const userLaunchpadAirdropWallet =
  //         await this.walletService.findUserWalletByTokenSymbol(
  //           ValueType.sLYK,
  //           userId,
  //           session,
  //         );

  //       //
  //       const rawWalletTransaction =
  //         await this.walletService.createRawWalletTransaction(
  //           {
  //             amount: launchpadAirdrop,
  //             wallet: userLaunchpadAirdropWallet._id,
  //             transactionFlow: TransactionFlow.IN,
  //             trxType: TrxType.LAUNCHPAD_AIRDROP,
  //             user: userId,
  //             machine: userMachine[0]._id as string,
  //           },
  //           session,
  //         );
  //       //

  //       //
  //       const trx = rawWalletTransaction[0]?.['_id'] || null;
  //       //
  //       const { requestId, serialNumber: airdropSerialNumber } =
  //         await this.walletService.generateUniqueRequestId(
  //           TrxType.LAUNCHPAD_AIRDROP,
  //           // session,
  //         );

  //       // Due to using of session, bellow `walletBalance` will not return the balance of this loop. so, using `totalWalletAmountTemp` variable to store temp wallet balance.
  //       const { walletBalance } = await this.walletService.getBalanceByWallet(
  //         userId,
  //         userLaunchpadAirdropWallet._id,
  //       );
  //       totalWalletAmountTemp += launchpadAirdrop + walletBalance;
  //       const [depositTransactiondata] = await Promise.all([
  //         this.walletService.depositTransactionModel.create(
  //           [
  //             {
  //               user: userId,
  //               toWallet: userLaunchpadAirdropWallet._id,
  //               toWalletTrx: trx,
  //               amount: launchpadAirdrop,
  //               confirmation: '',
  //               hash: '',
  //               onChainWallet: null,
  //               serialNumber: airdropSerialNumber,
  //               requestId,
  //               transactionStatus: TransactionStatus.SUCCESS,
  //               remarks: '',
  //               settingsUsed: null,
  //               newBalance: totalWalletAmountTemp,
  //               previousBalance: totalWalletAmountTemp - launchpadAirdrop,
  //               platform: platformData._id,
  //               token: userLaunchpadAirdropWallet?.token || null,
  //               network: null,
  //               blockchainId: userBId || null,
  //             },
  //           ],
  //           { session },
  //         ),
  //       ]);
  //       await this.walletService.depositTransactionHistoryModel.create(
  //         [
  //           {
  //             deposit_id: depositTransactiondata[0]._id,
  //             from: Deposit_Transaction_Type.Deposit,
  //             user: userId,
  //             toWallet: userLaunchpadAirdropWallet._id,
  //             toWalletTrx: trx,
  //             amount: launchpadAirdrop,
  //             confirmation: '',
  //             hash: '',
  //             type: rawWalletTransaction[0]?.['trxType'] || 'deposit',
  //             onChainWallet: null,
  //             serialNumber: airdropSerialNumber,
  //             requestId,
  //             transactionStatus: TransactionStatus.SUCCESS,
  //             remarks: '',
  //             settingsUsed: null,
  //             newBalance: totalWalletAmountTemp,
  //             previousBalance: totalWalletAmountTemp - launchpadAirdrop,
  //             platform: platformData._id,
  //             token: userLaunchpadAirdropWallet?.token || null,
  //             network: null,
  //             blockchainId: userBId || null,
  //           },
  //         ],
  //         { session },
  //       );
  //       const stake = await this.machineStakesModel.create(
  //         [
  //           {
  //             tokenAmount: tokenAmount,
  //             totalPrice: product.airdropPromo,
  //             machine: userMachine[0]._id,
  //             perTokenPrice: tokenPrice.price,
  //             type: CLOUDK_MACHINE_STAKE_TYPE.STAKE,
  //             from: STAKE_FROM.AIRDROP,
  //             user: userId,
  //             walletTransaction: trx,
  //           },
  //         ],
  //         { session },
  //       );
  //       //
  //       if (tokenAmount > 0) {
  //         // Transaction History
  //         const bulkCreateArray = [
  //           {
  //             machine: userMachine[0]._id,
  //             stake: stake[0]._id,
  //             walletTransaction: stakeTransactionOut[0]?.['_id'],
  //             note: 'Transaction by purchase new machine.',
  //           },
  //         ];
  //         //
  //         await this.cloudKMachineStakeTransactionModel.insertMany(
  //           bulkCreateArray,
  //           { session },
  //         );
  //       }

  //       const snGaskSetting = await this.snGaskSettingModel.findOne(); // todo get updates one using supernoderService
  //       const multiplier = snGaskSetting.multiplier || 3;

  //       await Promise.all([
  //         this.userGaskModel.create(
  //           [
  //             {
  //               user: new Types.ObjectId(userId),
  //               amount: product.airdropPromo * multiplier,
  //               flow: TransactionFlow.IN,
  //               machine: userMachine[0]._id,
  //               stake: stake[0]._id,
  //               multiplier: multiplier,
  //             },
  //           ],
  //           { session },
  //         ),

  //         await this.cacheService.deleteUserCache({
  //           type: CACHE_TYPE.ACTIVE_USER,
  //           user: userId,
  //         }),
  //         await this.cacheService.deleteUserCache({
  //           type: CACHE_TYPE.TOTAL_REWARD_RESULT,
  //           user: userId,
  //         }),
  //         await this.cacheService.deleteUserCache({
  //           type: CACHE_TYPE.REWARD_CLAIMABLE_RESULT,
  //           user: userId,
  //         }),

  //         // this.globalPoolModel.create(
  //         //   [
  //         //     {
  //         //       user: userId,
  //         //       amount: product.globalPool,
  //         //       flow: TransactionFlow.IN,
  //         //     },
  //         //   ],
  //         //   { session },
  //         // ),
  //       ]);
  //       userMachine[0].collatoral = product.airdropPromo;
  //       userMachine[0].stakedTokenAmount = tokenAmount;

  //       await userMachine[0].save({ session });

  //       await this.createCloudKTransaction(
  //         {
  //           tokenAmount: tokenAmount,
  //           type: CloudKTransactionTypes.ADD_STAKE,
  //           user: userId,
  //           machine: userMachine[0]._id as string,
  //           totalTokenPrice: product.airdropPromo,
  //           token: userDepositWallet.token,
  //         },
  //         session,
  //       );
  //       // await this.myFriendsService.createProductPurchaseBonus(
  //       //   user,
  //       //   product,
  //       //   session,
  //       // );
  //       const user = await this.usermModel.findById(userId, {}, { session });
  //       if (user) {
  //         user.isBuilderGenerationActive =
  //           await this.supernodeService.isBuilderGenerationUserActiveNode(
  //             userId,
  //             session,
  //           );

  //         user.isBaseReferralActive =
  //           (
  //             await this.supernodeService.baseRefereralUserActiveMachine(
  //               new Types.ObjectId(userId),
  //               session,
  //             )
  //           )?.status ?? false;
  //         //

  //         await user.save({ session });
  //       }

  //       // sngp reward distribution
  //       await this.sngpPointDistributionService(
  //         product?.globalPool,
  //         product?.countryPoints,
  //         userMachine[0]._id,
  //         userId,
  //         session,
  //       );
  //       //loop the active and add the data and substact from remaining value
  //       resultedArray.push(userMachine[0]);
  //     }

  //     if (user !== null && user.isUserEverPurchasedMachine !== true) {
  //       user.isUserEverPurchasedMachine = true;
  //       await user.save({ session });
  //     }

  //     // this.kMallService.callVoucherAPI(
  //     //   productId,
  //     //   userBId,
  //     //   quantity,
  //     //   orderId,
  //     //   idempotencyKey,
  //     // );
  //     // this.gatewayService.emitSocketEventNotification({
  //     //   message: MACHINE_PURCHASE_MESSAGE,
  //     //   eventName: user.blockchainId,
  //     //   data: {
  //     //     eventAction: SOCKET_EVENT_NAMES.MACHINE_PURCHASE_SUCCESS,
  //     //     title: 'Machine Purchased',
  //     //     message: `Machine has been purchased Successfully`,
  //     //   },
  //     // });

  //     await session.commitTransaction();

  //     return resultedArray;
  //   } catch (error) {
  //     await session.abortTransaction();
  //     throw error;
  //   } finally {
  //     session.endSession();
  //   }
  // }

  async sngpPointDistributionService(
    globalPoolPoint,
    countryPoints,
    machineId,
    userId,
    session: ClientSession,
  ) {
    try {
      //Add sngp to the user
      //Fetch active sngps
      const globalPool = await this.snGlogbalPollService.getActivePoolService();
      if (!globalPool || globalPool.length === 0) {
        return;
      }
      const completedSngps = [];
      const rewardAmounts = {};

      // add productSngp to active SNGP Pools
      for (let i = 0; i < globalPool.length; i++) {
        const poolData = globalPool[i];
        let pointForDistribution = countryPoints;
        let isSngpCompleted = false;

        if (poolData.type === POOL_TYPE.SNGP) {
          pointForDistribution = globalPoolPoint;
        }

        if (!rewardAmounts.hasOwnProperty(poolData._id.toString())) {
          rewardAmounts[poolData._id.toString()] = poolData.remainingPoints;
        }

        // checking pool contain remaining points to distribute
        if (
          poolData.remainingPoints === 0 ||
          rewardAmounts[poolData._id.toString()] == 0
        ) {
          continue;
        }
        const remainingPoints = rewardAmounts[poolData._id.toString()];
        // Checking remaining point is less than point that to be distributing
        if (remainingPoints < pointForDistribution) {
          isSngpCompleted = true;
          pointForDistribution = remainingPoints;
        }
        // create data for adding user global pool transactions
        const userSngpData = {
          points: pointForDistribution,
          sngp: poolData._id,
          user: userId,
          status: STATUS_TYPE.ACTIVE,
          machine: machineId,
          meta: {
            previousRemainingPoints: rewardAmounts[poolData._id.toString()],
            currentRemainingPoints:
              rewardAmounts[poolData._id.toString()] - pointForDistribution,
            totalPoint: poolData.totalPoints,
            pointForDistribution,
          },
        };
        await this.snGlogbalPollService.createUserSngp(userSngpData);

        // Saving the remaining points
        const PoolRemainingPoint =
          rewardAmounts[poolData._id.toString()] - pointForDistribution;

        poolData.remainingPoints = PoolRemainingPoint;
        rewardAmounts[poolData._id.toString()] = PoolRemainingPoint;

        if (PoolRemainingPoint === 0) {
          let count = await this.snGlogbalPollService.getUserSngpCount(
            poolData._id,
          );
          const isUserSngpAvailable =
            await this.snGlogbalPollService.isUserSngpAvailable(
              poolData._id,
              userId,
            );
          count = isUserSngpAvailable ? count : count + 1;
          const data = {
            noOfParticipants: count,
            status: DISTRIBUTION_STATUS_TYPE.WAIT_FOR_CONFIRMATION,
            sngp: poolData._id,
          };
          completedSngps.push(data);
          if (poolData.type === POOL_TYPE.COUNTRY_POOL)
            poolData.status = STATUS_TYPE.INACTIVE;
        }
        poolData.save();
      }
      if (completedSngps.length > 0) {
        // if any sngp completed the we are add it to the distribution pool table
        await this.snGlogbalPollService.sngpDistributionBulkInsert(
          completedSngps,
        );
      }
      return;
    } catch (error) {
      throw error;
    }
  }

  async getUserMachinesData(
    userId: Types.ObjectId,
    getUserMachineDto?: GetUserMachineDto,
  ) {
    try {
      const findFilter: FilterQuery<any> = {
        user: userId,
        $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
      };

      if (getUserMachineDto?.doNotShowExpired == 'yes') {
        findFilter.endDate = { $gte: new Date() };
      }

      const machines: any[] = await this.machineModel
        .find(findFilter)
        .sort({ createdAt: -1 })
        .populate([
          {
            path: 'stakeToken',
          },
          {
            path: 'product',
          },
        ]);
      console.log(machines, 'machines');

      const data = [];

      // const staked = await this.getAllMachineTotalCollatoral();
      // const stakedTokens = await this.getAllMachineStakesAmount();
      // const rewardsValue = await this.getAllUserMachineTotalRewards();
      // machines.forEach(async (machine) => {
      //   // const stakedValue = staked.find(
      //   //   (totalPriceResult) =>
      //   //     totalPriceResult?._id.toString() === machine?._id.toString(),
      //   // );
      //   // const stakedTockenValue = stakedTokens.find(
      //   //   (totalPriceResult) =>
      //   //     totalPriceResult?._id.toString() === machine?._id.toString(),
      //   // );
      //   // let rewards = rewardsValue.find((totalRewardsResult) => {
      //   //   return totalRewardsResult?._id?.toString() === machine?._id?.toString();
      //   // });
      //   // if (!rewards || rewards.length == 0) {
      //   //   rewards = { lifetimeReward: 0, claimableRewards: 0 };
      //   // }
      //   // if (getUserMachineDto?.doNotShowLimitExceeded == 'yes') {
      //   //   if (
      //   //     !machine.stakeUnlimited &&
      //   //     stakedValue.totalPrice.toFixed(5) >= machine.stakeLimit
      //   //   ) {
      //   //     return false;
      //   //   }
      //   // }
      //   const rewardData = await this.getUserMachineTotalRewards(machine._id);
      //   if (getUserMachineDto?.doNotShowLimitExceeded == 'yes') {
      //     if (
      //       !machine.stakeUnlimited &&
      //       !machine.collatoral &&
      //       machine.collatoral.toFixed(5) >= machine.stakeLimit
      //     ) {
      //       return false;
      //     }
      //   }
      //   data.push({
      //     name: machine.name,
      //     imageUrl: machine.imageUrl,
      //     machineId: machine.externalMachineId,
      //     stake: {
      //       value: machine.collatoral.toFixed(7),
      //       tokens: machine.stakedTokenAmount,
      //     },
      //     // stake: {
      //     //   value: stakedValue.totalPrice.toFixed(7),
      //     //   tokens: stakedTockenValue.totalAmount,
      //     // },
      //     rewards: {
      //       _id: machine._id,
      //       lifetimeReward: rewardData.lifetimeReward,
      //       claimableRewards: rewardData.claimableRewards,
      //     },
      //     expiry: machine.endDate,
      //     stakeToken: {
      //       name: machine.stakeToken?.name,
      //       symbol: machine.stakeToken?.symbol,
      //       iconUrl: machine.stakeToken?.iconUrl,
      //       color: machine.stakeToken?.color,
      //     },
      //     _id: machine._id,
      //     status:
      //       machine.endDate >= new Date() ? machine.status : STATUS_TYPE.INACTIVE,
      //     uniqueName: machine.uniqueName,
      //     stakeLimit: machine.stakeLimit,
      //     stakeUnlimited: machine.stakeUnlimited,
      //     startDate: machine.createdAt,
      //     endDate: machine.endDate,
      //   });
      // });

      for (const machine of machines) {
        let isGenActiveRewards: boolean = false;

        const rewardData = await this.getUserMachineTotalRewards(machine._id);

        if (getUserMachineDto?.doNotShowLimitExceeded == 'yes') {
          if (
            !machine.stakeUnlimited &&
            !machine.collatoral &&
            machine.collatoral.toFixed(5) >= machine.stakeLimit
          ) {
            continue;
          }
        }
        if (
          machine?.product?.actveGenRewardPercentageId &&
          machine?.product?.genRewardPercentage > 0
        ) {
          isGenActiveRewards = true;
        }

        const {
          isAdditionalMintingReward,
          additionalMinitngPerctage,
          additionalMintingPowerPercentage,
          startDatePromotion,
          endDatePromotion,
        } = await this.getUserMachinesCampaign({
          userId: userId,
          productId: machine.product._id,
          isGetSingleProduct: true,
        });

        data.push({
          name: machine.name,
          imageUrl: machine.imageUrl,
          machineId: machine.externalMachineId,
          stake: {
            value: machine.collatoral.toFixed(7),
            tokens: machine.stakedTokenAmount,
          },
          // stake: {
          //   value: stakedValue.totalPrice.toFixed(7),
          //   tokens: stakedTockenValue.totalAmount,
          // },
          rewards: {
            _id: machine._id,
            lifetimeReward: rewardData.lifetimeReward,
            claimableRewards: rewardData.claimableRewards,
          },
          expiry: machine.endDate,
          stakeToken: {
            name: machine.stakeToken?.name,
            symbol: machine.stakeToken?.symbol,
            iconUrl: machine.stakeToken?.iconUrl,
            color: machine.stakeToken?.color,
          },
          _id: machine._id,
          status:
            machine.endDate >= new Date()
              ? machine.status
              : STATUS_TYPE.INACTIVE,
          uniqueName: machine.uniqueName,
          stakeLimit: machine.stakeLimit,
          stakeUnlimited: machine.stakeUnlimited,
          startDate: machine.createdAt,
          endDate: machine.endDate,
          // Additional Minting Power
          additionalMintingPowerPercentage: additionalMintingPowerPercentage,
          additionalMinitngPerctage,
          isActiveMintingPercentage: isAdditionalMintingReward,
          // Active Gen
          isGenActiveRewards: isGenActiveRewards,
          //Delivery status
          isMachineConnected: machine.isMachineConnected || false,
          // assignedSerialNumber: machine.assignedSerialNumber || null,
          shipmentStatus: machine.shipmentStatus || null,
          shipmentItemIdentifier: machine.shipmentItemIdentifier || null,
          deliveryDate: machine.deliveryDate || null,
          serialNumberConnectedDate: machine.serialNumberConnectedDate || null,
          gracePeriodEndDate: machine.gracePeriodEndDate || null,
          gracePeriodStartDate: machine.gracePeriodStartDate || null,
          productDetails: machine?.product || null,
          connectionStatus: machine.connectionStatus || null,
        });
      }

      return data;
    } catch (error) {
      console.log('CATCH:', error);
    }
  }
  // async getUserMachinesCampaignOld(userId: Types.ObjectId) {
  //   let isAdditionalMintingReward: boolean = false;
  //   let isGenActiveRewards: boolean = false;

  //   const findFilter: FilterQuery<any> = {
  //     user: userId,

  //     $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
  //   };

  //   const machines: any[] = await this.machineModel
  //     .find(findFilter)
  //     .sort({ createdAt: -1 })
  //     .populate('product');

  //   for (const machine of machines) {
  //     if (
  //       machine?.product?.actveGenRewardPercentageId &&
  //       machine?.product?.genRewardPercentage > 0
  //     ) {
  //       isGenActiveRewards = true;
  //     }

  //     const findAdditionalMintingSetting =
  //       await this.additionalMintingPromotionModel.findById(
  //         machine.product.additionalMintingPowerId,
  //       );

  //     if (
  //       findAdditionalMintingSetting &&
  //       findAdditionalMintingSetting._id &&
  //       findAdditionalMintingSetting.status ===
  //         AdditionalMintingPromotionStatus.ACTIVE
  //     ) {
  //       const now = new Date().toISOString().split('T')[0]; // Get current date (YYYY-MM-DD)
  //       let isCheckMintingvalidation: boolean = true;

  //       // Ensure startDatePromotion and endDatePromotion are properly formatted strings
  //       const startDate =
  //         findAdditionalMintingSetting.startDate instanceof Date
  //           ? findAdditionalMintingSetting.startDate.toISOString().split('T')[0]
  //           : typeof findAdditionalMintingSetting.startDate === 'string'
  //             ? (findAdditionalMintingSetting.startDate as string).split('T')[0]
  //             : null;

  //       const endDate =
  //         findAdditionalMintingSetting.endDate instanceof Date
  //           ? findAdditionalMintingSetting.endDate.toISOString().split('T')[0]
  //           : typeof findAdditionalMintingSetting.endDate === 'string'
  //             ? (findAdditionalMintingSetting.endDate as string).split('T')[0]
  //             : null;

  //       // Check if the extracted dates are valid
  //       if (!startDate || !endDate) {
  //         isCheckMintingvalidation = false;
  //       }
  //       if (isCheckMintingvalidation) {
  //         if (now < startDate) {
  //           // return 'upcoming'  Future promotion
  //         } else if (now > endDate) {
  //           // return 'expired'  expired promotion
  //         } else {
  //           // return 'ongoing'  ongoing promotion
  //           isAdditionalMintingReward = true;
  //         }
  //       }
  //     }
  //   }
  //   return {
  //     isAdditionalMintingReward: isAdditionalMintingReward,
  //     isGenActiveRewards: isGenActiveRewards,
  //   };
  // }

  async getUserMachinesCampaign({
    userId,
    productId,
    isGetSingleProduct = false,
  }: {
    userId: Types.ObjectId;
    productId?: Types.ObjectId;
    isGetSingleProduct?: boolean;
  }): Promise<{
    isAdditionalMintingReward: boolean;
    additionalMinitngPerctage: number;
    additionalMintingPowerPercentage: number;
    startDatePromotion: Date | null;
    endDatePromotion: Date | null;
    isGenActiveRewards: boolean;
  }> {
    let isAdditionalMintingReward = false;
    let isGenActiveRewards = false;
    let additionalMintingPowerPercentage = 0;
    let startDatePromotion: Date | null = null;
    let endDatePromotion: Date | null = null;
    let additionalMinitngPerctage: number = 0;

    let findFilter: FilterQuery<any> = {
      user: userId,
      $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
    };

    if (isGetSingleProduct) {
      findFilter = {
        user: userId,
        product: productId,
        $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
      };
    }

    const machines: any = await this.machineModel
      .find(findFilter)
      .sort({ createdAt: -1 })
      .populate('product')
      .populate('user');

    const productIds = machines.map((machine) => machine.product._id);

    // Fetch active minting promotions once before the loop
    const activeMintingPromotions =
      await this.additionalMintingPromotionModel.find({
        status: AdditionalMintingPromotionStatus.ACTIVE,
        deletedAt: null,
      });

    const now = new Date().toISOString().split('T')[0];

    for (const machine of machines) {
      if (
        machine?.product?.actveGenRewardPercentageId &&
        machine?.product?.genRewardPercentage > 0
      ) {
        isGenActiveRewards = true;
      }

      for (const promotion of activeMintingPromotions) {
        if (!promotion.startDate || !promotion.endDate) continue;

        const startDate = new Date(promotion.startDate)
          .toISOString()
          .split('T')[0];
        const endDate = new Date(promotion.endDate).toISOString().split('T')[0];

        if (now >= startDate && now <= endDate) {
          // Fetch country-level settings for this promotion and productIds
          const countryLevelSettings =
            await this.additionalCountryLevelSettingModel.find({
              promotionId: promotion._id,
              productId: { $in: productIds },
              deletedAt: null,
            });

          for (const countrySetting of countryLevelSettings) {
            const countryMatch = countrySetting.countryList.find(
              (country) =>
                country.countryCodeAlpha3 === machine.user.document_country,
            );

            if (countryMatch && countryMatch?.percentage > 0) {
              // if (isGetSingleProduct) {
              additionalMinitngPerctage =
                (machine.mintingPower * countryMatch.percentage) / 100;
              additionalMintingPowerPercentage = countryMatch.percentage;
              // }

              startDatePromotion = promotion.startDate;
              endDatePromotion = promotion.endDate;
              isAdditionalMintingReward = true;

              break; // No need to check further if a valid promotion exists
            } else {
              const allMatch = countrySetting.countryList.find(
                (country) => country.name === countriesAllOptions.All,
              );
              if (allMatch && allMatch?.percentage > 0) {
                // if (isGetSingleProduct) {
                additionalMinitngPerctage =
                  (machine.mintingPower * allMatch.percentage) / 100;
                additionalMintingPowerPercentage = allMatch.percentage;
                // }

                startDatePromotion = promotion.startDate;
                endDatePromotion = promotion.endDate;
                isAdditionalMintingReward = true;

                break; // No need to check further if a valid promotion exists
              }
            }
          }

          if (isAdditionalMintingReward) break; // Exit loop if a valid match is found
        }
      }

      if (isAdditionalMintingReward) break; // Exit loop early if promotion is found
    }

    return {
      isAdditionalMintingReward,
      additionalMinitngPerctage,
      additionalMintingPowerPercentage,
      startDatePromotion,
      endDatePromotion,
      // Add other fields as needed
      isGenActiveRewards,
    };
  }

  async getMachineStakes(machineId: Types.ObjectId) {
    const pipeline: PipelineStage[] = [
      {
        $match: {
          machine: new Types.ObjectId(machineId),
          deletedAt: { $eq: null },
        },
      },
      {
        $sort: { createdAt: -1 },
      },
    ];

    return await this.machineStakesModel.aggregate(pipeline).exec();
  }

  async getClaimsHistory(userId: Types.ObjectId, paginateDTO: PaginateDTO) {
    const { page, limit } = paginateDTO;

    const pipeline: PipelineStage[] = [
      {
        $match: {
          user: new Types.ObjectId(userId),
          trxType: TrxType.CLAIMED_REWARD,
          deletedAt: { $eq: null },
        },
      },
      {
        $sort: { updatedAt: -1 },
      },
      {
        $lookup: {
          from: 'wallets',
          foreignField: '_id',
          localField: 'wallet',
          as: 'wallet',
          pipeline: [
            {
              $lookup: {
                from: 'tokens',
                foreignField: '_id',
                localField: 'token',
                as: 'token',
              },
            },
            {
              $unwind: {
                path: '$token',
                preserveNullAndEmptyArrays: true,
              },
            },
          ],
        },
      },
      {
        $unwind: {
          path: '$wallet',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 1,
          token: {
            name: '$wallet.token.name',
            symbol: '$wallet.token.symbol',
            iconUrl: '$wallet.token.iconUrl',
            color: '$wallet.token.color',
          },
          amount: 1,
          transactionFlow: 1,
        },
      },
    ];

    const list = await aggregatePaginate(
      this.walletService.walletTransactionModel,
      pipeline,
      page,
      limit,
    );
    return list;
  }

  async getMachineTotalStaked(userId: Types.ObjectId) {
    const pipeline: PipelineStage[] = [
      {
        $match: { user: new Types.ObjectId(userId), deletedAt: null },
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

  async getMachineTotalStakedV2(userId: Types.ObjectId) {
    const pipeline: PipelineStage[] = [
      {
        $match: { user: new Types.ObjectId(userId), deletedAt: { $eq: null } },
      },
      {
        $group: {
          _id: null,
          totalStaked: { $sum: '$stakedTokenAmount' },
        },
      },
    ];

    const result = await this.machineModel.aggregate(pipeline).exec();
    return result[0] ? result[0].totalStaked : 0;
  }

  async getMachineDetails(machineId: Types.ObjectId) {
    const machine: any = await this.machineModel.findById(machineId).populate([
      {
        path: 'stakeToken',
        select: 'name symbol iconUrl color',
      },
      {
        path: 'product',
      },
    ]);
    // let calculatedMintingPower: number = 0;
    // let additionalMintingPowerPercentage: any = null;
    // let isActiveMintingPercentage: boolean = false;
    let isGenActiveRewards: boolean = false;

    const rewards = await this.getUserMachineTotalRewards(machine._id as any);
    const totalStaked = await this.getMachineStakesAmount(machine._id as any);
    const profitGained = (rewards.lifetimeReward / totalStaked) * 100;
    if (
      machine?.product?.actveGenRewardPercentageId &&
      machine?.product?.genRewardPercentage > 0
    ) {
      isGenActiveRewards = true;
    }

    const {
      isAdditionalMintingReward: isActiveMintingPercentage,
      additionalMinitngPerctage,
      additionalMintingPowerPercentage,
      startDatePromotion,
      endDatePromotion,
    } = await this.getUserMachinesCampaign({
      userId: machine.user,
      productId: machine.product,
      isGetSingleProduct: true,
    });

    const data = {
      status:
        machine.endDate >= new Date() ? machine.status : STATUS_TYPE.INACTIVE,
      mintingPower: machine.mintingPower,
      lykPrice: machine.lockedPrice,
      dlp: machine.dlp,
      ath: machine.allTimeHigh,
      autoCompound: machine.autoCompound,
      rewards,
      expiry: machine.endDate,
      stakeLimit: machine.stakeLimit,
      stakeUnlimited: machine.stakeUnlimited,
      stakeToken: machine.stakeToken,
      totalStaked,
      profitGained: setDecimalPlaces(profitGained, AmountType.DOLLAR),
      boost: machine.boost,
      uniqueName: machine.uniqueName,
      startDate: machine.createdAt,
      endDate: machine.endDate,
      machinePrice: machine.product.price,
      isMachineConnected: machine?.isMachineConnected || false,
      // Additional Minting power
      additionalMintingPowerPercentage,
      additionalMinitngPerctage,
      isActiveMintingPercentage: isActiveMintingPercentage,
      startDatePromotion: startDatePromotion ?? null,
      endDatePromotion: endDatePromotion ?? null,
      // Active Gen
      isGenActiveRewards: isGenActiveRewards,
      productDetails: machine?.product || null,
    };
    return data;
  }

  async getMachineStakesAmount(machineId: Types.ObjectId) {
    const pipeline = [
      {
        $match: {
          machine: machineId,
          deletedAt: { $eq: null },
        },
      },
      {
        $project: {
          amount: {
            $cond: {
              if: { $eq: ['$type', CLOUDK_MACHINE_STAKE_TYPE.STAKE] },
              then: '$tokenAmount',
              else: { $multiply: ['$tokenAmount', -1] },
            },
          },
        },
      },
      {
        $group: {
          _id: '$machine',
          totalAmount: { $sum: '$amount' },
        },
      },
    ];

    const totalPriceResult = await this.machineStakesModel
      .aggregate(pipeline)
      .exec();

    return totalPriceResult[0]?.totalAmount || 0;
  }

  async getAllMachineStakesAmount() {
    const pipeline = [
      {
        $project: {
          machine: 1,
          amount: {
            $cond: {
              if: { $eq: ['$type', CLOUDK_MACHINE_STAKE_TYPE.STAKE] },
              then: '$tokenAmount',
              else: { $multiply: ['$tokenAmount', -1] },
            },
          },
        },
      },
      {
        $group: {
          _id: '$machine',
          totalAmount: { $sum: '$amount' },
        },
      },
    ];

    const totalPriceResult = await this.machineStakesModel
      .aggregate(pipeline)
      .exec();

    return totalPriceResult;
  }

  async getMachineTotalCollatoral(machineId: Types.ObjectId) {
    const pipeline = [
      {
        $match: {
          machine: machineId,
          deletedAt: { $eq: null },
        },
      },
      {
        $project: {
          amount: {
            $cond: {
              if: { $eq: ['$type', CLOUDK_MACHINE_STAKE_TYPE.STAKE] },
              then: '$totalPrice',
              else: { $multiply: ['$totalPrice', -1] },
            },
          },
        },
      },
      {
        $group: {
          _id: '$machine',
          totalPrice: { $sum: '$amount' },
        },
      },
    ];

    const totalPriceResult = await this.machineStakesModel
      .aggregate(pipeline)
      .exec();

    return totalPriceResult[0]?.totalPrice || 0;
  }

  async getAllMachineTotalCollatoral() {
    const pipeline = [
      {
        $match: {
          deletedAt: { $eq: null },
        },
      },
      {
        $project: {
          machine: 1,
          amount: {
            $cond: {
              if: { $eq: ['$type', CLOUDK_MACHINE_STAKE_TYPE.STAKE] },
              then: '$totalPrice',
              else: { $multiply: ['$totalPrice', -1] },
            },
          },
        },
      },
      {
        $group: {
          _id: '$machine',
          totalPrice: { $sum: '$amount' },
        },
      },
    ];

    const totalPriceResult = await this.machineStakesModel
      .aggregate(pipeline)
      .exec();

    return totalPriceResult;
  }

  async getUserMachineRewards(
    userId: Types.ObjectId | string,
    filters: {
      page?: number;
      limit?: number;
      claimed?: boolean;
      date?: DateFilter;
      machineId?: string;
    },
  ) {
    const { claimed, date, machineId } = filters;
    const matchConditions: any[] = [
      { user: new Types.ObjectId(userId), deletedAt: { $eq: null } },
    ];

    if (claimed) {
      matchConditions.push({ 'machine.claimed': claimed });
    }

    if (machineId) {
      matchConditions.push({ machine: new Types.ObjectId(machineId) });
    }

    if (date) {
      const { startDate, endDate } = await getDateRange(date);
      matchConditions.push({
        createdAt: {
          $gte: startDate,
          $lte: endDate,
        },
      });
    }

    const pipeline: PipelineStage[] = [
      {
        $match: {
          $and: matchConditions,
        },
      },
      {
        $lookup: {
          localField: 'machine',
          foreignField: '_id',
          as: 'machine',
          from: 'cloudkmachines',
        },
      },
      {
        $unwind: '$machine',
      },
      {
        $sort: { createdAt: -1 },
      },
    ];

    const data = await aggregatePaginate(
      this.rewardModel,
      pipeline,
      Number(filters.page),
      Number(filters.limit),
    );

    return data;
  }

  async getUserMachineTotalRewards(machineId: Types.ObjectId) {
    const pipeline: PipelineStage[] = [
      {
        $match: { machine: new Types.ObjectId(machineId), deletedAt: null },
      },
      {
        $group: {
          _id: null,
          lifetimeReward: { $sum: '$tokenAmount' },
          claimableRewards: {
            $sum: {
              $cond: {
                if: { $eq: ['$claimed', false] },
                then: '$tokenAmount',
                else: 0,
              },
            },
          },
        },
      },
    ];

    const totalRewardsResult = await this.rewardModel
      .aggregate(pipeline)
      .exec();

    return totalRewardsResult.length > 0
      ? totalRewardsResult[0]
      : { lifetimeReward: 0, claimableRewards: 0 };
  }

  async getAllUserMachineTotalRewards() {
    const pipeline: PipelineStage[] = [
      {
        $match: {
          deletedAt: null,
        },
      },
      {
        $project: {
          machine: 1,
          tokenAmount: 1,
          claimed: 1,
        },
      },
      {
        $group: {
          _id: '$machine',
          lifetimeReward: { $sum: '$tokenAmount' },
          claimableRewards: {
            $sum: {
              $cond: {
                if: { $eq: ['$claimed', false] },
                then: '$tokenAmount',
                else: 0,
              },
            },
          },
        },
      },
    ];

    const totalRewardsResult = await this.rewardModel
      .aggregate(pipeline)
      .exec();

    return totalRewardsResult;
  }

  async getUserTotalRewards(userId: string | Types.ObjectId) {
    const pipeline: PipelineStage[] = [
      {
        $match: {
          user: new Types.ObjectId(userId),
          deletedAt: { $eq: null },
        },
      },
      {
        $group: {
          _id: null,
          lifetimeReward: { $sum: '$tokenAmount' },
          claimableRewards: {
            $sum: {
              $cond: {
                if: { $eq: ['$claimed', false] },
                then: '$tokenAmount',
                else: 0,
              },
            },
          },
        },
      },
    ];

    const cloudkSettings = await this.getCurrentCloudkSettings();

    const userStakingBalance = await this.walletService.getBalanceByToken(
      new Types.ObjectId(userId),
      cloudkSettings.stakeToken._id as Types.ObjectId,
    );

    const totalStaked = await this.getMachineTotalStaked(
      new Types.ObjectId(userId),
    );

    const totalRewardsResult = await this.rewardModel
      .aggregate(pipeline)
      .exec();

    let claimable_rewards = totalRewardsResult[0]?.claimableRewards || 0;

    const extraClaimed: any = await this.cloudkTransactionModel.findOne({
      user: userId,
      'meta.type': 'extra_claim',
      'meta.status': 'pending',
    });

    if (extraClaimed) {
      claimable_rewards = claimable_rewards + extraClaimed.tokenAmount;
    }

    // const settings = await this.cloudKSettingsModel
    //   .findOne({})
    //   .populate('rewardToken stakeToken');

    const data = {
      lifetimeReward: totalRewardsResult[0]?.lifetimeReward || 0,
      claimableRewards: claimable_rewards,
      stakeToken: cloudkSettings.stakeToken,
      rewardToken: cloudkSettings.rewardToken,
      token: {
        totalStaked: totalStaked,
        available: userStakingBalance.balance,
        name: userStakingBalance.name,
      },
    };

    return data;
  }

  async getUserTotalRewardsResult(userId: string | Types.ObjectId) {
    // const totalRewardResultCache = await this.cacheService.getCacheUser({
    //   type: CACHE_TYPE.TOTAL_REWARD_RESULT,
    //   user: String(userId),
    // });

    // if (totalRewardResultCache) {
    //   return totalRewardResultCache;
    // }
    const pipeline: PipelineStage[] = [
      {
        $match: {
          user: new Types.ObjectId(userId),
          deletedAt: { $eq: null },
        },
      },
      {
        $group: {
          _id: null,
          lifetimeReward: { $sum: '$tokenAmount' },
          claimableRewards: {
            $sum: {
              $cond: {
                if: { $eq: ['$claimed', false] },
                then: '$tokenAmount',
                else: 0,
              },
            },
          },
        },
      },
    ];

    const cloudkSettings = await this.getCurrentCloudkSettings();

    // const userStakingBalance = await this.walletService.getBalanceByToken(
    //   new Types.ObjectId(userId),
    //   cloudkSettings.stakeToken._id as Types.ObjectId,
    // );

    // const totalStaked = await this.getMachineTotalStaked(
    //   new Types.ObjectId(userId),
    // );

    const totalRewardsResult = await this.rewardModel
      .aggregate(pipeline)
      .exec();

    let claimable_rewards = totalRewardsResult[0]?.claimableRewards || 0;

    const extraClaimed: any = await this.cloudkTransactionModel.findOne({
      user: userId,
      'meta.type': 'extra_claim',
      'meta.status': 'pending',
    });

    if (extraClaimed) {
      claimable_rewards = claimable_rewards + extraClaimed.tokenAmount;
    }

    // const settings = await this.cloudKSettingsModel
    //   .findOne({})
    //   .populate('rewardToken stakeToken');

    const data = {
      lifetimeReward: totalRewardsResult[0]?.lifetimeReward || 0,
      claimableRewards: claimable_rewards,
      stakeToken: cloudkSettings.stakeToken,
      rewardToken: cloudkSettings.rewardToken,
      // token: {
      //   totalStaked: totalStaked,
      //   available: userStakingBalance.balance,
      //   name: userStakingBalance.name,
      // },
    };
    await this.cacheService.setCacheUser(
      {
        type: CACHE_TYPE.TOTAL_REWARD_RESULT,
        user: String(userId),
        data: data,
      },
      86400,
    );

    return data;
  }

  async getUserClaimTotalRewardsResult(userId: string | Types.ObjectId) {
    // const rewardCacheData = await this.cacheService.getCacheUser({
    //   type: CACHE_TYPE.REWARD_CLAIMABLE_RESULT,
    //   user: String(userId),
    // });

    // if (rewardCacheData) {
    //   return rewardCacheData;
    // }

    const cloudkSettings = await this.getCurrentCloudkSettings();

    const userStakingBalance = await this.walletService.getBalanceByToken(
      new Types.ObjectId(userId),
      cloudkSettings.stakeToken._id as Types.ObjectId,
    );

    // const populateWallet = await this.walletModel
    //   .find({
    //     user: userId,
    //     token: cloudkSettings.stakeToken._id,
    //     deletedAt: null,
    //   })
    //   .populate('token');

    // const available =
    //   populateWallet && populateWallet.length > 0
    //     ? populateWallet[0].totalBalanceinToken
    //     : 0;

    const totalStaked = await this.getMachineTotalStaked(
      new Types.ObjectId(userId),
    );
    // const machine = await this.machineModel
    //   .findOne({ user: new Types.ObjectId(userId), deletedAt: { $eq: null } })
    //   .sort({ createdAt: -1 })
    //   .populate('stakeToken');

    const data = {
      stakeToken: cloudkSettings.stakeToken,
      rewardToken: cloudkSettings.rewardToken,
      token: {
        totalStaked: totalStaked,
        available: userStakingBalance.balance,
        name: cloudkSettings.stakeToken.name,
      },
    };

    // await this.cacheService.setCacheUser(
    //   {
    //     type: CACHE_TYPE.REWARD_CLAIMABLE_RESULT,
    //     user: String(userId),
    //     data: data,
    //   },
    //   86400,
    // );

    return data;
  }

  async newClaimRewards(claimRewardsDto: ClaimRewardsDto) {
    const settings = await this.getCurrentKillSettings();

    if (!settings.claimEnabled) {
      throw new HttpException(
        'Claim is currently disabled, please try again later',
        400,
      );
    }
    const user = await this.myBlockchainIdService.syncUserByBid(
      claimRewardsDto.bid,
    );
    const _token = await this.tokenService.findTokenBysymbol(
      claimRewardsDto.token,
    );

    if (!user) throw new HttpException('BID not fount!', 400);
    const cloudkSettings = await this.getCurrentCloudkSettings();
    const userRewardWallet =
      await this.walletService.findUserWalletByTokenSymbolV2(
        _token._id,
        user._id,
      );

    if (!userRewardWallet)
      throw new HttpException(
        `${cloudkSettings.rewardToken.symbol} wallet not found`,
        400,
      );

    const session = await this.connection.startSession();
    await session.startTransaction();

    try {
      const { walletBalance } = await this.walletService.getBalanceByWallet(
        user._id,
        userRewardWallet._id,
      );
      const claimedTrx = await this.walletService.createRawWalletTransaction(
        {
          user: user._id,
          wallet: userRewardWallet._id,
          trxType: TrxType.CLAIMED_REWARD,
          amount: claimRewardsDto.amount,
          transactionFlow: TransactionFlow.IN,
        },
        session,
      );

      const { serialNumber: sN, requestId } =
        await this.walletService.generateUniqueRequestId(
          TrxType.CLAIMED_REWARD,
        );
      const amount = Number(claimRewardsDto.amount);
      const formattedAmount = isNaN(amount)
        ? '0'
        : truncateNumber(amount, 6).toString();

      const newDeposit = new this.walletService.depositTransactionModel({
        user: user._id,
        toWallet: userRewardWallet._id,
        toWalletTrx: claimedTrx[0]._id,
        amount: claimRewardsDto.amount,
        confirmation: '0',
        hash: TrxType.CLAIMED_REWARD,
        onChainWallet: null,
        serialNumber: sN,
        requestId,
        transactionStatus: TransactionStatus.SUCCESS,
        newBalance: walletBalance + claimRewardsDto.amount,
        previousBalance: walletBalance,
        remarks: `Reward Claim via CloudK of ${formattedAmount} ${_token?.symbol} processed successfully.`,
        token: userRewardWallet?.token || null,
        network: null,
        blockchainId: claimRewardsDto?.bid || user?.blockchainId || null,
      });
      await newDeposit.save({ session });

      const newDepositTransactionHistory =
        new this.walletService.depositTransactionHistoryModel({
          deposit_id: newDeposit._id,
          from: Deposit_Transaction_Type.Deposit,
          user: user._id,
          toWallet: userRewardWallet._id,
          toWalletTrx: claimedTrx[0]._id,
          type: claimedTrx[0]?.trxType || 'deposit',
          amount: claimRewardsDto.amount,
          confirmation: '0',
          hash: TrxType.CLAIMED_REWARD,
          onChainWallet: null,
          serialNumber: sN,
          requestId,
          transactionStatus: TransactionStatus.SUCCESS,
          newBalance: walletBalance + claimRewardsDto.amount,
          previousBalance: walletBalance,
          remarks: `Reward Claim via CloudK of ${formattedAmount} ${_token?.symbol} processed successfully.`,
          token: userRewardWallet?.token || null,
          network: null,
          blockchainId: claimRewardsDto?.bid || user?.blockchainId || null,
        });
      await newDepositTransactionHistory.save({ session });

      await this.rewardModel.updateMany(
        { claimed: false, user: user._id },
        { claimed: true, claimedTrx: claimedTrx[0]._id },
        {
          session,
        },
      );

      const currentPrice = await this.getCurrentPrice();
      await this.createCloudKTransaction(
        {
          tokenAmount: claimRewardsDto.amount,
          type: CloudKTransactionTypes.REWARDS_CLAIMED,
          user: user._id,
          token: userRewardWallet.token,
        },
        session,
      );

      await session.commitTransaction();

      return 'Tokens Claimed Successfully';
    } catch (error) {
      await session.abortTransaction();

      // console.log({
      //   claimeError: error,
      // });
      throw new HttpException('Failed to claim tokens', 400);
    } finally {
      session.endSession();
    }
  }
  async claimRewards(userId: string) {
    const settings = await this.getCurrentKillSettings();

    if (!settings.claimEnabled) {
      throw new HttpException(
        'Claim is currently disabled, please try again later',
        400,
      );
    }

    const pipeline = [
      {
        $match: {
          claimed: false,
          user: new Types.ObjectId(userId),
          deletedAt: null,
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$tokenAmount' },
        },
      },
    ];

    const claimableRewards = await this.rewardModel.aggregate(pipeline).exec();

    let amountToClaim =
      claimableRewards.length > 0 ? claimableRewards[0].total : 0;

    const extraClaimed = await this.cloudkTransactionModel.findOne({
      user: userId,
      'meta.type': 'extra_claim',
      'meta.status': 'pending',
    });

    if (extraClaimed) {
      if (amountToClaim < 0 - extraClaimed.tokenAmount) {
        throw new Error("You can't claim right now. please try again next day");
      }

      amountToClaim = amountToClaim + extraClaimed.tokenAmount; // extraClaimed.tokenAmount already minus amount thatwhy we add this +
    }

    if (!extraClaimed && amountToClaim <= 0) {
      return 'Nothing to claim';
    }

    const cloudkSettings = await this.getCurrentCloudkSettings();

    // const userWithdrawWallet =
    //   await this.walletService.findUserWalletByTokenSymbol(
    //     cloudkSettings.rewardToken.symbol,
    //     new Types.ObjectId(userId),
    //   );

    const userRewardWallet =
      await this.walletService.findUserWalletByTokenSymbol(
        cloudkSettings.rewardToken.symbol,
        new Types.ObjectId(userId),
      );

    // if (!userWithdrawWallet)
    //   throw new HttpException('User LYK-D wallet not found', 400);
    if (!userRewardWallet)
      throw new HttpException(
        `${cloudkSettings.rewardToken.symbol} wallet not found`,
        400,
      );

    const session = await this.connection.startSession();
    await session.startTransaction();

    try {
      const userData = await this.usermModel.findOne({
        _id: new Types.ObjectId(userId),
      });
      const { price } = await this.getCurrentPrice();
      const { walletBalance } = await this.walletService.getBalanceByWallet(
        new Types.ObjectId(userId),
        userRewardWallet._id,
      );
      // const claimedTrx = await this.walletService.createWalletTransaction(
      //   {
      //     user: new Types.ObjectId(userId),
      //     wallet: userWithdrawWallet._id,
      //     trxType: TrxType.CLAIMED_REWARD,
      //     amount: amountToClaim,
      //     transactionFlow: TransactionFlow.IN,
      //   },
      //   session,
      // );

      // deduct from due balance
      let DueMetaData: DueReferenceMetaData = {
        type: DueType.NODEK,
      };
      const {
        remainingBalance,
        isDeducted,
        isAllowtoTransactions,
        usdAmount,
        DueWithdrawID,
        DueWalletTransactionId,
        DueWalletId,
        deductedBalance,
        dueWalletBalance,
      } = await this.walletDepositService.deductDueWalletBalance({
        userId: new Types.ObjectId(userId),
        token: userRewardWallet.token,
        fromAmount: amountToClaim,
        amount: amountToClaim,
        tokenPrice: price,
        isDebitEnable: true,
        trxType: TrxType.CLAIMED_REWARD,
        dueType: DueType.NODEK,
        beforeWalletBalance: walletBalance,
        session: session,
      });

      const totalAmount = amountToClaim;

      amountToClaim = remainingBalance;

      const { note, meta, userRemarks } = await generateNoteTransactionDetails({
        trxType: TrxType.CLAIMED_REWARD,
        fromAmount: totalAmount || 0,
        amount: totalAmount,
        fromBid: userData?.blockchainId,
        receiverAddress: userData?.blockchainId,
        fee: 0,
        commission: 0,
        beforeWalletBalance: walletBalance,
        isDeducted: isDeducted,
        dueWalletBalance: dueWalletBalance,
        deductedAmount: deductedBalance,
        balanceAmount: amountToClaim,
        tokenPrice: price,
        actualTokenData: userRewardWallet?.token,
        fromRequestedAmount: totalAmount,
      });
      const claimedTrx = await this.walletService.createRawWalletTransaction(
        {
          user: new Types.ObjectId(userId),
          wallet: userRewardWallet._id,
          trxType: TrxType.CLAIMED_REWARD,
          amount: amountToClaim,
          transactionFlow: TransactionFlow.IN,
          note: note,
          remark: userRemarks,
          meta: isDeducted
            ? {
                ...meta,
                dueWithdrawTransactionId: DueWithdrawID,
                dueType: DueType.NODEK,
                DueRemarks: isAllowtoTransactions
                  ? DueRemarks.NodeK_CLAIMED_PARTIAL_DEBIT_WITHDRAW
                  : DueRemarks.NodeK_CLAIMED_FULL_DEBIT_WITHDRAW,
              }
            : meta,
        },
        session,
      );

      const { serialNumber: sN, requestId } =
        await this.walletService.generateUniqueRequestId(
          TrxType.CLAIMED_REWARD,
        );

      const newDeposit = new this.walletService.depositTransactionModel({
        user: new Types.ObjectId(userId),
        toWallet: userRewardWallet._id,
        toWalletTrx: claimedTrx[0]._id,
        fromAmount: totalAmount,
        amount: amountToClaim,
        confirmation: 'nodek claim done',
        hash: TrxType.CLAIMED_REWARD,
        onChainWallet: null,
        serialNumber: sN,
        requestId,
        transactionStatus: TransactionStatus.SUCCESS,
        newBalance: walletBalance + amountToClaim,
        previousBalance: walletBalance,
        token: userRewardWallet?.token || null,
        network: null,
        // blockchainId: claimRewardsDto.bid || null,
        blockchainId: userData?.blockchainId || null,
        note: note,
        remarks: userRemarks,
        meta: isDeducted
          ? {
              ...meta,
              isDeducted: true,
              dueWithdrawTransactionId: DueWithdrawID,
              dueType: DueType.NODEK,
              DueRemarks: isAllowtoTransactions
                ? DueRemarks.NodeK_CLAIMED_PARTIAL_DEBIT_WITHDRAW
                : DueRemarks.NodeK_CLAIMED_FULL_DEBIT_WITHDRAW,
            }
          : meta,
      });
      await newDeposit.save({ session });

      const newDepositTransactionHistory =
        new this.walletService.depositTransactionHistoryModel({
          deposit_id: newDeposit._id,
          from: Deposit_Transaction_Type.Deposit,
          type: claimedTrx[0]?.trxType || 'deposit',
          user: new Types.ObjectId(userId),
          toWallet: userRewardWallet._id,
          toWalletTrx: claimedTrx[0]._id,
          fromAmount: totalAmount,
          amount: amountToClaim,
          fromToken: userRewardWallet?.token || null,
          confirmation: 'nodek claim done',
          hash: TrxType.CLAIMED_REWARD,
          onChainWallet: null,
          serialNumber: sN,
          requestId,
          transactionStatus: TransactionStatus.SUCCESS,
          newBalance: walletBalance + amountToClaim,
          previousBalance: walletBalance,
          token: userRewardWallet?.token || null,
          network: null,
          blockchainId: userData?.blockchainId || null,
          remarks: userRemarks,
          note: note,
          meta: isDeducted
            ? {
                ...meta,
                isDeducted: true,
                dueWithdrawTransactionId: DueWithdrawID,
                dueType: DueType.NODEK,
                DueRemarks: isAllowtoTransactions
                  ? DueRemarks.NodeK_CLAIMED_PARTIAL_DEBIT_WITHDRAW
                  : DueRemarks.NodeK_CLAIMED_FULL_DEBIT_WITHDRAW,
              }
            : meta,
        });
      await newDepositTransactionHistory.save({ session });

      if (isDeducted) {
        DueMetaData = {
          ...DueMetaData,
          depositTransactionId: newDeposit._id,
        };
      }

      await this.rewardModel.updateMany(
        { claimed: false, user: new Types.ObjectId(userId) },
        { claimed: true, claimedTrx: claimedTrx[0]._id },
        {
          session,
        },
      );

      const cloudkTransaction = await this.createCloudKTransaction(
        {
          tokenAmount: amountToClaim,
          type: CloudKTransactionTypes.REWARDS_CLAIMED,
          user: userId,
          token: userRewardWallet.token,
          lykPrice: price,
          note: note,
          remark: userRemarks,
          meta: isDeducted
            ? {
                dueWithdrawTransactionId: DueWithdrawID,
                type: DueType.NODEK,
                DueRemarks: isAllowtoTransactions
                  ? DueRemarks.NodeK_CLAIMED_PARTIAL_DEBIT_WITHDRAW
                  : DueRemarks.NodeK_CLAIMED_FULL_DEBIT_WITHDRAW,
              }
            : null,
        },
        session,
      );

      if (isDeducted) {
        DueMetaData = {
          ...DueMetaData,
          fromAmount: totalAmount,
          fromToken: userRewardWallet?.token || null,
          fromWallet: userRewardWallet._id,
          deductedAmount: amountToClaim,
          tokenPrice: price,
          amount: remainingBalance,
          type: DueType.NODEK,
          DueRemark: isAllowtoTransactions
            ? DueRemarks.NodeK_CLAIMED_PARTIAL_DEBIT_WITHDRAW
            : DueRemarks.NodeK_CLAIMED_FULL_DEBIT_WITHDRAW,
          duewalletId: DueWalletId,
          fromWalletTrx: claimedTrx[0]._id,
          dueWalletTransactionId: DueWalletTransactionId,
          cloudkTransactionId: cloudkTransaction[0]?._id as Types.ObjectId,
        };
        await this.walletDepositService.UpdateMetaInDueTransaction({
          DueMeta: DueMetaData,
          dueTransactionId: DueWithdrawID,
          note: note,
          session: session,
        });
      }

      if (extraClaimed) {
        extraClaimed.meta.status = 'claimed';
        extraClaimed.markModified('meta'); // Tell Mongoose this field has changed
        await extraClaimed.save();
      }

      const aRewardValue = await this.getRewardTokenValues(userId);
      for (const reward of aRewardValue) {
        await this.updateCloudkMachineRewardValue(reward);
      }

      await session.commitTransaction();

      await this.cacheService.deleteUserCache({
        type: CACHE_TYPE.TOTAL_REWARD_RESULT,
        user: userId,
      });
      const formattedTotalAmount = await formatToFixed5(totalAmount);
      const formattedDeductedBalance = await formatToFixed5(deductedBalance);
      if (formattedDeductedBalance > 0 || isDeducted) {
        return `You have successfully claimed ${formattedTotalAmount} LYK-W. $${formattedDeductedBalance} will be deducted from your ${StaticToken.DEBIT} wallet.`;
      } else {
        return `${formattedTotalAmount} LYK-W Claimed Successfully`;
      }
    } catch (error) {
      await session.abortTransaction();

      console.log({
        claimeError: error,
      });
      throw new HttpException('Failed to claim tokens', 400);
    } finally {
      session.endSession();
    }
  }

  async stakeIntoMachine(machineId: string, userId: string, amount: number) {
    const settings = await this.getCurrentKillSettings();

    if (!settings.stakeEnabled) {
      throw new HttpException(
        'Staking is currently disabled, please try again later',
        400,
      );
    }

    const user = new Types.ObjectId(userId);
    const machine = await this.machineModel
      .findOne({
        _id: machineId,
        user: userId,
      })
      .populate('stakeToken');

    if (!machine) throw new HttpException('No such machine', 400);

    const stakeWallet = await this.walletService.findUserWalletByTokenSymbol(
      machine.stakeToken.symbol,
      user,
    );
    if (!stakeWallet)
      throw new HttpException(
        `${machine.stakeToken.symbol} wallet not found`,
        400,
      );

    const currentPrice = await this.getCurrentPrice();

    const stakeWalletBalance = await this.wallet.find({
      user: user,
      token: stakeWallet.token._id,
    });
    // const stakeWalletBalance = await this.walletService.getBalanceByToken(
    //   user,
    //   stakeWallet.token._id,
    // );

    if (stakeWalletBalance[0].totalBalanceinToken < amount) {
      throw new HttpException('Insufficient tokens in the wallet', 400);
    }

    const totalStakedInMachine = await this.getMachineTotalCollatoral(
      machine._id as Types.ObjectId,
    ); // must come in dollars

    if (
      machine.stakeLimit &&
      machine.stakeLimit < totalStakedInMachine + amount * currentPrice.price
    ) {
      throw new HttpException('Stake limit exceeded', 400);
    }

    const session = await this.connection.startSession();
    await session.startTransaction();

    try {
      const walletTransactionArray =
        await this.walletService.createRawWalletTransaction(
          {
            amount: amount,
            wallet: stakeWallet._id,
            transactionFlow: TransactionFlow.OUT,
            trxType: TrxType.STAKE,
            user: machine.user,
          },
          session,
        );

      const walletTransaction =
        walletTransactionArray.length > 0 ? walletTransactionArray[0] : null;

      const message = `stake-in-dollar = ${currentPrice.price} * ${amount} | stake in token ${machine.stakeToken.symbol} = ${amount}`;

      const stake = await this.addStake({
        session: session,
        machineId: new mongoose.Types.ObjectId(machineId),
        userId: new Types.ObjectId(userId),
        type: CLOUDK_MACHINE_STAKE_TYPE.STAKE,
        from: STAKE_FROM.MORE_STAKE,
        totalToken: amount,
        lykPrice: currentPrice.price,
        walletTransactionId: new Types.ObjectId(walletTransaction._id),
        extraMessage: message,
      });

      // await this.machineStakesModel.create(
      //   [
      //     {
      //       tokenAmount: amount, // // how many token
      //       totalPrice: currentPrice.price * amount,  // dollar amount
      //       machine: machine._id,
      //       perTokenPrice: currentPrice.price, // lyk price
      //       type: CLOUDK_MACHINE_STAKE_TYPE.STAKE,
      //       user: new Types.ObjectId(userId),
      //       walletTransaction: walletTransaction._id,
      //       note: message,
      //       from: STAKE_FROM.MORE_STAKE
      //     },
      //   ],
      //   {
      //     session,
      //   },
      // );

      const snGaskSetting = await this.snGaskSettingModel.findOne(); // todo get updates one using supernoderService
      const multiplier = snGaskSetting.multiplier || 3;

      await this.userGaskModel.create(
        [
          {
            user: new Types.ObjectId(userId),
            amount: stake.totalPrice * multiplier, // dollar value
            flow: TransactionFlow.IN,
            stake: stake._id,
            multiplier: multiplier,
            machine: machine._id,
          },
        ],
        { session },
      );
      await this.cacheService.deleteUserCache({
        type: CACHE_TYPE.ACTIVE_USER,
        user: userId,
      });

      machine.collatoral += currentPrice.price * amount;
      machine.stakedTokenAmount += amount;
      machine.status = CLOUDK_MACHINE_STATUS.ACTIVE;
      await machine.save({ session });

      await this.createCloudKTransaction(
        {
          tokenAmount: amount,
          type: CloudKTransactionTypes.ADD_STAKE,
          user: machine.user,
          machine: machine._id as Types.ObjectId,
          totalTokenPrice: currentPrice.price * amount,
          token: stakeWallet.token,
          stake: String(stake._id),
        },
        session,
      );

      const user = await this.usermModel.findById(userId, {}, { session });
      if (user) {
        user.isBuilderGenerationActive =
          await this.supernodeService.isBuilderGenerationUserActiveNode(
            new Types.ObjectId(userId),
            session,
          );

        user.isBaseReferralActive =
          (
            await this.supernodeService.baseRefereralUserActiveMachine(
              new Types.ObjectId(userId),
              session,
            )
          )?.status ?? false;

        await user.save({ session });
      }

      await session.commitTransaction();
      return 'Tokens staked successfully';
    } catch (error) {
      await session.abortTransaction();
      throw new HttpException(error.message, 400);
    } finally {
      session.endSession();
    }
  }

  async getCurrentInflationRulesData() {
    const inflation = await this.inflationModel
      .findOne({})
      .sort({ createdAt: -1 })
      .select('name adminNote');

    const rules = await this.inflationRulesModel
      .find({
        inflation: inflation._id,
      })
      .sort({ dropPercentage: 1 })
      .select('-_id -inflation -createdAt -updatedAt');

    return {
      inflation,
      rules,
    };
  }

  /**
   *
   * @param userId
   * @returns
   * @descricated we will update a flag in user schema when a user purchase a machine.
   */
  async userMachinePurshaed(userId) {
    const data = await this.machineModel.findOne({
      user: new Types.ObjectId(userId),
    });

    if (data) {
      return {
        isMachinePurshaed: true,
      };
    }

    return {
      isMachinePurshaed: false,
    };
  }

  async getInflationRulesHistory() {
    const inflation = await this.inflationModel
      .find({})
      .sort({ createdAt: -1 })
      .select('name adminNote');

    const data = [];

    for (const inf of inflation) {
      const rules = await this.inflationRulesModel
        .find({
          inflation: inf._id,
        })
        .sort({ dropPercentage: 1 })
        .select('-_id -inflation -createdAt -updatedAt');

      data.push({
        inflation: inf,
        rules,
      });
    }

    return data;
  }

  validateInflationRulesArray(inflationRules: InflationRulePayload[]): void {
    for (let i = 1; i < inflationRules.length; i++) {
      if (
        inflationRules[i].dropPercentage < inflationRules[i - 1].dropPercentage
      ) {
        throw new Error(
          `dropPercentage is not in ascending order at index ${i}`,
        );
      }
    }
  }

  async createInflationRules(data: InflationRulesDto) {
    try {
      this.validateInflationRulesArray(data.rules);
    } catch (err) {
      throw new HttpException(err.message, 400);
    }

    const inflation = await this.inflationModel.create({
      name: data.name,
      adminNote: data.adminNote,
    });

    const newRules = data.rules.map((rule) => ({
      ...rule,
      inflation: inflation._id,
    }));

    const rules = await this.inflationRulesModel.create(newRules);

    return {
      inflation,
      rules,
    };
  }

  async getUserGlobalAutoComplete(userId: Types.ObjectId) {
    let autoCompound = await this.globalAutoCompoundModel.findOne({
      user: userId,
    });
    if (!autoCompound) {
      autoCompound = await this.globalAutoCompoundModel.create({
        user: userId,
      });
    }
    return {
      enabled: autoCompound.enabled,
    };
  }
  async getDueBalance(userId: any): Promise<{ token: any; balance: number }> {
    const tokenData =
      await this.tokenService.findTokenBysymbol(DUE_WALLET_SYMBOL);

    const userWallet = await this.walletService.findUserWalletByTokenSymbol(
      DUE_WALLET_SYMBOL,
      userId,
    );

    if (!userWallet) {
      return { token: tokenData, balance: 0 };
    }
    const { walletBalance } = await this.walletService.getBalanceByWallet(
      userId,
      userWallet._id,
    );

    return {
      token: tokenData,
      balance: walletBalance,
    };
  }
  async setUserGlobalAutoCompound(userId: Types.ObjectId, enabled: boolean) {
    if (enabled) {
      const DueWalletBalanceCheck = await this.getDueBalance(userId);
      if (DueWalletBalanceCheck.balance > 0) {
        return `You cannot activate AutoCompound because your due wallet balance have ${DueWalletBalanceCheck.balance} USDT.`;
      }
    }
    let autoCompound = await this.globalAutoCompoundModel.findOne({
      user: userId,
    });

    if (!autoCompound) {
      autoCompound = await this.globalAutoCompoundModel.create({
        user: userId,
      });
    }

    await this.machineModel.updateMany(
      {
        user: userId,
        status: CLOUDK_MACHINE_STATUS.ACTIVE,
      },
      { autoCompound: enabled },
    );

    autoCompound.enabled = enabled;
    await autoCompound.save();

    return `Global Auto Compound ${enabled ? 'enabled' : 'disabled'} Successfully`;
  }

  async setMachineAutoCompound(
    userId: Types.ObjectId | string,
    machineId: Types.ObjectId,
    enabled: boolean,
  ) {
    const machine = await this.machineModel.findOne({
      user: userId,
      _id: machineId,
    });

    if (!machine) throw new HttpException('Invalid machine id', 400);

    //Commented out because Auto Compound Feature Implementation

    // const totalStaked = await this.getMachineTotalCollatoral(
    //   machine._id as Types.ObjectId,
    // );
    // if (
    //   enabled &&
    //   !machine.stakeUnlimited &&
    //   totalStaked + 5 >= machine.stakeLimit
    // )
    //   throw new HttpException(
    //     'Unable to stake into this machine. Stake limit too near to current stake amount',
    //     400,
    //   );

    if (!machine) throw new HttpException('Machine not found', 400);

    machine.autoCompound = enabled;
    await machine.save();

    let autoCompound = await this.globalAutoCompoundModel.findOne({
      user: userId,
    });

    if (!autoCompound) {
      autoCompound = await this.globalAutoCompoundModel.create({
        user: userId,
      });
    }
    if (enabled) {
      const machineList = await this.machineModel.find({
        user: userId,
        _id: { $ne: machineId },
        status: CLOUDK_MACHINE_STATUS.ACTIVE,
        autoCompound: false,
        $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
      });
      if (machineList.length > 0) {
        autoCompound.enabled = false;
      } else {
        autoCompound.enabled = true;
      }
    } else {
      autoCompound.enabled = enabled;
    }
    await autoCompound.save();
    return `Auto Compound ${enabled ? 'enabled' : 'disabled'} Successfully`;
  }

  async getCurrentBoostForMachines() {
    const isOverride = await this.overrideBoostModel.findOne({
      enabled: true,
      startTime: { $lte: new Date() },
      endTime: { $gte: new Date() },
    });

    if (isOverride) {
      return {
        boost: isOverride.boost,
      };
    }

    const inflation = await this.inflationModel
      .findOne({})
      .sort({ createdAt: -1 })
      .select('name adminNote');

    const currentPrice = await this.getCurrentPrice();
    const tokenAth = await this.tokenService.getTokenOnChainDayATHPrice();
    const compareFromPrice = tokenAth;

    const didPriceFall = currentPrice.price < compareFromPrice;

    if (!didPriceFall) return { boost: 0 };

    const percentageFall = 1 - currentPrice.price / compareFromPrice;

    const ruleApplied = await this.inflationRulesModel
      .find({
        inflation: inflation._id,
      })
      .sort({ dropPercentage: -1 })
      .findOne({
        dropPercentage: { $lte: percentageFall * 100 },
      });

    return {
      boost: ruleApplied ? ruleApplied.mintingBoost : 0,
    };
  }

  async createBoostOverride(createBoostDto: CreateCloudKOverrideBoostDto) {
    return await this.overrideBoostModel.create(createBoostDto);
  }

  async createNewCloudKSettings(cloudKSettingsDto: CloudKSettingsDto) {
    return await this.cloudKSettingsModel.create({
      stakeToken: cloudKSettingsDto.stakeToken,
      rewardToken: cloudKSettingsDto.rewardToken,
      bunInToken: cloudKSettingsDto.bunInToken,
    });
  }

  async getCurrentCloudkSettings() {
    const settings = await this.cloudKSettingsModel
      .findOne({ deletedAt: null })
      .sort({
        createdAt: -1,
      })
      .populate('stakeToken rewardToken burnInToken burnReceiveToken');

    return settings;
  }

  async createProduct(createCloudKProductDto: CreateCloudKProductDto) {
    return await this.productsModel.create(createCloudKProductDto);
  }

  async getAllProducts2() {
    const productsCacheData = await this.cacheService.getCacheUser({
      type: CACHE_TYPE.ALL_PRODUCTS,
      user: String('homnifi-platform'),
    });

    if (productsCacheData) {
      return {
        list: productsCacheData,
      };
    }

    const productsData = await this.productsModel.find();
    await this.cacheService.setCacheUser({
      type: CACHE_TYPE.ALL_PRODUCTS,
      user: String('homnifi-platform'),
      data: productsData,
    });

    return {
      list: productsData,
    };
  }
  async getAllProducts(paginateDTO?: PaginateDTO) {
    if (paginateDTO) {
      const { page, limit, query } = paginateDTO;
      // Escape special characters in the query string
      const escapedQuery = query
        ? query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
        : '';
      const searchQuery = query
        ? {
            $or: [
              { _id: query },
              { name: { $regex: escapedQuery, $options: 'i' } },
              { externalProductId: { $regex: query, $options: 'i' } },
              { licenseName: { $regex: query, $options: 'i' } },
            ],
          }
        : {};

      const matchStage = {
        $match: {
          ...searchQuery,
        },
      };
      const pipeline = [
        matchStage,
        {
          $sort: { price: 1 },
        },
      ];

      const results = await aggregatePaginate(
        this.productsModel,
        pipeline,
        page,
        limit,
      );

      return results;
    } else {
      return await this.productsModel.find({}).sort({
        price: 1,
      });
    }
  }

  async getAllProductsWithSort(paginateDTO?: ProductPaginateDTO) {
    if (paginateDTO) {
      const { page, limit, query, sort } = paginateDTO;
      const pageNum = Number(page);
      const limitNum = Number(limit);

      // Prepare sort query
      const sortQuery: Record<string, 1 | -1> = {};
      if (sort && typeof sort === 'object') {
        for (const key in sort) {
          sortQuery[key] = sort[key] === 'descending' ? -1 : 1;
        }
      } else {
        sortQuery.name = 1; // Default sorting
      }

      // Prepare search query
      let searchQuery: Record<string, any> = {};

      if (query) {
        if (/^\d+$/.test(query)) {
          // Query contains only numbers → filter by numeric fields
          searchQuery = { genRewardPercentage: Number(query) };
        } else {
          // Query is text-based → filter by allowed text fields
          searchQuery = {
            $or: [
              {
                name: {
                  $regex: query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'),
                  $options: 'i',
                },
              },
              { externalProductId: { $regex: query, $options: 'i' } },
              { licenseName: { $regex: query, $options: 'i' } },
            ],
          };
        }
      }
      try {
        const results = await this.productsModel
          .find(searchQuery)
          .sort(sortQuery)
          .skip((page - 1) * limit)
          .limit(limit);

        const totalCount = await this.productsModel.countDocuments(searchQuery);

        return {
          list: results,
          totalCount: totalCount,
          currentPage: pageNum,
          totalPages: Math.ceil(totalCount / limitNum),
        };
      } catch (error) {
        console.error('Error fetching products:', error);
        throw error;
      }
    } else {
      return await this.productsModel.find({}).sort({ name: 1 });
    }
  }

  async findProductById(productId: Types.ObjectId) {
    return await this.productsModel.findById(productId);
  }

  async updateProductById(
    id: string,
    updateCloudKProductDto: CreateCloudKProductDto,
  ) {
    const getProduct = await this.productsModel.findById(id);
    if (!getProduct) {
      throw new HttpException(`Product with ID ${id} not found`, 400);
    }

    const updateData: any = { ...updateCloudKProductDto };

    // if (
    //   getProduct.genRewardPercentage !==
    //   updateCloudKProductDto.genRewardPercentage
    // ) {
    //   // update all the status is false
    //   await this.genExtraRewardHistoryModel.updateMany(
    //     { productId: getProduct._id },
    //     { status: false },
    //   );
    //   // update new date
    //   const dataSet = new this.genExtraRewardHistoryModel({
    //     amount: updateCloudKProductDto.genRewardPercentage,
    //     productId: getProduct._id,
    //     status: true,
    //   });

    //   await dataSet.save();
    //   updateData.actveGenRewardPercentageId = dataSet._id;
    // }

    const updatedProduct = await this.productsModel.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true },
    );

    await this.cacheService.deleteUserCache({
      type: CACHE_TYPE.ALL_PRODUCTS,
      user: String('homnifi-platform'),
    });

    if (!updatedProduct) {
      throw new HttpException(`Product with ID ${id} not found`, 400);
    }
    return updatedProduct;
  }

  async getAcPenaltyHistory() {
    return await this.autoCompoundPenaltyModel.find({}).sort({
      createdAt: -1,
    });
  }

  async createAcPenalty(percentage: number) {
    return await this.autoCompoundPenaltyModel.create({
      percentage,
    });
  }

  async getAllUserMachinesCount(userId: string): Promise<number> {
    return this.machineModel
      .countDocuments({ user: new Types.ObjectId(userId) })
      .exec();
  }

  async getAllUserMachinesList(paginateDTO: MachineFilterDTO) {
    const {
      page,
      limit,
      query,
      machine,
      product,
      autoCompound,
      date,
      machineStatus,
    } = paginateDTO;

    const searchQuery: any = query
      ? {
          $and: [
            {
              $or: [
                { name: { $regex: query, $options: 'i' } },
                {
                  user: {
                    $eq: mongoose.Types.ObjectId.isValid(query)
                      ? new mongoose.Types.ObjectId(query)
                      : '(--)',
                  },
                },
                { 'userData.blockchainId': { $regex: query, $options: 'i' } },
                { 'userData.email': { $regex: query, $options: 'i' } },
                { uniqueName: { $regex: query, $options: 'i' } },
              ],
            },
            {
              $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
            },
          ],
        }
      : {
          $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
        };

    const productFilter: any = machine
      ? { _id: new mongoose.Types.ObjectId(machine) }
      : {};

    if (product) {
      productFilter.product = new mongoose.Types.ObjectId(product);
    }

    if (typeof autoCompound !== 'undefined') {
      searchQuery.autoCompound =
        autoCompound == AutoCompoundValues.YES ? true : false;
    }
    if (typeof date !== 'undefined') {
      const { startDate, endDate } = getDateRange(date);
      searchQuery.createdAt = {
        $gte: startDate,
        $lte: endDate,
      };
    }

    if (typeof machineStatus !== 'undefined') {
      searchQuery.status = machineStatus;
    }

    const matchStage = {
      $match: {
        ...searchQuery,
        ...productFilter,
      },
    };
    const pipeline = [
      {
        $sort: { createdAt: -1 },
      },
      {
        $lookup: {
          from: 'tokens',
          localField: 'stakeToken',
          foreignField: '_id',
          as: 'stakeToken',
        },
      },
      {
        $unwind: {
          path: '$stakeToken',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userData',
        },
      },
      {
        $unwind: {
          path: '$userData',
          preserveNullAndEmptyArrays: true,
        },
      },
      matchStage,
    ];

    const results = await aggregatePaginate(
      this.machineModel,
      pipeline,
      page,
      limit,
    );

    const data = [];

    for (const machine of results.list) {
      const stakedValue = await this.getMachineTotalCollatoral(
        machine._id as any,
      );
      const stakedTokens = await this.getMachineStakesAmount(
        machine._id as Types.ObjectId,
      );
      const rewards = await this.getUserMachineTotalRewards(machine._id as any);
      data.push({
        name: machine.name,
        imageUrl: machine.imageUrl,
        machineId: machine.externalMachineId,
        stake: {
          value: stakedValue,
          tokens: stakedTokens,
        },
        user: machine.userData,

        rewards,
        expiry: machine.endDate,
        stakeToken: {
          name: machine.stakeToken?.name,
          symbol: machine.stakeToken?.symbol,
          iconUrl: machine.stakeToken?.iconUrl,
          color: machine.stakeToken?.color,
        },
        _id: machine._id,
        status: machine.status,
        uniqueName: machine.uniqueName,
        stakeLimit: machine.stakeLimit,
        startDate: machine.createdAt,
        endDate: machine.endDate,
        product: machine.product,
        autoCompound: machine.autoCompound,
        createdAt: machine.createdAt,
      });
    }

    return {
      ...results,
      list: data,
    };
  }
  async getAllUserMachinesListv2(paginateDTO: MachineFilterDTO) {
    const {
      page,
      limit,
      query,
      machine,
      product,
      autoCompound,
      date,
      machineStatus,
    } = paginateDTO;

    const pageNum = Number(page);
    const limitNum = Number(limit);

    // Build the base query
    const baseQuery: any = {
      $and: [
        {
          $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
        },
        // {
        //   $or: [{ user: { $ne: null } }, { user: { $exists: true } }],
        // },
      ],
    };

    if (query) {
      // First find userID separately to avoid complex regex in main query
      const userID = await this.usermModel
        .findOne({
          $or: [
            { blockchainId: { $regex: query, $options: 'i' } },
            { email: { $regex: query, $options: 'i' } },
          ],
        })
        .select('_id')
        .lean();

      baseQuery.$and = [
        {
          $or: [
            { name: { $regex: query, $options: 'i' } },
            { user: userID?._id },
            { uniqueName: { $regex: query, $options: 'i' } },
          ],
        },
      ];

      if (mongoose.Types.ObjectId.isValid(query)) {
        baseQuery.$and[0].$or.push({
          user: new mongoose.Types.ObjectId(query),
        });
      }
    }

    if (machine) baseQuery._id = new mongoose.Types.ObjectId(machine);
    if (product) baseQuery.product = new mongoose.Types.ObjectId(product);
    if (typeof autoCompound !== 'undefined')
      baseQuery.autoCompound = autoCompound == AutoCompoundValues.YES;
    if (typeof machineStatus !== 'undefined') baseQuery.status = machineStatus;

    if (typeof date !== 'undefined') {
      const { startDate, endDate } = getDateRange(date);
      baseQuery.createdAt = { $gte: startDate, $lte: endDate };
    }

    // Get all machine IDs first for better index usage
    const machineIds = await this.machineModel
      .find(baseQuery)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .select('_id')
      .lean();

    // Get stake stats for all machines in one query
    const stakeStats = await this.machineStakesModel.aggregate([
      {
        $match: {
          machine: { $in: machineIds.map((m) => m._id) },
          deletedAt: null,
        },
      },
      {
        $group: {
          _id: '$machine',
          totalValue: {
            $sum: {
              $cond: {
                if: { $eq: ['$type', CLOUDK_MACHINE_STAKE_TYPE.STAKE] },
                then: '$totalPrice',
                else: { $multiply: ['$totalPrice', -1] },
              },
            },
          },
          totalTokens: {
            $sum: {
              $cond: {
                if: { $eq: ['$type', CLOUDK_MACHINE_STAKE_TYPE.STAKE] },
                then: '$tokenAmount',
                else: { $multiply: ['$tokenAmount', -1] },
              },
            },
          },
        },
      },
    ]);

    // Create a map for quick stake stats lookup
    const stakeStatsMap = stakeStats.reduce((acc, stat) => {
      acc[stat._id.toString()] = stat;
      return acc;
    }, {});

    // Get machine details with populated fields
    const machines = await this.machineModel
      .find({ _id: { $in: machineIds.map((m) => m._id) } })
      .sort({ createdAt: -1 })
      .populate('stakeToken', 'name symbol iconUrl color')
      .populate('user', 'name email blockchainId')
      .lean();

    // Transform the data
    const results = await Promise.all(
      machines.map(async (machine: any) => {
        const machineId = machine._id.toString();
        const stats = stakeStatsMap[machineId] || {
          totalValue: 0,
          totalTokens: 0,
        };
        const rewardData = await this.getUserMachineTotalRewards(machine._id);
        return {
          name: machine.name,
          imageUrl: machine.imageUrl,
          machineId: machine.externalMachineId,
          externalMachineId: machine.externalMachineId,
          stake: {
            value: machine.collatoral.toFixed(7),
            tokens: machine.stakedTokenAmount,
          },
          user: machine.user,
          rewards: {
            lifetimeReward: rewardData.lifetimeReward,
            claimableRewards: rewardData.claimableRewards,
          },
          expiry: machine.endDate,
          stakeToken: machine.stakeToken
            ? {
                name: machine.stakeToken.name,
                symbol: machine.stakeToken.symbol,
                iconUrl: machine.stakeToken.iconUrl,
                color: machine.stakeToken.color,
              }
            : null,
          _id: machine._id,
          status: machine.status,
          uniqueName: machine.uniqueName,
          stakeLimit: machine.stakeLimit,
          startDate: machine.createdAt || '',
          endDate: machine.endDate,
          product: machine.product,
          autoCompound: machine.autoCompound,
          lockedPrice: machine.lockedPrice,
          allTimeHigh: machine.allTimeHigh,
          boost: machine.boost,
          mintingPower: machine.mintingPower,
          dlp: machine.dlp,
          createdAt: machine.createdAt,
        };
      }),
    );

    const totalCount = await this.machineModel.countDocuments(baseQuery);

    return {
      list: results,
      totalCount: totalCount,
      currentPage: pageNum,
      totalPages: Math.ceil(totalCount / limitNum),
    };
  }
  async getSimulationMachinesList(paginateDTO: PaginateDTO) {
    const { page, limit } = paginateDTO;
    const pipeline = [
      {
        $lookup: {
          from: 'tokens',
          localField: 'stakeToken',
          foreignField: '_id',
          as: 'stakeToken',
        },
      },
      {
        $unwind: {
          path: '$stakeToken',
          preserveNullAndEmptyArrays: true,
        },
      },
    ];

    const machines = await aggregatePaginate(
      this.simulationMachineModel,
      pipeline,
      page,
      limit,
    );
    return machines;
  }

  async getAdminUserMachineRewards(machineId: string, filters) {
    const machine = await this.machineModel.findById(machineId);
    return await this.getUserMachineRewards(machine.user, filters);
  }

  async getOverallMachineTotalStaked() {
    const pipeline: PipelineStage[] = [
      {
        $match: { deletedAt: { $eq: null } },
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

  async getOverallUserTotalRewards() {
    const pipeline: PipelineStage[] = [
      {
        $group: {
          _id: null,
          lifetimeRewardPrice: { $sum: '$totalPrice' },
          claimableRewardsPrice: {
            $sum: {
              $cond: {
                if: { $eq: ['$claimed', false] },
                then: '$totalPrice',
                else: 0,
              },
            },
          },
        },
      },
    ];

    const totalStaked = await this.getOverallMachineTotalStaked();
    const cloudkSettings = await this.getCurrentCloudkSettings();
    const totalRewardsResult = await this.rewardModel
      .aggregate(pipeline)
      .exec();

    const balanceAggregation =
      await this.walletService.walletTransactionModel.aggregate([
        {
          $lookup: {
            from: 'wallets',
            foreignField: '_id',
            localField: 'wallet',
            as: 'wallet',
          },
        },
        {
          $unwind: {
            path: '$wallet',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $match: {
            'wallet.token': cloudkSettings.stakeToken._id,
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
          },
        },
        {
          $project: {
            _id: 0,
            balance: { $subtract: ['$incomingBalance', '$outgoingBalance'] },
          },
        },
      ]);

    const walletBalance = balanceAggregation[0]?.balance || 0;

    const data = {
      lifetimeReward: totalRewardsResult[0]?.lifetimeRewardPrice || 0,
      claimableRewards: totalRewardsResult[0]?.claimableRewardsPrice || 0,
      stakeToken: cloudkSettings.stakeToken,
      rewardToken: cloudkSettings.rewardToken,
      token: {
        totalStaked: totalStaked,
        available: walletBalance,
        name: cloudkSettings.stakeToken.name,
      },
    };

    return data;
  }

  async getDailyCronjobData(paginateDTO: PaginateDTO, status: string = 'All') {
    const page = Number(paginateDTO.page) || 1;
    const limit = Number(paginateDTO.limit) || 10;
    const allStatuses = [
      'intiated',
      'not-initiated',
      'success',
      'failed',
      'partial-success',
    ];

    const pipeline: PipelineStage[] = [
      {
        $sort: { createdAt: -1 },
      },
      {
        $lookup: {
          from: 'cloudkmachines',
          foreignField: '_id',
          localField: 'failedMachine',
          as: 'failedMachine',
        },
      },
      {
        $unwind: {
          path: '$failedMachine',
          preserveNullAndEmptyArrays: true,
        },
      },
      // Conditionally add $match stage for status
      ...(status && status !== 'All'
        ? [
            {
              $match: { status },
            },
          ]
        : []),
      {
        $facet: {
          totalCount: [{ $count: 'total' }],
          paginatedResults: [{ $skip: (page - 1) * limit }, { $limit: limit }],
          statusCounts: [
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 },
              },
            },
          ],
        },
      },
      {
        $addFields: {
          statusCounts: {
            $map: {
              input: allStatuses,
              as: 'status',
              in: {
                status: '$$status',
                count: {
                  $let: {
                    vars: {
                      match: {
                        $arrayElemAt: [
                          {
                            $filter: {
                              input: '$statusCounts',
                              cond: { $eq: ['$$this._id', '$$status'] },
                            },
                          },
                          0,
                        ],
                      },
                    },
                    in: { $ifNull: ['$$match.count', 0] },
                  },
                },
              },
            },
          },
        },
      },
    ];

    const result = await this.dailyJobModel.aggregate(pipeline).exec();

    return {
      totalCount: result[0]?.totalCount[0]?.total || 0,
      list: result[0]?.paginatedResults || [],
      totalPages: Math.ceil((result[0]?.totalCount[0]?.total || 0) / limit),
      currentPage: page,
      statusCounts: result[0]?.statusCounts || [],
    };
  }

  async createSimulationMachine(productId, userId) {
    const product = await this.productsModel.findOne({
      externalProductId: productId,
    });

    if (!product) {
      throw new HttpException(
        `No product with id ${productId} found on homnify`,
        400,
      );
    }
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setFullYear(endDate.getFullYear() + 5);

    const currentTokenSettings = await this.getCurrentCloudkSettings();

    const rewardWallet: any =
      await this.walletService.findUserWalletByTokenSymbol(
        ValueType.mLYK,
        userId,
      );

    const session = await this.connection.startSession();
    await session.startTransaction();

    const boostData = await this.getCurrentBoostForMachines();

    try {
      const userMachine = await this.machineModel.create(
        [
          {
            user: userId,
            name: product.name,
            stakeLimit: product.stakeLimit,
            rewardWallet: rewardWallet._id,
            lockedPrice: 1,
            allTimeHigh: 1,
            dlp: 1,
            mintingPower: product.mintingPowerPerc / 100,
            boost: boostData.boost,
            stakeToken: currentTokenSettings.stakeToken._id,
            autoCompound: false,
            startDate: startDate,
            endDate: endDate,
            imageUrl: product.imageUrl,
            externalMachineId: product.externalProductId,
            isSimulater: true,
          },
        ],
        { session },
      );
      await this.userServices.createUserAnalyticLog({
        userId: userId,
        scenario: ScenarioAnalyticsPointType.NEW_MACHINE,
        status: StatusAnalyticsPointType.PENDING,
      });
      await session.commitTransaction();
      return;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async createCloudKTransaction(
    cloudkTransactionDto: {
      tokenAmount: number;
      type: CloudKTransactionTypes;
      user: Types.ObjectId | string;
      token: Types.ObjectId | string;
      machine?: Types.ObjectId | string;
      fromMachine?: Types.ObjectId | string;
      totalTokenPrice?: number;
      stake?: Types.ObjectId | string;
      lykPrice?: number;
      note?: string;
      remark?: string;
      reward?: Types.ObjectId;
      stakeType?: string;
      additionalMintingRewardId?: Types.ObjectId | null;
      additionalMintingPowerPercentage?: number;
      actveGenRewardId?: Types.ObjectId | null;
      genRewardPercentage?: number;
      meta?: Record<string, any>;
    },
    session?: ClientSession,
  ) {
    return await this.cloudkTransactionModel.create([cloudkTransactionDto], {
      session,
    });
  }

  // OLD Aggregations
  // async getTransactionsPaginated1(
  //   user: Types.ObjectId,
  //   paginateDTO: PaginateDTO,
  //   {
  //     machine,
  //     token,
  //     type,
  //     from,
  //     to,
  //   }: {
  //     machine?: string;
  //     token?: string;
  //     type?: CloudKTransactionTypes;
  //     from?: string;
  //     to?: string;
  //   },
  // ) {
  //   const { page, limit } = paginateDTO;

  //   const matchConditions: any[] = [{ user }, { deletedAt: { $eq: null } }];

  //   if (machine) {
  //     matchConditions.push({ machine: new Types.ObjectId(machine) });
  //   }

  //   if (token) {
  //     matchConditions.push({ token: new Types.ObjectId(token) });
  //   }

  //   if (type) {
  //     matchConditions.push({ type });
  //   }

  //   if (from) {
  //     const fromDate = new Date(from);
  //     const toDate = to ? new Date(to) : new Date();
  //     toDate.setUTCHours(23, 59, 59, 999);
  //     matchConditions.push({
  //       createdAt: {
  //         $gte: fromDate,
  //         $lte: toDate,
  //       },
  //     });
  //   }

  //   matchConditions.push({
  //     $or: [
  //       { type: { $ne: 'add-stake' } }, // Include all types except 'add-stake'
  //       {
  //         $and: [
  //           // Include 'add-stake' only if tokenAmount is not 0
  //           { type: 'add-stake' },
  //           { tokenAmount: { $ne: 0 } },
  //         ],
  //       },
  //     ],
  //   });

  //   const pipeline = [
  //     {
  //       $match: {
  //         $and: matchConditions,
  //       },
  //     },
  //     {
  //       $sort: { createdAt: -1 },
  //     },
  //     {
  //       $lookup: {
  //         from: 'cloudkmachines',
  //         localField: 'machine',
  //         foreignField: '_id',
  //         as: 'machine',
  //       },
  //     },
  //     {
  //       $unwind: {
  //         path: '$machine',
  //         preserveNullAndEmptyArrays: true,
  //       },
  //     },
  //     {
  //       $lookup: {
  //         from: 'tokens',
  //         localField: 'token',
  //         foreignField: '_id',
  //         as: 'token',
  //       },
  //     },
  //     {
  //       $unwind: {
  //         path: '$token',
  //         preserveNullAndEmptyArrays: true,
  //       },
  //     },
  //     {
  //       $lookup: {
  //         from: 'cloudkmachinestakes',
  //         localField: 'stake',
  //         foreignField: '_id',
  //         as: 'stake',
  //       },
  //     },
  //     {
  //       $unwind: {
  //         path: '$stake',
  //         preserveNullAndEmptyArrays: true,
  //       },
  //     },
  //   ];
  //   console.log(
  //     '--------------------------',
  //     JSON.stringify(pipeline, null, 2),
  //   );

  //   const data = await aggregatePaginate(
  //     this.cloudkTransactionModel,
  //     pipeline,
  //     page,
  //     limit,
  //   );

  //   return data;
  // }

  async getTransactionsPaginated(
    user: Types.ObjectId,
    paginateDTO: PaginateDTO,
    {
      machine,
      token,
      type,
      from,
      to,
    }: {
      machine?: string;
      token?: string;
      type?: CloudKTransactionTypes;
      from?: string;
      to?: string;
    },
  ) {
    const { page, limit } = paginateDTO;

    //================================================
    let whereConfig: any = { deletedAt: { $eq: null } }; // Add deletedAt condition here

    if (user) {
      whereConfig = {
        ...whereConfig,
        user: user,
      };
    }
    if (token) {
      whereConfig = {
        ...whereConfig,
        token: token,
      };
    }

    if (machine) {
      whereConfig = {
        ...whereConfig,
        machine: machine,
      };
    }
    if (type) {
      whereConfig = {
        ...whereConfig,
        type: type,
      };
    }
    if (from) {
      const fromDate = new Date(from);
      const toDate = to ? new Date(to) : new Date();
      toDate.setUTCHours(23, 59, 59, 999);

      whereConfig = {
        ...whereConfig,
        createdAt: {
          $gte: fromDate,
          $lte: toDate,
        },
      };
    }

    whereConfig = {
      ...whereConfig,
      $or: [
        { type: { $ne: 'add-stake' } }, // Include all types except 'add-stake'
        {
          $and: [
            // Include 'add-stake' only if tokenAmount is not 0
            { type: 'add-stake' },
            { tokenAmount: { $ne: 0 } },
          ],
        },
      ],
    };

    const paginate = await pagination({
      page,
      pageSize: limit,
      model: this.cloudkTransactionModel,
      condition: whereConfig,
      pagingRange: 5,
    });

    const list = await this.cloudkTransactionModel
      .find(whereConfig)
      .sort({ createdAt: -1 })
      .skip(paginate.offset)
      .limit(paginate.limit)
      // .select('-shops -favoritesProducts -favoritesShops')
      .populate([
        {
          path: 'machine',
        },
        {
          path: 'stake',
        },
        {
          path: 'token',
        },
        {
          path: 'reward',
        },
        {
          path: 'machine',
        },
      ]);

    return {
      list,
      totalCount: paginate.total,
      totalPages: paginate.metadata.page.totalPage,
      currentPage: paginate.metadata.page.currentPage,
      paginate,
    };
    //==============================================
  }

  async getCurrentKillSettings(): Promise<CloudKKillSetting> {
    const settings = await this.killSettingsModel
      .findOne({})
      .sort({
        createdAt: -1,
      })
      .select('stakeEnabled claimEnabled machineBuyEnabled rewardsJobEnabled');
    return settings;
  }

  async addKillSettings(
    killSettings: CloudKKillSettingDTO,
    adminId,
  ): Promise<CloudKKillSetting> {
    return await this.killSettingsModel.create({
      ...killSettings,
      addedBy: adminId,
    });
  }

  async getExportUserList() {
    const exportRequestResponse =
      await this.myBlockchainIdService.getExportUserList();
    return exportRequestResponse;
  }

  async findActiveParent(userId: string) {
    const userActiveNode = await this.userActiveTreeModel
      .findOne({ user: new Types.ObjectId(userId) })
      .exec();

    if (!userActiveNode || !userActiveNode.upline) {
      throw new HttpException(
        'Active PArent not found',
        HttpStatus.BAD_REQUEST,
      );
    }

    const uplineNode: ActiveUserTree = await this.userActiveTreeModel
      .findOne({ user: userActiveNode.upline })
      .exec();

    if (!uplineNode) {
      throw new HttpException(
        'Active PArent not found',
        HttpStatus.BAD_REQUEST,
      );
    }

    const isUplineActive =
      await this.supernodeService.isBuilderGenerationUserActiveNode(
        new Types.ObjectId(uplineNode.user.toString()),
      );

    if (isUplineActive) {
      return isUplineActive;
    }

    return this.findActiveParent(uplineNode.user.toString());
  }

  async getUserCloudK(userId: Types.ObjectId) {
    const pipeline: PipelineStage[] = [
      {
        $match: { user: new Types.ObjectId(userId), deletedAt: { $eq: null } },
      },
      {
        $group: {
          _id: null,
          totalPrice: { $sum: '$tokenAmount' },
        },
      },
    ];

    const totalRewardsResult = await this.rewardModel
      .aggregate(pipeline)
      .exec();

    return totalRewardsResult.length > 0 ? totalRewardsResult[0].totalPrice : 0;
  }

  async getUserDailyCloudK(
    userId: Types.ObjectId,
    startDay?: any,
    endDay?: any,
  ) {
    // Get the start and end of today
    const today = new Date();
    const startOfDay = startDay
      ? startDay
      : new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = endDay
      ? endDay
      : new Date(today.setHours(23, 59, 59, 999));

    const pipeline: PipelineStage[] = [
      {
        $match: {
          user: new Types.ObjectId(userId),
          deletedAt: { $eq: null },
          createdAt: { $gte: startOfDay, $lt: endOfDay }, // Filter for today
        },
      },
      {
        $group: {
          _id: null,
          totalPrice: { $sum: '$tokenAmount' },
        },
      },
    ];

    const totalRewardsResult = await this.rewardModel
      .aggregate(pipeline)
      .exec();

    return totalRewardsResult.length > 0 ? totalRewardsResult[0].totalPrice : 0;
  }

  async updateMachineDate() {
    const createdAt = new Date();
    const oneDayInMilliseconds = 24 * 60 * 60 * 1000; // Hours * Minutes * Seconds * Milliseconds
    const oneDayAgo = new Date(createdAt.getTime() - oneDayInMilliseconds);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const machine = await this.machineModel.updateMany(
      {
        startDate: {
          $gte: today,
        },
      },
      {
        $set: {
          startDate: oneDayAgo,
        },
      },
      { new: true },
    );
    return machine;
  }

  async checkLastJob() {
    const lastJob = await this.dailyJobModel.findOne({}).sort({
      createdAt: -1,
    });
    return lastJob;
  }

  async terminateMachine(machineId: string) {
    const machine: CloudKMachine = await this.machineModel.findById(machineId);

    if (!machine) throw new HttpException('Invalid machine id', 404);

    machine.status = CLOUDK_MACHINE_STATUS.TERMINATED;
    machine.deletedAt = new Date();

    await machine.save();

    return;
  }

  async addStake({
    session,
    userId,
    totalToken,
    lykPrice,
    machineId,
    walletTransactionId,
    extraMessage,
    from,
    type,
    burnValue,
    actualValue,
    bonusAmount,
  }: {
    session: any;
    userId: mongoose.Types.ObjectId;
    totalToken: number;
    lykPrice: number;
    machineId: mongoose.Types.ObjectId;
    walletTransactionId: mongoose.Types.ObjectId;
    extraMessage?: string;
    from: STAKE_FROM;
    type: CLOUDK_MACHINE_STAKE_TYPE;
    burnValue?: number;
    actualValue?: number;
    bonusAmount?: number;
  }) {
    const slake = await this.machineStakesModel.create(
      [
        {
          tokenAmount: totalToken, // // how many token
          totalPrice: lykPrice * totalToken, // dollar amount
          machine: machineId,
          perTokenPrice: lykPrice, // lyk price
          type: type,
          user: userId,
          walletTransaction: walletTransactionId,
          note: extraMessage,
          from: from,
          burnValue,
          actualValue,
          bonusAmount,
        },
      ],
      {
        session,
      },
    );
    // ;
    return slake.length > 0 ? slake[0] : null;
  }
  async updateOverBoost() {
    await this.overrideBoostModel.updateMany({ enabled: false });
  }
  async getinfulationRulesByDropPercentage(
    inflation: any,
    percentageFall: number,
  ) {
    const ruleApplied = await this.inflationRulesModel
      .find({
        inflation: inflation._id,
      })
      .sort({ dropPercentage: -1 })
      .findOne({
        dropPercentage: { $lte: percentageFall * 100 },
      });
    return ruleApplied;
  }

  async getUserDailyRewards(userId: string | Types.ObjectId) {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const pipeline: PipelineStage[] = [
      {
        $match: {
          user: new Types.ObjectId(userId),
          deletedAt: { $eq: null },
          createdAt: { $gte: startOfToday, $lte: endOfToday },
        },
      },
      {
        $group: {
          _id: null,
          todayRewards: { $sum: '$tokenAmount' },
        },
      },
    ];
    const todayRewardsResult = await this.rewardModel
      .aggregate(pipeline)
      .exec();
    return todayRewardsResult?.[0]?.todayRewards || 0;
  }

  async getUserDailyRewardsUSD(userId: string | Types.ObjectId) {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const pipeline: PipelineStage[] = [
      {
        $match: {
          user: new Types.ObjectId(userId),
          deletedAt: { $eq: null },
          createdAt: { $gte: startOfToday, $lte: endOfToday },
        },
      },
      {
        $group: {
          _id: null,
          todayRewards: { $sum: '$totalPrice' },
        },
      },
    ];
    const todayRewardsResult = await this.rewardModel
      .aggregate(pipeline)
      .exec();
    return todayRewardsResult?.[0]?.todayRewards || 0;
  }

  async updateGlobalPoolById(
    id: string,
    updateCloudKGlobalPoolDto: updateCloudKGlobalPoolDto,
  ) {
    const updatedGlobalPool = await this.productsModel.findByIdAndUpdate(
      id,
      updateCloudKGlobalPoolDto,
      { new: true, runValidators: true },
    );
    if (!updatedGlobalPool) {
      throw new HttpException(`Product with ID ${id} not found`, 400);
    }
    return updatedGlobalPool;
  }

  async getAllUserMachineRewardValue(machineId: string) {
    const pipeline: PipelineStage[] = [
      {
        $match: {
          deletedAt: null,
          machine: new Types.ObjectId(machineId),
        },
      },
      {
        $group: {
          _id: '$machine',
          lifetimeReward: {
            $sum: '$tokenAmount',
          },
          claimableRewards: {
            $sum: {
              $cond: {
                if: {
                  $eq: ['$claimed', false],
                },
                then: '$tokenAmount',
                else: 0,
              },
            },
          },
          machine: {
            $first: '$machine',
          },
          rewardId: {
            $first: '$_id',
          },
        },
      },
      {
        $project: {
          _id: 0,
          user: 1,
          machine: 1,
          lifetimeReward: 1,
          claimableRewards: 1,
          rewardId: 1,
        },
      },
    ];

    const totalRewardsResult = await this.rewardModel
      .aggregate(pipeline)
      .exec();

    const result = {
      lifetimeReward:
        totalRewardsResult && totalRewardsResult.length > 0
          ? totalRewardsResult[0].lifetimeReward
          : 0,
      claimableRewards:
        totalRewardsResult && totalRewardsResult.length > 0
          ? totalRewardsResult[0].claimableRewards
          : 0,
      machine:
        totalRewardsResult && totalRewardsResult.length > 0
          ? totalRewardsResult[0].machine
          : null,
      rewardId:
        totalRewardsResult && totalRewardsResult.length > 0
          ? totalRewardsResult[0].rewardId
          : null,
    };
    return result;
  }

  async getRewardTokenValues(userId: string) {
    const query = {
      deletedAt: { $eq: null },
    };
    if (userId && userId !== '') {
      query['userId'] = userId;
    }
    const response = [];
    const aMachines = await this.machineModel.find(query);
    for (const machine of aMachines) {
      const machineId = machine._id.toString();
      const rewardValues = await this.getAllUserMachineRewardValue(machineId);
      response.push(rewardValues);
    }
    return response;
  }

  async updateCloudkMachineRewardValue(reward: any) {
    await this.machineModel.updateOne(
      { _id: reward.machine },
      {
        $set: {
          lifetlifetimeReward: reward.lifetimeReward,
          claimableRewards: reward.claimableRewards,
        },
      },
      {
        new: true,
      },
    );
  }

  // async getRewardTokenValues2(userId: string) {
  //   // Build the base query for machines
  //   const machineMatch = {
  //     deletedAt: { $eq: null },
  //     ...(userId ? { userId } : {}),
  //   };

  //   const pipeline: PipelineStage[] = [
  //     {
  //       $match: machineMatch,
  //     },
  //     {
  //       $lookup: {
  //         from: 'cloudkrewards',
  //         localField: '_id',
  //         foreignField: 'machine',
  //         as: 'rewards',
  //       },
  //     },
  //     {
  //       $unwind: {
  //         path: '$rewards',
  //         preserveNullAndEmptyArrays: true,
  //       },
  //     },
  //     {
  //       $match: {
  //         'rewards.deletedAt': { $eq: null },
  //       },
  //     },
  //     {
  //       $group: {
  //         _id: '$_id',
  //         lifetimeReward: {
  //           $sum: '$rewards.tokenAmount',
  //         },
  //         claimableRewards: {
  //           $sum: {
  //             $cond: {
  //               if: { $eq: ['$rewards.claimed', false] },
  //               then: '$rewards.tokenAmount',
  //               else: 0,
  //             },
  //           },
  //         },
  //         machine: { $first: '$$ROOT' },
  //       },
  //     },
  //     {
  //       $project: {
  //         _id: 0,
  //         machine: '$_id',
  //         lifetimeReward: 1,
  //         claimableRewards: 1,
  //         rewardId: { $first: '$machine.rewards._id' },
  //       },
  //     },
  //   ];

  //   const results = await this.machineModel.aggregate(pipeline).exec();
  //   return results;
  // }

  async getAllTransactions(
    paginateDTO: PaginateDTO,
    {
      machine,
      token,
      type,
      from,
      to,
      search,
      product,
    }: {
      machine?: string;
      token?: string;
      type?: CloudKTransactionTypes;
      from?: string;
      to?: string;
      search?: string;
      product?: string;
    },
  ) {
    const { page, limit } = paginateDTO;

    let whereConfig: any = { deletedAt: { $eq: null } };

    if (token) {
      whereConfig.token = new Types.ObjectId(token);
    }

    if (machine) {
      whereConfig.machine = new Types.ObjectId(machine);
    }

    if (type) {
      whereConfig.type = type;
    }

    if (from) {
      const fromDate = new Date(from);
      const toDate = to ? new Date(to) : new Date();
      toDate.setUTCHours(23, 59, 59, 999);

      whereConfig.createdAt = {
        $gte: fromDate,
        $lte: toDate,
      };
    }

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      const matchingUsers = await this.usermModel
        .find({
          deletedAt: { $eq: null },
          $or: [
            { email: searchRegex },
            { username: searchRegex },
            { blockchainId: searchRegex },
          ],
        })
        .select('_id');

      const matchingMachines = await this.cloudkTransactionModel.distinct(
        'machine',
        {
          'machine.name': searchRegex,
        },
      );

      whereConfig = {
        ...whereConfig,
        $or: [
          { user: { $in: matchingUsers.map((u) => u._id) } },
          { machine: { $in: matchingMachines } },
        ],
      };
    }

    if (product) {
      const matchingMachinesByProduct = await this.machineModel
        .find({ product: new Types.ObjectId(product) })
        .select('_id');

      whereConfig.machine = {
        $in: matchingMachinesByProduct.map((m) => m._id),
      };
    }

    whereConfig = {
      ...whereConfig,
      $or: [
        { type: { $ne: 'add-stake' } },
        {
          $and: [{ type: 'add-stake' }, { tokenAmount: { $ne: 0 } }],
        },
      ],
    };

    const total = await this.cloudkTransactionModel.countDocuments(whereConfig);
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;

    const list = await this.cloudkTransactionModel
      .find(whereConfig)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .populate([
        {
          path: 'machine',
        },
        {
          path: 'stake',
        },
        {
          path: 'token',
        },
        {
          path: 'user',
          select: 'email username blockchainId',
        },
      ]);

    return {
      list,
      totalCount: total,
      totalPages,
      currentPage: page,
      metadata: {
        page: {
          currentPage: page,
          totalPage: totalPages,
        },
      },
    };
  }

  async createOrUpdateAutoCompoundSetting({
    user,
    isUpdate = false,
    currentBalanceInDue = 0,
    skipNotification = false,
  }: {
    user: Types.ObjectId | mongoose.Schema.Types.ObjectId;
    isUpdate: boolean;
    currentBalanceInDue?: number;
    skipNotification?: boolean;
  }): Promise<boolean> {
    try {
      // Find existing setting
      const userData = await this.usermModel.findOne({
        _id: user,
      });
      const existingAutoCompound =
        await this.cloudKAutoCompoundSettingModel.findOne({
          user: user,
          status: STATUS_TYPE.ACTIVE,
        });

      if (isUpdate) {
        if (currentBalanceInDue > 0) {
          this.gatewayService.emitSocketEventNotification({
            message: DUEBALANCECLEARED,
            eventName: userData.blockchainId,
            data: {
              eventAction: SOCKET_EVENT_NAMES.DUEBALANCECLEARED,
              title: 'Due Balance Cleared',
              message: DUEBALANCECLEARED,
            },
          });
        }
        // Handle enabling auto-compound
        if (!existingAutoCompound) {
          return false; // Already enabled
        }
        existingAutoCompound.status = STATUS_TYPE.INACTIVE;
        existingAutoCompound.deletedAt = new Date();
        await existingAutoCompound.save();
        const machines = existingAutoCompound.machines;
        // Update machines
        await this.machineModel.updateMany(
          { _id: { $in: machines.map((machine) => machine._id) } },
          { $set: { autoCompound: true } },
        );
        // GlobalAutoComponant
        const globalAutoCompoundSetting =
          await this.globalAutoCompoundModel.findOne({
            user: user,
          });

        if (globalAutoCompoundSetting) {
          globalAutoCompoundSetting.enabled =
            existingAutoCompound.globalAutoCompoundEnabled == true
              ? true
              : false;
          await globalAutoCompoundSetting.save();
        }

        // Create new setting
      } else {
        if (!skipNotification) {
          this.gatewayService.emitSocketEventNotification({
            message: DUEBALANCEDEBT,
            eventName: userData.blockchainId,
            data: {
              eventAction: SOCKET_EVENT_NAMES.DUEBALANCEDEBT,
              title: 'Due Balance Debt',
              message: DUEBALANCEDEBT,
            },
          });
        }

        // Handle disabling auto-compound
        if (existingAutoCompound) {
          return true; // Already disabled
        }

        // Find machines to enable auto-compound
        const machines = await this.machineModel
          .find({
            user: user,
            autoCompound: true,
          })
          .select('_id')
          .lean()
          .exec();

        if (machines.length === 0) {
          return false;
        }
        const globalAutoCompoundSetting =
          await this.globalAutoCompoundModel.findOne({
            user: user,
          });
        const machinesList = machines.map((machine) => machine._id);
        const newSetting = await this.cloudKAutoCompoundSettingModel.create({
          user: user,
          machines: machinesList,
          status: STATUS_TYPE.ACTIVE,
          globalAutoCompoundEnabled:
            globalAutoCompoundSetting.enabled == true ? true : false,
        });
        // Update All Autocomponant False in CloudkMachine
        await this.machineModel.updateMany(
          { _id: { $in: machinesList } },
          { $set: { autoCompound: false } },
        );

        // GlobalAutoComponant Make It False
        if (globalAutoCompoundSetting) {
          globalAutoCompoundSetting.enabled = false;
          await globalAutoCompoundSetting.save();
        }

        return Boolean(newSetting);
      }
    } catch (error) {
      console.error('Error in createOrUpdateAutoCompoundSetting:', error);
      throw error;
    }
  }

  async getAllInflationRules() {
    return await this.inflationRulesModel
      .find()
      .sort({
        todropPercentage: 1,
      })
      .exec();
  }
  async getUserInflationRulesV1(userId, machine, reward) {
    const rewardTrx: any = await this.rewardModel.findOne({
      _id: reward,
      deletedAt: null,
      type: { $ne: CloudKRewardGenerationType.ADDITIONAL_MINTING_REWARD },
    });

    if (!rewardTrx) {
      throw new HttpException(
        `No reward transaction with id ${reward} found on homnifi`,
        400,
      );
    }

    const machineTrx = await this.machineModel.findOne({
      _id: machine,
      user: userId,
      deletedAt: null,
    });

    if (!machineTrx) {
      throw new HttpException(
        `No machine with id ${machine} found on homnifi`,
        400,
      );
    }

    // Validate rewardTrx.createdAt
    if (
      !rewardTrx.createdAt ||
      isNaN(new Date(rewardTrx.createdAt).getTime())
    ) {
      throw new HttpException(`Invalid reward transaction date`, 400);
    }

    // Find the most recent previous reward transaction before rewardTrx.createdAt
    const prevRewardTrx: any = await this.rewardModel
      .findOne({
        user: userId,
        machine: machine,
        deletedAt: null,
        type: { $ne: CloudKRewardGenerationType.ADDITIONAL_MINTING_REWARD },

        createdAt: { $lt: rewardTrx.createdAt }, // Get the latest before the current transaction
      })
      .sort({ createdAt: -1 }); // Sort in descending order to get the most recent one

    if (!prevRewardTrx) {
      throw new HttpException(`No previous reward transaction found`, 400);
    }

    // Find the most recent previous-to-previous reward transaction before prevRewardTrx.createdAt
    const prevToPrvRewardTrx: any = await this.rewardModel
      .findOne({
        user: userId,
        machine: machine,
        deletedAt: null,
        type: { $ne: CloudKRewardGenerationType.ADDITIONAL_MINTING_REWARD },

        createdAt: { $lt: prevRewardTrx.createdAt }, // Get the latest before the previous transaction
      })
      .sort({ createdAt: -1 }); // Sort in descending order to get the most recent one

    if (!prevToPrvRewardTrx) {
      throw new HttpException(
        `No reward transaction found for the day before previous`,
        400,
      );
    }

    return { machineTrx, rewardTrx, prevRewardTrx, prevToPrvRewardTrx };
  }

  async getUserInflationRules(userId, machine, reward) {
    const rewardTrx: any = await this.rewardModel.findOne({
      _id: reward,
      deletedAt: null,
    });

    if (!rewardTrx) {
      throw new HttpException(
        `No reward transaction with id ${reward} found on homnifi`,
        400,
      );
    }

    const machineTrx = await this.machineModel.findOne({
      _id: machine,
      user: userId,
      deletedAt: null,
    });

    if (!machineTrx) {
      throw new HttpException(
        `No machine with id ${machine} found on homnifi`,
        400,
      );
    }

    // Get the previous day's date from rewardTrx.createdAt
    const previousDate = new Date(rewardTrx.createdAt);
    previousDate.setDate(previousDate.getDate() - 1);

    // Find the previous day's reward transaction
    const prevRewardTrx: any = await this.rewardModel.findOne({
      user: userId,
      machine: machine,
      deletedAt: null,
      createdAt: {
        $gte: new Date(previousDate.setHours(0, 0, 0, 0)), // Start of the previous day
        $lte: new Date(previousDate.setHours(23, 59, 59, 999)), // End of the previous day
      },
    });

    const previousToPrvDate = new Date(prevRewardTrx?.createdAt);
    previousToPrvDate.setDate(previousToPrvDate.getDate() - 1);

    // Find the previous day's reward transaction
    const prevToPrvRewardTrx = await this.rewardModel.findOne({
      user: userId,
      machine: machine,
      deletedAt: null,
      createdAt: {
        $gte: new Date(previousToPrvDate.setHours(0, 0, 0, 0)), // Start of the previous day
        $lte: new Date(previousToPrvDate.setHours(23, 59, 59, 999)), // End of the previous day
      },
    });

    return { machineTrx, rewardTrx, prevRewardTrx, prevToPrvRewardTrx };
  }

  async createProductGen2RewardPercentage(
    updateCloudKProductDto: CreateCloudKProductGen2RewardPercentageDto,
    adminId: Types.ObjectId,
  ) {
    const { productId, genRewardPercentage } = updateCloudKProductDto;
    const getProduct = await this.productsModel.findOne({
      _id: new Types.ObjectId(productId),
      deletedAt: null,
    });
    if (!getProduct) {
      throw new HttpException(`Product with ID ${productId} not found`, 400);
    }
    if (!getProduct.licenseName) {
      throw new HttpException(
        `The product with ID ${productId} is missing a license name. Please update the product details and try again.`,
        400,
      );
    }

    if (!getProduct.aiTradingSoftwareName) {
      throw new HttpException(
        `The product with ID ${productId} is missing an AI trading software name. Please update the product details and try again.`,
        400,
      );
    }
    await this.genExtraRewardHistoryModel.updateMany(
      { productId: getProduct._id },
      { status: false },
    );

    const dataSet: any = new this.genExtraRewardHistoryModel({
      percentage: genRewardPercentage,
      productId: getProduct._id,
      adminId,
      status: true,
    });
    await dataSet.save();

    getProduct.genRewardPercentage = dataSet.percentage;
    getProduct.actveGenRewardPercentageId = dataSet._id;

    await getProduct.save();

    await this.cacheService.deleteUserCache({
      type: CACHE_TYPE.ALL_PRODUCTS,
      user: String('homnifi-platform'),
    });

    return 'Updated Successully.';
  }

  async getProductGen2RewardPercentageHistory(
    id: Types.ObjectId,
    page: number,
    limit: number,
  ) {
    const getProduct = await this.productsModel.findOne({
      _id: id,
      deletedAt: null,
    });
    if (!getProduct) {
      throw new HttpException(`Product with ID ${id} not found`, 400);
    }

    const pipeline: PipelineStage[] = [
      {
        $match: {
          productId: getProduct._id,
          deletedAt: null,
        },
      },
      {
        $lookup: {
          from: 'cloudkproducts',
          localField: 'productId',
          foreignField: '_id',
          as: 'productDetails',
        },
      },
      {
        $unwind: {
          path: '$productDetails',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'admins',
          localField: 'adminId',
          foreignField: '_id',
          as: 'adminId',
          pipeline: [
            {
              $project: {
                firstName: 1,
                lastName: 1,
                email: 1,
                username: 1,
                status: 1,
              },
            },
          ],
        },
      },
      {
        $unwind: {
          path: '$adminId',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $sort: { createdAt: -1 },
      },
    ];

    const dataList = await aggregatePaginate(
      this.genExtraRewardHistoryModel,
      pipeline,
      page,
      limit,
    );

    return dataList;
  }
}
