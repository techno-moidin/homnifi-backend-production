import {
  BadRequestException,
  forwardRef,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import mongoose, { ClientSession, Connection, Model, Types } from 'mongoose';
import { GetDepositSettingsDto } from '../admin/dto/wallet.dto';
import { CACHE_TYPE } from '../cache/Enums/cache.enum';
import { CacheService } from '../cache/cache.service';
import { CloudKService } from '../cloud-k/cloud-k.service';
import {
  CLOUDK_MACHINE_STAKE_TYPE,
  STAKE_FROM,
} from '../cloud-k/schemas/cloudk-machine-stakes.schema';
import {
  CLOUDK_MACHINE_STATUS,
  CloudKMachine,
} from '../cloud-k/schemas/cloudk-machine.schema';
import { CloudKTransactionTypes } from '../cloud-k/schemas/cloudk-transactions.schema';
import { CloudKMachineStakeTransaction } from '../cloud-k/schemas/stake-history.schema';
import { TransactionStatus } from '../global/enums/transaction.status.enum';
import {
  Deposit_Transaction_Type,
  TrxType,
} from '../global/enums/trx.type.enum';
import { PLATFORMS } from '../global/enums/wallet.enum';
import { KMallService } from '../k-mall/kmall.service';
import { Platform } from '../platform/schemas/platform.schema';
import { SuperNodeGaskSetting } from '../supernode/schemas/sn-gask-setting.schema';
import { UserGask } from '../supernode/schemas/user-gask.schema';
import { SupernodeService } from '../supernode/supernode.service';
import { DepositAndStakeTransactionStatusEnum } from '../token/enums/depositAndStakeTransactionStatus-Enum';
import { setDepositSummaryType } from '../token/enums/depositSettings-type-enum';
import { DepositSetting } from '../token/schemas/deposit.settings.schema';
import { DepositAndStakeSettings } from '../token/schemas/depositAndStackSettings.schema';
import { Network } from '../token/schemas/network.schema';
import {
  DUE_WALLET_SYMBOL,
  Token,
  ValueType,
} from '../token/schemas/token.schema';
import { TokenService } from '../token/token.service';
import { WebhookDepositDto } from '../webhook/dto/webhook-deposit.dto';
import {
  WebhookDataStatus,
  WebhookMessages,
  WebhookType,
} from '../webhook/enums/webhook.enum';
import { WebhookService } from '../webhook/webhook.service';
import { CreateDepositAndStakeDto } from './dto/deposit-and-stake.dto';
import { TransactionFlow } from './enums/transcation.flow.enum';
import { OnChainWalletI } from './interfaces/on.chain.wallet.interface';
import { DepositTransactionSummary } from './schemas/deposit.summary.schema';
import { DepositAndStakeProducts } from './schemas/depositAndStakeProducts';
import { DepositAndStakeTransaction } from './schemas/depositAndStakeTransaction';
import { OnChainWallet } from './schemas/on.chain.wallet.schema';
import { WalletService } from './wallet.service';
import { TokenI } from '../token/interfaces/token.interface';
import { toTwos, Wallet } from 'ethers';
import { DepositTransactionHistory } from './schemas/deposit.history.transaction.schema';
import e from 'express';
import { WalletTransaction } from './schemas/wallet.transaction.schema.';
import {
  DueRemarks,
  DueType,
  RequestStatus,
} from './enums/request.status.enum';
import { WITHDRAW_TYPES } from '../token/enums/withdraw-types.enum';
import { User } from '../users/schemas/user.schema';
import { WithdrawTransaction } from './schemas/withdraw.transaction.schema';
import {
  DeductDueProcessTypes,
  DueReferenceMetaData,
} from '../wallet/interfaces/withdraw-transaction.interface';
import { ConversionMode } from './enums/conversion.status.enums';
import {
  getActualAmountAfterConversion,
  getConversionMode,
} from '../utils/common/wallet.transaction.functions';
import {
  formatToFixed5,
  generateDueTransactionDetails,
  generateNoteTransactionDetails,
} from '../utils/common/common.functions';

@Injectable()
export class WalletDepositService {
  constructor(
    @InjectModel(Token.name)
    private tokenModel: Model<Token>,
    @InjectModel(WithdrawTransaction.name)
    private withdrawTransactionModel: Model<WithdrawTransaction>,
    @InjectModel(CloudKMachine.name)
    private machineModel: Model<CloudKMachine>,
    @InjectModel(DepositAndStakeProducts.name)
    private depositAndStakeProductsModel: Model<DepositAndStakeProducts>,
    @InjectModel(Wallet.name)
    private walletModel: Model<Wallet>,
    @InjectModel(DepositAndStakeTransaction.name)
    private depositAndStakeTransactionModel: Model<DepositAndStakeTransaction>,
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(OnChainWallet.name)
    private readonly onChainWalletModel: Model<OnChainWalletI>,
    @InjectModel(Network.name)
    private readonly networkModel: Model<Network>,
    @InjectModel(Platform.name)
    private readonly platformModel: Model<Platform>,
    @InjectModel(DepositAndStakeSettings.name)
    private readonly depositAndStakeSettingModel: Model<DepositAndStakeSettings>,
    @InjectModel(DepositSetting.name)
    private readonly depositSettingModel: Model<DepositSetting>,
    @InjectModel(CloudKMachineStakeTransaction.name)
    private cloudKMachineStakeTransactionModel: Model<CloudKMachineStakeTransaction>,
    @InjectModel(SuperNodeGaskSetting.name)
    private snGaskSettingModel: Model<SuperNodeGaskSetting>,
    @InjectModel(UserGask.name)
    private userGaskModel: Model<UserGask>,
    private readonly kmallService: KMallService,
    @Inject(forwardRef(() => WalletService))
    private readonly walletService: WalletService,
    private readonly webhookmodelservice: WebhookService,
    @Inject(forwardRef(() => CloudKService))
    private cloudKService: CloudKService,
    private readonly cacheService: CacheService,
    private readonly supernodeService: SupernodeService,
    private tokenService: TokenService,

    @InjectModel(User.name)
    private userModel: Model<User>,

    @InjectModel(DepositTransactionSummary.name)
    readonly depositTransactionSummary: Model<DepositTransactionSummary>,
    @InjectModel(DepositTransactionHistory.name)
    private depositTransactionHistoryModel: Model<DepositTransactionHistory>,
  ) {}
  async depositAndStake(userId: string, depositDto: CreateDepositAndStakeDto) {
    // Transaction exist or not
    const transaction = await this.depositAndStakeTransactionModel.findOne({
      user: userId,
      status: DepositAndStakeTransactionStatusEnum.PENDING,
    });

    if (transaction) {
      throw new UnprocessableEntityException('Transaction already exists.');
    }
    // get settings from deposit and stake settings
    const platformData = await this.platformModel.findOne({
      status: 'active',
      symbol: PLATFORMS.HOMNIFI,
    });

    if (!platformData) {
      throw new Error('Platform configuration not found');
    }

    const getSettings = await this.depositAndStakeSettingModel.findOne({
      isEnable: true,
      isVisible: true,
      deletedAt: null,
      platform: platformData._id,
      fromToken: new Types.ObjectId(depositDto.token),
    });

    // fetch Token and Network

    if (!getSettings) {
      throw new Error('Settings is not available for the particular token.');
    }

    // check the network is in Token
    const isNetworkExist = getSettings.networks.some(
      (data) => data.networkId == depositDto.network,
    );
    if (!isNetworkExist) {
      throw new Error('Invalid network for this token.');
    }

    //TODO : Remove when Multiple Products come to picture
    if (depositDto.machineDetails.length > 1) {
      throw new Error('Only one machine is allowed.');
    }
    const machines = depositDto.machineDetails[0];

    // Fetching all the product id of the User
    const getMachine = await this.machineModel
      .findOne({
        user: new Types.ObjectId(userId),
        //TODO: Remove when multiple machine select
        _id: new Types.ObjectId(machines.machine),
      })
      .select('_id');
    if (!getMachine) {
      throw new Error('There is no such machines at this time.');
    }

    // save the deposit data
    const session = await this.connection.startSession();
    session.startTransaction();
    try {
      let walletAdress = '';
      const onChainWallet = await this.onChainWalletModel.findOne({
        user: new Types.ObjectId(userId),
        network: depositDto.network,
        token: depositDto.token,
      });

      if (!onChainWallet) {
        const network = await this.networkModel.findById(depositDto.network);
        const newWallet = await this.kmallService.createKMallWallet(
          network.code,
        );

        const userOnChainWallet = await this.walletService.createOnChainWallet(
          {
            address: newWallet.address,
            network: depositDto.network,
            token: depositDto.token,
            user: new Types.ObjectId(userId),
          },
          session,
        );
        walletAdress = userOnChainWallet.address;
      } else {
        walletAdress = onChainWallet.address;
      }

      const { requestId } = await this.walletService.generateUniqueRequestId(
        TrxType.DEPOSIT_AND_STAKE_REQUEST_ID_PREF,
      );

      // Add data in deposit and Stake transactions
      const depositAndStakeTransaction =
        await this.depositAndStakeTransactionModel.create(
          [
            {
              network: depositDto.network,
              token: depositDto.token,
              toToken: getSettings.toToken,
              user: new Types.ObjectId(userId),
              depositAddress: walletAdress,
              status: DepositAndStakeTransactionStatusEnum.PENDING,
              expiredAt: new Date(
                new Date().getTime() +
                  getSettings.validityHours * 60 * 60 * 1000,
              ), // Add 6 hr from now
              requestId,
              depositAndStakeSettings: getSettings._id,
            },
          ],
          {
            session,
          },
        );

      // Add Product that to add
      await this.depositAndStakeProductsModel.create(
        [
          {
            depositAndStakeTransaction: depositAndStakeTransaction[0]._id,
            machine: depositDto.machineDetails[0].machine,
          },
        ],
        { session },
      );
      // Adding Entries to Deposit Transactions History Collection
      await this.walletService.depositTransactionHistoryModel.create(
        [
          {
            deposit_id: depositAndStakeTransaction[0]._id,
            from: Deposit_Transaction_Type.Deposit_Stack,
            type: TrxType.DEPOSIT_AND_STAKE_REQUEST,
            machine: depositDto.machineDetails[0].machine,
            network: depositDto.network,
            token: depositDto.token,
            toToken: getSettings.toToken,
            user: new Types.ObjectId(userId),
            depositAddress: walletAdress,
            status: DepositAndStakeTransactionStatusEnum.PENDING,
            expiredAt: new Date(
              new Date().getTime() + getSettings.validityHours * 60 * 60 * 1000,
            ),
            requestId,
            depositAndStakeSettings: getSettings._id,
          },
        ],
        { session },
      );

      await session.commitTransaction();
      return {
        id: depositAndStakeTransaction[0]._id,
        walletAddress: walletAdress,
        requestId,
      };
    } catch (error) {
      await session.abortTransaction();
      throw new Error(error);
    } finally {
      session.endSession();
    }
  }

  async cancelTransaction(userId: string) {
    const transaction = await this.depositAndStakeTransactionModel.findOne({
      user: userId,
      status: DepositAndStakeTransactionStatusEnum.PENDING,
    });

    if (!transaction) {
      throw new NotFoundException('Transaction Not Found');
    }
    transaction.remarks = WebhookMessages.DEPOSIT_REQUEST_CANCELLED_BY_USER;
    transaction.status = DepositAndStakeTransactionStatusEnum.CANCELED;
    transaction.expiredAt = new Date(); // This time is showing frontend as cancelled time. so we are updating here.
    await transaction.save();

    return transaction;
  }

  async getTransaction(userId: string, defaultStatus: boolean = true) {
    const transaction = await this.depositAndStakeTransactionModel
      .findOne({
        user: userId,
        status: DepositAndStakeTransactionStatusEnum.PENDING,
      })
      .populate('network', 'name code')
      .populate('token', 'name symbol iconUrl')
      .populate(
        'depositAndStakeSettings',
        'minDisplayAmount minAmount toToken',
      );

    if (!transaction) {
      if (defaultStatus) {
        throw new HttpException('', HttpStatus.NO_CONTENT);
      } else {
        return {
          transaction: null,
          product: null,
        };
      }
    }

    const now = new Date();
    const expiredAt = new Date(transaction.expiredAt);
    if (expiredAt.getTime() <= now.getTime()) {
      transaction.status = DepositAndStakeTransactionStatusEnum.EXPIRED;
      transaction.remarks = WebhookMessages.NO_DEPOSIT_RECEIVED;
      transaction.save();
      if (defaultStatus) {
        throw new HttpException('Transaction expired', HttpStatus.NO_CONTENT);
      } else {
        return {
          transaction: null,
          product: null,
        };
      }
    }

    const product = await this.depositAndStakeProductsModel
      .find({
        depositAndStakeTransaction: transaction._id,
      })
      .populate(
        'machine',
        '_id product imageUrl uniqueName idempotencyKey productPrice name',
      );
    const result = {
      transaction,
      product,
    };
    return result;
  }

  async availableDepositAndStakeWallets(query: GetDepositSettingsDto) {
    const { platform } = query;
    const platformData = await this.platformModel.findOne({
      status: 'active',
      symbol: platform || PLATFORMS.HOMNIFI,
    });

    if (!platformData) {
      throw new Error('Platform configuration not found');
    }

    let settings = await this.depositAndStakeSettingModel
      .aggregate([
        {
          $match: {
            isEnable: true,
            isVisible: true,
            deletedAt: null,
            platform: platformData._id,
          },
        },
        { $sort: { createdAt: -1 } },
        // {
        //   $lookup: {
        //     from: 'networks',
        //     localField: 'networks',
        //     foreignField: '_id',
        //     as: 'networks',
        //   },
        // },
        // {
        //   $group: {
        //     _id: '$fromToken',
        //     document: { $first: '$$ROOT' },
        //   },
        // },
        // { $replaceRoot: { newRoot: '$document' } },
        {
          $lookup: {
            from: 'tokens',
            localField: 'fromToken',
            foreignField: '_id',
            as: 'fromToken',
          },
        },
        {
          $lookup: {
            from: 'networks',
            localField: 'networks.networkId',
            foreignField: '_id',
            as: 'networksData',
          },
        },
        { $unwind: '$fromToken' },

        // {
        //   $project: {
        //     'fromToken.networks': 0,
        //   },
        // },
      ])
      .exec();

    settings = settings.map((res) => {
      res.networks = res?.networks?.map((network: any) => {
        if (typeof network === 'string') {
          return null;
        }
        network.networksData = res.networksData.find(
          (p) => p._id.toString() === network.networkId.toString(),
        );
        return network;
      });
      delete res.networksData;
      return res;
    });

    const availableTokens = settings.map((setting) => {
      delete setting._id;
      return {
        ...setting.fromToken,
        ...setting,
      };
    });

    return availableTokens;
  }

  async normalDepositService(
    user,
    fromToken: TokenI,
    createDepositDto: WebhookDepositDto,
    platform: any,
    webhookRequestId: Types.ObjectId,
    session?: ClientSession,
    isDepositAndStakeEnabled?: boolean,
    onChainWallet?: any,
  ) {
    const { amount } = createDepositDto;

    let updatedAmount = amount;
    let currentRateInUSD: number = 0;
    let convertedRateInUSD: number = 0;

    let whereConfig: any = {
      isEnable: true,
      deletedAt: null,
    };
    if (fromToken) {
      whereConfig = {
        ...whereConfig,
        fromToken: fromToken._id,
      };
    }
    if (platform) {
      // const platformInfo = await this.platformModel.findOne({
      //   symbol: platform,
      //   status: 'active',
      // });

      whereConfig = {
        ...whereConfig,
        platform: platform._id,
      };
    }
    // Fetch deposit settings without aggregation
    const depositSetting = await this.depositSettingModel
      .findOne(whereConfig)
      .populate('toToken fromToken') // add from token
      .lean()
      .exec();

    if (!depositSetting || !depositSetting.platform) {
      await this.webhookmodelservice.createWebhook({
        payload: createDepositDto,
        type: WebhookType.DEPOSIT_SETTINGS,
        message: WebhookMessages.DEPOSIT_SETTINGS,
        status: WebhookDataStatus.FAILED,
        platform: platform.symbol,
        webhookRequestId,
      });
      throw new BadRequestException(WebhookMessages.DEPOSIT_SETTINGS);
    }

    // Fetch user Wallet
    const toWallet = await this.walletService.findUserWalletByTokenSymbolV2(
      depositSetting.toToken,
      user._id,
    );

    if (!toWallet) {
      await this.webhookmodelservice.createWebhook({
        payload: createDepositDto,
        type: WebhookType.WALLET,
        message: WebhookMessages.WALLET,
        status: WebhookDataStatus.FAILED,
        platform: platform.symbol,
        webhookRequestId,
      });
      throw new BadRequestException(WebhookMessages.WALLET);
    }

    let isAmountLessThanMin;
    const fromAmount: number = updatedAmount;

    if (depositSetting.isOnChainDeposit) {
      if (onChainWallet.network._id) {
        const network = await this.networkModel.findOne({
          _id: onChainWallet.network._id,
        });
        if (!network.code) {
          await this.webhookmodelservice.createWebhook({
            payload: createDepositDto,
            type: WebhookType.NETWORK,
            message: WebhookMessages.NETWORK,
            status: WebhookDataStatus.FAILED,
            platform: platform.symbol,
            webhookRequestId,
          });
          throw new BadRequestException(WebhookMessages.NETWORK);
        }
        const convertedRate = await this.tokenService.getConvertedCoinTOUSDT(
          fromToken.symbol,
          network.code,
          updatedAmount,
        );
        if (
          !convertedRate.conversionRate ||
          convertedRate.conversionRate === 0
        ) {
          await this.webhookmodelservice.createWebhook({
            payload: createDepositDto,
            type: WebhookType.COIN_TO_USDT,
            message: WebhookMessages.COIN_TO_USDT,
            status: WebhookDataStatus.FAILED,
            platform: platform.symbol,
            webhookRequestId,
          });
          throw new BadRequestException(WebhookMessages.COIN_TO_USDT);
        }
        updatedAmount = convertedRate.conversionRate;
        currentRateInUSD = convertedRate.currentRate;
        convertedRateInUSD = convertedRate.conversionRate;
        if (depositSetting?.isValidateMinAmount) {
          isAmountLessThanMin = updatedAmount < depositSetting.minAmount;
        } else {
          isAmountLessThanMin = false;
        }

        // Amount Minimum Validation Make it Defaul False - As Per Meeting with Sohail , They Don't need this Validation in On-Chain Deposit Webhook
        // isAmountLessThanMin = false;
      } else {
        await this.webhookmodelservice.createWebhook({
          payload: createDepositDto,
          type: WebhookType.NETWORK,
          message: WebhookMessages.NETWORK,
          status: WebhookDataStatus.FAILED,
          platform: platform.symbol,
          webhookRequestId,
        });
        throw new BadRequestException(WebhookMessages.NETWORK);
      }
    } else {
      isAmountLessThanMin = updatedAmount < depositSetting.minAmount;
    }

    let trx;
    let type: any = 'deposit';

    const priceData = await this.walletService.getCurrentPrice();

    let totalAmount = updatedAmount;
    if (
      fromToken.valueType.toLowerCase() ===
      depositSetting.toToken.valueType.toLocaleLowerCase()
    ) {
      totalAmount = updatedAmount; // Keep the amount the same
    } else if (
      fromToken.valueType === ValueType.USD &&
      depositSetting.toToken.valueType === ValueType.LYK
    ) {
      // From USD to LYK: multiply by LYK price
      totalAmount = updatedAmount / priceData.price;
    } else if (
      fromToken.valueType === ValueType.LYK &&
      depositSetting.toToken.valueType === ValueType.USD
    ) {
      totalAmount = updatedAmount * priceData.price;
    }
    const { walletBalance } = await this.walletService.getBalanceByWallet(
      user._id,
      toWallet._id,
    );
    // Check amount is less than minimum amount
    if (!isAmountLessThanMin) {
      const toWalletTransaction =
        await this.walletService.createRawWalletTransaction(
          {
            user: user._id,
            wallet: toWallet._id,
            trxType: isDepositAndStakeEnabled
              ? TrxType.DEPOSIT_AND_STAKE
              : TrxType.DEPOSIT,
            amount: totalAmount,
            transactionFlow: TransactionFlow.IN,
          },
          session,
        );

      trx = toWalletTransaction[0]?.['_id'];
      type = toWalletTransaction[0]?.['trxType'];

      if (!toWalletTransaction) {
        await this.webhookmodelservice.createWebhook({
          payload: createDepositDto,
          type: WebhookType.WALLET_TRANSACTION,
          message: WebhookMessages.WALLET_TRANSACTION,
          status: WebhookDataStatus.FAILED,
          platform: platform.symbol,
          webhookRequestId,
        });
        throw new HttpException(WebhookMessages.WALLET_TRANSACTION, 404);
      }
    }

    const { requestId, serialNumber } =
      await this.walletService.generateUniqueRequestId(TrxType.DEPOSIT);

    const newDeposit = new this.walletService.depositTransactionModel({
      fromToken: fromToken._id,
      user: user._id,
      toWallet,
      toWalletTrx: trx,
      fromAmount: fromAmount,
      amount: totalAmount,
      currentRateInUSD: currentRateInUSD,
      convertedRateInUSD: convertedRateInUSD,
      confirmation: createDepositDto.note,
      onChainWallet: onChainWallet ? onChainWallet._id : null,
      serialNumber: serialNumber,
      requestId,
      transactionStatus: isAmountLessThanMin
        ? TransactionStatus.FAILED
        : TransactionStatus.SUCCESS,
      remarks: isAmountLessThanMin
        ? 'Amount is less than minimum amount required for deposit'
        : depositSetting.isOnChainDeposit
          ? `Transaction successful: ${amount} ${fromToken.name} has been deposited and converted to ${totalAmount} ${depositSetting.toToken.name}.`
          : createDepositDto.note,
      note: createDepositDto.note,
      settingsUsed: depositSetting._id,
      hash: createDepositDto.hash,
      platform: platform?._id || null,
      newBalance: walletBalance + totalAmount,
      previousBalance: walletBalance,
      network: onChainWallet
        ? (onChainWallet.network._id as Types.ObjectId)
        : null,
      token: depositSetting.toToken._id as Types.ObjectId,
      blockchainId: user?.blockchainId || null,
      isOnChainDeposit: depositSetting?.isOnChainDeposit || false,
    });

    await newDeposit.save({ session });
    const newDepositTransactionHistory =
      new this.walletService.depositTransactionHistoryModel({
        deposit_id: newDeposit._id,
        from: Deposit_Transaction_Type.Deposit,
        type: type || 'deposit',
        fromToken: fromToken._id,
        user: user._id,
        toWallet,
        fromAmount: fromAmount,
        toWalletTrx: trx,
        amount: totalAmount,
        currentRateInUSD: currentRateInUSD,
        convertedRateInUSD: convertedRateInUSD,
        confirmation: createDepositDto.note,
        depositAddress: onChainWallet?.address || null,
        onChainWallet: onChainWallet ? onChainWallet._id : null,
        serialNumber: serialNumber,
        requestId,
        transactionStatus: isAmountLessThanMin
          ? TransactionStatus.FAILED
          : TransactionStatus.SUCCESS,
        remarks: isAmountLessThanMin
          ? 'Amount is less than minimum amount required for deposit'
          : depositSetting.isOnChainDeposit
            ? `Transaction successful: ${amount} ${fromToken.name} has been deposited and converted to ${totalAmount} ${depositSetting.toToken.name}.`
            : createDepositDto.note,
        note: createDepositDto.note,
        settingsUsed: depositSetting._id,
        hash: createDepositDto.hash,
        platform: platform?._id || null,
        newBalance: walletBalance + totalAmount,
        previousBalance: walletBalance,
        network: onChainWallet
          ? (onChainWallet.network._id as Types.ObjectId)
          : null,
        token: depositSetting.toToken._id as Types.ObjectId,
        blockchainId: user?.blockchainId || null,
        isOnChainDeposit: depositSetting?.isOnChainDeposit || false,
      });
    await newDepositTransactionHistory.save({ session });
    if (onChainWallet?.network) {
      await this.setDepositSummaryV2(
        {
          amount: totalAmount,
          token: depositSetting.toToken._id as Types.ObjectId,
          network: onChainWallet.network._id as Types.ObjectId,
          networkName: onChainWallet.network.name,
          tokenSymbol: depositSetting.toToken.symbol,
        },
        session,
      );
    }

    if (isAmountLessThanMin) {
      await this.webhookmodelservice.createWebhook({
        payload: createDepositDto,
        type: WebhookType.AMOUNT,
        message: WebhookMessages.AMOUNT,
        status: WebhookDataStatus.FAILED,
        platform: platform.symbol,
        webhookRequestId,
      });

      if (!isDepositAndStakeEnabled) {
        const notificationMessage = depositSetting.isOnChainDeposit
          ? `Your deposit of ${amount} ${fromToken.name} has failed because it is below the minimum required amount of ${depositSetting.minDisplayAmount} ${depositSetting.toToken.name}.`
          : `Your deposit of ${totalAmount} ${fromToken.name} has failed because it is below the minimum required amount of ${depositSetting.minDisplayAmount} ${fromToken.name}.`;
        // Send Notification
        await this.walletService.depositNotificationSendService(
          isAmountLessThanMin ? false : true,
          user._id,
          totalAmount,
          fromToken.name,
          depositSetting.toToken.symbol,
          user,
          trx,
          notificationMessage,
        );
      }
      await session.commitTransaction();
      throw new BadRequestException(
        depositSetting.isOnChainDeposit
          ? `Unfortunately, Your deposit of ${amount} ${fromToken.name} could not be processed due to the amount is less than the minimum amount ${depositSetting.minDisplayAmount} ${depositSetting.toToken.name}.`
          : `Unfortunately, your deposit of ${totalAmount} ${fromToken.name} could not be processed due to the amount is less than the minimum amount ${depositSetting.minDisplayAmount}.`,
      );
    } else {
      const checkisDueToken = fromToken.symbol === DUE_WALLET_SYMBOL;
      if (checkisDueToken) {
        await this.cloudKService.createOrUpdateAutoCompoundSetting({
          user: user._id,
          isUpdate: false,
        });
      }
    }

    await session.commitTransaction();

    if (!isDepositAndStakeEnabled) {
      // Send Notification
      await this.walletService.depositNotificationSendService(
        isAmountLessThanMin ? false : true,
        user._id,
        totalAmount,
        fromToken.name,
        depositSetting.toToken.symbol,
        user,
        trx,
      );
    }

    await this.cacheService.deleteUserCache({
      type: CACHE_TYPE.REWARD_CLAIMABLE_RESULT,
      user: user._id,
    });

    return {
      newDeposit,
      status: isAmountLessThanMin ? false : true,
    };
  }

  async normalDepositServiceV1(
    user,
    fromToken: TokenI,
    createDepositDto: WebhookDepositDto,
    platform: any,
    webhookRequestId: Types.ObjectId,
    session?: ClientSession,
    isDepositAndStakeEnabled?: boolean,
    onChainWallet?: any,
  ) {
    const { amount } = createDepositDto;

    let updatedAmount = amount;
    let currentRateInUSD: number = 0;
    let convertedRateInUSD: number = 0;

    let whereConfig: any = {
      isEnable: true,
      deletedAt: null,
    };
    if (fromToken) {
      whereConfig = {
        ...whereConfig,
        fromToken: fromToken._id,
      };
    }
    if (platform) {
      // const platformInfo = await this.platformModel.findOne({
      //   symbol: platform,
      //   status: 'active',
      // });

      whereConfig = {
        ...whereConfig,
        platform: platform._id,
      };
    }
    // Fetch deposit settings without aggregation
    const depositSetting = await this.depositSettingModel
      .findOne(whereConfig)
      .populate('toToken') // add from token
      .lean()
      .exec();

    if (!depositSetting || !depositSetting.platform) {
      await this.webhookmodelservice.createWebhook({
        payload: createDepositDto,
        type: WebhookType.DEPOSIT_SETTINGS,
        message: WebhookMessages.DEPOSIT_SETTINGS,
        status: WebhookDataStatus.FAILED,
        platform: platform.symbol,
        webhookRequestId,
      });
      throw new BadRequestException(WebhookMessages.DEPOSIT_SETTINGS);
    }

    // Fetch user Wallet
    const toWallet = await this.walletService.findUserWalletByTokenSymbolV2(
      depositSetting.toToken,
      user._id,
    );

    if (!toWallet) {
      await this.webhookmodelservice.createWebhook({
        payload: createDepositDto,
        type: WebhookType.WALLET,
        message: WebhookMessages.WALLET,
        status: WebhookDataStatus.FAILED,
        platform: platform.symbol,
        webhookRequestId,
      });
      throw new BadRequestException(WebhookMessages.WALLET);
    }

    let isAmountLessThanMin;
    const fromAmount: number = updatedAmount;

    if (depositSetting.isOnChainDeposit) {
      if (onChainWallet.network._id) {
        const network = await this.networkModel.findOne({
          _id: onChainWallet.network._id,
        });
        if (!network.code) {
          await this.webhookmodelservice.createWebhook({
            payload: createDepositDto,
            type: WebhookType.NETWORK,
            message: WebhookMessages.NETWORK,
            status: WebhookDataStatus.FAILED,
            platform: platform.symbol,
            webhookRequestId,
          });
          throw new BadRequestException(WebhookMessages.NETWORK);
        }
        const convertedRate = await this.tokenService.getConvertedCoinTOUSDT(
          fromToken.symbol,
          network.code,
          updatedAmount,
        );
        if (
          !convertedRate.conversionRate ||
          convertedRate.conversionRate === 0
        ) {
          await this.webhookmodelservice.createWebhook({
            payload: createDepositDto,
            type: WebhookType.COIN_TO_USDT,
            message: WebhookMessages.COIN_TO_USDT,
            status: WebhookDataStatus.FAILED,
            platform: platform.symbol,
            webhookRequestId,
          });
          throw new BadRequestException(WebhookMessages.COIN_TO_USDT);
        }
        updatedAmount = convertedRate.conversionRate;
        currentRateInUSD = convertedRate.currentRate;
        convertedRateInUSD = convertedRate.conversionRate;
        if (depositSetting?.isValidateMinAmount) {
          isAmountLessThanMin = updatedAmount < depositSetting.minAmount;
        } else {
          isAmountLessThanMin = false;
        }

        // Amount Minimum Validation Make it Defaul False - As Per Meeting with Sohail , They Don't need this Validation in On-Chain Deposit Webhook
        // isAmountLessThanMin = false;
      } else {
        await this.webhookmodelservice.createWebhook({
          payload: createDepositDto,
          type: WebhookType.NETWORK,
          message: WebhookMessages.NETWORK,
          status: WebhookDataStatus.FAILED,
          platform: platform.symbol,
          webhookRequestId,
        });
        throw new BadRequestException(WebhookMessages.NETWORK);
      }
    } else {
      isAmountLessThanMin = updatedAmount < depositSetting.minAmount;
    }

    let trx;
    let type: any = 'deposit';

    const conversionMode = await getConversionMode(
      fromToken,
      depositSetting.toToken,
    );

    const priceData = await this.walletService.getCurrentPrice();

    const totalAmount = await getActualAmountAfterConversion(
      fromToken,
      depositSetting.toToken,
      priceData,
      updatedAmount,
      conversionMode,
      1,
      false,
    );

    const { walletBalance } = await this.walletService.getBalanceByWallet(
      user._id,
      toWallet._id,
    );
    // Check amount is less than minimum amount
    if (!isAmountLessThanMin) {
      const toWalletTransaction =
        await this.walletService.createRawWalletTransaction(
          {
            user: user._id,
            wallet: toWallet._id,
            trxType: isDepositAndStakeEnabled
              ? TrxType.DEPOSIT_AND_STAKE
              : TrxType.DEPOSIT,
            amount: totalAmount,
            transactionFlow: TransactionFlow.IN,
          },
          session,
        );

      trx = toWalletTransaction[0]?.['_id'];
      type = toWalletTransaction[0]?.['trxType'];

      if (!toWalletTransaction) {
        await this.webhookmodelservice.createWebhook({
          payload: createDepositDto,
          type: WebhookType.WALLET_TRANSACTION,
          message: WebhookMessages.WALLET_TRANSACTION,
          status: WebhookDataStatus.FAILED,
          platform: platform.symbol,
          webhookRequestId,
        });
        throw new HttpException(WebhookMessages.WALLET_TRANSACTION, 404);
      }
    }

    const { requestId, serialNumber } =
      await this.walletService.generateUniqueRequestId(TrxType.DEPOSIT);

    const newDeposit = new this.walletService.depositTransactionModel({
      fromToken: fromToken._id,
      user: user._id,
      toWallet,
      toWalletTrx: trx,
      fromAmount: fromAmount,
      amount: totalAmount,
      currentRateInUSD: currentRateInUSD,
      convertedRateInUSD: convertedRateInUSD,
      confirmation: createDepositDto.note,
      onChainWallet: onChainWallet ? onChainWallet._id : null,
      serialNumber: serialNumber,
      requestId,
      transactionStatus: isAmountLessThanMin
        ? TransactionStatus.FAILED
        : TransactionStatus.SUCCESS,
      remarks: isAmountLessThanMin
        ? 'Amount is less than minimum amount required for deposit'
        : depositSetting.isOnChainDeposit
          ? `Transaction successful: ${amount} ${fromToken.name} has been deposited and converted to ${totalAmount} ${depositSetting.toToken.name}.`
          : createDepositDto.note,
      note: createDepositDto.note,
      settingsUsed: depositSetting._id,
      hash: createDepositDto.hash,
      platform: platform?._id || null,
      newBalance: walletBalance + totalAmount,
      previousBalance: walletBalance,
      network: onChainWallet
        ? (onChainWallet.network._id as Types.ObjectId)
        : null,
      token: depositSetting.toToken._id as Types.ObjectId,
      blockchainId: user?.blockchainId || null,
      isOnChainDeposit: depositSetting?.isOnChainDeposit || false,
    });

    await newDeposit.save({ session });

    const newDepositTransactionHistory =
      new this.walletService.depositTransactionHistoryModel({
        deposit_id: newDeposit._id,
        from: Deposit_Transaction_Type.Deposit,
        type: type || 'deposit',
        fromToken: fromToken._id,
        user: user._id,
        toWallet,
        fromAmount: fromAmount,
        toWalletTrx: trx,
        amount: totalAmount,
        currentRateInUSD: currentRateInUSD,
        convertedRateInUSD: convertedRateInUSD,
        confirmation: createDepositDto.note,
        depositAddress: onChainWallet?.address || null,
        onChainWallet: onChainWallet ? onChainWallet._id : null,
        serialNumber: serialNumber,
        requestId,
        transactionStatus: isAmountLessThanMin
          ? TransactionStatus.FAILED
          : TransactionStatus.SUCCESS,
        remarks: isAmountLessThanMin
          ? 'Amount is less than minimum amount required for deposit'
          : depositSetting.isOnChainDeposit
            ? `Transaction successful: ${amount} ${fromToken.name} has been deposited and converted to ${totalAmount} ${depositSetting.toToken.name}.`
            : createDepositDto.note,
        note: createDepositDto.note,
        settingsUsed: depositSetting._id,
        hash: createDepositDto.hash,
        platform: platform?._id || null,
        newBalance: walletBalance + totalAmount,
        previousBalance: walletBalance,
        network: onChainWallet
          ? (onChainWallet.network._id as Types.ObjectId)
          : null,
        token: depositSetting.toToken._id as Types.ObjectId,
        blockchainId: user?.blockchainId || null,
        isOnChainDeposit: depositSetting?.isOnChainDeposit || false,
      });
    await newDepositTransactionHistory.save({ session });
    if (onChainWallet?.network) {
      await this.setDepositSummaryV2(
        {
          amount: totalAmount,
          token: depositSetting.toToken._id as Types.ObjectId,
          network: onChainWallet.network._id as Types.ObjectId,
          networkName: onChainWallet.network.name,
          tokenSymbol: depositSetting.toToken.symbol,
        },
        session,
      );
    }

    if (isAmountLessThanMin) {
      await this.webhookmodelservice.createWebhook({
        payload: createDepositDto,
        type: WebhookType.AMOUNT,
        message: WebhookMessages.AMOUNT,
        status: WebhookDataStatus.FAILED,
        platform: platform.symbol,
        webhookRequestId,
      });

      if (!isDepositAndStakeEnabled) {
        const notificationMessage = depositSetting.isOnChainDeposit
          ? `Your deposit of ${amount} ${fromToken.name} has failed because it is below the minimum required amount of ${depositSetting.minDisplayAmount} ${depositSetting.toToken.name}.`
          : `Your deposit of ${totalAmount} ${fromToken.name} has failed because it is below the minimum required amount of ${depositSetting.minDisplayAmount} ${fromToken.name}.`;
        // Send Notification
        await this.walletService.depositNotificationSendService(
          isAmountLessThanMin ? false : true,
          user._id,
          totalAmount,
          fromToken.name,
          depositSetting.toToken.symbol,
          user,
          trx,
          notificationMessage,
        );
      }
      await session.commitTransaction();
      throw new BadRequestException(
        depositSetting.isOnChainDeposit
          ? `Unfortunately, Your deposit of ${amount} ${fromToken.name} could not be processed due to the amount is less than the minimum amount ${depositSetting.minDisplayAmount} ${depositSetting.toToken.name}.`
          : `Unfortunately, your deposit of ${totalAmount} ${fromToken.name} could not be processed due to the amount is less than the minimum amount ${depositSetting.minDisplayAmount}.`,
      );
    }

    await session.commitTransaction();

    if (!isDepositAndStakeEnabled) {
      // Send Notification
      await this.walletService.depositNotificationSendService(
        isAmountLessThanMin ? false : true,
        user._id,
        totalAmount,
        fromToken.name,
        depositSetting.toToken.symbol,
        user,
        trx,
      );
    }

    await this.cacheService.deleteUserCache({
      type: CACHE_TYPE.REWARD_CLAIMABLE_RESULT,
      user: user._id,
    });

    return {
      newDeposit,
      status: isAmountLessThanMin ? false : true,
    };
  }

  async depositAndStakeService(
    user,
    fromToken,
    createDepositDto: WebhookDepositDto,
    platform: Platform, // since somebody changed the platform string to Object from the controller level, changing here also.
    webhookRequestId: Types.ObjectId,
    stakeRequest,
    session?: ClientSession,
    otherData?: {
      onChainWallet?: OnChainWallet | any;
    },
  ) {
    const { amount } = createDepositDto;
    const platformData = platform;
    //Fetch deposit and stake settings
    const depositSettings = await this.depositAndStakeSettingModel
      .aggregate([
        {
          $match: {
            fromToken: fromToken._id,
            isEnable: true,
            isVisible: true,
            deletedAt: null,
            platform: platformData._id,
          },
        },
        {
          $lookup: {
            from: 'tokens',
            localField: 'toToken',
            foreignField: '_id',
            as: 'toToken',
          },
        },
        {
          $lookup: {
            from: 'platforms',
            localField: 'platform',
            foreignField: '_id',
            as: 'platforms',
          },
        },
        {
          $unwind: {
            path: '$toToken',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            fromToken: 1,
            isEnable: 1,
            isVisible: 1,
            toToken: 1,
            platforms: 1,
            minAmount: 1,
            minDisplayAmount: 1,
          },
        },
      ])
      .exec();

    const depositSetting = depositSettings[0];
    if (!depositSetting) {
      await this.webhookmodelservice.createWebhook({
        payload: { ...createDepositDto, stakeRequestId: stakeRequest._id },
        type: WebhookType.DEPOSIT_AND_STAKE_SETTINGS,
        message: WebhookMessages.DEPOSIT_AND_STAKE_SETTINGS,
        status: WebhookDataStatus.FAILED,
        platform: platform.symbol,
        webhookRequestId,
      });
      throw new BadRequestException(WebhookMessages.DEPOSIT_AND_STAKE_SETTINGS);
    }

    const toWallet = await this.walletService.findUserWalletByTokenSymbol(
      depositSetting.toToken.symbol,
      user._id,
      session,
    );
    const { requestId, serialNumber } =
      await this.walletService.generateUniqueRequestId(TrxType.DEPOSIT);

    const { walletBalance } = await this.walletService.getBalanceByWallet(
      user._id,
      toWallet._id,
    );
    if (depositSetting && depositSetting.minDisplayAmount > amount) {
      const newDeposit = new this.walletService.depositTransactionModel({
        fromToken: fromToken._id,
        user: user._id,
        toWallet,
        toWalletTrx: null,
        amount,
        confirmation: createDepositDto.note,
        onChainWallet: user ? user._id : null,
        serialNumber: serialNumber,
        requestId,
        transactionStatus: TransactionStatus.FAILED,
        remarks:
          'Failed due to the amount is less than minimum amount required for deposit and stake',
        settingsUsed: depositSetting._id,
        hash: createDepositDto.hash,
        newBalance: walletBalance + amount,
        previousBalance: walletBalance,
        token: toWallet?.token || null,
        network: null,
        platform: platformData._id,
        blockchainId: user?.blockchainId || null,
        isOnChainDeposit: depositSetting?.isOnChainDeposit || false,
      });

      await newDeposit.save();
      const newDepositTransactionHistory =
        new this.walletService.depositTransactionHistoryModel({
          deposit_id: newDeposit._id,
          from: Deposit_Transaction_Type.Deposit,
          type: 'deposit',
          fromToken: fromToken._id,
          user: user._id,
          toWallet,
          toWalletTrx: null,
          amount,
          confirmation: createDepositDto.note,
          depositAddress: user?.address || null,
          onChainWallet: user ? user._id : null,
          serialNumber: serialNumber,
          requestId,
          transactionStatus: TransactionStatus.FAILED,
          remarks:
            'Failed due to the amount is less than minimum amount required for deposit and stake',
          settingsUsed: depositSetting._id,
          hash: createDepositDto.hash,
          platform: platformData._id,
          newBalance: walletBalance + amount,
          previousBalance: walletBalance,
          token: toWallet?.token || null,
          network: null,
          blockchainId: user?.blockchainId || null,
        });
      await newDepositTransactionHistory.save({ session });
      await this.webhookmodelservice.createWebhook({
        payload: {
          ...createDepositDto,
          stakeRequestId: stakeRequest._id,
        },
        type: WebhookType.MINIMUM_LIMIT_NOT_MET,
        message: WebhookMessages.MINIMUM_LIMIT_NOT_MET,
        status: WebhookDataStatus.FAILED,
        platform: platform.symbol,
        webhookRequestId,
      });

      const message = `Your Deposit and Stake of ${amount} ${fromToken.name} is failed due to the amount is less than the minimum amount ${depositSetting.minDisplayAmount} ${fromToken.name}.`;
      const emailMessage = `Unfortunately, your deposit of ${amount} ${fromToken.name} could not be processed because the amount is less than the minimum amount of ${depositSetting.minDisplayAmount} ${fromToken.name}.`;
      this.walletService.stakeNotificationSendService(
        false,
        user._id,
        amount,
        fromToken.name,
        depositSetting.toToken.symbol,
        user,
        0,
        null,
        message,
        null,
        emailMessage,
      );
      throw new BadRequestException(
        `Unfortunately, your deposit of ${amount} ${fromToken.name} could not be processed due to the amount is less than the minimum amount ${depositSetting.minDisplayAmount} ${fromToken.name}.`,
      );
    }

    const [settings, getMachine, currentPrice, cloudKsettings] =
      await Promise.all([
        this.cloudKService.getCurrentKillSettings(),
        this.machineModel
          .findOne({
            user: new Types.ObjectId(user._id),
            //TODO: Remove when multiple machine select
            _id: new Types.ObjectId(stakeRequest.product[0].machine._id),
            deletedAt: null,
          })
          .populate('stakeToken'),
        this.cloudKService.getCurrentPrice(),
        this.cloudKService.getCurrentCloudkSettings(),
      ]);

    if (!getMachine) {
      await this.webhookmodelservice.createWebhook({
        payload: { ...createDepositDto, stakeRequestId: stakeRequest._id },
        type: WebhookType.DEPOSIT_AND_STAKE_NO_MACHINE,
        message: WebhookMessages.DEPOSIT_AND_STAKE_NO_MACHINE,
        status: WebhookDataStatus.FAILED,
        platform: platform.symbol,
        webhookRequestId,
      });
      throw new BadRequestException(
        WebhookMessages.DEPOSIT_AND_STAKE_NO_MACHINE,
      );
    }

    if (!settings.stakeEnabled) {
      await this.webhookmodelservice.createWebhook({
        payload: { ...createDepositDto, stakeRequestId: stakeRequest._id },
        type: WebhookType.STAKE_NOT_ENABLED,
        message: WebhookMessages.STAKE_NOT_ENABLED,
        status: WebhookDataStatus.FAILED,
        platform: platform.symbol,
        webhookRequestId,
      });
      throw new BadRequestException(WebhookMessages.STAKE_NOT_ENABLED);
    }

    if (!cloudKsettings) {
      await this.webhookmodelservice.createWebhook({
        payload: { ...createDepositDto, stakeRequestId: stakeRequest._id },
        type: WebhookType.NODE_K_SETTINGS_NOT_FOUND,
        message: WebhookMessages.NODE_K_SETTINGS_NOT_FOUND,
        status: WebhookDataStatus.FAILED,
        platform: platform.symbol,
        webhookRequestId,
      });
      throw new BadRequestException(WebhookMessages.NODE_K_SETTINGS_NOT_FOUND);
    }

    // check machine token and deposit token is same
    if (
      getMachine.stakeToken._id.toString() !=
      depositSetting.toToken._id.toString()
    ) {
      await this.webhookmodelservice.createWebhook({
        payload: { ...createDepositDto, stakeRequestId: stakeRequest._id },
        type: WebhookType.MISMATCH_TOKEN,
        message: WebhookMessages.MISMATCH_TOKEN,
        status: WebhookDataStatus.FAILED,
        platform: platform.symbol,
        webhookRequestId,
      });
      throw new BadRequestException(WebhookMessages.MISMATCH_TOKEN);
    }

    //Fetch total staked Value
    const totalStakedInMachine =
      await this.cloudKService.getMachineTotalCollatoral(
        getMachine._id as Types.ObjectId,
      );

    //Convert mlyk token value to doller value
    const amountToBeStake = amount * currentPrice.price;

    let amountToMachineInUsd = 0;
    let amountToWallet = 0;
    let amountToMachineInToken = 0;
    let isPartialSuccess = false;
    if (getMachine.stakeLimit === totalStakedInMachine) {
      isPartialSuccess = true;
    }

    if (
      getMachine.stakeLimit &&
      getMachine.stakeLimit < totalStakedInMachine + amountToBeStake &&
      getMachine.stakeLimit >= totalStakedInMachine
    ) {
      amountToWallet =
        totalStakedInMachine + amountToBeStake - getMachine.stakeLimit;

      amountToMachineInUsd = amountToBeStake - amountToWallet;
      amountToMachineInToken = amountToMachineInUsd / currentPrice.price;
    } else {
      amountToMachineInUsd = amountToBeStake;
      amountToMachineInToken = amount;
    }

    const DSTrans = await this.depositAndStakeTransactionModel.findOne({
      user: user._id,
      status: DepositAndStakeTransactionStatusEnum.PENDING,
    });

    const toWalletTransaction =
      await this.walletService.createRawWalletTransaction(
        {
          user: user._id,
          wallet: toWallet._id,
          trxType: TrxType.DEPOSIT,
          amount,
          transactionFlow: TransactionFlow.IN,
        },
        session,
      );

    const trx = toWalletTransaction[0]?.['_id'];

    const isExceedingStakeLimit =
      getMachine.stakeLimit &&
      getMachine.stakeLimit < totalStakedInMachine + amountToBeStake
        ? true
        : false;

    const newDeposit = new this.walletService.depositTransactionModel({
      user: user._id,
      fromToken: fromToken._id,
      toWallet,
      toWalletTrx: trx,
      amount,
      confirmation: createDepositDto.note,
      onChainWallet: user ? user._id : null,
      serialNumber: serialNumber,
      requestId,
      transactionStatus: TransactionStatus.SUCCESS,
      remarks: `Deposit and Transaction request ID: ` + DSTrans.requestId,
      settingsUsed: depositSetting._id,
      hash: createDepositDto.hash,
      newBalance: walletBalance + amount,
      previousBalance: walletBalance,
      token: toWallet?.token || null,
      network: null,
      blockchainId: user?.blockchainId || null,
      isOnChainDeposit: depositSetting?.isOnChainDeposit || false,
    });

    await newDeposit.save({ session });

    const newDepositTransactionHistory =
      new this.walletService.depositTransactionHistoryModel({
        deposit_id: newDeposit._id,
        from: Deposit_Transaction_Type.Deposit,
        type: toWalletTransaction[0]?.['trxType'] || 'deposit',
        user: user._id,
        fromToken: fromToken._id,
        toWallet,
        toWalletTrx: trx,
        amount,
        confirmation: createDepositDto.note,
        depositAddress: user?.address || null,
        onChainWallet: user ? user._id : null,
        serialNumber: serialNumber,
        requestId,
        transactionStatus: TransactionStatus.SUCCESS,
        remarks: `Deposit and Transaction request ID: ` + DSTrans.requestId,
        settingsUsed: depositSetting._id,
        hash: createDepositDto.hash,
        newBalance: walletBalance + amount,
        previousBalance: walletBalance,
        token: toWallet?.token || null,
        network: null,
        blockchainId: user?.blockchainId || null,
        isOnChainDeposit: depositSetting?.isOnChainDeposit || false,
      });
    await newDepositTransactionHistory.save({ session });

    if (otherData.onChainWallet) {
      await this.setDepositSummaryV2(
        {
          amount,
          token: depositSetting.toToken._id,
          network: otherData.onChainWallet.network._id,
          networkName: otherData.onChainWallet.network.name,
          tokenSymbol: depositSetting.toToken.symbol,
        },
        session,
      );
    }

    // Adding the stake amount to the cloudkMachineStake
    const machineId = getMachine._id as string;
    const stake = await this.cloudKService.addStake({
      session: session,
      machineId: new mongoose.Types.ObjectId(machineId),
      userId: user._id,
      type: CLOUDK_MACHINE_STAKE_TYPE.STAKE,
      from: STAKE_FROM.DEPOSIT_AND_STAKE,
      totalToken: amountToMachineInToken,
      lykPrice: currentPrice.price,
      walletTransactionId: null,
      extraMessage:
        'Deposit and transaction || stake request Id ' +
        stakeRequest.transaction._id.toString(),
    });
    if (!stake) {
      await this.webhookmodelservice.createWebhook({
        payload: { ...createDepositDto, stakeRequestId: stakeRequest._id },
        type: WebhookType.UNEXPECTED_ERROR,
        message: WebhookMessages.UNEXPECTED_ERROR,
        status: WebhookDataStatus.FAILED,
        platform: platform.symbol,
        webhookRequestId,
      });
      throw new BadRequestException(WebhookMessages.UNEXPECTED_ERROR);
    }

    await this.cloudKMachineStakeTransactionModel.create(
      [
        {
          machine: new mongoose.Types.ObjectId(machineId),
          stake: stake._id,
          // walletTransaction: walletTransaction._id,
          note: 'Deposit And stake Transaction',
        },
      ],
      {
        session,
      },
    );

    const snGaskSetting = await this.snGaskSettingModel.findOne();
    const multiplier = snGaskSetting.multiplier || 3;

    await this.userGaskModel.create(
      [
        {
          user: new Types.ObjectId(user._id),
          amount: stake.totalPrice * multiplier, // dollar value
          flow: TransactionFlow.IN,
          stake: stake._id,
          multiplier: multiplier,
          machine: getMachine._id,
        },
      ],
      { session },
    );

    await this.cacheService.deleteUserCache({
      type: CACHE_TYPE.ACTIVE_USER,
      user: user._id,
    });

    await this.cacheService.deleteUserCache({
      type: CACHE_TYPE.REWARD_CLAIMABLE_RESULT,
      user: user._id,
    });

    getMachine.collatoral += amountToMachineInUsd;
    getMachine.stakedTokenAmount += amountToMachineInToken;
    getMachine.status = CLOUDK_MACHINE_STATUS.ACTIVE;
    await getMachine.save({ session });

    await this.cloudKService.createCloudKTransaction(
      {
        tokenAmount: amountToMachineInUsd / currentPrice.price,
        type: CloudKTransactionTypes.ADD_STAKE,
        user: getMachine.user,
        machine: getMachine._id as Types.ObjectId,
        totalTokenPrice: amountToMachineInUsd,
        token: getMachine.stakeToken as any,
        stake: String(stake._id),
      },
      session,
    );

    user.isBuilderGenerationActive =
      await this.supernodeService.isBuilderGenerationUserActiveNode(
        user._id,
        session,
      );

    user.isBaseReferralActive =
      (
        await this.supernodeService.baseRefereralUserActiveMachine(
          new Types.ObjectId(user._id),
          session,
        )
      )?.status ?? false;

    await user.save({ session });

    const returnStatus = true;

    DSTrans.status = isPartialSuccess
      ? DepositAndStakeTransactionStatusEnum.PARTIAL_SUCCESS
      : DepositAndStakeTransactionStatusEnum.COMPLETED;
    DSTrans.remarks = `${amount} ${depositSetting.toToken.name} deposit has been processed and $${amountToMachineInUsd} staked in the machine ${getMachine.uniqueName}`;
    DSTrans.save({ session });

    if (DSTrans) {
      await this.depositTransactionHistoryModel.findOneAndUpdate(
        {
          user: user._id,
          deposit_id: DSTrans._id,
          from: Deposit_Transaction_Type.Deposit_Stack,
          status: DepositAndStakeTransactionStatusEnum.PENDING,
        },
        {
          remarks: `${amount} ${depositSetting.toToken.name} deposit has been processed and $${amountToMachineInUsd} staked in the machine ${getMachine.uniqueName}`,
          status: isPartialSuccess
            ? DepositAndStakeTransactionStatusEnum.PARTIAL_SUCCESS
            : DepositAndStakeTransactionStatusEnum.COMPLETED,
        },
        { session },
      );
    }

    if (amountToWallet != 0) {
      // adding remaining token to wallet
      await this.walletService.createRawWalletTransaction(
        {
          user: user._id,
          wallet: toWallet._id,
          trxType: TrxType.DEPOSIT,
          amount: amountToMachineInUsd / currentPrice.price,
          transactionFlow: TransactionFlow.OUT,
        },
        session,
      );
      await session.commitTransaction();
    } else {
      await this.walletService.createRawWalletTransaction(
        {
          user: user._id,
          wallet: toWallet._id,
          trxType: TrxType.DEPOSIT,
          amount,
          transactionFlow: TransactionFlow.OUT,
        },
        session,
      );
      await session.commitTransaction();
    }

    await this.walletService.stakeNotificationSendService(
      true,
      user._id,
      amountToMachineInUsd,
      fromToken.name,
      depositSetting.toToken.symbol,
      user,
      amountToWallet,
      trx,
      null,
      amount,
      null,
      DSTrans.requestId,
      getMachine?.uniqueName,
    );

    return {
      status: returnStatus,
    };
  }
  /**
   * Update or create a summary of deposit.
   * @param summaryData setDepositSummaryType
   * @returns boolean
   */
  async setDepositSummary(
    summaryData: setDepositSummaryType,
    session?: ClientSession | null,
  ): Promise<boolean> {
    try {
      const filterQuery = {
        token: summaryData.token,
        network: summaryData.network,
      };
      const existsSummary =
        await this.depositTransactionSummary.findOne(filterQuery);

      if (existsSummary) {
        existsSummary.amount = (existsSummary.amount || 0) + summaryData.amount;
        await existsSummary.save({ session });
      } else {
        await this.depositTransactionSummary.create([summaryData], { session });
      }
      return true;
    } catch (error) {
      throw new Error(`Error updating deposit summary: ${error.message}`);
    }
  }

  async setDepositSummaryV1(
    summaryData: setDepositSummaryType,
    session?: ClientSession | null,
  ): Promise<boolean> {
    try {
      const filterQuery = {
        token: summaryData.token,
        network: summaryData.network,
      };

      await this.depositTransactionSummary.updateOne(
        filterQuery,
        {
          $inc: { amount: parseFloat(`${summaryData.amount}`).toFixed(10) },
          $setOnInsert: summaryData,
        },
        { session, upsert: true }, // Enable upsert and pass session if provided
      );

      return true;
    } catch (error) {
      throw new Error(`Error updating deposit summary: ${error.message}`);
    }
  }

  async setDepositSummaryV2(
    summaryData: setDepositSummaryType,
    session?: ClientSession | null,
  ): Promise<boolean> {
    try {
      const filterQuery = {
        token: summaryData.token,
        network: summaryData.network,
      };

      // Parse `summaryData.amount` to ensure it's a valid number

      // Normalize the amount to a fixed precision
      const amountToAdd =
        typeof summaryData.amount === 'string'
          ? parseFloat(summaryData.amount)
          : summaryData.amount;

      if (isNaN(amountToAdd)) {
        throw new Error('Invalid amount provided');
      }

      // Round to 10 decimal places for precision
      const roundedAmount = parseFloat(amountToAdd.toFixed(10));

      // Update the document: increment `amount` and set on insert
      await this.depositTransactionSummary.updateOne(
        filterQuery,
        {
          $inc: { amount: roundedAmount }, // Increment the existing amount
          $setOnInsert: { ...summaryData, amount: undefined }, // Avoid overwriting the `amount` on insert
        },
        { session, upsert: true }, // Enable upsert and pass session if provided
      );

      return true;
    } catch (error) {
      throw new Error(`Error updating deposit summary: ${error.message}`);
    }
  }

  async deductDueWalletBalance(DueProps: DeductDueProcessTypes): Promise<{
    deductedBalance: number;
    remainingBalance: number;
    isDeducted: boolean;
    isAllowtoTransactions: boolean;
    usdAmount: number;
    previousDueBalance: number;
    DueWithdrawID: Types.ObjectId | null;
    DueWalletTransactionId: Types.ObjectId | null;
    DueWalletId: Types.ObjectId | null;
    dueWalletBalance: number;
  }> {
    try {
      const {
        userId,
        token,
        amount,
        isDebitEnable,
        tokenPrice,
        dueType,
        trxType,
        beforeWalletBalance,
        session,
        fromAmount,
      } = DueProps;

      let isAllowtoTransactions: boolean = true;
      if (!isDebitEnable) {
        return {
          deductedBalance: 0,
          remainingBalance: amount,
          isDeducted: false,
          isAllowtoTransactions: isAllowtoTransactions,
          usdAmount: 0,
          previousDueBalance: 0,
          DueWithdrawID: null,
          DueWalletTransactionId: null,
          DueWalletId: null,
          dueWalletBalance: 0,
        };
      }
      const userData = await this.userModel.findOne({
        _id: userId,
        deletedAt: null,
      });
      const actualTokenData = await this.tokenModel.findOne({
        _id: token,
        deletedAt: null,
      });

      // const actualWallet = await this.walletService.findUserWalletByTokenSymbol(
      //   actualTokenData.symbol,
      //   userId,
      // );

      const userDueWallet =
        await this.walletService.findUserWalletByTokenSymbol(
          DUE_WALLET_SYMBOL,
          userId,
        );

      if (!userDueWallet) {
        return {
          deductedBalance: 0,
          remainingBalance: amount,
          isDeducted: false,
          isAllowtoTransactions: isAllowtoTransactions,
          usdAmount: 0,
          previousDueBalance: 0,
          DueWithdrawID: null,
          DueWalletTransactionId: null,
          DueWalletId: null,
          dueWalletBalance: 0,
        };
      }
      const { walletBalance } = await this.walletService.getBalanceByWallet(
        userId,
        userDueWallet._id,
      );
      const userDueWalletBalance = walletBalance;

      if (userDueWalletBalance === 0) {
        await this.cloudKService.createOrUpdateAutoCompoundSetting({
          user: userId,
          isUpdate: true,
          currentBalanceInDue: userDueWalletBalance,
        });
        return {
          deductedBalance: 0,
          remainingBalance: amount,
          isDeducted: false,
          isAllowtoTransactions: isAllowtoTransactions,
          usdAmount: 0,
          previousDueBalance: walletBalance,
          DueWithdrawID: null,
          DueWalletTransactionId: null,
          DueWalletId: null,
          dueWalletBalance: walletBalance,
        };
      }
      let usdAmount;
      // deduct amount from wallet
      if (actualTokenData.valueType == 'lyk') {
        usdAmount = tokenPrice * amount;
      } else if (actualTokenData.valueType == 'usd') {
        usdAmount = amount;
      } else {
        await this.cloudKService.createOrUpdateAutoCompoundSetting({
          user: userId,
          isUpdate: true,
          currentBalanceInDue: userDueWalletBalance,
        });
        return {
          deductedBalance: 0,
          remainingBalance: amount,
          isDeducted: false,
          isAllowtoTransactions: isAllowtoTransactions,
          usdAmount: 0,
          previousDueBalance: walletBalance,
          DueWithdrawID: null,
          DueWalletTransactionId: null,
          DueWalletId: null,
          dueWalletBalance: walletBalance,
        };
      }
      let deductedAmount;
      if (usdAmount <= userDueWalletBalance) {
        deductedAmount = usdAmount;
        isAllowtoTransactions = false;
      } else {
        deductedAmount = userDueWalletBalance;
        isAllowtoTransactions = true;
      }

      const { hash } = await generateDueTransactionDetails({
        type: dueType,
        amount: amount,
        actualTokenData: actualTokenData,
        deductedAmount: deductedAmount,
        isAllowtoTransactions: isAllowtoTransactions,
      });
      let remainingBalance;
      if (actualTokenData.valueType == 'lyk') {
        remainingBalance = (usdAmount - deductedAmount) / tokenPrice;
      } else if (actualTokenData.valueType == 'usd') {
        remainingBalance = usdAmount - deductedAmount;
      }
      const { note, userRemarks } = await generateNoteTransactionDetails({
        trxType: trxType,
        fromAmount: fromAmount,
        amount: amount,
        fromBid: userData?.blockchainId,
        receiverAddress: userData?.blockchainId,
        fee: 0,
        commission: 0,
        beforeWalletBalance: beforeWalletBalance,
        isDeducted: true,
        dueWalletBalance: walletBalance,
        deductedAmount: deductedAmount,
        balanceAmount: remainingBalance,
        tokenPrice: tokenPrice,
        actualTokenData: actualTokenData,
      });

      const createdWalletTrx =
        await this.walletService.createRawWalletTransaction(
          {
            user: userId,
            wallet: userDueWallet._id,
            trxType: TrxType.WITHDRAW,
            amount: deductedAmount,
            transactionFlow: TransactionFlow.OUT,
            note: note,
            meta: { fromAmount: amount, DueRemarks: hash },
          },
          session || null,
        );

      const { requestId, serialNumber } =
        await this.walletService.generateUniqueRequestId(TrxType.WITHDRAW);

      const DueRefData = await this.withdrawTransactionModel.create(
        [
          {
            user: userId,
            fromWallet: userDueWallet._id,
            fromWalletTrx: createdWalletTrx[0]._id,
            network: null,
            receiverAddress: userData?.blockchainId,
            amount: deductedAmount,
            total: deductedAmount,
            fee: 0,
            commission: 0,
            feeType: 'fixed',
            commissionType: 'fixed',
            userRemarks: userRemarks,
            requestStatus: RequestStatus.COMPLETED,
            withdrawType: WITHDRAW_TYPES.INTERNAL,
            hash: TrxType.DUE_WALLET,
            serialNumber,
            requestId,
            receiveToken: actualTokenData._id,
            tokenPrice: tokenPrice,
            settingsUsed: null,
            previousBalance: walletBalance,
            newBalance: walletBalance - deductedAmount,
            platform: null,
            token: userDueWallet.token || null,
            blockchainId: userData?.blockchainId || null,
          },
        ],
        { session },
      );

      if (isAllowtoTransactions) {
        await this.cloudKService.createOrUpdateAutoCompoundSetting({
          user: userId,
          isUpdate: true,
          currentBalanceInDue: userDueWalletBalance,
        });
      } else {
        await this.cloudKService.createOrUpdateAutoCompoundSetting({
          user: userId,
          isUpdate: false,
          currentBalanceInDue: userDueWalletBalance,
        });
      }
      return {
        deductedBalance: deductedAmount,
        remainingBalance: remainingBalance,
        isDeducted: true,
        isAllowtoTransactions: isAllowtoTransactions,
        usdAmount: usdAmount,
        previousDueBalance: walletBalance,
        DueWithdrawID: DueRefData[0]._id as Types.ObjectId,
        DueWalletTransactionId: createdWalletTrx[0]._id as Types.ObjectId,
        DueWalletId: userDueWallet._id as Types.ObjectId,
        dueWalletBalance: walletBalance,
      };
    } catch (error) {
      console.log(
        `Error in DeductDueProcessService.deductDueProcess: ${error.message}`,
      );
    }
  }

  async handleDueWithdrawalReimbursement(
    meta: {
      deductedAmount: number;
      dueWithdrawTransactionId: string;
      reimbursedWalletTransactionId: Types.ObjectId;
      tokenData?: any;
    },
    user: Types.ObjectId,
    session?: ClientSession,
  ): Promise<boolean> {
    try {
      // Check if there's an amount to reimburse
      if (!meta?.deductedAmount || meta.deductedAmount <= 0) {
        return false;
      }

      // Fetch the withdrawal transaction
      const getDueWithdrawTransaction: any =
        await this.withdrawTransactionModel.findById(
          meta.dueWithdrawTransactionId,
        );
      if (!getDueWithdrawTransaction) return false;

      const { walletBalance } = await this.walletService.getBalanceByWallet(
        user,
        getDueWithdrawTransaction.fromWallet,
      );

      // Create reimbursement transaction
      const createdWalletTrx =
        await this.walletService.createRawWalletTransaction(
          {
            user,
            wallet: getDueWithdrawTransaction.fromWallet,
            trxType: TrxType.REIMBERS,
            amount: getDueWithdrawTransaction.amount,
            transactionFlow: TransactionFlow.IN,
            note: `Total Amount Reimbers $${getDueWithdrawTransaction.amount}`,
          },
          session,
        );
      const { requestId, serialNumber } =
        await this.walletService.generateUniqueRequestId(TrxType.DEPOSIT);
      const formattedAmount = await formatToFixed5(
        getDueWithdrawTransaction.amount,
      );

      const newDeposit = new this.walletService.depositTransactionModel({
        fromToken: getDueWithdrawTransaction.token,
        user: user,
        toWallet: getDueWithdrawTransaction.fromWallet,
        toWalletTrx: createdWalletTrx[0]._id,
        fromAmount: getDueWithdrawTransaction.amount,
        amount: getDueWithdrawTransaction.amount,
        confirmation: 'internal',
        hash: 'internal-reimbursement',
        serialNumber: serialNumber,
        requestId,
        transactionStatus: TransactionStatus.SUCCESS,
        remarks: `$${formattedAmount} reimbursement has been successfully transferred to your wallet.`,
        note: `$${formattedAmount} reimbursement has been successfully transferred to your wallet.`,
        newBalance: walletBalance + getDueWithdrawTransaction.amount,
        previousBalance: walletBalance,
        token: getDueWithdrawTransaction.token,
        blockchainId: getDueWithdrawTransaction.blockchainId || null,
        meta: {
          dueWithdrawTransactionId: meta.dueWithdrawTransactionId,
          isReverted: true,
          type: TrxType.REIMBERS,
          reimbursedWalletTransactionId: meta.reimbursedWalletTransactionId,
          walletTransactionId: createdWalletTrx[0]._id,
        },
      });

      await newDeposit.save({ session });
      const newDepositTransactionHistory =
        new this.walletService.depositTransactionHistoryModel({
          deposit_id: newDeposit._id,
          from: Deposit_Transaction_Type.Deposit,
          fromToken: getDueWithdrawTransaction.token,
          user: user,
          toWallet: getDueWithdrawTransaction.fromWallet,
          toWalletTrx: createdWalletTrx[0]._id,
          fromAmount: getDueWithdrawTransaction.amount,
          amount: getDueWithdrawTransaction.amount,
          confirmation: 'internal',
          // onChainWallet: onChainWallet ? onChainWallet._id : null,
          serialNumber: serialNumber,
          requestId,
          transactionStatus: TransactionStatus.SUCCESS,
          remarks: `$${formattedAmount} reimbursement has been successfully transferred to your wallet.`,
          note: `$${formattedAmount} reimbursement has been successfully transferred to your wallet.`,
          hash: 'internal-reimbursement',
          newBalance: walletBalance + getDueWithdrawTransaction.amount,
          previousBalance: walletBalance,
          token: getDueWithdrawTransaction.token,
          blockchainId: getDueWithdrawTransaction.blockchainId || null,
          meta: {
            dueWithdrawTransactionId: meta.dueWithdrawTransactionId,
            isReverted: true,
            type: TrxType.REIMBERS,
            reimbursedWalletTransactionId: meta.reimbursedWalletTransactionId,
            walletTransactionId: createdWalletTrx[0]._id,
          },
        });
      await newDepositTransactionHistory.save({ session });
      // Update original transaction if reimbursement was successful
      if (createdWalletTrx[0]._id) {
        const DueMetaData: DueReferenceMetaData = {
          ...getDueWithdrawTransaction.meta,
          isReverted: true,
          revertedWalletTransactionId: createdWalletTrx[0]._id,
        };
        getDueWithdrawTransaction.meta = DueMetaData;
        await getDueWithdrawTransaction.save();
      }
    } catch (error) {
      throw new Error(`Failed to process reimbursement: ${error.message}`);
    }
  }

  async UpdateMetaInDueTransaction(DueProps: {
    DueMeta: DueReferenceMetaData;
    dueTransactionId: Types.ObjectId;
    note: string;
    session?: ClientSession;
  }): Promise<void> {
    const { DueMeta, dueTransactionId, note, session } = DueProps;
    await this.withdrawTransactionModel.findByIdAndUpdate(
      dueTransactionId,
      {
        meta: DueMeta,
        note: note,
      },
      { session },
    );
  }
}
