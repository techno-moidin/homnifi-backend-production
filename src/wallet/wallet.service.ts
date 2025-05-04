import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Wallet } from './schemas/wallet.schema';
import mongoose, {
  ClientSession,
  Connection,
  Document,
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
import {
  Deposit_Transaction_Type,
  TrxType,
} from '../global/enums/trx.type.enum';
import { TransactionFlow } from './enums/transcation.flow.enum';
import {
  OnChainWalletSettingsDTO,
  PaginateDTO,
  SpecialSwapPaginateDTO,
  SwapFilterDTO,
  TokenFilterDTO,
  WalletFilterDTO,
  WithdrawFilterDTO,
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
import { Token, ValueType } from '../token/schemas/token.schema';
import { CreateOnChainWalletDto } from './dto/create-on-chain-wallet.dto';
import {
  DueRemarks,
  DueType,
  RequestStatus,
} from './enums/request.status.enum';
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
import { CONVERSION_TYPES, PLATFORMS } from '../global/enums/wallet.enum';
import { NetworkSettingsType } from '../platform/schemas/network-settings.schema';
import { SpecialSwapTransaction } from '@/src/wallet/schemas/special.swap.transaction.schema';
import { WalletDepositService } from './wallet.deposit.service';
import { PlatformService } from '../platform/platform.service';
import { DepositAndStakeTransaction } from './schemas/depositAndStakeTransaction';
import { OnChainWalletStatus } from './enums/on-chain-status.';
import {
  OnChainWalletSetting,
  OnChainWalletSettingStatus,
} from '../token/schemas/on.chain.wallet.setting.schema';
import { WebhookModel } from '../webhook/schemas/webhookModel.schema';
import { CloudKWalletBalanceDto } from '../webhook/dto/cloudk-webhook.dto';
import { CloudKWalletTransactionDto } from '../webhook/dto/cloudk-wallet-transaction.dto';
import { UsersService } from '../users/users.service';

import TronWeb from 'tronweb';
import { GetAllowApprovalWithdrawDto } from './dto/get-allow-approval-withdraw.dto';
import { aggregatePaginate2 } from '../utils/pagination2.service';
import { aggregatePaginate3 } from '../utils/pagination3.service';
import { WithdrawSummary } from './schemas/withdraw.summary.schema';
import { CacheService } from '../cache/cache.service';
import { CACHE_TYPE } from '../cache/Enums/cache.enum';
import { Swap_SpecialSwap_Type } from './enums/swap-specialSwap.enum';
import { DepositTransactionHistory } from './schemas/deposit.history.transaction.schema';
import { SwapTransactionHistory } from './schemas/swap.transaction.history.schema';
import { CreateOnChainWalletSettingsDto } from './dto/create-on-chain-wallet-settings.dto';
import { TokenSymbol } from '../token/enums/token-code.enum';
import { OnChainAttempt } from '../token/schemas/on.chain.attempt.schema';
import {
  formatToFixed5,
  generateNoteTransactionDetails,
  getCustomRange,
  validateValue,
} from '../utils/common/common.functions';
import { DueReferenceMetaData } from './interfaces/withdraw-transaction.interface';
import {
  getActualAmountAfterConversion,
  getConversionMode,
} from '../utils/common/wallet.transaction.functions';
import { ConversionMode } from './enums/conversion.status.enums';

@Injectable()
export class WalletService {
  private readonly tronWeb: any;
  constructor(
    private readonly httpService: HttpService,
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
    @InjectModel(SwapTransactionHistory.name)
    private readonly swapTransactionHistoryModel: Model<SwapTransactionHistory>,
    @InjectModel(SpecialSwapTransaction.name)
    private readonly specialSwapTransactionModel: Model<SpecialSwapTransaction>,
    @InjectModel(DepositTransaction.name)
    readonly depositTransactionModel: Model<DepositTransactionI>,
    @InjectModel(DepositTransactionHistory.name)
    readonly depositTransactionHistoryModel: Model<DepositTransactionHistory>,
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
    @InjectModel(WebhookModel.name, 'webhook')
    private readonly webhookModel: Model<WebhookModel>,
    @InjectModel(OnChainAttempt.name)
    private readonly onChainAttemptModel: Model<OnChainAttempt>,

    @InjectModel(WithdrawSummary.name)
    private readonly withdrawSummaryModal: Model<WithdrawSummary>,

    private readonly usersService: UsersService,
    private cacheService: CacheService,
  ) {
    this.tronWeb = new TronWeb.TronWeb({
      fullHost: 'https://api.trongrid.io',
    });
  }
  async getAllWallets(userId?: any) {
    if (userId) {
      return await this.walletModel.find({
        user: new Types.ObjectId(userId),
        deletedAt: null,
      });
    } else {
      return await this.walletModel.find({
        deletedAt: null,
      });
    }
  }

  async getAllWalletsByTokenId(tokenId?: any) {
    console.log({ tokenId });
    return await this.walletModel.find({
      token: tokenId,
      deletedAt: null,
    });
  }

  async newDeposit(createDepositDto: CreateDepositDto) {
    const session = await this.connection.startSession();
    session.startTransaction();
    try {
      const { amount, hash, address, isBid } = createDepositDto;
      let user;
      let onChainWallet;

      if (amount < 0)
        throw new HttpException('Amount Must be greater then Zero', 400);

      const isHashExists = await this.depositTransactionModel.findOne({
        hash,
        transactionStatus: { $ne: TransactionStatus.FAILED },
      });

      if (isHashExists)
        throw new HttpException(
          `Same hash trx with request id ${isHashExists.requestId} already exists`,
          400,
        );

      if (isBid) {
        user = await this.myBlockchainIdService.syncUserByBid(address);
      } else {
        onChainWallet = await this.onChainWalletModel
          .findOne({
            address: { $regex: address, $options: 'si' },
          })
          .populate('user');
        if (!onChainWallet) {
          throw new HttpException(
            'No user found with this wallet address.',
            404,
          );
        }
        user = onChainWallet.user;
      }

      const fromToken = await this.tokenModel.findOne({
        symbol: createDepositDto.coin,
      });
      if (!fromToken) throw new HttpException('Invalid coin', 400);

      const depositSetting = await this.depositSettingModel
        .findOne({
          fromToken: fromToken._id,
          isEnable: true,
        })
        .populate<Token>('toToken');
      if (!depositSetting)
        throw new HttpException(
          'No deposit settings found for this token',
          400,
        );

      const toWallet = await this.findUserWalletByTokenSymbol(
        depositSetting.toToken.symbol,
        user._id,
      );

      if (!toWallet) {
        throw new HttpException(
          'No wallet found for this user and token.',
          404,
        );
      }

      const isAmountLessThanMin = amount < depositSetting.minAmount;
      let trx;
      let type = 'deposit';
      const { walletBalance } = await this.getBalanceByWallet(
        user._id,
        toWallet,
      );
      if (!isAmountLessThanMin) {
        const toWalletTransaction = await this.createRawWalletTransaction(
          {
            user: user._id,
            wallet: toWallet._id,
            trxType: TrxType.DEPOSIT,
            amount,
            transactionFlow: TransactionFlow.IN,
          },
          session,
        );

        trx = toWalletTransaction[0]?.['_id'];
        type = toWalletTransaction[0]?.['trxType'];

        if (!toWalletTransaction) {
          throw new HttpException('Failed to create wallet transaction.', 400);
        }
      }

      const { requestId, serialNumber } = await this.generateUniqueRequestId(
        TrxType.DEPOSIT,
      );

      const newDeposit = new this.depositTransactionModel({
        user: user._id,
        toWallet,
        toWalletTrx: trx,
        amount,
        confirmation: createDepositDto.confirmation,
        hash,
        onChainWallet: onChainWallet ? onChainWallet._id : null,
        serialNumber: serialNumber,
        requestId,
        transactionStatus: isAmountLessThanMin
          ? TransactionStatus.FAILED
          : TransactionStatus.SUCCESS,
        remarks: isAmountLessThanMin
          ? 'Failed - Due to the amount is less than minimum amount required for deposit'
          : '',
        settingsUsed: depositSetting._id,
        newBalance: walletBalance + amount,
        previousBalance: walletBalance,
        token: toWallet?.token || null,
        network: onChainWallet ? onChainWallet.network : null,
        blockchainId: user?.blockchainId || null,
      });

      // TODO: Add amount in depositTransaction summuary

      await newDeposit.save({ session });

      const newDepositTransactionHistory =
        new this.depositTransactionHistoryModel({
          deposit_id: newDeposit._id,
          from: Deposit_Transaction_Type.Deposit,
          type: type || 'deposit',
          user: user._id,
          toWallet,
          toWalletTrx: trx,
          amount,
          confirmation: createDepositDto.confirmation,
          hash,
          depositAddress: onChainWallet?.address || null,
          onChainWallet: onChainWallet ? onChainWallet._id : null,
          serialNumber: serialNumber,
          requestId,
          transactionStatus: isAmountLessThanMin
            ? TransactionStatus.FAILED
            : TransactionStatus.SUCCESS,
          remarks: isAmountLessThanMin
            ? 'Failed - Due to the amount is less than minimum amount required for deposit'
            : '',
          settingsUsed: depositSetting._id,
          newBalance: walletBalance + amount,
          previousBalance: walletBalance,
          token: toWallet?.token || null,
          network: onChainWallet ? onChainWallet.network : null,
          blockchainId: user?.blockchainId || null,
        });
      await newDepositTransactionHistory.save({ session });
      await session.commitTransaction();
      this.notificationService.create({
        userIds: [user._id],
        title: 'Deposit Successfull',
        message: `Your deposit of ${amount} ${depositSetting.toToken.symbol} is Successfull`,
        type: NotificationTypeEnum.DEPOSIT,
      });

      this.emailService.send(
        user.email,
        'Deposit Confirmation',
        'Deposit Confirmation',
        'Your deposit has been successfully processed!',
        'We are pleased to inform you that your deposit has been successfully processed',
        fromToken.name,
        String(amount),
        String(new Date()),
        String(trx),
        user.username || user.email,
      );

      //Sending Socket event
      //In here we use userId as Event name and inside the data we specify the event
      this.gatewayService.emitSocketEventNotification({
        message: DEPOSIT_MESSAGE,
        eventName: user.blockchainId,
        data: {
          eventAction: SOCKET_EVENT_NAMES.DEPOSIT_TRANSACTION_SUCCESS,
          title: 'Deposit Successfull',
          message: `Your deposit of ${amount} ${depositSetting.toToken.symbol} is Successfull`,
        },
      });

      return {
        newDeposit,
        status: isAmountLessThanMin ? false : true,
      };
    } catch (error) {
      throw new Error(error);
    } finally {
      session.endSession();
    }
  }

  async webhookDeposit(
    createDepositDto: WebhookDto,
    platform: string,
    webhookRequestId: Types.ObjectId,
  ) {
    const session = await this.connection.startSession();
    session.startTransaction();
    try {
      const { amount, order_id, token, bid } = createDepositDto;
      const user = await this.myBlockchainIdService.syncUserByBid(bid);
      if (!user) {
        await this.webhookmodelservice.createWebhook({
          payload: createDepositDto,
          type: WebhookType.BID,
          message: WebhookMessages.BID,
          status: WebhookDataStatus.FAILED,
          platform,
          webhookRequestId,
        });
        throw new BadRequestException(WebhookMessages.BID);
      }
      const fromToken = await this.tokenModel.findOne({
        symbol: createDepositDto.token,
      });
      if (!fromToken) {
        await this.webhookmodelservice.createWebhook({
          payload: createDepositDto,
          type: WebhookType.TOKEN,
          message: WebhookMessages.TOKEN,
          status: WebhookDataStatus.FAILED,
          platform,
          webhookRequestId,
        });
        throw new BadRequestException(WebhookMessages.TOKEN);
      }

      const platformData = await this.platformService.getPlatformBySymbol(
        platform,
        false,
      );
      const depositSetting = await this.depositSettingModel
        .findOne({
          fromToken: fromToken._id,
          isEnable: true,
          platform: platformData._id,
        })
        .populate<Token>('toToken');
      if (!depositSetting) {
        await this.webhookmodelservice.createWebhook({
          payload: createDepositDto,
          type: WebhookType.DEPOSIT_SETTINGS,
          message: WebhookMessages.DEPOSIT_SETTINGS,
          status: WebhookDataStatus.FAILED,
          platform,
          webhookRequestId,
        });
        throw new BadRequestException(WebhookMessages.DEPOSIT_SETTINGS);
      }

      const toWallet = await this.findUserWalletByTokenSymbol(
        depositSetting.toToken.symbol,
        user._id,
      );

      if (!toWallet) {
        await this.webhookmodelservice.createWebhook({
          payload: createDepositDto,
          type: WebhookType.WALLET,
          message: WebhookMessages.WALLET,
          status: WebhookDataStatus.FAILED,
          platform,
          webhookRequestId,
        });
        throw new BadRequestException(WebhookMessages.WALLET);
      }

      const isAmountLessThanMin =
        platform === 'jb' ? false : amount < depositSetting.minAmount;
      let trx;
      let type;
      const { walletBalance } = await this.getBalanceByWallet(
        user._id,
        toWallet._id,
      );
      if (!isAmountLessThanMin) {
        const toWalletTransaction = await this.createRawWalletTransaction(
          {
            user: user._id,
            wallet: toWallet._id,
            trxType: TrxType.DEPOSIT,
            amount,
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
            platform,
            webhookRequestId,
          });
          throw new HttpException(WebhookMessages.WALLET_TRANSACTION, 404);
        }
      }

      const { requestId, serialNumber } = await this.generateUniqueRequestId(
        TrxType.DEPOSIT,
      );

      const newDeposit = new this.depositTransactionModel({
        user: user._id,
        toWallet,
        toWalletTrx: trx,
        amount,
        confirmation: createDepositDto.platform,
        onChainWallet: user ? user._id : null,
        serialNumber: serialNumber,
        requestId,
        transactionStatus:
          platform === 'jb'
            ? TransactionStatus.SUCCESS
            : isAmountLessThanMin
              ? TransactionStatus.FAILED
              : TransactionStatus.SUCCESS,
        remarks:
          platform === 'jb'
            ? ''
            : isAmountLessThanMin
              ? `Amount is less than minimum amount ${depositSetting.minAmount} required for deposit`
              : '',
        settingsUsed: depositSetting._id,
        platform: platformData._id,
        newBalance: walletBalance + amount,
        previousBalance: walletBalance,
        token: toWallet?.token || null,
        network: null,
        blockchainId: user?.blockchainId || null,
      });

      await newDeposit.save({ session });
      const newDepositTransactionHistory =
        new this.depositTransactionHistoryModel({
          deposit_id: newDeposit._id,
          from: Deposit_Transaction_Type.Deposit,
          type: type || 'deposit',
          user: user._id,
          toWallet,
          toWalletTrx: trx,
          amount,
          confirmation: createDepositDto.platform,
          depositAddress: user?.address || null,
          onChainWallet: user ? user._id : null,
          serialNumber: serialNumber,
          requestId,
          transactionStatus:
            platform === 'jb'
              ? TransactionStatus.SUCCESS
              : isAmountLessThanMin
                ? TransactionStatus.FAILED
                : TransactionStatus.SUCCESS,
          remarks:
            platform === 'jb'
              ? ''
              : isAmountLessThanMin
                ? `Amount is less than minimum amount ${depositSetting.minAmount} required for deposit`
                : '',
          settingsUsed: depositSetting._id,
          platform: platformData._id,
          newBalance: walletBalance + amount,
          previousBalance: walletBalance,
          token: toWallet?.token || null,
          network: null,
          blockchainId: user?.blockchainId || null,
        });
      await newDepositTransactionHistory.save({ session });
      await session.commitTransaction();
      this.notificationService.create({
        userIds: [user._id],
        title:
          platform === 'jb'
            ? 'Deposit Successfull'
            : isAmountLessThanMin
              ? 'Deposit Failed'
              : 'Deposit Successfull',
        message: `Your deposit of ${amount} ${depositSetting.toToken.symbol} is ${platform === 'jb' ? 'successfull' : isAmountLessThanMin ? 'failed' : 'successfull'}`,
        type: NotificationTypeEnum.DEPOSIT,
      });

      this.emailService.send(
        user.email,
        `Deposit ${platform === 'jb' ? 'Confirmation' : isAmountLessThanMin ? 'Failed' : 'Confirmation'}`,
        `Deposit ${platform === 'jb' ? 'Confirmation' : isAmountLessThanMin ? 'Failed' : 'Confirmation'}`,
        `Your deposit has been ${platform === 'jb' ? 'successfully processed!' : isAmountLessThanMin ? 'failed!' : 'successfully processed!'}`,
        `${
          platform === 'jb'
            ? `We are pleased to inform you that your deposit of ${amount} in ${fromToken.name} has been successfully processed}.`
            : isAmountLessThanMin
              ? `Unfortunately, your deposit of ${amount} ${fromToken.name} could not be processed due to The amount is less than the minimum   equired for deposit.`
              : `We are pleased to inform you that your deposit of ${amount} in ${fromToken.name} has been successfully processed}.`
        }`,
        fromToken.name,
        String(amount),
        String(new Date()),
        String(trx),
        user.username || user.email,
      );

      //Sending Socket event
      //In here we use userId as Event name and inside the data we specify the event
      this.gatewayService.emitSocketEventNotification({
        message: DEPOSIT_MESSAGE,
        eventName: user.blockchainId,
        data: {
          eventAction:
            platform === 'jb'
              ? SOCKET_EVENT_NAMES.DEPOSIT_TRANSACTION_SUCCESS
              : isAmountLessThanMin
                ? SOCKET_EVENT_NAMES.DEPOSIT_TRANSACTION_FAILURE
                : SOCKET_EVENT_NAMES.DEPOSIT_TRANSACTION_SUCCESS,
          title:
            platform === 'jb'
              ? 'Deposit Successfull'
              : isAmountLessThanMin
                ? 'Deposit Failed'
                : 'Deposit Successfull',
          message:
            platform === 'jb'
              ? `Your deposit of ${amount} ${depositSetting.toToken.symbol} was Successfull!`
              : isAmountLessThanMin
                ? `Unfortunately, your deposit of ${amount} ${depositSetting.toToken.symbol} could not be processed.`
                : `Your deposit of ${amount} ${depositSetting.toToken.symbol} was Successfull!`,
        },
      });

      return {
        newDeposit,
        status: platform === 'jb' ? true : isAmountLessThanMin ? false : true,
      };
    } catch (error) {
      await session.abortTransaction();
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new Error(error);
    } finally {
      session.endSession();
    }
  }

  async webhookTokenDeposit(
    createDepositDto: WebhookDepositDto,
    platform: any,
    webhookRequestId: Types.ObjectId,
  ) {
    const session = await this.connection.startSession();
    session.startTransaction();
    try {
      const { address, isBid } = createDepositDto;
      let user;
      let onChainWallet;
      let onChainWalletID;

      //Checking request pass the Bid or onChainWallet
      //Fetch the user details using the bid or wallet adress
      if (isBid) {
        user = await this.myBlockchainIdService.syncUserByBid(address);
      } else {
        onChainWallet = await this.onChainWalletModel
          .findOne({
            address: { $regex: address, $options: 'si' },
          })
          .populate('user network');

        if (onChainWallet) {
          const depositSetting = await this.depositSettingModel.findById(
            onChainWallet?.token,
          );
          const onChainWalletSetting = await this.onChainWalletSettingModel
            .findOne({
              status: OnChainWalletStatus.ACTIVE,
              token: depositSetting?.fromToken,
            })
            .exec();
          const isDuplicateAddress = await this.depositTransactionModel.findOne(
            {
              onChainWallet: onChainWallet._id,
              transactionStatus: 'success',
            },
          );
          if (onChainWalletSetting && isDuplicateAddress) {
            await this.webhookmodelservice.createWebhook({
              payload: createDepositDto,
              type: WebhookType.ADDRESS_EXISTS,
              message: WebhookMessages.ADDRESS_EXISTS,
              status: WebhookDataStatus.FAILED,
              platform,
              webhookRequestId,
            });
            throw new BadRequestException(WebhookMessages.ADDRESS_EXISTS);
          }
        } else {
          await this.webhookmodelservice.createWebhook({
            payload: createDepositDto,
            type: WebhookType.ON_CHAIN_WALLET,
            message: WebhookMessages.ON_CHAIN_WALLET,
            status: WebhookDataStatus.FAILED,
            platform,
            webhookRequestId,
          });
          throw new BadRequestException(WebhookMessages.ON_CHAIN_WALLET);
        }
        user = onChainWallet.user;
      }

      // check user isExist or not
      if (!user) {
        await this.webhookmodelservice.createWebhook({
          payload: createDepositDto,
          type: WebhookType.BID,
          message: WebhookMessages.BID,
          status: WebhookDataStatus.FAILED,
          platform: platform.symbol,
          webhookRequestId,
        });
        throw new BadRequestException(WebhookMessages.BID);
      }

      //Fetch the Token
      const fromToken = await this.tokenModel.findOne({
        symbol: createDepositDto.token,
      });
      // Check Token is exist or not
      if (!fromToken) {
        await this.webhookmodelservice.createWebhook({
          payload: createDepositDto,
          type: WebhookType.TOKEN,
          message: WebhookMessages.TOKEN,
          status: WebhookDataStatus.FAILED,
          platform: platform.symbol,
          webhookRequestId,
        });
        throw new BadRequestException(WebhookMessages.TOKEN);
      }

      // Check Deposit and stake Request exist or not
      const stakeRequest = await this.walletDepositService.getTransaction(
        user._id,
        false,
      );

      if (
        stakeRequest.transaction &&
        stakeRequest.transaction.token._id.toString() ==
          fromToken._id.toString()
      ) {
        return await this.walletDepositService.depositAndStakeService(
          user,
          fromToken,
          createDepositDto,
          platform,
          webhookRequestId,
          stakeRequest,
          session,
          {
            onChainWallet,
          },
        );
      } else {
        // Normal Deposit service

        return await this.walletDepositService.normalDepositServiceV1(
          user,
          fromToken as TokenI,
          createDepositDto,
          platform,
          webhookRequestId,
          session,
          false,
          onChainWallet,
        );
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      await session.abortTransaction();
      throw new Error(error);
    } finally {
      session.endSession();
    }
  }

  async depositNotificationSendService(
    success: boolean,
    userIds,
    amount: number,
    fromTokenSymbol: string,
    toTokenSymbol: string,
    user,
    trx?: any,
    notificationMessage?: string,
  ) {
    if (global?.noNotification && global?.noNotification === true) return; //used global variable to avoid sending notification for migration usdk wallet script

    if (success) {
      // Add data to notification
      this.notificationService.create({
        userIds: [userIds],
        title: 'Deposit Successful',
        message: `Your deposit of ${amount} ${toTokenSymbol} is successful`,
        type: NotificationTypeEnum.DEPOSIT,
      });

      // Email service
      this.emailService.send(
        user.email,
        `Deposit Confirmation`,
        `Deposit Confirmation`,
        `Your deposit has been successfully processed!`,
        `We are pleased to inform you that your deposit of ${amount} in ${fromTokenSymbol} has been successfully processed.`,
        fromTokenSymbol,
        String(amount),
        String(new Date()),
        String(trx),
        user.username || user.email,
      );

      //Sending Socket event
      //In here we use userId as Event name and inside the data we specify the event
      this.gatewayService.emitSocketEventNotification({
        message: DEPOSIT_MESSAGE,
        eventName: user.blockchainId,
        data: {
          eventAction: SOCKET_EVENT_NAMES.DEPOSIT_TRANSACTION_SUCCESS,
          title: 'Deposit Successful',
          message: `Your deposit of ${amount} ${toTokenSymbol} was Successful!`,
        },
      });
    } else {
      this.notificationService.create({
        userIds: [userIds],
        title: 'Deposit Failed',
        message: notificationMessage
          ? notificationMessage
          : `Your deposit of ${amount} ${toTokenSymbol} is failed`,
        type: NotificationTypeEnum.DEPOSIT,
      });

      // this.emailService.send(
      //   user.email,
      //   `Deposit Failed`,
      //   `Deposit Failed`,
      //   `Your deposit has been failed!`,
      //   `Unfortunately, your deposit of ${amount} in ${fromTokenSymbol} could not be processed because the amount is less than the minimum required for deposit.`,
      //   fromTokenSymbol,
      //   String(amount),
      //   String(new Date()),
      //   String(''),
      //   user.username || user.email,
      // );

      //Sending Socket event
      //In here we use userId as Event name and inside the data we specify the event
      this.gatewayService.emitSocketEventNotification({
        message: DEPOSIT_MESSAGE,
        eventName: user.blockchainId,
        data: {
          eventAction: SOCKET_EVENT_NAMES.DEPOSIT_TRANSACTION_FAILURE,
          title: 'Deposit Failed',
          message: `Unfortunately, your deposit of ${amount} ${toTokenSymbol} could not be processed because the amount is less than the minimum required for deposit.`,
        },
      });
    }
  }
  async isValidTronAddress(address) {
    const tronAddressRegex = /^T[a-zA-Z0-9]{33}$/;
    return tronAddressRegex.test(address);
  }

  validateTronAddress(address: string): boolean {
    return this.tronWeb.isAddress(address);
  }

  async validateAddressOld(
    address: string,
    networkId: string | Types.ObjectId,
  ) {
    const network = await this.networkModel.findById(networkId);
    if (!network) throw new HttpException('Invalid network Id', 400);
    const isValid = Web3.utils.isAddress(address);
    if (!isValid) {
      if (this.isValidTronAddress(address)) {
        if (!this.validateTronAddress(address)) {
          throw new HttpException('Invalid address/network', 400);
        }
        return true;
      }
      throw new HttpException('Invalid address/network', 400);
    }
    return isValid;
  }

  async validateAddress(address: string, networkId: string | Types.ObjectId) {
    const network = await this.networkModel.findById(networkId);
    if (!network) throw new HttpException('Invalid network Id', 400);
    const validationResult = await this.kmallService.validateAddress(
      address,
      network?.code,
    );
    if (!validationResult) {
      throw new HttpException('Invalid address/network', 400);
    }
    return validationResult;
  }

  async calculateFeeCharge(amount, fee, type: ChargesType, tokenPrice: number) {
    let feeTokenAmount = 0;
    switch (type) {
      case ChargesType.FIXED:
        feeTokenAmount = fee / tokenPrice;
        break;

      case ChargesType.PERCENTAGE:
        const feeInTokens = fee / tokenPrice;
        feeTokenAmount = (feeInTokens * amount) / 100;
        break;

      default:
        throw new Error('Invalid charge type');
    }

    return setDecimalPlaces(feeTokenAmount, AmountType.TOKEN);
  }

  async getBalanceByWallet(userId: Types.ObjectId, walletId: Types.ObjectId) {
    try {
      console.log(userId, 'userId', walletId);

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

  async getWalletById(id) {
    return await this.walletModel.findById(id);
  }

  async findUserWalletByTokenSymbol(
    symbol: string,
    userId: Types.ObjectId,
    session?: ClientSession,
  ) {
    const token = await this.tokenModel.findOne({
      symbol: symbol.toLocaleLowerCase(),
    });

    if (!token) {
      throw new Error(`Token with symbol "${symbol}" not found.`);
    }

    const wallet: any = await this.walletModel
      .findOne({
        token: token._id,
        user: new Types.ObjectId(userId),
        deletedAt: null,
      })
      .populate('token');

    if (wallet) return wallet;

    const newWallet = await this.walletModel.create({
      user: new Types.ObjectId(userId),
      token: token._id,
    });

    return newWallet;

    // const token = await this.getTokenBySymbol(symbol);

    // if (!token) {
    //   throw new Error(`Token with symbol "${symbol}" not found.`);
    // }

    // if (session) {
    //   const newWallet = await this.walletModel.create(
    //     [
    //       {
    //         user: userId,
    //         token: token._id,
    //       },
    //     ],
    //     { session },
    //   );

    //

    //   return newWallet[0];
    // } else {
    //   return await this.walletModel.create({
    //     user: userId,
    //     token: token._id,
    //   });
    // }
  }

  async findUserWalletByTokenSymbolV2(
    tokenInfo: any,
    userId: Types.ObjectId,
    session?: ClientSession,
  ): Promise<any> {
    //
    try {
      if (tokenInfo) {
        const walletInfo = await this.walletModel.findOne({
          user: userId,
          token: tokenInfo._id,
          deletedAt: null,
        });
        if (walletInfo) {
          return walletInfo;
        } else {
          if (session) {
            const newWallet = await this.walletModel.create(
              [
                {
                  user: userId,
                  token: tokenInfo._id,
                },
              ],
              // { session },
            );

            return newWallet[0];
          } else {
            return await this.walletModel.create({
              user: userId,
              token: tokenInfo._id,
            });
          }
        }
      } else {
        throw new Error(`Token with symbol "${tokenInfo.symbol}" not found.`);
      }
    } catch (error) {}
  }

  async findUserWalletByAddress(
    address: string,
    userId: Types.ObjectId,
    session?: ClientSession,
  ) {
    const pipeline = [
      {
        $match: {
          user: new Types.ObjectId(userId),
          address: address,
        },
      },
    ];

    const wallet = await this.walletModel.aggregate(pipeline).exec();

    return wallet?.[0];
  }
  // async createRawWalletTransaction(
  //   createWalletTransactionDto: CreateWalletTransactionDto,
  //   session?: ClientSession,
  // ): Promise<WalletTransactionI[]> {
  //   return await this.walletTransactionModel.create(
  //     [createWalletTransactionDto],
  //     {
  //       session,
  //     },
  //   );
  // }

  async createRawWalletTransaction(
    createWalletTransactionDto: CreateWalletTransactionDto,
    session?: ClientSession,
  ): Promise<WalletTransactionI[]> {
    const { wallet, amount, transactionFlow } = createWalletTransactionDto; // Assuming amount and walletId are in the DTO

    // Step 1: Find the wallet by walletId
    const walletData: any = await this.walletModel.findById(wallet).exec();

    if (!walletData) {
      throw new Error('Wallet not found');
    }

    // Step 2: Add the amount to the wallet transaction (create a new wallet transaction)
    const newTransaction = {
      ...createWalletTransactionDto,
      // Add additional transaction properties if needed
    };

    // Create a wallet transaction

    const createdTransactions = await this.walletTransactionModel.create(
      [newTransaction],
      { session },
    );

    // Step 3: Update wallet balance based on the transaction flow
    if (transactionFlow === TransactionFlow.IN) {
      walletData.totalBalanceinToken += amount;
    } else if (transactionFlow === TransactionFlow.OUT) {
      walletData.totalBalanceinToken -= amount;
    }

    // Save the updated wallet
    await walletData.save();
    // Delete the cache
    // await this.cacheService.deleteUserCache({
    //   type: CACHE_TYPE.MONTHLY_TOKEN_GRAPH_DATA,
    //   user: createWalletTransactionDto.user,
    // });
    // await this.cacheService.deleteUserCache({
    //   type: CACHE_TYPE.YEARLY_TOKEN_GRAPH_DATA,
    //   user: createWalletTransactionDto.user,
    // });
    // await this.cacheService.deleteUserCache({
    //   type: CACHE_TYPE.WEEK_TOKEN_GRAPH_DATA,
    //   user: createWalletTransactionDto.user,
    // });

    return createdTransactions;
  }

  async createRawWalletTransactionWithoutSession(
    createWalletTransactionDto: CreateWalletTransactionDto,
  ) {
    await this.cacheService.deleteUserCache({
      type: CACHE_TYPE.MONTHLY_TOKEN_GRAPH_DATA,
      user: createWalletTransactionDto.user,
    });
    await this.cacheService.deleteUserCache({
      type: CACHE_TYPE.YEARLY_TOKEN_GRAPH_DATA,
      user: createWalletTransactionDto.user,
    });
    await this.cacheService.deleteUserCache({
      type: CACHE_TYPE.WEEK_TOKEN_GRAPH_DATA,
      user: createWalletTransactionDto.user,
    });
    return await this.walletTransactionModel.create(createWalletTransactionDto);
  }

  async getBalanceByToken(userId: Types.ObjectId, tokenId: Types.ObjectId) {
    const wallet = await this.walletModel.aggregate([
      {
        $match: {
          user: new Types.ObjectId(userId),
          token: new Types.ObjectId(tokenId),
          deletedAt: null,
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
      {
        $unwind: '$token',
      },
    ]);

    if (!wallet.length) {
      const token = await this.tokenModel.findById(tokenId);
      return {
        _id: token._id,
        name: token.name,
        symbol: token.symbol,
        balance: 0,
      };
    }

    const { walletBalance } = await this.getBalanceByWallet(
      userId,
      wallet[0]._id,
    );

    const token = wallet[0].token;
    const returnObj = {
      _id: token._id,
      name: token.name,
      symbol: token.symbol,
      balance: walletBalance,
      walletId: wallet[0]._id as mongoose.Types.ObjectId,
    };
    return returnObj;
  }

  // async requestWithdraw(
  //   userId: Types.ObjectId,
  //   createWithdrawDto: CreateWithdrawDto,
  // ) {
  //   const isExternal = createWithdrawDto.type === WITHDRAW_TYPES.EXTERNAL;
  //   ;

  //   if (isExternal) {
  //     // slyk
  //     //  if slyk no need validation

  //     await this.validateAddress(
  //       createWithdrawDto.receiverAddress,
  //       createWithdrawDto.network,
  //     );
  //   }

  //   const session = await this.connection.startSession();
  //   session.startTransaction();
  //   try {
  //     const {
  //       token: tokenId,
  //       amount,
  //       network,
  //       receiverAddress,
  //       userRemarks,
  //       type,
  //       platform,
  //     } = createWithdrawDto;

  //     const token = await this.tokenModel.findById(tokenId);
  //     ;

  //     const userWithdrawWallet = await this.findUserWalletByTokenSymbol(
  //       token.symbol,
  //       userId,
  //     );
  //     ;

  //     const user = await this.userModel.findById(userId);

  //     if (!userWithdrawWallet || !user)
  //       throw new HttpException('Invalid wallet', 400);

  //     const withdrawSettings = await this.withdrawSettingModel
  //       .findOne({
  //         type,
  //         fromToken: userWithdrawWallet.token,
  //         isEnable: true,
  //         platform: new Types.ObjectId(platform),
  //       })
  //       .populate('toToken networks');
  //     if (!withdrawSettings)
  //       throw new HttpException('Cannot withdraw from this wallet', 400);
  //     let toUser;
  //     if (!isExternal) {
  //       // toUser = await this.userModel.findOne({
  //       //   blockchainId: receiverAddress,
  //       // });

  //       toUser =
  //         await this.myBlockchainIdService.syncUserByBid(receiverAddress);

  //       if (!toUser) throw new HttpException('Invalid user id', 400);
  //     }

  //     let networkSettings: NetworkSettingsType;
  //     if (isExternal) {
  //       /**
  //        * As we added Platform support to the application. we are takeing the fees from the networks settings
  //        */
  //       networkSettings = withdrawSettings.networks.find(
  //         (v) => v.networkId.toString() === network.toString(),
  //       );

  //       if (!networkSettings) {
  //         throw new UnprocessableEntityException(
  //           'Network ID is not align with given settings',
  //         );
  //       }
  //     } else {
  //       networkSettings = {
  //         feeType: ChargesType.FIXED,
  //         feeValue: 0,
  //         feeFixedValue: 0,
  //         commissionType: ChargesType.FIXED,
  //         commissionValue: 0,
  //         commissionFixedValue: 0,
  //       } as NetworkSettingsType;
  //     }

  //     const isPendingForAdmin = amount > withdrawSettings.minWithdrawableAmount;
  //     const requestStatus = isExternal
  //       ? isPendingForAdmin
  //         ? RequestStatus.PENDING_FOR_ADMIN
  //         : RequestStatus.PENDING
  //       : RequestStatus.COMPLETED;

  //     const priceData = await this.tokenService.getCurrentPrice();

  //     let fee = await this.calculateFeeCharge(
  //       amount,
  //       networkSettings.feeValue,
  //       networkSettings.feeType,
  //       priceData.price,
  //     );
  //     // We are checking highest value with fixed amount. if  per
  //     if (
  //       networkSettings.feeType == ChargesType.PERCENTAGE &&
  //       networkSettings.feeFixedValue
  //     ) {
  //       if (networkSettings.feeFixedValue >= amount) {
  //         throw new HttpException(
  //           'Unable to deduct the transaction fee from your amount. amount is too low',
  //           400,
  //         );
  //       }
  //       fee = Math.max(networkSettings.feeFixedValue, fee);
  //     }

  //     let commission = await this.calculateFeeCharge(
  //       amount,
  //       networkSettings.commissionValue,
  //       networkSettings.commissionType,
  //       priceData.price,
  //     );

  //     if (
  //       networkSettings.commissionType == ChargesType.PERCENTAGE &&
  //       networkSettings.commissionFixedValue
  //     ) {
  //       if (networkSettings.commissionFixedValue >= amount) {
  //         throw new HttpException(
  //           'Unable to deduct the commission from your amount. amount is too low',
  //           400,
  //         );
  //       }
  //       commission = Math.max(networkSettings.commissionFixedValue, commission);
  //     }

  //     const { walletBalance } = await this.getBalanceByWallet(
  //       userId,
  //       userWithdrawWallet._id,
  //     );

  //     if (amount > walletBalance) {
  //       throw new HttpException('Insufficient balance', 400);
  //     }

  //     const receivableAmount = amount - fee - commission;

  //     const createdWalletTrx = await this.walletTransactionModel.create(
  //       [
  //         {
  //           user: userId,
  //           wallet: userWithdrawWallet._id,
  //           trxType: isExternal ? TrxType.WITHDRAW : TrxType.TRANSFER,
  //           amount: amount,
  //           transactionFlow: TransactionFlow.OUT,
  //         },
  //       ],
  //       { session },
  //     );

  //     const { requestId, serialNumber } = await this.generateUniqueRequestId(
  //       isExternal ? TrxType.WITHDRAW : TrxType.TRANSFER,
  //     );

  //     await this.withdrawTransactionModel.create(
  //       [
  //         {
  //           user: userId,
  //           fromWallet: userWithdrawWallet._id,
  //           fromWalletTrx: createdWalletTrx[0]._id,
  //           network: network,
  //           receiverAddress,
  //           amount,
  //           total: receivableAmount,
  //           fee,
  //           commission,
  //           feeType: networkSettings.feeType,
  //           commissionType: networkSettings.commissionType,
  //           userRemarks,
  //           requestStatus,
  //           withdrawType: type,
  //           serialNumber,
  //           requestId,
  //           receiveToken: withdrawSettings.toToken._id,
  //           tokenPrice: priceData.price,
  //           settingsUsed: withdrawSettings._id,
  //           previousBalance: walletBalance,
  //           newBalance: walletBalance - amount,
  //           platform,
  //         },
  //       ],
  //       { session },
  //     );

  //     if (!isExternal) {
  //       const toUserWallet = await this.findUserWalletByTokenSymbol(
  //         withdrawSettings.toToken.symbol,
  //         toUser._id,
  //       );
  //       if (!toUserWallet)
  //         throw new HttpException(
  //           `The other user does not have ${withdrawSettings.toToken.symbol} wallet`,
  //           400,
  //         );
  //       const trx = await this.walletTransactionModel.create(
  //         [
  //           {
  //             user: toUser._id,
  //             wallet: toUserWallet._id,
  //             trxType: TrxType.TRANSFER,
  //             amount: receivableAmount,
  //             transactionFlow: TransactionFlow.IN,
  //           },
  //         ],
  //         { session },
  //       );
  //       const { serialNumber: sN } = await this.generateUniqueRequestId(
  //         TrxType.DEPOSIT,
  //       );
  //       const newDeposit = new this.depositTransactionModel({
  //         user: toUser._id,
  //         toWallet: toUserWallet._id,
  //         toWalletTrx: trx[0]._id,
  //         amount: receivableAmount,
  //         confirmation: 'internal',
  //         hash: 'internal',
  //         onChainWallet: null,
  //         serialNumber: sN,
  //         requestId,
  //         fromUser: user._id,
  //         transactionStatus: TransactionStatus.SUCCESS,
  //         newBalance: walletBalance + amount,
  //         previousBalance: walletBalance,
  //       });
  //       await newDeposit.save({ session });

  //       this.emailService.send(
  //         toUser.email,
  //         'Received Token Transfer',
  //         'Received Token Transfer',
  //         'You have received a token transfer',
  //         `We are please to announce that you have successfully received your transfer with request ID: ${requestId}`,
  //         withdrawSettings.toToken.symbol,
  //         String(amount),
  //         String(new Date()),
  //         requestId,
  //         toUser.username || toUser.email,
  //       );
  //       this.emailService.send(
  //         user.email,
  //         'Transfer successful',
  //         'Transfer successful',
  //         'Your transfer has completed successfully',
  //         `We are please to announce that your transfer was successfull with request ID: ${requestId}`,
  //         withdrawSettings.toToken.symbol,
  //         String(amount),
  //         String(new Date()),
  //         requestId,
  //         user.username || user.email,
  //       );
  //       this.notificationService.create({
  //         userIds: [toUser._id],
  //         title: 'Transfer Received',
  //         message: `You received a transfer of ${amount} ${withdrawSettings.toToken.symbol} from ${user.username || user.email}`,
  //         type: NotificationTypeEnum.WITHDRAWAL,
  //       });
  //     }

  //     const walletTokenSymbol = withdrawSettings.toToken.symbol;

  //     if (
  //       isExternal &&
  //       !isPendingForAdmin &&
  //       amount <= withdrawSettings.minWithdrawableAmount
  //     ) {
  //       const newtworkCode = await this.networkModel.findById(network);
  //       ;
  //       const kmallWithdrawReq =
  //         await this.kmallService.requestWithdrawOnExternalApp({
  //           asset:
  //             `${walletTokenSymbol}-${newtworkCode.code}`.toLocaleLowerCase(),
  //           amount: receivableAmount,
  //           address: receiverAddress,
  //           requestId,
  //         });
  //       this.emailService.send(
  //         user.email,
  //         'Withdraw request received',
  //         'Withdraw request received',
  //         'Your withdraw has completed successfully',
  //         `We are please to announce that you have successfully completed your withdraw and it will be processed in two hours`,
  //         withdrawSettings.toToken.symbol,
  //         String(amount),
  //         String(new Date()),
  //         requestId,
  //         user.username || user.email,
  //       );
  //     }

  //     if (isExternal && isPendingForAdmin) {
  //       this.emailService.send(
  //         user.email,
  //         'Withdraw request received',
  //         'Withdraw request received',
  //         'Your withdraw request is under review',
  //         `We are please to announce that you have successfully completed your withdraw request and it will be reviewed by the admin`,
  //         withdrawSettings.toToken.symbol,
  //         String(amount),
  //         String(new Date()),
  //         requestId,
  //         user.username || user.email,
  //       );
  //     }

  //     this.notificationService.create({
  //       userIds: [userId],
  //       title: isExternal ? 'Withdrawal request' : 'Transfer Successfull',
  //       message: isExternal
  //         ? 'Your withdraw request has been successfully sent.'
  //         : 'Your transfer is successfull',
  //       type: NotificationTypeEnum.WITHDRAWAL,
  //     });

  //     await session.commitTransaction();
  //   } catch (error) {
  //     await session.abortTransaction();
  //     throw error;
  //   } finally {
  //     session.endSession();
  //   }
  // }

  // async testingURl() {
  //   const tokens = await this.tokenModel.find({
  //     symbol: 'lyk-w',
  //   });
  //
  //   const wallet = await this.walletModel
  //     .find({
  //       user: new Types.ObjectId('670917cf1d934fb967b78f51'),
  //       token: tokens[0]._id,
  //     })
  //     .populate('token');

  //

  //   return wallet;
  // }

  async requestWithdraw(
    userId: Types.ObjectId,
    createWithdrawDto: CreateWithdrawDto,
  ) {
    let isExternal = createWithdrawDto.type === WITHDRAW_TYPES.EXTERNAL;
    if (isExternal) {
      // slyk
      //  if slyk no need validation

      await this.validateAddress(
        createWithdrawDto.receiverAddress,
        createWithdrawDto.network,
      );
    }

    const session = await this.connection.startSession();
    session.startTransaction();
    try {
      const {
        token: tokenId,
        amount: fromRequestedAmount,
        network,
        receiverAddress,
        userRemarks,
        optionalRemarks,
        type,
        platform,
        hundredPercent,
      } = createWithdrawDto;
      let amount: number = fromRequestedAmount;
      const token = await this.tokenModel.findById(tokenId);

      const userWithdrawWallet = await this.findUserWalletByTokenSymbol(
        token.symbol,
        userId,
      );
      const user = await this.userModel.findById(userId);
      if (!userWithdrawWallet || !user)
        throw new HttpException('Invalid wallet', 400);

      if (!isExternal && user.blockchainId === receiverAddress) {
        throw new HttpException(
          'Invalid walletWithdrawal to same account is not allowed. Please select a different user.',
          400,
        );
      }

      if (hundredPercent) {
        const { walletBalance } = await this.getBalanceByWallet(
          userId,
          userWithdrawWallet._id,
        );
        if (walletBalance > 0) {
          amount = walletBalance;
        }
      }

      const withdrawSettings = await this.withdrawSettingModel
        .findOne({
          type,
          fromToken: userWithdrawWallet.token,
          isEnable: true,
          platform: new Types.ObjectId(platform),
        })
        .populate('toToken networks');
      if (!withdrawSettings)
        throw new HttpException('Cannot withdraw from this wallet', 400);
      let toUser;
      if (!isExternal) {
        // toUser = await this.userModel.findOne({
        //   blockchainId: receiverAddress,
        // });

        toUser =
          await this.myBlockchainIdService.syncUserByBid(receiverAddress);

        if (!toUser) throw new HttpException('Invalid user id', 400);
      }

      let networkSettings: NetworkSettingsType;
      if (isExternal) {
        /**
         * As we added Platform support to the application. we are takeing the fees from the networks settings
         */
        networkSettings = withdrawSettings.networks.find(
          (v) => v.networkId.toString() === network.toString(),
        );

        if (!networkSettings) {
          throw new UnprocessableEntityException(
            'Network ID is not align with given settings',
          );
        }
      } else {
        networkSettings = {
          feeType: ChargesType.FIXED,
          feeValue: 0,
          feeFixedValue: 0,
          commissionType: ChargesType.FIXED,
          commissionValue: 0,
          commissionFixedValue: 0,
        } as NetworkSettingsType;
      }
      let isPendingForAdmin = amount > withdrawSettings.minWithdrawableAmount;
      let requestStatus = isExternal
        ? isPendingForAdmin
          ? RequestStatus.PENDING_FOR_ADMIN
          : RequestStatus.PENDING
        : RequestStatus.COMPLETED;
      const priceData = await this.tokenService.getCurrentPrice();

      let fee = await this.calculateFeeCharge(
        amount,
        networkSettings.feeValue,
        networkSettings.feeType,
        token.valueType.toLocaleLowerCase() === ValueType.LYK.toLowerCase()
          ? priceData.price
          : 1,
      );
      // We are checking highest value with fixed amount. if  per
      if (
        networkSettings.feeType == ChargesType.PERCENTAGE &&
        networkSettings.feeFixedValue
      ) {
        if (networkSettings.feeFixedValue >= amount) {
          throw new HttpException(
            'Unable to deduct the transaction fee from your amount. amount is too low',
            400,
          );
        }
        fee = Math.max(networkSettings.feeFixedValue, fee);
      }

      let commission = await this.calculateFeeCharge(
        amount,
        networkSettings.commissionValue,
        networkSettings.commissionType,
        token.valueType.toLocaleLowerCase() === ValueType.LYK.toLowerCase()
          ? priceData.price
          : 1,
      );

      if (
        networkSettings.commissionType == ChargesType.PERCENTAGE &&
        networkSettings.commissionFixedValue
      ) {
        if (networkSettings.commissionFixedValue >= amount) {
          throw new HttpException(
            'Unable to deduct the commission from your amount. amount is too low',
            400,
          );
        }
        commission = Math.max(networkSettings.commissionFixedValue, commission);
      }

      const { walletBalance } = await this.getBalanceByWallet(
        userId,
        userWithdrawWallet._id,
      );

      if (amount > walletBalance) {
        throw new HttpException('Insufficient balance', 400);
      }

      let receivableAmount = amount - fee - commission;

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
        token: userWithdrawWallet.token,
        fromAmount: amount,
        amount: receivableAmount,
        tokenPrice: priceData.price,
        isDebitEnable: true,
        trxType: TrxType.WITHDRAW,
        dueType: DueType.WITHDRAW,
        beforeWalletBalance: walletBalance,
        session: session,
      });

      receivableAmount = remainingBalance;

      if (!isAllowtoTransactions) {
        requestStatus = RequestStatus.COMPLETED;
        isPendingForAdmin = false;
        isExternal = false;
      }

      const {
        note: withdrawNote,
        meta: withdrawMeta,
        userRemarks: withdrawRemarks,
      } = await generateNoteTransactionDetails({
        trxType: TrxType.WITHDRAW,
        fromBid: user?.blockchainId,
        receiverAddress: receiverAddress,
        fromAmount: amount,
        amount: amount,
        fee: fee || 0,
        commission: commission || 0,
        beforeWalletBalance: walletBalance,
        isDeducted: isDeducted,
        dueWalletBalance: dueWalletBalance,
        deductedAmount: deductedBalance,
        balanceAmount: receivableAmount,
        tokenPrice: priceData.price,
        actualTokenData: userWithdrawWallet.token,
        hundredPercent: hundredPercent,
        fromRequestedAmount: fromRequestedAmount,
      });

      const createdWalletTrx = await this.createRawWalletTransaction(
        {
          user: userId,
          wallet: userWithdrawWallet._id,
          trxType: isExternal ? TrxType.WITHDRAW : TrxType.TRANSFER,
          amount: amount,
          transactionFlow: TransactionFlow.OUT,
          note: withdrawNote,
          remark: withdrawRemarks,
          meta: isDeducted
            ? {
                ...withdrawMeta,
                dueWithdrawTransactionId: DueWithdrawID,
                dueType: DueType.WITHDRAW,
                DueRemarks: isAllowtoTransactions
                  ? DueRemarks.PARTIAL_DEBIT_WITHDRAW
                  : DueRemarks.FULL_DEBIT_WITHDRAW,
              }
            : withdrawMeta,
        },
        session,
      );

      const { requestId, serialNumber } = await this.generateUniqueRequestId(
        isExternal ? TrxType.WITHDRAW : TrxType.TRANSFER,
      );

      const WithdrawTransaction = new this.withdrawTransactionModel({
        user: userId,
        fromWallet: userWithdrawWallet._id,
        fromWalletTrx: createdWalletTrx[0]._id,
        network: network,
        receiverAddress,
        amount: amount,
        total: receivableAmount,
        fee,
        commission,
        feeType: networkSettings.feeType,
        commissionType: networkSettings.commissionType,
        requestStatus,
        withdrawType: type,
        serialNumber,
        requestId,
        receiveToken: withdrawSettings.toToken._id,
        tokenPrice: priceData.price,
        settingsUsed: withdrawSettings._id,
        previousBalance: walletBalance,
        newBalance: walletBalance - amount,
        platform,
        token: token._id || null,
        blockchainId: user?.blockchainId || null,
        meta: isDeducted
          ? {
              ...withdrawMeta,
              isDeducted: isDeducted,
              deductedAmount: deductedBalance,
              dueWithdrawTransactionId: DueWithdrawID,
              dueType: DueType.WITHDRAW,
              DueRemarks: isAllowtoTransactions
                ? DueRemarks.PARTIAL_DEBIT_WITHDRAW
                : DueRemarks.FULL_DEBIT_WITHDRAW,
            }
          : withdrawMeta,
        note: withdrawNote,
        userRemarks: withdrawRemarks,
        optionalRemarks,
      });
      await WithdrawTransaction.save({ session });

      if (isDeducted) {
        DueMetaData = {
          ...DueMetaData,
          withdrawTransactionId: WithdrawTransaction._id as Types.ObjectId,
        };
      }

      if (requestStatus === RequestStatus.COMPLETED) {
        await this.withdrawSummary(
          {
            amount,
            token: new Types.ObjectId(withdrawSettings.toToken._id as string),
            tokenName: withdrawSettings.toToken.name,
            symbol: withdrawSettings.toToken.symbol,
            networkId: network || null,
            networkName: '',
            withdrawType: type,
          },
          session,
        );
      }
      let deposit_id = null;
      if (!isExternal && receivableAmount > 0) {
        const toUserWallet = await this.findUserWalletByTokenSymbol(
          withdrawSettings.toToken.symbol,
          toUser._id,
        );
        if (!toUserWallet)
          throw new HttpException(
            `The other user does not have ${withdrawSettings.toToken.symbol} wallet`,
            400,
          );
        const { walletBalance: toUserWalletBalance } =
          await this.getBalanceByWallet(toUser._id, toUserWallet._id);

        const { note: depositNote, meta: depositMeta } =
          await generateNoteTransactionDetails({
            trxType: TrxType.DEPOSIT,
            fromBid: user?.blockchainId,
            receiverAddress: receiverAddress,
            fromAmount: amount,
            amount: amount,
            fee: fee || 0,
            commission: commission || 0,
            beforeWalletBalance: toUserWalletBalance,
            balanceAmount: receivableAmount,
            tokenPrice: priceData.price,
            actualTokenData: withdrawSettings.toToken,
          });

        const trx = await this.createRawWalletTransaction({
          user: toUser._id,
          wallet: toUserWallet._id,
          trxType: TrxType.TRANSFER,
          amount: receivableAmount,
          transactionFlow: TransactionFlow.IN,
          note: depositNote,
          meta: depositMeta,
        });
        // const trx = await this.walletTransactionModel.create(
        //   [
        //     {
        //       user: toUser._id,
        //       wallet: toUserWallet._id,
        //       trxType: TrxType.TRANSFER,
        //       amount: receivableAmount,
        //       transactionFlow: TransactionFlow.IN,
        //     },
        //   ],
        //   { session },
        // );
        const { serialNumber: sN } = await this.generateUniqueRequestId(
          TrxType.DEPOSIT,
        );
        const deposit_receivableAmount = await formatToFixed5(receivableAmount);
        const newDeposit = new this.depositTransactionModel({
          user: toUser._id,
          toWallet: toUserWallet._id,
          toWalletTrx: trx[0]._id,
          amount: receivableAmount,
          confirmation: 'internal',
          hash: 'internal',
          onChainWallet: null,
          serialNumber: sN,
          requestId,
          fromUser: user._id,
          transactionStatus: TransactionStatus.SUCCESS,
          newBalance: toUserWalletBalance + receivableAmount,
          previousBalance: toUserWalletBalance,
          token: toUserWallet?.token || null,
          network: null,
          blockchainId: toUser?.blockchainId || null,
          optionalRemarks: optionalRemarks || '',
          remarks: `${deposit_receivableAmount} ${withdrawSettings.toToken.name} deposited successfully`,
          note: depositNote,
          meta: isDeducted
            ? {
                ...depositMeta,
                dueWithdrawTransactionId: DueWithdrawID,
                withdrawTransactionId:
                  WithdrawTransaction._id as Types.ObjectId,
                dueType: DueType.WITHDRAW,
                DueRemarks: isAllowtoTransactions
                  ? DueRemarks.PARTIAL_DEBIT_WITHDRAW
                  : DueRemarks.FULL_DEBIT_WITHDRAW,
              }
            : depositMeta,
        });
        await newDeposit.save({ session });
        deposit_id = newDeposit._id;
        const newDepositTransactionHistory =
          new this.depositTransactionHistoryModel({
            deposit_id: newDeposit._id,
            from: Deposit_Transaction_Type.Deposit,
            type: trx[0]?.trxType || 'deposit',
            user: toUser._id,
            fromToken: toUserWallet?.token || null,
            toWallet: toUserWallet._id,
            toWalletTrx: trx[0]._id,
            amount: receivableAmount,
            confirmation: 'internal',
            hash: 'internal',
            onChainWallet: null,
            serialNumber: sN,
            requestId,
            fromUser: user._id,
            transactionStatus: TransactionStatus.SUCCESS,
            newBalance: toUserWalletBalance + receivableAmount,
            previousBalance: toUserWalletBalance,
            token: toUserWallet?.token || null,
            network: null,
            blockchainId: toUser?.blockchainId || null,
            optionalRemarks: optionalRemarks || '',
            remarks: `${deposit_receivableAmount} ${withdrawSettings.toToken.name} deposited successfully`,
            note: depositNote,
            meta: isDeducted
              ? {
                  dueWithdrawTransactionId: DueWithdrawID,
                  withdrawTransactionId:
                    WithdrawTransaction._id as Types.ObjectId,
                  type: DueType.WITHDRAW,
                  DueRemarks: isAllowtoTransactions
                    ? DueRemarks.PARTIAL_DEBIT_WITHDRAW
                    : DueRemarks.FULL_DEBIT_WITHDRAW,
                }
              : null,
          });
        await newDepositTransactionHistory.save({ session });
        this.emailService.send(
          toUser.email,
          'Received Token Transfer',
          'Received Token Transfer',
          'You have received a token transfer',
          `We are please to announce that you have successfully received your transfer with request ID: ${requestId}`,
          withdrawSettings.toToken.symbol,
          String(amount),
          String(new Date()),
          requestId,
          toUser.username || toUser.email,
        );
        this.emailService.send(
          user.email,
          'Transfer successful',
          'Transfer successful',
          'Your transfer has completed successfully',
          `We are please to announce that your transfer was successfull with request ID: ${requestId}`,
          withdrawSettings.toToken.symbol,
          String(amount),
          String(new Date()),
          requestId,
          user.username || user.email,
        );
        this.notificationService.create({
          userIds: [toUser._id],
          title: 'Transfer Received',
          message: `You received a transfer of ${receivableAmount} ${withdrawSettings.toToken.name} from ${user.username || user.email}`,
          type: NotificationTypeEnum.WITHDRAWAL,
        });
      }

      const walletTokenSymbol = withdrawSettings.toToken.symbol;

      if (
        isExternal &&
        !isPendingForAdmin &&
        amount <= withdrawSettings.minWithdrawableAmount
      ) {
        const newtworkCode = await this.networkModel.findById(network);
        const kmallWithdrawReq =
          await this.kmallService.requestWithdrawOnExternalApp({
            asset:
              `${walletTokenSymbol}-${newtworkCode.code}`.toLocaleLowerCase(),
            amount: receivableAmount,
            address: receiverAddress,
            requestId,
          });
        this.emailService.send(
          user.email,
          'Withdraw request received',
          'Withdraw request received',
          'Your withdraw has completed successfully',
          `We are please to announce that you have successfully completed your withdraw and it will be processed in two hours`,
          withdrawSettings.toToken.symbol,
          String(amount),
          String(new Date()),
          requestId,
          user.username || user.email,
        );
      }

      if (isExternal && isPendingForAdmin) {
        this.emailService.send(
          user.email,
          'Withdraw request received',
          'Withdraw request received',
          'Your withdraw request is under review',
          `We are please to announce that you have successfully completed your withdraw request and it will be reviewed by the admin`,
          withdrawSettings.toToken.symbol,
          String(amount),
          String(new Date()),
          requestId,
          user.username || user.email,
        );
      }

      this.notificationService.create({
        userIds: [userId],
        title: isExternal ? 'Withdrawal request' : 'Transfer Successfull',
        message: isExternal
          ? 'Your withdraw request has been successfully sent.'
          : 'Your transfer is successfull',
        type: NotificationTypeEnum.WITHDRAWAL,
      });
      if (isDeducted) {
        DueMetaData = {
          ...DueMetaData,
          fromAmount: amount,
          fromToken: userWithdrawWallet?.token || null,
          fromWallet: userWithdrawWallet._id,
          deductedAmount: deductedBalance,
          tokenPrice: priceData.price,
          amount: receivableAmount,
          type: DueType.WITHDRAW,
          DueRemark: isAllowtoTransactions
            ? DueRemarks.PARTIAL_DEBIT_WITHDRAW
            : DueRemarks.FULL_DEBIT_WITHDRAW,
          duewalletId: DueWalletId,
          fromWalletTrx: createdWalletTrx[0]._id,
          dueWalletTransactionId: DueWalletTransactionId,
          depositTransactionId: deposit_id || null,
          isReverted: false,
          // cloudkTransactionId: cloudkTransaction[0]?._id as Types.ObjectId,
        };
        await this.walletDepositService.UpdateMetaInDueTransaction({
          DueMeta: DueMetaData,
          dueTransactionId: DueWithdrawID,
          note: withdrawNote,
          session: session,
        });
      }
      await session.commitTransaction();
    } catch (error) {
      console.log('ERROR Message:', { error: error });

      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async approveForWithdraw(
    requestId: string,
    approveWithdrawDto: ApproveWithdrawDto,
  ) {
    const { adminId } = approveWithdrawDto;

    const updatedRequest = await this.acceptWithdraw(
      requestId,
      approveWithdrawDto.hash,
      adminId,
    );

    const withdrawRequest: any = await this.withdrawTransactionModel
      .findOne({
        requestId,
        requestStatus: RequestStatus.PENDING_FOR_ADMIN,
      })
      .populate<Wallet>('fromWallet user');

    if (!withdrawRequest)
      throw new HttpException('Withdraw request not for admin approval', 400);

    if (!withdrawRequest.platform)
      throw new UnprocessableEntityException('Platform not found');

    const withdrawSetting = await this.withdrawSettingModel
      .findOne({
        fromToken: withdrawRequest.fromWallet.token,
        platform: withdrawRequest.platform,
        deletedAt: null,
        type: WITHDRAW_TYPES.EXTERNAL,
        isEnable: true,
      })
      .populate('fromToken toToken');

    // TODO : // decline and reinmurse in this case?
    if (!withdrawSetting)
      throw new HttpException('Withdraw setting not for these tokens', 400);

    const walletTokenSymbol = withdrawSetting.toToken.symbol;
    const network = await this.networkModel.findById(withdrawRequest.network);

    await this.kmallService.requestWithdrawOnExternalApp({
      asset: `${walletTokenSymbol}-${network.code}`.toLocaleLowerCase(),
      amount: withdrawRequest.total,
      address: withdrawRequest.receiverAddress,
      requestId: withdrawRequest.requestId,
    });

    withdrawRequest.requestStatus = RequestStatus.PENDING;
    await withdrawRequest.save();

    this.emailService.send(
      withdrawRequest.user.email,
      'Withdraw request accepted',
      'Withdraw request accepted',
      'Your withdraw has accepted by the admin',
      `We are please to announce that the admin has accepted your withdraw request and it will be completed within two hours`,
      withdrawSetting.toToken.symbol,
      String(withdrawRequest.amount),
      String(new Date()),
      requestId,
      withdrawRequest.user.username || withdrawRequest.user.email,
    );

    return withdrawRequest;
  }

  async acceptWithdraw(
    requestId: string,
    hash: string,
    adminId?: Types.ObjectId,
  ) {
    const withdrawRequest: any = await this.withdrawTransactionModel
      .findOne({
        requestId,
        requestStatus: RequestStatus.PENDING,
      })
      .populate('fromWallet');

    if (!withdrawRequest) {
      // throw new HttpException('Withdraw request not found', 404);
      return true;
    }
    const status = RequestStatus.COMPLETED;

    const updatedRequest =
      await this.withdrawTransactionModel.findByIdAndUpdate(
        withdrawRequest._id,
        { requestStatus: status, hash, updatedBy: adminId || null },
        { new: true },
      );

    if (status === RequestStatus.COMPLETED) {
      this.withdrawSummary({
        amount: withdrawRequest.amount,
        token: new Types.ObjectId(withdrawRequest.fromWallet.token),
        networkId: withdrawRequest.network || null,
        networkName: '',
        withdrawType: withdrawRequest.type,
      }).then((response) => {});
    }

    if (!updatedRequest) {
      throw new HttpException('Failed to update the withdraw request', 400);
    }

    const user = await this.userModel.findById(updatedRequest.user);
    const userId = user._id as Types.ObjectId;

    await this.notificationService.create({
      userIds: [userId],
      title: 'Withdraw request',
      message: 'Your withdraw request has successfully completed',
      type: NotificationTypeEnum.WITHDRAWAL,
    });

    //Socket service
    this.gatewayService.emitSocketEventNotification({
      message: WITHDRAW_SUCCESS_MESSAGE,
      eventName: user.blockchainId,
      data: {
        eventAction: SOCKET_EVENT_NAMES.WITHDRAW_TRANSACTION_SUCCESS,
        title: 'Withdraw successful',
        message: `Your withdraw request has successfully completed.`,
      },
    });

    return updatedRequest;
  }

  async rejectWithdraw(
    id: string,
    denialReason?: string,
    adminId?: Types.ObjectId,
  ) {
    const session = await this.connection.startSession();
    session.startTransaction();
    try {
      const withdrawRequest = await this.withdrawTransactionModel
        .findOne({
          requestId: id,
          requestStatus: RequestStatus.PENDING_FOR_ADMIN,
        })
        .populate<Wallet>('fromWallet');

      if (!withdrawRequest) {
        throw new HttpException('Withdraw request not found', 404);
      }
      const { walletBalance } = await this.getBalanceByWallet(
        withdrawRequest.user as any,
        withdrawRequest.fromWallet._id,
      );

      const fromWallet: any = withdrawRequest.fromWallet;

      const token = await this.tokenModel.findById(fromWallet.token);
      const reimbersedRecord = await this.withdrawAmountReimberse(
        withdrawRequest,
        session,
        token,
        walletBalance,
      );

      if (!reimbersedRecord) {
        throw new HttpException('Failed to reimberse the amount', 400);
      }

      const updatedRequest =
        await this.withdrawTransactionModel.findByIdAndUpdate(
          withdrawRequest._id,
          {
            requestStatus: adminId
              ? RequestStatus.REJECTED_AND_REIMBERSED
              : RequestStatus.ON_CHAIN_FAILURE_AND_REIMBERSED,
            updatedBy: adminId,
            denialReason: denialReason || '',
            meta: {
              ...withdrawRequest.meta,
              isReverted: true,
              revertedWalletTransactionId:
                reimbersedRecord &&
                reimbersedRecord[0] &&
                reimbersedRecord[0]?._id
                  ? reimbersedRecord[0]?._id
                  : null,
            },
          },
          { new: true, session },
        );

      await session.commitTransaction();

      const user = await this.userModel.findById(updatedRequest.user);
      const userId = user._id as Types.ObjectId;

      await this.notificationService.create({
        userIds: [userId],
        title: 'Withdraw request',
        message: 'Your withdraw request is rejected',
        type: NotificationTypeEnum.WITHDRAWAL,
      });

      //Socket service
      this.gatewayService.emitSocketEventNotification({
        message: WITHDRAW_FAILURE_MESSAGE,
        eventName: user.blockchainId,
        data: {
          eventAction: SOCKET_EVENT_NAMES.WITHDRAW_TRANSACTION_FAILURE,
          title: 'Withdraw request.',
          message: `Your withdraw request is rejected.`,
        },
      });

      this.emailService.send(
        user.email,
        'Withdraw request rejected',
        'Withdraw request rejected',
        'Your withdraw is rejected by the admin',
        `We are sorry to announce that the admin has rejected your withdraw request`,
        token.name,
        String(updatedRequest.amount),
        String(new Date()),
        withdrawRequest.requestId,
        user.username || user.email,
      );

      return updatedRequest;
    } catch (error) {
      await session.abortTransaction();
      throw new Error(error);
    } finally {
      session.endSession();
    }
  }

  async withdrawAmountReimberse(
    withdrawRequest: any,
    session?: ClientSession,
    tokenData?: any,
    walletBalance?: number,
  ) {
    const {
      user,
      fromWallet,
      amount,
      total,
      commission,
      fee,
      meta,
      token,
      blockchainId,
      receiverAddress,
    } = withdrawRequest;
    // Creating Meta, Notes and Remarks

    if (!tokenData) {
      throw new HttpException('Token not found', 404);
    }
    const {
      note: reimberseNote,
      meta: reimberseMeta,
      userRemarks: reimburseRemarks,
    } = await generateNoteTransactionDetails({
      trxType: TrxType.REIMBERS,
      fromAmount: amount,
      amount: amount,
      fromBid: blockchainId,
      receiverAddress: receiverAddress,
      fee: fee,
      commission: commission,
      beforeWalletBalance: walletBalance,
      isDeducted: meta?.isDeducted || false,
      dueWalletBalance: meta?.dueWalletBalance || 0,
      deductedAmount: meta?.deductedAmount || 0,
      balanceAmount: meta?.balanceAmount || amount,
      tokenPrice: meta?.tokenPrice || 0,
      actualTokenData: tokenData || 0,
      fromRequestedAmount: amount,
    });

    const createdWalletTrx = await this.createRawWalletTransaction(
      {
        user: user,
        wallet: fromWallet,
        trxType: TrxType.REIMBERS,
        amount: amount,
        transactionFlow: TransactionFlow.IN,
        remark: reimburseRemarks,
        note: reimberseNote,
        meta: reimberseMeta,
      },
      session,
    );
    if (createdWalletTrx) {
      const { requestId, serialNumber } = await this.generateUniqueRequestId(
        TrxType.DEPOSIT,
      );
      const formattedAmount = await formatToFixed5(amount);
      const newDeposit = new this.depositTransactionModel({
        fromToken: token,
        user: user,
        toWallet: fromWallet,
        toWalletTrx: createdWalletTrx[0]._id,
        fromAmount: amount,
        amount: amount,
        confirmation: 'internal',
        hash: 'internal-reimbursement',
        // onChainWallet: onChainWallet ? onChainWallet._id : null,
        serialNumber: serialNumber,
        requestId,
        transactionStatus: TransactionStatus.SUCCESS,
        remarks: `${formattedAmount} ${tokenData.name} reimbursement has been successfully transferred to your wallet.`,
        note: `${formattedAmount} ${tokenData.name}  reimbursement has been successfully transferred to your wallet.`,
        newBalance: walletBalance + amount,
        previousBalance: walletBalance,
        token: token,
        blockchainId: blockchainId || null,
      });

      await newDeposit.save({ session });
      const newDepositTransactionHistory =
        new this.depositTransactionHistoryModel({
          deposit_id: newDeposit._id,
          from: Deposit_Transaction_Type.Deposit,
          fromToken: token,
          user: user,
          toWallet: fromWallet,
          toWalletTrx: createdWalletTrx[0]._id,
          fromAmount: amount,
          amount: amount,
          confirmation: 'internal',
          hash: 'internal-reimbursement',
          serialNumber: serialNumber,
          requestId,
          transactionStatus: TransactionStatus.SUCCESS,
          remarks: `${formattedAmount} ${tokenData.name} reimbursement has been successfully transferred to your wallet.`,
          note: `${formattedAmount} ${tokenData.name}  reimbursement has been successfully transferred to your wallet.`,
          // platform: platform?._id || null,
          newBalance: walletBalance + amount,
          previousBalance: walletBalance,
          token: token,
          blockchainId: blockchainId || null,
        });
      await newDepositTransactionHistory.save({ session });
    }
    if (
      meta?.isDeducted &&
      meta?.DueRemarks === DueRemarks.PARTIAL_DEBIT_WITHDRAW &&
      meta?.dueType === DueType.WITHDRAW
    ) {
      const ReimbersDue =
        await this.walletDepositService.handleDueWithdrawalReimbursement(
          {
            deductedAmount: meta.deductedAmount,
            dueWithdrawTransactionId: meta.dueWithdrawTransactionId,
            reimbursedWalletTransactionId: createdWalletTrx[0]._id,
            tokenData: tokenData,
          },
          user,
          session,
        );
    }
    return createdWalletTrx;
  }

  async generateUniqueRequestId(trxType: TrxType, session?: ClientSession) {
    let model;
    switch (trxType) {
      case TrxType.WITHDRAW:
        model = this.withdrawTransactionModel;
        break;
      case TrxType.TRANSFER:
        model = this.withdrawTransactionModel;
        break;
      case TrxType.SWAP:
        model = this.swapTransactionModel;
        break;
      case TrxType.SPECIAL_SWAP:
        model = this.specialSwapTransactionModel;
        break;
      case TrxType.DEPOSIT:
        model = this.depositTransactionModel;
      case TrxType.CLAIMED_REWARD:
        model = this.depositTransactionModel;
        break;
      case TrxType.BONUS:
        model = this.depositTransactionModel;
        break;
      case TrxType.MIGRATE:
        model = this.depositTransactionModel;
        break;
      case TrxType.LAUNCHPAD_AIRDROP:
        model = this.depositTransactionModel;
        break;
      case TrxType.SUPERNODE_REWARD:
        model = this.depositTransactionModel;
        break;
      case TrxType.T_BALANCE_WITHDRAW:
        model = this.withdrawTransactionModel;
        break;
    }

    /**
     * commented the code below. since the code is not make any sense. and its make hard to reuse this function
     */
    // if (!model) throw new Error('Invalid Transaction Type');

    const counter = await this.trxCounterModel.findOneAndUpdate(
      { _id: 'trxSerialNumber' }, // Use a specific ID for the machine serial number counter
      { $inc: { seq: 1 } }, // Atomically increment the sequence number
      {
        new: true,
        upsert: true,
        // session, // Include the session to ensure atomicity within a transaction
      },
    );

    // const lastTrx = await model
    //   .findOne({})
    //   .session(session)
    //   .sort({ serialNumber: -1 });
    // const serialNumber = lastTrx ? (lastTrx.serialNumber || 1000) + 1 : 1000;
    const serialNumber = counter.seq;
    const requestId = await generateUniqueString(trxType, serialNumber);
    return {
      requestId,
      serialNumber,
    };
  }

  async createWalletByTokenSymbol(userId: Types.ObjectId, tokenSymbol: string) {
    await this.findUserWalletByTokenSymbol(tokenSymbol, userId);
  }

  async newSwap(userId: Types.ObjectId, createSwapDto: CreateSwapDto) {
    const session = await this.connection.startSession();
    session.startTransaction();
    try {
      const {
        fromToken: fromTokenId,
        toToken: toTokenId,
        amount: fromAmount,
        hundredPercent,
      } = createSwapDto;
      let amount: number = fromAmount;
      const fromToken: any = await this.tokenModel.findById(fromTokenId);
      const toToken: any = await this.tokenModel.findById(toTokenId);
      if (!fromToken || !toToken) {
        throw new HttpException('Invalid token ids provided', 400);
      }

      // Check if the user has sufficient balance for the swap
      const fromUserWallet = await this.findUserWalletByTokenSymbol(
        fromToken.symbol,
        userId,
        session,
      );
      const toUserWallet = await this.findUserWalletByTokenSymbol(
        toToken.symbol,
        userId,
        session,
      );

      const allSwapSettings: any =
        await this.tokenService.getSwapSettingsByFromToken(fromToken._id);

      const currentTokenSwapSettings = allSwapSettings.find(
        (setting) =>
          toToken.symbol.toLowerCase() === setting.symbol.toLowerCase(),
      );
      // console.log(
      //   '🚀 ~ newSwap ~ currentTokenSwapSettings:',
      //   currentTokenSwapSettings,
      // );

      if (hundredPercent) {
        const { walletBalance } = await this.getBalanceByWallet(
          userId,
          fromUserWallet._id,
        );
        if (walletBalance > 0) {
          amount = walletBalance;
        }
      }

      if (!currentTokenSwapSettings)
        throw new HttpException('Cannot swap these wallets', 400);

      if (amount < currentTokenSwapSettings.minAmount)
        throw new HttpException(
          `Minimum ${currentTokenSwapSettings.minAmount} is required to swap.`,
          400,
        );
      if (amount > currentTokenSwapSettings.maxAmount)
        throw new HttpException(
          `Can only swap upto ${currentTokenSwapSettings.maxAmount} tokens.`,
          400,
        );

      const priceData = await this.tokenService.getCurrentPrice();

      let swapAmount = amount;

      const commission = await this.calculateFeeCharge(
        amount,
        currentTokenSwapSettings.commission,
        currentTokenSwapSettings.commissionType,
        fromToken.valueType.toLocaleLowerCase() === ValueType.LYK.toLowerCase()
          ? priceData.price
          : 1,
      );

      const totalAmount = swapAmount - commission;

      const conversionMode = await getConversionMode(fromToken, toToken);

      let customRate = 1;
      let isConvertable = false;

      if (
        currentTokenSwapSettings.rate &&
        conversionMode === ConversionMode.DYNAMIC_TO_DYNAMIC
      ) {
        customRate = currentTokenSwapSettings.rate
          ? currentTokenSwapSettings.rate
          : customRate;
        isConvertable = true;
      }

      swapAmount = await getActualAmountAfterConversion(
        fromToken,
        toToken,
        priceData,
        totalAmount,
        conversionMode,
        customRate,
        isConvertable,
      );

      // // We Just want to make sure valueType is lowerCase
      // fromToken.valueType = fromToken.valueType.toLowerCase();
      // toToken.valueType = toToken.valueType.toLowerCase();

      // if (fromToken.valueType === toToken.valueType) {
      //   swapAmount = totalAmount; // Keep the amount the same
      // } else if (
      //   fromToken.valueType === ValueType.USD &&
      //   toToken.valueType === ValueType.LYK
      // ) {
      //   // From USD to LYK: multiply by LYK price
      //   swapAmount = totalAmount / priceData.price;
      // } else if (
      //   fromToken.valueType === ValueType.LYK &&
      //   toToken.valueType === ValueType.USD
      // ) {
      //   swapAmount = totalAmount * priceData.price;
      // }

      //  84
      // const totalAmount =  swapAmount - commission ;

      const { walletBalance } = await this.getBalanceByWallet(
        userId,
        fromUserWallet._id,
      );

      const { walletBalance: toTokenWalletBalance } =
        await this.getBalanceByWallet(userId, toUserWallet._id);

      const fromUserWalletBalance = walletBalance;
      if (totalAmount > fromUserWalletBalance)
        throw new HttpException('Insufficient balance', 400);

      const rate = currentTokenSwapSettings.rate;

      const fromTrx = await this.createRawWalletTransaction(
        {
          user: userId,
          wallet: fromUserWallet._id,
          trxType: TrxType.SWAP,
          amount: amount,
          transactionFlow: TransactionFlow.OUT,
          meta: {
            fromAmount: fromAmount || null,
            amount: amount || null,
            totalAmount: totalAmount || null,
            hundredPercent: hundredPercent ?? false,
            commission: commission || null,
            commissionType: currentTokenSwapSettings?.commissionType || null,
            tokenPrice: priceData?.price || null,
          },
        },
        session,
      );
      const extraTokenPercentage =
        String(fromToken.symbol).toLocaleLowerCase() === 'usdk-old' ? 0.1 : 0;

      // const amt = swapAmount * (rate || 1);
      const amt = swapAmount;
      const toTrx = await this.createRawWalletTransaction(
        {
          user: userId,
          wallet: toUserWallet._id,
          trxType: TrxType.SWAP,
          // amount: amount * (rate || 1),
          amount: amt,
          // bonus: amt * extraTokenPercentage,
          actualAmount: swapAmount,
          transactionFlow: TransactionFlow.IN,
          note: isConvertable ? 'T-balance swap' : 'normal-swap',

          meta: {
            fromWallet: fromUserWallet._id,
            fromWalletTrx: fromTrx[0]._id,
            tokenPrice: priceData?.price || null,
          },
        },
        session,
      );

      const { requestId, serialNumber } = await this.generateUniqueRequestId(
        TrxType.SWAP,
      );

      const swapTrx = new this.swapTransactionModel({
        user: userId,
        fromWallet: fromUserWallet._id,
        fromWalletTrx: fromTrx[0]._id,
        toWallet: toUserWallet._id,
        toWalletTrx: toTrx[0]._id,
        amount: swapAmount,
        swapAmount: amount,
        // bonus: swapAmount * extraTokenPercentage,
        total: totalAmount,
        actualAmount: swapAmount,
        commission,
        commissionType: currentTokenSwapSettings.commissionType,
        serialNumber,
        requestId,
        tokenPrice: priceData.price,
        settingsUsed: currentTokenSwapSettings.settingId,
        newBalance: fromUserWalletBalance - amount,
        previousBalance: fromUserWalletBalance,
        newBalanceOfToToken: toTokenWalletBalance + swapAmount,
        previousBalanceOfToToken: toTokenWalletBalance,
        platform: currentTokenSwapSettings.platform,
      });
      await swapTrx.save({ session });

      const swapTransactionHistory = new this.swapTransactionHistoryModel({
        swap_id: swapTrx._id,
        type: Swap_SpecialSwap_Type.SWAP,
        user: userId,
        fromWallet: fromUserWallet._id,
        fromWalletTrx: fromTrx[0]._id,
        toWallet: toUserWallet._id,
        toWalletTrx: toTrx[0]._id,
        amount: swapAmount,
        swapAmount: amount,

        // bonus: swapAmount * extraTokenPercentage,
        total: totalAmount,
        actualAmount: swapAmount,
        commission,
        commissionType: currentTokenSwapSettings.commissionType,
        serialNumber,
        requestId,
        tokenPrice: priceData.price,
        settingsUsed: currentTokenSwapSettings.settingId,
        newBalance: fromUserWalletBalance - amount,
        previousBalance: fromUserWalletBalance,
        newBalanceOfToToken: toTokenWalletBalance + swapAmount,
        previousBalanceOfToToken: toTokenWalletBalance,
        platform: currentTokenSwapSettings.platform,
      });
      await swapTransactionHistory.save({ session });

      await session.commitTransaction();

      await this.notificationService.create({
        userIds: [userId],
        title: 'Swap request',
        message: 'Your swap request has created successfully',
        type: NotificationTypeEnum.SWAP,
      });
      const userIdAsObject = new mongoose.Types.ObjectId(userId);

      const user = await this.userModel.findById(userIdAsObject);

      // this.emailService.send(
      //   user.email,
      //   'Swap Confirmation',
      //   'Swap Confirmation',
      //   'Your Swap has been created successfully!',
      //   'We are pleased to inform you that your swap has been successfully processed',
      //   fromToken.name,
      //   String(amount),
      //   String(new Date()),
      //   String(swapTrx._id.toString()),
      //   user.username || user.email,
      // );

      return swapTrx;
    } catch (error) {
      session.abortTransaction();
      throw new HttpException(error, 400);
    } finally {
      session.endSession();
    }
  }

  async newSpecialSwap(
    userId: Types.ObjectId | string,
    createSwapDto: CreateSwapDto,
  ) {
    const userOId = new Types.ObjectId(userId);
    const session = await this.connection.startSession();
    session.startTransaction();
    try {
      const {
        fromToken: fromTokenId,
        toToken: toTokenId,
        amount: fromAmount,
        hundredPercent,
      } = createSwapDto;
      let total: number = fromAmount;
      const [fromToken, toToken]: [any, any] = await Promise.all([
        this.tokenModel.findById(fromTokenId),
        this.tokenModel.findById(toTokenId),
      ]);

      if (!fromToken || !toToken) {
        throw new HttpException('Invalid token ids provided', 400);
      }

      // Check if the user has sufficient balance for the swap
      const [fromUserWallet, toUserWallet] = await Promise.all([
        this.findUserWalletByTokenSymbol(fromToken.symbol, userOId, session),
        this.findUserWalletByTokenSymbol(toToken.symbol, userOId, session),
      ]);

      if (hundredPercent) {
        const { walletBalance } = await this.getBalanceByWallet(
          userOId,
          fromUserWallet._id,
        );
        if (walletBalance > 0) {
          total = walletBalance;
        }
      }

      const allSwapSettings: any =
        await this.tokenService.getSpecialSwapSettingsByFromToken(
          fromToken._id,
        );

      const currentTokenSwapSettings = allSwapSettings.find(
        (setting) =>
          toToken.symbol.toLowerCase() === setting.symbol.toLowerCase(),
      );

      if (!currentTokenSwapSettings)
        throw new HttpException('Cannot swap these wallets', 400);

      if (total < currentTokenSwapSettings.minAmount)
        throw new HttpException(
          `Minimum ${currentTokenSwapSettings.minAmount} is required to swap.`,
          400,
        );
      if (total > currentTokenSwapSettings.maxAmount)
        throw new HttpException(
          `Can only swap upto ${currentTokenSwapSettings.maxAmount} tokens.`,
          400,
        );

      const priceData = await this.tokenService.getCurrentPrice();

      // let swapAmount = total;

      // // We Just want to make sure valueType is lowerCase
      // fromToken.valueType = fromToken.valueType.toLowerCase();
      // toToken.valueType = toToken.valueType.toLowerCase();

      // if (fromToken.valueType === toToken.valueType) {
      //   swapAmount = total; // Keep the amount the same
      // } else if (
      //   fromToken.valueType === ValueType.USD &&
      //   toToken.valueType === ValueType.LYK
      // ) {
      //   // From USD to LYK: multiply by LYK price
      //   swapAmount = total / priceData.price;
      // } else if (
      //   fromToken.valueType === ValueType.LYK &&
      //   toToken.valueType === ValueType.USD
      // ) {
      //   swapAmount = total * priceData.price;
      // }
      // //

      // const commission = await this.calculateFeeCharge(
      //   swapAmount,
      //   currentTokenSwapSettings.commission,
      //   currentTokenSwapSettings.commissionType,
      //   fromToken.valueType === ValueType.LYK ? priceData.price : 1,
      // );
      // const totalAmount = swapAmount;
      // swapAmount = totalAmount - commission;

      let swapAmount = total;

      const commission = await this.calculateFeeCharge(
        total,
        currentTokenSwapSettings.commission,
        currentTokenSwapSettings.commissionType,
        fromToken.valueType.toLocaleLowerCase() === ValueType.LYK.toLowerCase()
          ? priceData.price
          : 1,
      );

      const totalAmount = swapAmount - commission;

      // We Just want to make sure valueType is lowerCase
      fromToken.valueType = fromToken.valueType.toLowerCase();
      toToken.valueType = toToken.valueType.toLowerCase();

      if (fromToken.valueType === toToken.valueType) {
        swapAmount = totalAmount; // Keep the amount the same
      } else if (
        fromToken.valueType === ValueType.USD &&
        toToken.valueType === ValueType.LYK
      ) {
        // From USD to LYK: multiply by LYK price
        swapAmount = totalAmount / priceData.price;
      } else if (
        fromToken.valueType === ValueType.LYK &&
        toToken.valueType === ValueType.USD
      ) {
        swapAmount = totalAmount * priceData.price;
      }

      const { walletBalance } = await this.getBalanceByWallet(
        userOId,
        fromUserWallet._id,
      );

      const { walletBalance: toTokenWalletBalance } =
        await this.getBalanceByWallet(userOId, toUserWallet._id);

      const fromUserWalletBalance = walletBalance;
      if (total > fromUserWalletBalance)
        throw new HttpException('Insufficient balance', 400);

      const rate = currentTokenSwapSettings.rate;

      const fromTrx = await this.createRawWalletTransaction(
        {
          user: userOId,
          wallet: fromUserWallet._id,
          trxType: TrxType.SPECIAL_SWAP,
          amount: total,
          transactionFlow: TransactionFlow.OUT,
          meta: {
            fromAmount: fromAmount || null,
            amount: total || null,
            totalAmount: totalAmount || null,
            hundredPercent: hundredPercent ?? false,
            commission: commission || null,
            tokenPrice: priceData?.price || null,
            commissionType: currentTokenSwapSettings?.commissionType || null,
          },
        },
        session,
      );
      const toTrx = await this.createRawWalletTransaction(
        {
          user: userOId,
          wallet: toUserWallet._id,
          trxType: TrxType.SPECIAL_SWAP,
          amount: swapAmount * (rate || 1),
          transactionFlow: TransactionFlow.IN,
          meta: {
            fromWallet: fromUserWallet._id,
            fromWalletTrx: fromTrx[0]._id,
            tokenPrice: priceData?.price || null,
          },
        },
        session,
      );

      const { requestId, serialNumber } = await this.generateUniqueRequestId(
        TrxType.SPECIAL_SWAP,
      );

      const swapTrx = new this.specialSwapTransactionModel({
        user: userOId,
        fromWallet: fromUserWallet._id,
        fromWalletTrx: fromTrx[0]._id,
        toWallet: toUserWallet._id,
        toWalletTrx: toTrx[0]._id,
        amount: swapAmount,
        total,
        commission,
        commissionType: currentTokenSwapSettings.commissionType,
        serialNumber,
        requestId,
        tokenPrice: priceData.price,
        settingsUsed: currentTokenSwapSettings.settingId,
        newBalance: fromUserWalletBalance - total,
        previousBalance: fromUserWalletBalance,
        platform: currentTokenSwapSettings.platform,
        newBalanceOfToToken: toTokenWalletBalance + swapAmount,
        previousBalanceOfToToken: toTokenWalletBalance,
      });
      await swapTrx.save({ session });

      const swapTransactionHistory = new this.swapTransactionHistoryModel({
        swap_id: swapTrx._id,
        type: Swap_SpecialSwap_Type.SPECIAL_SWAP,
        user: userOId,
        fromWallet: fromUserWallet._id,
        fromWalletTrx: fromTrx[0]._id,
        toWallet: toUserWallet._id,
        toWalletTrx: toTrx[0]._id,
        amount: swapAmount,
        total,
        commission,
        commissionType: currentTokenSwapSettings.commissionType,
        serialNumber,
        requestId,
        tokenPrice: priceData.price,
        settingsUsed: currentTokenSwapSettings.settingId,
        newBalance: fromUserWalletBalance - total,
        previousBalance: fromUserWalletBalance,
        platform: currentTokenSwapSettings.platform,
        newBalanceOfToToken: toTokenWalletBalance + swapAmount,
        previousBalanceOfToToken: toTokenWalletBalance,
      });
      await swapTransactionHistory.save({ session });

      await session.commitTransaction();

      // await this.notificationService.create({
      //   userIds: [userOId],
      //   title: 'Swap request',
      //   message: 'Your swap request has created successfully',
      //   type: NotificationTypeEnum.SPECIAL_SWAP,
      // });
      const userIdAsObject = new mongoose.Types.ObjectId(userOId);

      const user = await this.userModel.findById(userIdAsObject);

      // this.emailService
      //   .send(
      //     user.email,
      //     'Swap Confirmation',
      //     'Swap Confirmation',
      //     'Your Swap has been created successfully!',
      //     'We are pleased to inform you that your swap has been successfully processed',
      //     fromToken.name,
      //     String(total),
      //     String(new Date()),
      //     String(swapTrx._id.toString()),
      //     user.username || user.email,
      //   )
      //   .catch((e) => console.error(e));
      return swapTrx;
    } catch (error) {
      await session.abortTransaction();
      throw new HttpException(error, 400);
    } finally {
      await session.endSession();
    }
  }

  // ⚠️ Commented out for backwards compatibility
  //
  // async getSwapsPaginated(userId: Types.ObjectId, paginateDTO: PaginateDTO) {
  //   const { page, limit, query, fromDate, toDate } = paginateDTO;

  //   const matchConditions: any[] = [
  //     { user: new Types.ObjectId(userId), deletedAt: { $eq: null } },
  //   ];

  //   if (query) {
  //     const queryNumber = parseInt(query, 10);
  //     if (!isNaN(queryNumber)) {
  //       matchConditions.push({
  //         $or: [{ serialNumber: queryNumber }],
  //       });
  //     } else {
  //       matchConditions.push({
  //         requestId: { $regex: query, $options: 'i' },
  //       });
  //     }
  //   }

  //   if (fromDate) {
  //     const from = new Date(fromDate);
  //     const to = toDate ? new Date(toDate) : new Date();
  //     to.setUTCHours(23, 59, 59, 999);
  //     matchConditions.push({
  //       createdAt: {
  //         $gte: from,
  //         $lte: to,
  //       },
  //     });
  //   }

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
  //         from: 'wallettransactions',
  //         localField: 'toWalletTrx',
  //         foreignField: '_id',
  //         as: 'toWalletTrx',
  //       },
  //     },
  //     {
  //       $unwind: { path: '$toWalletTrx', preserveNullAndEmptyArrays: true },
  //     },
  //     {
  //       $lookup: {
  //         from: 'wallets',
  //         localField: 'toWallet',
  //         foreignField: '_id',
  //         as: 'toWallet',
  //         pipeline: [
  //           {
  //             $lookup: {
  //               from: 'tokens',
  //               localField: 'token',
  //               foreignField: '_id',
  //               as: 'token',
  //             },
  //           },
  //           {
  //             $unwind: {
  //               path: '$token',
  //               preserveNullAndEmptyArrays: true,
  //             },
  //           },
  //         ],
  //       },
  //     },
  //     {
  //       $unwind: { path: '$toWallet', preserveNullAndEmptyArrays: true },
  //     },
  //     {
  //       $lookup: {
  //         from: 'wallettransactions',
  //         localField: 'fromWalletTrx',
  //         foreignField: '_id',
  //         as: 'fromWalletTrx',
  //       },
  //     },
  //     {
  //       $unwind: { path: '$fromWalletTrx', preserveNullAndEmptyArrays: true },
  //     },
  //     {
  //       $lookup: {
  //         from: 'wallets',
  //         localField: 'fromWallet',
  //         foreignField: '_id',
  //         as: 'fromWallet',
  //         pipeline: [
  //           {
  //             $lookup: {
  //               from: 'tokens',
  //               localField: 'token',
  //               foreignField: '_id',
  //               as: 'token',
  //             },
  //           },
  //           {
  //             $unwind: {
  //               path: '$token',
  //               preserveNullAndEmptyArrays: true,
  //             },
  //           },
  //         ],
  //       },
  //     },
  //     {
  //       $unwind: { path: '$fromWallet', preserveNullAndEmptyArrays: true },
  //     },
  //     {
  //       $project: {
  //         _id: 0,
  //         requestId: '$requestId',
  //         type: 'Swap',
  //         time: '$createdAt',
  //         fromToken: '$fromWallet.token.name',
  //         toToken: '$toWallet.token.name',
  //         amount: '$amount',
  //         status: TransactionStatus.SUCCESS,
  //         newBalance: '$newBalance',
  //         previousBalance: '$previousBalance',
  //         newBalanceOfToToken: '$newBalanceOfToToken',
  //         bonus: '$bonus',
  //       },
  //     },
  //   ];

  //   return await aggregatePaginate(
  //     this.swapTransactionModel,
  //     pipeline,
  //     page,
  //     limit,
  //   );
  // }
  async getSwapsPaginated(userId: Types.ObjectId, paginateDTO: PaginateDTO) {
    return this.generalSwapsPaginated(
      userId,
      paginateDTO,
      this.swapTransactionModel,
      Swap_SpecialSwap_Type.SWAP,
    );
  }

  async generalSwapsPaginated(
    userId: Types.ObjectId,
    paginateDTO: PaginateDTO,
    Model: Model<
      SwapTransactionI | SpecialSwapTransaction,
      object,
      | (Document<unknown, SwapTransactionI | SpecialSwapTransaction> &
          SwapTransactionI)
      | (SpecialSwapTransaction & { _id: Types.ObjectId }),
      any
    >,
    type: Swap_SpecialSwap_Type,
  ) {
    const { page, limit, query, fromDate, toDate } = paginateDTO;

    const matchConditions: any[] = [
      { user: new Types.ObjectId(userId), deletedAt: { $eq: null } },
    ];

    if (query) {
      const queryNumber = parseInt(query, 10);
      if (!isNaN(queryNumber)) {
        matchConditions.push({
          $or: [{ serialNumber: queryNumber }],
        });
      } else {
        matchConditions.push({
          requestId: { $regex: query, $options: 'i' },
        });
      }
    }

    if (fromDate) {
      const from = new Date(fromDate);
      const to = toDate ? new Date(toDate) : new Date();
      to.setUTCHours(23, 59, 59, 999);
      matchConditions.push({
        createdAt: {
          $gte: from,
          $lte: to,
        },
      });
    }

    const paginate = await pagination({
      page,
      pageSize: limit,
      model: Model,
      condition: {
        $and: matchConditions,
      },
      pagingRange: 5,
    });

    let list = await Model.find({
      $and: matchConditions,
    })
      .sort({ createdAt: -1 })
      .populate({
        path: 'toWallet',
        select: { token: 1 },
        populate: { path: 'token', select: { name: 1, valueType: 1 } },
      })
      .populate({
        path: 'fromWallet',
        select: { token: 1 },
        populate: { path: 'token', select: { name: 1, valueType: 1 } },
      })
      .skip(paginate.offset)
      .limit(paginate.limit)
      .select({
        _id: 0,
        requestId: 1,
        type,
        time: '$createdAt',

        amount: 1,
        status: TransactionStatus.SUCCESS,
        newBalance: 1,
        previousBalance: 1,
        newBalanceOfToToken: 1,
        bonus: 1,
      })
      .lean<
        {
          fromWallet: { token: { name: string; valueType: string } };
          toWallet: { token: { name: string; valueType: string } };
        }[]
      >();

    // flatten the list match with existing api response
    list = list.map((v) => {
      const fromToken = v.fromWallet?.token?.name || '-';
      const fromTokenValueType = v.fromWallet?.token?.valueType || '-';

      const toToken = v.toWallet?.token?.name || '-';
      const toTokenValueType = v.toWallet?.token?.valueType || '-';

      delete v.toWallet;
      delete v.fromWallet;

      return {
        ...v,
        fromToken,
        fromTokenValueType,
        toToken,
        toTokenValueType,
      };
    });

    return {
      list,
      totalCount: paginate.total,
      totalPages: paginate.metadata.page.totalPage,
      currentPage: paginate.metadata.page.currentPage,
      paging: {
        limit: paginate.limit,
        count: paginate.total,
      },
    };
  }

  async getSpecialSwapsPaginated(
    userId: Types.ObjectId,
    paginateDTO: SpecialSwapPaginateDTO,
  ) {
    return await this.generalSwapsPaginated(
      userId,
      paginateDTO,
      this.specialSwapTransactionModel,
      Swap_SpecialSwap_Type.SPECIAL_SWAP,
    );
  }

  async stakeNotificationSendService(
    success: boolean,
    userIds,
    amount: number,
    fromTokenSymbol: string,
    toTokenSymbol: string,
    user,
    amountToWallet: number,
    trx?: any,
    notificationMessage?: string,
    actualAmount?: number,
    emailMessage?: string,
    transactionId?: any,
    uniqueName?: string,
  ) {
    if (success) {
      let message = '';
      let Emailbody = '';
      if (amountToWallet > 0) {
        message = `$${amount} has been successfully staked to the machine, and $${amountToWallet} has been successfully deposited to your wallet.`;
        Emailbody = `We are pleased to inform you that your stake of $${amount} has been successfully processed in ${uniqueName} and your deposit of $${amountToWallet} has also been successfully completed for deposit and stake - Request ID : ${transactionId}`;
      } else {
        message = `$${amount} has been successfully staked to the machine, with no additional deposit to the wallet.`;
        Emailbody = `We are pleased to inform you that your stake of $${amount} has been successfully processed in ${uniqueName} for deposit and stake - Request ID : ${transactionId}`;
      }

      // Add data to notification
      this.notificationService.create({
        userIds: [userIds],
        title: 'Deposit and Stake Successfully done.',
        message: message,
        type: NotificationTypeEnum.DEPOSIT_AND_STAKE,
      });

      // Email service
      this.emailService.send(
        user.email,
        `Deposit and Stake Confirmation`,
        `Deposit and Stake Confirmation`,
        `Your Deposit and Stake has been successfully processed!`,
        Emailbody,
        fromTokenSymbol,
        String(actualAmount),
        String(new Date()),
        String(trx),
        user.username || user.email,
      );

      //Sending Socket event
      //In here we use userId as Event name and inside the data we specify the event
      this.gatewayService.emitSocketEventNotification({
        message: DEPOSIT_AND_STAKE_MESSAGE,
        eventName: user.blockchainId,
        data: {
          eventAction: SOCKET_EVENT_NAMES.DEPOSIT_AND_STAKE_TRANSACTION_SUCCESS,
          title: 'Deposit and Stake Successful',
          message: message,
        },
      });
    } else {
      this.notificationService.create({
        userIds: [userIds],
        title: 'Deposit and Stake failed',
        message: notificationMessage
          ? notificationMessage
          : `Your Deposit and Stake has been failed!`,
        type: NotificationTypeEnum.DEPOSIT_AND_STAKE,
      });

      this.emailService.send(
        user.email,
        `Deposit and Stake Failed`,
        `Deposit and Stake Failed`,
        `Your Deposit and Stake has been failed!`,
        emailMessage,
        fromTokenSymbol,
        String(amount),
        String(new Date()),
        String(''),
        user.username || user.email,
      );

      //Sending Socket event
      //In here we use userId as Event name and inside the data we specify the event
      this.gatewayService.emitSocketEventNotification({
        message: DEPOSIT_AND_STAKE_FAILURE_MESSAGE,
        eventName: user.blockchainId,
        data: {
          eventAction: SOCKET_EVENT_NAMES.DEPOSIT_AND_STAKE_TRANSACTION_FAILED,
          title: 'Deposit and Stake Failed',
          message: emailMessage,
        },
      });
    }
  }
  async getMergedSwapsPaginated(
    userId: Types.ObjectId,
    paginateDTO: SpecialSwapPaginateDTO,
  ) {
    const { page, limit, query, fromDate, toDate, fromToken, toToken } =
      paginateDTO;

    let whereConfig: any = {
      user: new mongoose.Types.ObjectId(userId),
      deletedAt: { $eq: null },
    };

    if (fromToken) {
      const fromTokenInfo = await this.tokenModel.findOne({
        symbol: fromToken,
      });
      if (fromTokenInfo) {
        const fromWallet = await this.walletModel.findOne({
          token: fromTokenInfo._id,
          user: userId,
        });
        if (fromWallet) {
          whereConfig = {
            ...whereConfig,
            fromWallet: fromWallet._id,
          };
        }
      }
    }

    if (toToken) {
      const toTokenInfo = await this.tokenModel.findOne({ symbol: toToken });
      if (toTokenInfo) {
        const toWallet = await this.walletModel.findOne({
          token: toTokenInfo._id,
          user: userId,
        });
        if (toWallet) {
          whereConfig = {
            ...whereConfig,
            toWallet: toWallet._id,
          };
        }
      }
    }

    if (query) {
      const newQuery = query.split(/[ ,]+/);

      // Construct individual query conditions
      const serialNumberSearchQuery = newQuery
        .filter((str) => !isNaN(Number(str))) // Ensure it's a number for serialNumber
        .map((str) => ({
          serialNumber: Number(str), // Match exact number
        }));

      const requestIdSearchQuery = newQuery.map((str) => ({
        requestId: { $regex: str, $options: 'i' }, // Case-insensitive regex
      }));

      const typeSearchQuery = newQuery
        .filter((str) => typeof str === 'string') // Ensure the query value is a string
        .map((str) => ({
          type: { $regex: str, $options: 'i' }, // Case-insensitive regex
        }));

      // Combine all query conditions into $or
      whereConfig = {
        ...whereConfig,
        $and: [
          {
            $or: [
              ...serialNumberSearchQuery,
              ...requestIdSearchQuery,
              ...typeSearchQuery,
            ],
          },
        ],
      };
    }

    if (fromDate) {
      const from = new Date(fromDate);
      const to = toDate ? new Date(toDate) : new Date();
      to.setUTCHours(23, 59, 59, 999);
      whereConfig = {
        ...whereConfig,
        createdAt: {
          $gte: from,
          $lte: to,
        },
      };
    }

    const paginate = await pagination({
      page,
      pageSize: limit,
      model: this.swapTransactionHistoryModel,
      condition: whereConfig,
      pagingRange: 5,
    });
    const list = await this.swapTransactionHistoryModel
      .find(whereConfig)
      .sort({ createdAt: -1 })
      .skip(paginate.offset)
      .limit(paginate.limit)
      .populate({
        path: 'toWallet',
        select: { token: 1 },
        populate: {
          path: 'token',
          select: { name: 1, valueType: 1 },
          strictPopulate: false,
        },
      })
      .populate({
        path: 'fromWallet',
        select: { token: 1 },
        populate: {
          path: 'token',
          select: { name: 1, valueType: 1 },
          strictPopulate: false,
        },
      })
      .lean<
        {
          fromWallet: { token: { name: string } };
          toWallet: { token: { name: string } };
        }[]
      >()
      .exec();

    const swapHistoryData = list.map((swapVal: any) => ({
      id: swapVal?.swap_id || null,
      requestId: swapVal?.requestId || null,
      serialNumber: swapVal?.serialNumber || null,
      amount: swapVal?.amount || 0,
      bonus: swapVal?.bonus || 0,
      newBalance: swapVal?.newBalance || 0,
      previousBalance: swapVal?.previousBalance || 0,
      newBalanceOfToToken: swapVal?.newBalanceOfToToken || 0,
      type: swapVal?.type || 0,
      time: swapVal?.createdAt || null,
      status: TransactionStatus.SUCCESS,
      fromToken: swapVal?.fromWallet?.token?.name || null,
      fromTokenValueType: swapVal?.fromWallet?.token?.valueType || null,
      toToken: swapVal?.toWallet?.token?.name || null,
      toTokenValueType: swapVal?.toWallet?.token?.valueType || null,
    }));

    return {
      list: swapHistoryData,
      totalCount: paginate.total,
      totalPages: paginate.metadata.page.totalPage,
      currentPage: paginate.metadata.page.currentPage,
    };
  }

  // OLD No Longer used because We did Swap Transaction history
  async getMergedSwapsPaginatedOLD(
    userId: Types.ObjectId,
    paginateDTO: SpecialSwapPaginateDTO,
  ) {
    const { page = 1 } = paginateDTO;
    let { limit = 10 } = paginateDTO;
    limit = Number(limit);
    // Function to fetch all swaps with pagination
    const fetchAllSwaps = async (userId: Types.ObjectId) => {
      const allSwaps: any[] = [];
      let currentPage = 1;

      while (true) {
        const swapsResult = await this.getSwapsPaginated(userId, {
          ...paginateDTO,
          page: currentPage,
          limit: 1000,
        });

        if (
          !swapsResult ||
          !Array.isArray(swapsResult.list) ||
          swapsResult.list.length === 0
        ) {
          break; // Exit loop if no more records are found
        }

        allSwaps.push(...swapsResult.list);
        currentPage++;
      }

      return allSwaps;
    };

    // Function to fetch all special swaps with pagination
    const fetchAllSpecialSwaps = async (userId: Types.ObjectId) => {
      const allSpecialSwaps: any[] = [];
      let currentPage = 1;

      while (true) {
        const specialSwapsResult = await this.getSpecialSwapsPaginated(userId, {
          ...paginateDTO,
          page: currentPage,
          limit: 1000,
        });

        if (
          !specialSwapsResult ||
          !Array.isArray(specialSwapsResult.list) ||
          specialSwapsResult.list.length === 0
        ) {
          break; // Exit loop if no more records are found
        }

        allSpecialSwaps.push(...specialSwapsResult.list);
        currentPage++;
      }

      return allSpecialSwaps;
    };

    // Fetch all regular and special swaps
    const [swapsDocs, specialSwapsDocs] = await Promise.all([
      fetchAllSwaps(userId),
      fetchAllSpecialSwaps(userId),
    ]);

    // Combine results
    const mergedResults = [...swapsDocs, ...specialSwapsDocs];

    // Sort merged results (if needed) before paginating
    mergedResults.sort((a, b) => b.time - a.time); // Assuming `time` is a Date or timestamp

    // Calculate total documents and pages
    const totalCount = mergedResults.length; // Total count based on merged results
    const totalPages = Math.ceil(totalCount / limit);
    // Calculate start and end indices for slicing
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    // Slice merged results to respect pagination
    const paginatedResults = mergedResults.slice(startIndex, endIndex);

    return {
      docs: paginatedResults,
      totalCount,
      totalPages,
      page,
      limit,
    };
  }

  async getDepositsPaginated2(
    userId: Types.ObjectId,
    paginateDTO: PaginateDTO,
  ) {
    const { page, limit, query, status, fromDate, toDate, token } = paginateDTO;

    let whereConfig: any = {};

    if (token) {
      const tokenInfo = await this.tokenModel.findOne({ symbol: token });
      if (tokenInfo) {
        whereConfig.token = tokenInfo._id;
      }
    }

    whereConfig.user = new Types.ObjectId(userId);
    whereConfig.deletedAt = { $eq: null };

    if (query) {
      const newQuery = query.split(/[ ,]+/);
      const serialNumberSearchQuery = newQuery
        .filter((str) => !isNaN(Number(str)))
        .map((str) => ({ serialNumber: Number(str) }));

      const requestIdSearchQuery = newQuery.map((str) => ({
        requestId: { $regex: str, $options: 'i' },
      }));

      const typeSearchQuery = newQuery.map((str) => ({
        type: { $regex: str, $options: 'i' },
      }));

      whereConfig.$and = [
        {
          $or: [
            ...requestIdSearchQuery,
            ...typeSearchQuery,
            ...serialNumberSearchQuery,
          ],
        },
      ];
    }

    if (status) {
      whereConfig = {
        ...whereConfig,
        $or: [
          { transactionStatus: status },
          { transactionStatus: null, status: status },
        ],
      };
    }

    if (fromDate) {
      const to = toDate ? new Date(toDate) : new Date();
      const Dates = await getCustomRange(new Date(fromDate), to);
      whereConfig.createdAt = { $gte: Dates.startDate, $lte: Dates.endDate };
    }

    const fetchLimit = limit * 3;
    const validDeposits: any[] = [];
    let skip = (page - 1) * limit;
    const seenIds = new Set();
    let maxAttempts = 5;

    while (validDeposits.length < limit && maxAttempts > 0) {
      const list = await this.depositTransactionHistoryModel
        .find(whereConfig)
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(fetchLimit)
        .populate([
          { path: 'fromUser' },
          { path: 'fromToken' },
          { path: 'onChainWallet' },
          { path: 'token' },
          {
            path: 'toWallet',
            populate: { path: 'token', strictPopulate: false },
          },
        ])
        .lean()
        .exec();

      console.log('Total records before filtering:', list.length);

      for (const trx of list) {
        if (
          !seenIds.has(trx.requestId) &&
          trx.transactionStatus !== 'failed' &&
          trx.status !== 'failed'
        ) {
          seenIds.add(trx.requestId);
          validDeposits.push(trx);
          if (validDeposits.length >= limit) break;
        }
      }

      if (validDeposits.length < limit) {
        skip += fetchLimit;
        maxAttempts--;
      }
    }

    const depositdata = validDeposits.map((trx: any) => ({
      id: trx?.requestId,
      deposit_id: trx?.deposit_id || null,
      from: trx?.from || null,
      time: trx?.createdAt || null,
      type:
        trx?.type ||
        (trx?.from === Deposit_Transaction_Type.Deposit_Stack
          ? TrxType?.DEPOSIT_AND_STAKE_REQUEST
          : 'deposit'),
      wallet:
        trx?.from === Deposit_Transaction_Type.Deposit_Stack
          ? trx?.token?.name
          : Deposit_Transaction_Type.Deposit
            ? trx?.toWallet?.token?.name
            : null,
      coin:
        trx?.from === Deposit_Transaction_Type.Deposit_Stack
          ? trx?.token?.name
          : Deposit_Transaction_Type.Deposit
            ? trx?.fromToken?.name
            : null,
      valueType: trx?.token ? trx.token.valueType : null,
      amount: trx?.amount || null,
      destination: trx?.onChainWallet?.address || trx?.depositAddress || null,
      hash: trx?.hash || null,
      status: trx?.transactionStatus || trx?.status || null,
      remarks: trx?.remarks || null,
      fromUser: trx?.fromUser || null,
      newBalance: trx?.newBalance || null,
      previousBalance: trx?.previousBalance || 0,
      updatetime: trx?.updatedAt || null,
      expiredtime: trx?.expiredAt || null,
      transactionId: trx?.toWalletTrx || null,
      serialNumber: trx?.serialNumber || null,
      optionalRemarks: trx?.optionalRemarks || null,
    }));

    const totalCount =
      await this.depositTransactionHistoryModel.countDocuments(whereConfig);
    return {
      list: depositdata,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page,
    };
  }

  async getDepositsPaginated(userId: Types.ObjectId, paginateDTO: PaginateDTO) {
    const { page, limit, query, status, fromDate, toDate } = paginateDTO;

    const depositmatchConditions: any[] = [
      { user: new Types.ObjectId(userId), deletedAt: { $eq: null } },
    ];

    if (query) {
      const queryNumber = parseInt(query, 10);
      if (!isNaN(queryNumber)) {
        depositmatchConditions.push({
          $or: [{ serialNumber: queryNumber }],
        });
      } else {
        depositmatchConditions.push({
          requestId: { $regex: query, $options: 'i' },
        });
      }
    }

    if (status) {
      const orConditions: any[] = [];
      if (status) orConditions.push({ transactionStatus: status });

      if (orConditions.length > 0) {
        depositmatchConditions.push({ $or: orConditions });
      }
    }

    if (fromDate) {
      const from = new Date(fromDate);
      const to = toDate ? new Date(toDate) : new Date();
      to.setUTCHours(23, 59, 59, 999);
      depositmatchConditions.push({
        createdAt: {
          $gte: from,
          $lte: to,
        },
      });
    }

    const depositpipeline = [
      {
        $match: {
          $and: depositmatchConditions,
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $lookup: {
          from: 'wallets',
          localField: 'toWallet',
          foreignField: '_id',
          as: 'toWallet',
          pipeline: [
            {
              $lookup: {
                from: 'tokens',
                localField: 'token',
                foreignField: '_id',
                as: 'token',
              },
            },
            {
              $unwind: { path: '$token', preserveNullAndEmptyArrays: true },
            },
          ],
        },
      },
      {
        $unwind: { path: '$toWallet', preserveNullAndEmptyArrays: true },
      },
      {
        $lookup: {
          from: 'wallettransactions',
          localField: 'toWalletTrx',
          foreignField: '_id',
          as: 'toWalletTrx',
        },
      },
      {
        $unwind: { path: '$toWalletTrx', preserveNullAndEmptyArrays: true },
      },
      {
        $lookup: {
          from: 'tokens',
          localField: 'fromToken',
          foreignField: '_id',
          as: 'fromToken',
        },
      },
      {
        $unwind: { path: '$fromToken', preserveNullAndEmptyArrays: true },
      },
      {
        $lookup: {
          from: 'onchainwallets',
          localField: 'onChainWallet',
          foreignField: '_id',
          as: 'onChainWallet',
        },
      },
      {
        $unwind: { path: '$onChainWallet', preserveNullAndEmptyArrays: true },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'fromUser',
          foreignField: '_id',
          as: 'fromUser',
        },
      },
      {
        $unwind: { path: '$fromUser', preserveNullAndEmptyArrays: true },
      },
    ];

    const depositandstakematchConditions: any[] = [
      { user: new Types.ObjectId(userId), deletedAt: { $eq: null } },
    ];

    if (status) {
      depositandstakematchConditions.push({ status: status });
    }

    if (fromDate) {
      const from = new Date(fromDate);
      const to = toDate ? new Date(toDate) : new Date();
      to.setUTCHours(23, 59, 59, 999);
      depositandstakematchConditions.push({
        createdAt: {
          $gte: from,
          $lte: to,
        },
      });
    }

    const depositandstakepipeline = [
      {
        $match: {
          $and: depositandstakematchConditions,
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $lookup: {
          from: 'networks',
          localField: 'network',
          foreignField: '_id',
          as: 'network',
        },
      },
      {
        $unwind: { path: '$network', preserveNullAndEmptyArrays: true },
      },
      {
        $lookup: {
          from: 'tokens',
          localField: 'token',
          foreignField: '_id',
          as: 'token',
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
        $unwind: { path: '$token', preserveNullAndEmptyArrays: true },
      },
      {
        $unwind: { path: '$toToken', preserveNullAndEmptyArrays: true },
      },
      {
        $lookup: {
          from: 'depositAndStakeSettings',
          localField: 'depositAndStakeSettings',
          foreignField: '_id',
          as: 'depositAndStakeSettings',
        },
      },
      {
        $unwind: {
          path: '$depositAndStakeSettings',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $sort: {
          createdAt: -1,
        },
      },
    ];

    const [depositsPaginated, depositandstakepaginated] = await Promise.all([
      aggregatePaginate(
        this.depositTransactionModel,
        depositpipeline,
        page,
        limit,
      ),
      aggregatePaginate(
        this.depositAndStakeTransactionModel,
        depositandstakepipeline,
        page,
        limit,
      ),
    ]);

    const depositlist = depositsPaginated.list || [];
    const depositandStakelist = depositandstakepaginated.list || [];

    const depositdata = depositlist.map((trx) => ({
      id: trx.requestId,
      time: trx.createdAt,
      type: trx.toWalletTrx?.trxType || 'deposit',
      wallet: trx?.toWallet?.token?.name,
      coin: trx?.fromToken?.name,
      amount: trx.amount,
      destination: trx?.onChainWallet?.address,
      hash: trx.hash,
      status: trx.transactionStatus,
      remarks: trx.remarks,
      fromUser: trx.fromUser,
      newBalance: trx.newBalance,
      previousBalance: trx?.previousBalance || 0,
      updatetime: trx.updatedAt,
      expiredtime: null,
      transactionId: trx.toWalletTrx?._id, // Add transactionId
    }));
    const depositandstakedata = depositandStakelist.map((trxt) => ({
      id: trxt.requestId,
      time: trxt.createdAt,
      type: TrxType?.DEPOSIT_AND_STAKE_REQUEST,
      coin: trxt?.token?.name,
      wallet: trxt?.toToken?.name,
      amount: null,
      destination: trxt?.depositAddress,
      hash: null,
      status: trxt.status,
      remarks: trxt.remarks,
      fromUser: null,
      newBalance: null,
      previousBalance: null,
      updatetime: trxt.updatedAt,
      expiredtime: trxt.expiredAt,
      transactionId: trxt.toWalletTrx?._id, // Add transactionId
    }));

    const list = [...(depositdata || []), ...(depositandstakedata || [])];

    const mergedResults = {
      deposits: depositsPaginated.docs,
      stakes: depositandstakepaginated.docs,

      page,
      limit,
    };
    list.sort((a, b) => b.time - a.time);

    return { ...mergedResults, list: list, totalcount: list.length };
  }

  //Old function without optimization
  // async getWithdrawsPaginated(
  //   userId: Types.ObjectId,
  //   paginateDTO: PaginateDTO,
  // ) {
  //   const { page, limit, query, type, status, fromDate, toDate } = paginateDTO;

  //   const matchConditions: any[] = [
  //     { user: new Types.ObjectId(userId), deletedAt: { $eq: null } },
  //   ];

  //   if (query) {
  //     const queryNumber = parseInt(query, 10);
  //     if (!isNaN(queryNumber)) {
  //       matchConditions.push({
  //         $or: [{ serialNumber: queryNumber }],
  //       });
  //     } else {
  //       matchConditions.push({
  //         $or: [
  //           { requestId: { $regex: query, $options: 'i' } },
  //           { receiverAddress: { $regex: query, $options: 'i' } },
  //         ],
  //       });
  //     }
  //   }

  //   if (type || status) {
  //     const orConditions: any[] = [];
  //     if (type) orConditions.push({ withdrawType: type });
  //     if (status) orConditions.push({ requestStatus: status });

  //     if (orConditions.length > 0) {
  //       matchConditions.push({ $or: orConditions });
  //     }
  //   }

  //   if (fromDate) {
  //     const from = new Date(fromDate);
  //     const to = toDate ? new Date(toDate) : new Date();
  //     to.setUTCHours(23, 59, 59, 999);
  //     matchConditions.push({
  //       createdAt: {
  //         $gte: from,
  //         $lte: to,
  //       },
  //     });
  //   }

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
  //         from: 'wallettransactions',
  //         localField: 'fromWalletTrx',
  //         foreignField: '_id',
  //         as: 'fromWalletTrx',
  //       },
  //     },
  //     {
  //       $unwind: { path: '$fromWalletTrx', preserveNullAndEmptyArrays: true },
  //     },
  //     {
  //       $lookup: {
  //         from: 'tokens',
  //         localField: 'receiveToken',
  //         foreignField: '_id',
  //         as: 'receiveToken',
  //       },
  //     },
  //     {
  //       $unwind: { path: '$receiveToken', preserveNullAndEmptyArrays: true },
  //     },
  //     {
  //       $lookup: {
  //         from: 'wallets',
  //         localField: 'fromWallet',
  //         foreignField: '_id',
  //         as: 'fromWallet',
  //         pipeline: [
  //           {
  //             $lookup: {
  //               from: 'tokens',
  //               localField: 'token',
  //               foreignField: '_id',
  //               as: 'token',
  //             },
  //           },
  //           {
  //             $unwind: {
  //               path: '$token',
  //               preserveNullAndEmptyArrays: true,
  //             },
  //           },
  //         ],
  //       },
  //     },
  //     {
  //       $unwind: { path: '$fromWallet', preserveNullAndEmptyArrays: true },
  //     },
  //     {
  //       $project: {
  //         id: '$serialNumber',
  //         time: '$createdAt',
  //         type: {
  //           $cond: {
  //             if: { $eq: ['$withdrawType', WITHDRAW_TYPES.EXTERNAL] },
  //             then: 'Withdraw',
  //             else: 'Transfer',
  //           },
  //         },
  //         withdrawToken: '$fromWallet.token.name',
  //         receiveToken: '$receiveToken.symbol',
  //         amount: '$amount',
  //         destination: '$receiverAddress',
  //         hash: '$hash',
  //         status: '$requestStatus',
  //         requestId: '$requestId',
  //         denialReason: '$denialReason',
  //         userRemarks: '$userRemarks',
  //         newBalance: '$newBalance',
  //         previousBalance: '$previousBalance',
  //       },
  //     },
  //   ];
  //   return await aggregatePaginate(
  //     this.withdrawTransactionModel,
  //     pipeline,
  //     page,
  //     limit,
  //   );
  // }

  //optimized version
  async getWithdrawsPaginated(
    userId: Types.ObjectId,
    paginateDTO: WalletFilterDTO,
  ) {
    const { page, limit, query, type, status, fromDate, toDate, token, sort } =
      paginateDTO;

    let whereConfig = {};

    whereConfig = {
      ...whereConfig,
      user: new Types.ObjectId(userId),
      deletedAt: { $eq: null },
    };

    let tokenInfo = null;
    if (token) {
      tokenInfo = await this.tokenModel.findOne({ symbol: token });
      whereConfig = {
        ...whereConfig,
        token: tokenInfo._id,
      };
    }

    if (query) {
      const newQuery = query.split(/[ ,]+/);
      const matchConditions = newQuery.map((str) => {
        const queryNumber = parseInt(str, 10);
        if (!isNaN(queryNumber)) {
          return { serialNumber: queryNumber };
        } else {
          return {
            $or: [
              { requestId: { $regex: str, $options: 'i' } },
              { receiverAddress: { $regex: str, $options: 'i' } },
            ],
          };
        }
      });

      whereConfig = {
        ...whereConfig,
        $or: matchConditions,
      };
    }

    if (type) {
      whereConfig = {
        ...whereConfig,
        $and: [
          {
            $or: [{ $and: { withdrawType: type } }],
          },
        ],
      };
    }
    if (status) {
      whereConfig = {
        ...whereConfig,
        $and: [
          {
            $or: [{ requestStatus: status }],
          },
        ],
      };
    }

    if (fromDate) {
      const from = new Date(fromDate);
      const to = toDate ? new Date(toDate) : new Date();
      to.setUTCHours(23, 59, 59, 999);
      whereConfig = {
        ...whereConfig,
        createdAt: {
          $gte: from,
          $lte: to,
        },
      };
    }

    const paginate = await pagination({
      page,
      pageSize: limit,
      model: this.withdrawTransactionModel,
      condition: whereConfig,
      pagingRange: 5,
    });

    // const sortQuery: any = {};
    // if (sort) {
    //   for (const key in sort) {
    //     sortQuery[key] = sort[key] === 'descending' ? -1 : 1;
    //   }
    // } else {
    //   sortQuery.createdAt = -1;
    // }

    const list = await this.withdrawTransactionModel
      .find(whereConfig)
      .sort({ createdAt: -1 })
      .skip(paginate.offset)
      .limit(paginate.limit)
      .populate([
        {
          path: 'user',
        },
        {
          path: 'fromWallet',
        },
        {
          path: 'token',
        },
      ])
      .lean();

    const projectedList = [];
    for (let i = 0; i < list.length; i++) {
      const doc = list[i];

      projectedList.push({
        _id: doc._id,
        id: doc.serialNumber,
        time: doc['createdAt'],
        type:
          doc.withdrawType === WITHDRAW_TYPES.EXTERNAL
            ? 'Withdraw'
            : 'Transfer',
        withdrawToken: doc.token ? doc.token['name'] : null,
        valueType: doc.token ? doc.token['valueType'] : null,
        amount: doc.amount,
        total: doc.total,
        destination: doc.receiverAddress,
        hash: doc.hash,
        status: doc.requestStatus,
        requestId: doc.requestId,
        denialReason: doc.denialReason,
        userRemarks: doc.userRemarks,
        optionalRemarks: doc.optionalRemarks ?? '',
        newBalance: doc.newBalance ?? 0,
        previousBalance: doc.previousBalance ?? 0,
      });
    }

    return {
      list: projectedList,
      totalCount: paginate.total,
      totalPages: paginate.metadata.page.totalPage,
      currentPage: paginate.metadata.page.currentPage,
      paginate,
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
        price: Number(response.data.last),
        high: Number(response.data.high),
      };

      return data;
    } catch (error) {
      throw new Error(error.response.data);
    }
  }
  async calculateWalletsSummary(wallets: any[]): Promise<{
    wallets: any[];
    totalDollarValue: number;
    totalTokenValue: number;
  }> {
    // Get the current price from the getCurrentPrice function
    const { price } = await this.getCurrentPrice();

    // Calculate the total token value and total dollar value
    let totalTokenValue = 0;
    let totalDollarValue = 0;

    // Calculate total token and dollar values
    wallets.forEach((wallet) => {
      totalTokenValue += wallet.balance;
      // For USDK tokens, use balance as dollar value, for others multiply by the price
      if (wallet.token.conversionType === CONVERSION_TYPES.CUSTOM) {
        totalDollarValue += wallet.balance * wallet.token.customRate;
      } else {
        if (
          wallet.token.valueType.toLowerCase() === ValueType.USD.toLowerCase()
        ) {
          totalDollarValue += wallet.balance; // USDK is already in dollar value
        } else {
          totalDollarValue += wallet.balance * price; // Multiply non-USDK tokens by the current price
        }
      }
    });

    // Update wallets with percentage, token balance, and dollar balance
    const updatedWallets = wallets.map((wallet) => ({
      ...wallet,
      tokenBalance: wallet.balance,
      dollarBalance:
        wallet.token.conversionType === CONVERSION_TYPES.CUSTOM
          ? wallet.balance * wallet.token.customRate
          : wallet.token.valueType.toLowerCase() === ValueType.USD.toLowerCase()
            ? wallet.balance // If USDK, dollar balance is the same as token balance
            : wallet.balance * price, // For other tokens, multiply by price
      percentage:
        wallet.balance > 0
          ? wallet.token.conversionType === CONVERSION_TYPES.CUSTOM
            ? (
                ((wallet.balance * wallet.token.customRate) /
                  totalDollarValue) *
                100
              ).toFixed(2)
            : (
                ((wallet.balance *
                  (wallet.token.valueType.toLowerCase() ===
                  ValueType.USD.toLowerCase()
                    ? 1
                    : price)) /
                  totalDollarValue) *
                100
              ).toFixed(2)
          : 0,
    }));

    return {
      totalTokenValue, // Total token balance (sum of all wallets' balances)
      totalDollarValue, // Total dollar value
      wallets: updatedWallets, // Updated wallets with token and dollar balance
    };
  }

  async calculateWalletsSummaryV1(wallets: any[]): Promise<{
    wallets: any[];
    totalDollarValue: number;
    totalTokenValue: number;
  }> {
    // Get the current price from the getCurrentPrice function
    const { price } = await this.getCurrentPrice();

    // Calculate the total token value and total dollar value
    let totalTokenValue = 0;
    let totalDollarValue = 0;

    // Calculate total token and dollar values
    wallets.forEach((wallet) => {
      totalTokenValue += wallet.balance;
      // For USDK tokens, use balance as dollar value, for others multiply by the price
      if (wallet.token.conversionType === CONVERSION_TYPES.CUSTOM) {
        totalDollarValue += wallet.balance * wallet.token.customRate;
      } else {
        if (
          wallet.token.valueType.toLowerCase() === ValueType.USD.toLowerCase()
        ) {
          totalDollarValue += wallet.balance; // USDK is already in dollar value
        } else {
          totalDollarValue += wallet.balance * price; // Multiply non-USDK tokens by the current price
        }
      }
    });

    // Update wallets with percentage, token balance, and dollar balance
    // const updatedWallets = wallets.map((wallet) => ({
    //   ...wallet,
    //   tokenBalance: wallet.balance,
    //   dollarBalance:
    //     wallet.token.conversionType === CONVERSION_TYPES.CUSTOM
    //       ? wallet.balance * wallet.token.customRate
    //       : wallet.token.valueType.toLowerCase() === ValueType.USD.toLowerCase()
    //         ? wallet.balance // If USDK, dollar balance is the same as token balance
    //         : wallet.balance * price, // For other tokens, multiply by price
    //   percentage:
    //     wallet.balance > 0
    //       ? (
    //           ((wallet.balance *
    //             (wallet.token.valueType.toLowerCase() ===
    //             ValueType.USD.toLowerCase()
    //               ? 1
    //               : price)) /
    //             totalDollarValue) *
    //           100
    //         ).toFixed(2)
    //       : 0,
    // }));
    const updatedWallets = wallets.map((wallet) => {
      const dollarBalance =
        wallet.token.conversionType === CONVERSION_TYPES.CUSTOM
          ? wallet.balance * wallet.token.customRate
          : wallet.token.valueType.toLowerCase() === ValueType.USD.toLowerCase()
            ? wallet.balance
            : wallet.balance * price;

      return {
        ...wallet,
        tokenBalance: wallet.balance,
        dollarBalance,
        percentage:
          totalDollarValue > 0
            ? ((dollarBalance / totalDollarValue) * 100).toFixed(2)
            : 0,
      };
    });

    return {
      totalTokenValue, // Total token balance (sum of all wallets' balances)
      totalDollarValue, // Total dollar value
      wallets: updatedWallets, // Updated wallets with token and dollar balance
    };
  }

  // async getTotalBalance(userId: Types.ObjectId) {
  //   const wallets = await this.walletModel.aggregate([
  //     {
  //       $match: {
  //         user: new Types.ObjectId(userId),
  //         deletedAt: { $eq: null },
  //       },
  //     },
  //     {
  //       $lookup: {
  //         from: 'tokens',
  //         localField: 'token',
  //         foreignField: '_id',
  //         as: 'token',
  //         pipeline: [
  //           {
  //             $lookup: {
  //               from: 'networks',
  //               localField: 'networks',
  //               foreignField: '_id',
  //               as: 'networkList',
  //             },
  //           },
  //           {
  //             $addFields: {
  //               networks: '$networkList._id',
  //             },
  //           },
  //         ],
  //       },
  //     },
  //     {
  //       $unwind: '$token',
  //     },
  //   ]);

  //   // if return true then we will re call this function again. so this will return all wallet with new created wallet
  //   const doNeedToReeCall = await this.createWalletIfNotExits(wallets, userId);
  //   if (doNeedToReeCall) {
  //     await this.getTotalBalance(userId);
  //     return;
  //   }

  //   const cloudKSettings = await this.getCurrentCloudKSettings();
  //   const walletsBalance = await Promise.all(
  //     wallets.map(async (wallet) => {
  //       // eslint-disable-next-line prefer-const
  //       let { walletBalance, totalStaked } = await this.getBalanceByWallet(
  //         userId,
  //         wallet._id,
  //       );
  //       const balance = walletBalance;

  //       const tokenTrxSettings =
  //         await this.tokenService.getAvailableTransactionSettings(
  //           wallet.token._id,
  //         );
  //       const tokenObj = {
  //         name: wallet.token.name,
  //         symbol: wallet.token.symbol,
  //         color: wallet.token.color,
  //         borderColor: wallet.token.borderColor,
  //         iconUrl: wallet.token.iconUrl,
  //         networkList: wallet.token.networkList,
  //         valueType: wallet.token.valueType,
  //         trxSettings: tokenTrxSettings,
  //         showZeroBalance: wallet.token.showZeroBalance || false,
  //       };

  //       let totalAvailableToStake = 0;
  //       if (
  //         wallet.token._id.toString() == cloudKSettings.stakeToken.toString()
  //       ) {
  //         const machinesMaxStake =
  //           await this.getTotalMachinesStakeByUser(userId);
  //         const userTotalMachineStakes =
  //           await this.getMachineTotalStaked(userId);
  //         totalStaked = userTotalMachineStakes;
  //         totalAvailableToStake = machinesMaxStake - userTotalMachineStakes;
  //       }

  //       return {
  //         token: tokenObj,
  //         balance,
  //         _id: wallet._id,
  //         totalStaked,
  //         totalAvailableToStake,
  //       };
  //     }),
  //   );
  //   const summary = await this.calculateWalletsSummary(walletsBalance);
  //   return summary;
  // }

  //new api
  async getTotalBalance(userId: Types.ObjectId) {
    const cloudKSettings = await this.getCurrentCloudKSettings();
    const [wallets, machinesMaxStake, userTotalMachineStakes] =
      await Promise.all([
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
        this.getTotalMachinesStakeByUser(userId),
        this.getMachineTotalStaked(userId),
      ]);

    const walletBalances = await Promise.all(
      wallets.map(async (wallet) => {
        const { walletBalance, totalStaked } = await this.getBalanceByWallet(
          userId,
          wallet._id,
        );
        const tokenTrxSettings =
          await this.tokenService.getAvailableTransactionSettings(
            wallet.token._id,
          );

        return {
          token: {
            ...wallet.token,
            trxSettings: tokenTrxSettings,
            showZeroBalance: wallet.token.showZeroBalance || false,
          },
          balance: walletBalance,
          id: wallet._id,
          totalStaked:
            wallet.token._id.toString() === cloudKSettings.stakeToken.toString()
              ? userTotalMachineStakes
              : totalStaked,
          totalAvailableToStake:
            wallet.token._id.toString() === cloudKSettings.stakeToken.toString()
              ? machinesMaxStake - userTotalMachineStakes
              : 0,
        };
      }),
    );

    return this.calculateWalletsSummary(walletBalances);
  }

  /**
   *
   * @param wallets the array of wallets of the user
   * @param userId user ID
   * @returns boolean true if crated any wallet.
   */
  async createWalletIfNotExits(wallets, userId: any): Promise<boolean> {
    const allTokens = await this.tokenService.getAllTokens();

    const tokensNotExist = allTokens.filter((t) => {
      return !wallets.find((w) => t.symbol === w.token.symbol);
    });

    const newWallets = [];
    if (tokensNotExist.length > 0) {
      await tokensNotExist.forEach(async (t) => {
        const filter = {
          user: new Types.ObjectId(userId),
          token: new Types.ObjectId(t._id),
        };
        const exits = await this.walletModel.findOne(filter);
        if (!exits) {
          const created = await await this.walletModel.create(filter);
          newWallets.push(created);
        } else {
          console.error(
            'Its unexpected. tying to crate a wallet its already created',
          );
        }
      });
    } else {
      return false;
    }
    return newWallets.length > 0;
  }

  async getTotalBalanceByTokenSymbol(
    userId: Types.ObjectId,
    tokenSymbol: string,
  ) {
    const wallets = await this.walletModel.aggregate([
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
          pipeline: [
            {
              $match: {
                symbol: tokenSymbol,
                deletedAt: { $eq: null },
              },
            },
          ],
        },
      },
      {
        $unwind: '$token',
      },
    ]);
    const cloudKSettings = await this.getCurrentCloudKSettings();
    const walletsBalance = await Promise.all(
      wallets.map(async (wallet) => {
        // eslint-disable-next-line prefer-const
        let { walletBalance: balance, totalStaked } =
          await this.getBalanceByWallet(userId, wallet._id);

        const tokenTrxSettings =
          await this.tokenService.getAvailableTransactionSettings(
            wallet.token._id,
          );
        const tokenObj = {
          name: wallet.token.name,
          symbol: wallet.token.symbol,
          color: wallet.token.color,
          borderColor: wallet.token.borderColor,
          iconUrl: wallet.token.iconUrl,
          networkList: wallet.token.networkList,
          valueType: wallet.token.valueType,
          trxSettings: tokenTrxSettings,
          showZeroBalance: wallet.token.showZeroBalance || false,
        };

        let totalAvailableToStake = 0;
        if (
          wallet.token._id.toString() == cloudKSettings.stakeToken.toString()
        ) {
          const machinesMaxStake =
            await this.getTotalMachinesStakeByUser(userId);
          const userTotalMachineStakes =
            await this.getMachineTotalStaked(userId);
          totalStaked = userTotalMachineStakes;
          totalAvailableToStake = machinesMaxStake - userTotalMachineStakes;
        }

        return {
          token: tokenObj,
          balance,
          _id: wallet._id,
          totalStaked,
          totalAvailableToStake,
        };
      }),
    );

    const { wallets: walletsData } =
      await this.calculateWalletsSummary(walletsBalance);
    return walletsData;
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

  async getCurrentCloudKSettings(): Promise<CloudKSetting> {
    return await this.cloudKSettingsModel.findOne({}).sort({
      createdAt: -1,
    });
  }

  async getBalanceOfEachToken(userId: Types.ObjectId) {
    const wallets = await this.walletModel.aggregate([
      {
        $match: {
          user: new Types.ObjectId(userId),
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
      {
        $unwind: '$token',
      },
      {
        $lookup: {
          from: 'tokensettings',
          localField: 'token._id',
          foreignField: 'token',
          as: 'tokenSetting',
        },
      },
      {
        $unwind: '$tokenSetting',
      },
    ]);
    const walletsBalance = await Promise.all(
      wallets.map(async (wallet) => {
        const { walletBalance } = await this.getBalanceByWallet(
          userId,
          wallet._id,
        );
        const balance = walletBalance;

        const tokenObj = {
          _id: wallet.token._id,
          name: wallet.token.name,
          symbol: wallet.token.symbol,
          color: wallet.token.color,
          tokenSettings: {
            depositEnabled: wallet.tokenSetting.depositEnabled,
            withdrawEnabled: wallet.tokenSetting.withdrawEnabled,
            fromSwapEnabled: wallet.tokenSetting.fromSwapEnabled,
            toSwapEnabled: wallet.tokenSetting.toSwapEnabled,
          },
        };
        return { token: tokenObj, balance };
      }),
    );
    return walletsBalance;
  }

  async getGraphOfToken(
    userId: Types.ObjectId,
    timeLine: CHART_TIMELIME_TYPES,
  ) {
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    const today = new Date();
    let groupFormat: '%Y' | '%Y %b' | '%Y-%m-%d' = '%Y';

    switch (timeLine) {
      case 'monthly': {
        const graphDataCache = await this.cacheService.getCacheUser({
          type: CACHE_TYPE.MONTHLY_TOKEN_GRAPH_DATA,
          user: String(userId),
        });

        if (graphDataCache) {
          return graphDataCache;
        }

        groupFormat = '%Y-%m-%d';
        startDate.setDate(1);
        break;
      }
      case 'yearly': {
        const graphDataCache = await this.cacheService.getCacheUser({
          type: CACHE_TYPE.YEARLY_TOKEN_GRAPH_DATA,
          user: String(userId),
        });

        if (graphDataCache) {
          return graphDataCache;
        }
        groupFormat = '%Y %b';
        startDate.setMonth(startDate.getMonth() - 6);

        break;
      }
      case 'weekly': {
        const graphDataCache = await this.cacheService.getCacheUser({
          type: CACHE_TYPE.WEEK_TOKEN_GRAPH_DATA,
          user: String(userId),
        });

        if (graphDataCache) {
          return graphDataCache;
        }
        groupFormat = '%Y-%m-%d';
        startDate.setDate(startDate.getDate() - 6);
        break;
      }
    }

    const prevBalance: { prevTotal: number }[] | [] =
      await this.walletTransactionModel.aggregate([
        {
          $match: {
            user: new Types.ObjectId(userId),
            createdAt: { $lte: startDate },
          },
        },
        {
          $group: {
            _id: '$items',

            totalCredit: {
              $sum: {
                $cond: {
                  if: { $eq: ['$transactionFlow', 'in'] },
                  then: '$amount',
                  else: 0,
                },
              },
            },
            totalDebit: {
              $sum: {
                $cond: {
                  if: { $eq: ['$transactionFlow', 'out'] },
                  then: '$amount',
                  else: 0,
                },
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            prevTotal: { $subtract: ['$totalCredit', '$totalDebit'] },
          },
        },
      ]);

    const wallets = await this.walletTransactionModel.aggregate([
      {
        $match: {
          user: new Types.ObjectId(userId),
          createdAt: { $gte: startDate, $lte: today },
        },
      },
      {
        $group: {
          _id: {
            day: { $dateToString: { format: groupFormat, date: '$createdAt' } },
          },
          lastCreated: {
            $first: '$createdAt',
          },
          totalCredit: {
            $sum: {
              $cond: {
                if: { $eq: ['$transactionFlow', 'in'] },
                then: '$amount',
                else: 0,
              },
            },
          },
          totalDebit: {
            $sum: {
              $cond: {
                if: { $eq: ['$transactionFlow', 'out'] },
                then: '$amount',
                else: 0,
              },
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          x: '$_id.day',
          y: { $subtract: ['$totalCredit', '$totalDebit'] },
          c: '$lastCreated',
        },
      },
      {
        $sort: { c: 1 },
      },
    ]);

    const prevTotal = prevBalance[0]?.prevTotal || 0;

    const returnData = await this.formatData(timeLine, wallets, prevTotal);
    switch (timeLine) {
      case 'monthly': {
        const graphDataCache = await this.cacheService.setCacheUser({
          type: CACHE_TYPE.MONTHLY_TOKEN_GRAPH_DATA,
          user: String(userId),
          data: returnData,
        });
        break;
      }
      case 'yearly': {
        const graphDataCache = await this.cacheService.setCacheUser({
          type: CACHE_TYPE.YEARLY_TOKEN_GRAPH_DATA,
          user: String(userId),
          data: returnData,
        });
        break;
      }
      case 'weekly': {
        const graphDataCache = await this.cacheService.setCacheUser({
          type: CACHE_TYPE.WEEK_TOKEN_GRAPH_DATA,
          user: String(userId),
          data: returnData,
        });
        break;
      }
    }
    return returnData;
  }
  // this V2 is for IfValueType is LYK then we convert this into USD and show Graph
  async getGraphOfTokenV2(
    userId: Types.ObjectId,
    timeLine: CHART_TIMELIME_TYPES,
  ) {
    const priceData = await this.tokenService.getCurrentPrice();
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    const today = new Date();
    let groupFormat: '%Y' | '%Y %b' | '%Y-%m-%d' = '%Y';

    switch (timeLine) {
      case 'monthly': {
        // const graphDataCache = await this.cacheService.getCacheUser({
        //   type: CACHE_TYPE.MONTHLY_TOKEN_GRAPH_DATA,
        //   user: String(userId),
        // });

        // if (graphDataCache) {
        //   return graphDataCache;
        // }

        groupFormat = '%Y-%m-%d';
        startDate.setDate(1);
        break;
      }
      case 'yearly': {
        // const graphDataCache = await this.cacheService.getCacheUser({
        //   type: CACHE_TYPE.YEARLY_TOKEN_GRAPH_DATA,
        //   user: String(userId),
        // });

        // if (graphDataCache) {
        //   return graphDataCache;
        // }
        groupFormat = '%Y %b';
        startDate.setMonth(startDate.getMonth() - 6);
        break;
      }
      case 'weekly': {
        // const graphDataCache = await this.cacheService.getCacheUser({
        //   type: CACHE_TYPE.WEEK_TOKEN_GRAPH_DATA,
        //   user: String(userId),
        // });

        // if (graphDataCache) {
        //   return graphDataCache;
        // }
        groupFormat = '%Y-%m-%d';
        startDate.setDate(startDate.getDate() - 6);
        break;
      }
    }

    const prevBalance: { prevTotal: number }[] | [] =
      await this.walletTransactionModel.aggregate([
        {
          $match: {
            user: new Types.ObjectId(userId),
            createdAt: { $lte: startDate },
            deletedAt: null,
          },
        },
        {
          $lookup: {
            from: 'wallets',
            localField: 'wallet',
            foreignField: '_id',
            as: 'walletInfo',
          },
        },
        {
          $unwind: '$walletInfo',
        },
        {
          $lookup: {
            from: 'tokens',
            localField: 'walletInfo.token',
            foreignField: '_id',
            as: 'tokenInfo',
          },
        },
        {
          $unwind: '$tokenInfo',
        },
        {
          $group: {
            _id: '$items',
            totalCredit: {
              $sum: {
                $cond: {
                  if: { $eq: ['$transactionFlow', 'in'] },
                  then: {
                    $cond: {
                      if: {
                        $eq: [
                          '$tokenInfo.conversionType',
                          CONVERSION_TYPES.CUSTOM,
                        ],
                      },
                      then: { $multiply: ['$amount', '$tokenInfo.customRate'] },
                      else: {
                        $cond: {
                          if: { $eq: ['$tokenInfo.valueType', ValueType.LYK] },
                          then: { $multiply: ['$amount', priceData.price] },
                          else: '$amount', // Normal amount
                        },
                      },
                    },
                  },
                  else: 0,
                },
              },
            },
            totalDebit: {
              $sum: {
                $cond: {
                  if: { $eq: ['$transactionFlow', 'out'] },
                  then: {
                    $cond: {
                      if: {
                        $eq: [
                          '$tokenInfo.conversionType',
                          CONVERSION_TYPES.CUSTOM,
                        ],
                      },
                      then: { $multiply: ['$amount', '$tokenInfo.customRate'] },
                      else: {
                        $cond: {
                          if: { $eq: ['$tokenInfo.valueType', ValueType.LYK] },
                          then: { $multiply: ['$amount', priceData.price] },
                          else: '$amount', // Normal amount
                        },
                      },
                    },
                  },
                  else: 0,
                },
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            prevTotal: { $subtract: ['$totalCredit', '$totalDebit'] },
          },
        },
      ]);

    const wallets = await this.walletTransactionModel.aggregate([
      {
        $match: {
          user: new Types.ObjectId(userId),
          createdAt: { $gte: startDate, $lte: today },
          deletedAt: null,
        },
      },
      {
        $lookup: {
          from: 'wallets',
          localField: 'wallet',
          foreignField: '_id',
          as: 'walletInfo',
        },
      },
      {
        $unwind: '$walletInfo',
      },
      {
        $lookup: {
          from: 'tokens',
          localField: 'walletInfo.token',
          foreignField: '_id',
          as: 'tokenInfo',
        },
      },
      {
        $unwind: '$tokenInfo',
      },
      {
        $group: {
          _id: {
            day: { $dateToString: { format: groupFormat, date: '$createdAt' } },
          },
          lastCreated: {
            $first: '$createdAt',
          },
          totalCredit: {
            $sum: {
              $cond: {
                if: { $eq: ['$transactionFlow', 'in'] },
                then: {
                  $cond: {
                    if: {
                      $eq: [
                        '$tokenInfo.conversionType',
                        CONVERSION_TYPES.CUSTOM,
                      ],
                    },
                    then: { $multiply: ['$amount', '$tokenInfo.customRate'] },
                    else: {
                      $cond: {
                        if: { $eq: ['$tokenInfo.valueType', ValueType.LYK] },
                        then: { $multiply: ['$amount', priceData.price] },
                        else: '$amount', // Normal amount
                      },
                    },
                  },
                },
                else: 0,
              },
            },
          },
          totalDebit: {
            $sum: {
              $cond: {
                if: { $eq: ['$transactionFlow', 'out'] },
                then: {
                  $cond: {
                    if: {
                      $eq: [
                        '$tokenInfo.conversionType',
                        CONVERSION_TYPES.CUSTOM,
                      ],
                    },
                    then: { $multiply: ['$amount', '$tokenInfo.customRate'] },
                    else: {
                      $cond: {
                        if: { $eq: ['$tokenInfo.valueType', ValueType.LYK] },
                        then: { $multiply: ['$amount', priceData.price] },
                        else: '$amount', // Normal amount
                      },
                    },
                  },
                },
                else: 0,
              },
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          x: '$_id.day',
          y: { $subtract: ['$totalCredit', '$totalDebit'] },
          c: '$lastCreated',
        },
      },
      {
        $sort: { c: 1 },
      },
    ]);

    const prevTotal = prevBalance[0]?.prevTotal || 0;
    const returnData = await this.formatData(timeLine, wallets, prevTotal);

    // switch (timeLine) {
    //   case 'monthly': {
    //     const graphDataCache = await this.cacheService.setCacheUser({
    //       type: CACHE_TYPE.MONTHLY_TOKEN_GRAPH_DATA,
    //       user: String(userId),
    //       data: returnData,
    //     });
    //     break;
    //   }
    //   case 'yearly': {
    //     const graphDataCache = await this.cacheService.setCacheUser({
    //       type: CACHE_TYPE.YEARLY_TOKEN_GRAPH_DATA,
    //       user: String(userId),
    //       data: returnData,
    //     });
    //     break;
    //   }
    //   case 'weekly': {
    //     const graphDataCache = await this.cacheService.setCacheUser({
    //       type: CACHE_TYPE.WEEK_TOKEN_GRAPH_DATA,
    //       user: String(userId),
    //       data: returnData,
    //     });
    //     break;
    //   }
    // }

    return returnData;
  }

  formatData(timeline: CHART_TIMELIME_TYPES, data: any[], prevBalance: number) {
    let newData = [];

    if (timeline == 'weekly') {
      const weekday = DAY_OF_WEEK_SHORT_NAMES;
      const d = new Date();
      d.setDate(d.getDate() - 7);

      data = data.map((v) => {
        const dm = new Date(v.x);
        v.timestamp = dm.getTime();
        v.date = v.x;
        v.x = weekday[dm.getDay()];
        return v;
      });

      let inheritAmount = prevBalance;
      for (let i = 0; i < 7; i++) {
        d.setDate(d.getDate() + 1);
        const day = weekday[d.getDay()];
        const fd = data.findIndex((v) => v.x == day);

        if (fd >= 0) {
          inheritAmount += data[fd].y;
          newData.push({
            x: day,
            y: inheritAmount,
          });
        } else {
          newData.push({
            x: day,
            y: inheritAmount,
          });
        }
      }

      return newData;
    }

    if (timeline == 'monthly') {
      data = data.map((v) => {
        const dm = new Date(v.x);
        v.timestamp = dm.getTime();
        v.date = dm.getDate();
        return v;
      });
      const d = new Date();

      const todayDateUTC = d.getTime();
      d.setDate(1);

      let inheritAmount = 0;
      let i = 0;
      while (d.getTime() <= todayDateUTC) {
        const fd = data.findIndex((v) => v.date == d.getDate());
        const padDate = d.getDate().toString().padStart(2, '0');
        if (i == 0) {
          newData.push({
            x: padDate,
            y: prevBalance + (fd >= 0 ? data[fd].y : 0),
          });

          inheritAmount += prevBalance;
        } else {
          if (fd >= 0) {
            inheritAmount += data[fd].y;
            newData.push({
              x: padDate,
              y: inheritAmount,
            });
          } else {
            newData.push({
              x: padDate,
              y: inheritAmount,
            });
          }
        }
        d.setDate(d.getDate() + 1);
        i++;
      } // while end

      // If there is more than 15 records. we will cut it down to 15 noms. here, removing Even index records
      const maxRemove = newData.length > 15 ? newData.length - 15 : 0;
      let removed = 0;
      if (maxRemove) {
        newData = newData.filter((v, index) => {
          const isEven = index % 2 == 0;

          if (removed <= maxRemove && isEven && index !== newData.length - 1) {
            removed++;
            return false;
          }
          return true;
        });
      }
      // Filter Ends

      return newData;
    }
    if (timeline == 'yearly') {
      data = data.map((v) => {
        const dm = new Date(v.x);
        v.timestamp = dm.getTime();
        v.x = v.x.replace(/[0-9 ]+/, '');
        return v;
      });
      const d = new Date();
      d.setMonth(d.getMonth() - 6);

      let inheritAmount = 0;
      const monthNames = MONTH_SHORT_NAMES;
      for (let i = 0; i < 6; i++) {
        d.setMonth(d.getMonth() + 1);
        const month = monthNames[d.getMonth()];
        const fd = data.findIndex((v) => v.x == month);

        if (i == 0) {
          newData.push({
            x: month,
            y: prevBalance + (fd >= 0 ? data[fd].y : 0),
          });
          inheritAmount += prevBalance;
          continue;
        }

        if (fd >= 0) {
          inheritAmount += data[fd].y;
          newData.push({
            x: month,
            y: inheritAmount,
          });
        } else {
          newData.push({
            x: month,
            y: inheritAmount,
          });
        }
      }

      return newData;
    }

    return data;
  }

  async createOnChainWallet(
    createOnChainWalletDto: CreateOnChainWalletDto,
    session?: ClientSession,
  ) {
    const existingWallets = await this.onChainWalletModel.find({
      user: createOnChainWalletDto.user,
      token: createOnChainWalletDto.token,
      network: createOnChainWalletDto.network,
      status: OnChainWalletStatus.ACTIVE,
    });

    if (existingWallets.length > 0) {
      await this.onChainWalletModel.updateMany(
        {
          user: createOnChainWalletDto.user,
          token: createOnChainWalletDto.token,
          network: createOnChainWalletDto.network,
          status: OnChainWalletStatus.ACTIVE,
        },
        { $set: { status: OnChainWalletStatus.INACTIVE } },
        { session },
      );
    }
    const onChainWalletDoc = new this.onChainWalletModel(
      createOnChainWalletDto,
    );
    return await onChainWalletDoc.save({ session });
  }

  async getUserOnChainAddress(onChainAddressDto: OnChainAddressDto) {
    const session = await this.connection.startSession();
    await session.startTransaction();
    try {
      const { userId, onChainTokenId, networkId } = onChainAddressDto;
      const user = await this.getUserById(userId);

      const depositSetting = await this.depositSettingModel
        .findById(onChainTokenId)
        .populate({
          path: 'fromToken',
          select: 'symbol',
        });

      const onChainWalletSetting = await this.onChainWalletSettingModel
        .findOne({
          status: OnChainWalletStatus.ACTIVE,
          token: depositSetting?.fromToken,
          network: networkId,
        })
        .exec();
      const network = await this.networkModel.findById(networkId);

      const onChainWallet = await this.onChainWalletModel.findOne({
        user: userId,
        network: networkId,
        token: onChainTokenId,
      });
      let newWalletAddress;
      if (onChainWalletSetting) {
        const coin = depositSetting?.fromToken['symbol'] + '-' + network.code;
        const walletRequestPayload = {
          requestId: uuidv4(),
          minAmount: depositSetting?.minAmount,
          customer: {
            name: user?.username,
            email: user?.email,
          },
          coin: coin,
        };

        const newWallet =
          await this.kmallService.createPbPayWallet(walletRequestPayload);

        newWalletAddress = newWallet?.address;
        if (onChainWallet) {
          const attempsDetails = await this.getUserOnChainAttempsCount(
            userId,
            onChainWalletSetting?.id,
          );
          if (attempsDetails >= onChainWalletSetting.maxAttempts) {
            throw new BadRequestException(
              `You have already reached the maximum attempts: ${onChainWalletSetting.maxAttempts}`,
            );
          }
        }

        await this.createOnChainWallet(
          {
            address: newWalletAddress,
            network: networkId,
            token: onChainTokenId,
            user: userId,
            status: OnChainWalletStatus.ACTIVE,
          },
          session,
        );

        await this.createOrUpdateOnChainAttempts(
          userId,
          onChainWalletSetting?.id,
        );

        await session.commitTransaction();
        return {
          address: newWalletAddress,
        };
      } else {
        if (onChainWallet) {
          session.endSession();
          return {
            address: onChainWallet.address,
          };
        }
        const newWallet = await this.kmallService.createKMallWallet(
          network.code,
        );
        newWalletAddress = newWallet.address;
      }

      const userOnChainWallet = await this.createOnChainWallet(
        {
          address: newWalletAddress,
          network: networkId,
          token: onChainTokenId,
          user: userId,
          status: OnChainWalletStatus.ACTIVE,
        },
        session,
      );
      await session.commitTransaction();
      return {
        address: userOnChainWallet.address,
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async createOrUpdateOnChainAttempts(
    userId: Types.ObjectId,
    onChainWalletSetting: Types.ObjectId,
  ) {
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setUTCHours(23, 59, 59, 999);

    const userAttemptDetails = await this.onChainAttemptModel.findOne({
      user: userId,
      onChainWalletSetting: onChainWalletSetting,
      date: { $gte: startOfDay, $lte: endOfDay },
      isReset: { $ne: true },
    });

    if (!userAttemptDetails) {
      await this.onChainAttemptModel.create({
        user: userId,
        onChainWalletSetting: onChainWalletSetting,
        attempts: 1,
        date: new Date(),
      });
    } else {
      await this.onChainAttemptModel.updateOne(
        { _id: userAttemptDetails._id },
        { $inc: { attempts: 1 }, $set: { date: new Date() } },
      );
    }
  }

  async getUserOnChainAttempsCounts(onChainAddressDto: OnChainAddressDto) {
    const { userId, onChainTokenId, networkId } = onChainAddressDto;

    const depositSetting =
      await this.depositSettingModel.findById(onChainTokenId);

    const onChainWalletSetting = await this.onChainWalletSettingModel
      .findOne({
        status: OnChainWalletStatus.ACTIVE,
        token: depositSetting?.fromToken,
        network: networkId,
      })
      .exec();

    const attempsCount = await this.getUserOnChainAttempsCount(
      userId,
      onChainWalletSetting?.id,
    );

    return {
      isOnChainWallet: onChainWalletSetting ? true : false,
      numberOfAttempts: attempsCount || 0,
      totalAttemtps: onChainWalletSetting?.maxAttempts || 0,
    };
  }

  async getUserOnChainAttempsCount(
    user: Types.ObjectId,
    onChainWalletSetting: Types.ObjectId,
  ) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const userAttemptDetails = await this.onChainAttemptModel.findOne({
      user: user,
      onChainWalletSetting: onChainWalletSetting,
      date: { $gte: startOfDay, $lte: endOfDay },
      isReset: { $ne: true },
    });

    const attemptsCount = userAttemptDetails ? userAttemptDetails.attempts : 0;
    return attemptsCount;
  }

  async getAllSwapsPaginated(paginateDTO: WalletFilterDTO) {
    const {
      page,
      limit,
      query,
      status,
      fromDate,
      toDate,
      fromToken,
      toToken,
      sort,
    } = paginateDTO;
    const matchConditions: any[] = [{ deletedAt: null }];

    if (query) {
      const queryNumber = parseInt(query, 10);
      if (!isNaN(queryNumber)) {
        matchConditions.push({
          $or: [
            { serialNumber: queryNumber },
            {
              'user.blockchainId': {
                $regex: query,
                $options: 'i',
              },
            },
          ],
        });
      } else {
        matchConditions.push({
          $or: [
            { requestId: { $regex: query, $options: 'i' } },
            {
              'user.email': {
                $regex: query,
                $options: 'i',
              },
            },
            { 'user.firstName': { $regex: query, $options: 'i' } },
            { 'user.lastName': { $regex: query, $options: 'i' } },
          ],
        });
      }
    }

    if (status) {
      matchConditions.push({ requestStatus: status });
    }

    if (fromDate) {
      const from = new Date(fromDate);
      const to = toDate ? new Date(toDate) : new Date();
      to.setUTCHours(23, 59, 59, 999);
      matchConditions.push({
        createdAt: {
          $gte: from,
          $lte: to,
        },
      });
    }

    if (fromToken) {
      matchConditions.push({ 'fromWallet.token.symbol': fromToken });
    }

    if (toToken) {
      matchConditions.push({ 'toWallet.token.symbol': toToken });
    }

    const sortQuery: any = {};
    if (sort) {
      for (const key in sort) {
        sortQuery[key] = sort[key] === 'descending' ? -1 : 1;
      }
    } else {
      sortQuery.createdAt = -1;
    }

    const pipeline = [];

    pipeline.push(
      {
        $sort: sortQuery,
      },
      {
        $lookup: {
          from: 'wallettransactions',
          localField: 'toWalletTrx',
          foreignField: '_id',
          as: 'toWalletTrx',
        },
      },
      {
        $unwind: { path: '$toWalletTrx', preserveNullAndEmptyArrays: true },
      },
      {
        $lookup: {
          from: 'wallettransactions',
          localField: 'fromWalletTrx',
          foreignField: '_id',
          as: 'fromWalletTrx',
        },
      },
      {
        $unwind: { path: '$fromWalletTrx', preserveNullAndEmptyArrays: true },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'toUser',
          foreignField: '_id',
          as: 'toUser',
        },
      },
      {
        $unwind: { path: '$toUser', preserveNullAndEmptyArrays: true },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'user',
        },
      },
      {
        $unwind: { path: '$user', preserveNullAndEmptyArrays: true },
      },
      {
        $lookup: {
          from: 'wallets',
          localField: 'toWallet',
          foreignField: '_id',
          as: 'toWallet',
        },
      },
      {
        $unwind: { path: '$toWallet', preserveNullAndEmptyArrays: true },
      },
      {
        $lookup: {
          from: 'tokens',
          localField: 'toWallet.token',
          foreignField: '_id',
          as: 'toWallet.token',
        },
      },
      {
        $unwind: {
          path: '$toWallet.token',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'wallets',
          localField: 'fromWallet',
          foreignField: '_id',
          as: 'fromWallet',
        },
      },
      {
        $unwind: { path: '$fromWallet', preserveNullAndEmptyArrays: true },
      },
      {
        $lookup: {
          from: 'tokens',
          localField: 'fromWallet.token',
          foreignField: '_id',
          as: 'fromWallet.token',
        },
      },
      {
        $unwind: {
          path: '$fromWallet.token',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          trxType: 'swap',
        },
      },
      {
        $lookup: {
          from: 'swapsettings',
          localField: 'settingsUsed',
          foreignField: '_id',
          as: 'settingsUsed',
        },
      },
      {
        $unwind: {
          path: '$settingsUsed',
          preserveNullAndEmptyArrays: true,
        },
      },
    );

    if (matchConditions.length > 0) {
      pipeline.push({ $match: { $and: matchConditions } });
    }

    pipeline.push({
      $project: {
        'fromWallet.token.createdAt': 0,
        'fromWallet.token.updatedAt': 0,
        'toWallet.token.createdAt': 0,
        'toWallet.token.updatedAt': 0,
        'fromWallet.user': 0,
        'toWallet.user': 0,
        'fromWallet.createdAt': 0,
        'fromWallet.updatedAt': 0,
        'toWallet.createdAt': 0,
        'toWallet.updatedAt': 0,
        'user.createdAt': 0,
        'user.updatedAt': 0,
        'toUser.blockchainId': 0,
        'toUser.createdAt': 0,
        'toUser.updatedAt': 0,
        'fromWalletTrx.updatedAt': 0,
        'fromWalletTrx.user': 0,
        'fromWalletTrx.wallet': 0,
        'toWalletTrx.updatedAt': 0,
        'toWalletTrx.user': 0,
        'toWalletTrx.wallet': 0,
        // settingsUsed: {
        //   minAmount: '$settingsUsed.minAmount',
        //   maxAmount: '$settingsUsed.maxAmount',
        //   commission: '$settingsUsed.commission',
        //   commissionType: '$settingsUsed.commissionType',
        // },
      },
    });

    return await aggregatePaginate(
      this.swapTransactionModel,
      pipeline,
      page,
      limit,
    );
  }

  async getAllDepositsPaginated(paginateDTO: WalletFilterDTO) {
    // Destructure input parameters
    const {
      page,
      limit,
      query,
      status,
      fromDate,
      toDate,
      token,
      sort,
      platform,
    } = paginateDTO;

    // Initialize an empty where configuration object
    let whereConfig: any = { deletedAt: null };

    // Optional: Token filtering
    if (token) {
      // Find token by symbol and add to where conditions
      const tokenInfo = await this.tokenModel.findOne({ symbol: token });
      whereConfig = {
        ...whereConfig,
        token: tokenInfo._id,
      };
    }
    if (platform) {
      const tokenInfo = await this.tokenModel.findOne({ platforms: platform });
      whereConfig = {
        ...whereConfig,
        token: tokenInfo._id,
      };
    }

    // Complex search query handling
    if (query) {
      // Split query into multiple search terms
      const newQuery = query.split(/[ ,]+/);

      // Create search conditions for multiple fields
      const requestIdSearchQuery = newQuery.map((str) => ({
        requestId: RegExp(str, 'i'),
      }));

      const hashSearchQuery = newQuery.map((str) => ({
        hash: RegExp(str, 'i'),
      }));

      const remarksSearchQuery = newQuery.map((str) => ({
        remarks: RegExp(str, 'i'),
      }));

      const blockchainIdSearchQuery = newQuery.map((str) => ({
        blockchainId: RegExp(str, 'i'),
      }));

      // Update whereConfig with complex search conditions
      whereConfig = {
        ...whereConfig,
        $and: [
          {
            $or: [
              { $and: requestIdSearchQuery },
              { $and: hashSearchQuery },
              { $and: remarksSearchQuery },
              { $and: blockchainIdSearchQuery },
            ],
          },
        ],
      };
    }

    // Date range filtering
    if (fromDate) {
      const from = new Date(fromDate);
      const to = toDate ? new Date(toDate) : new Date();
      to.setUTCHours(23, 59, 59, 999);

      whereConfig = {
        ...whereConfig,
        createdAt: {
          $gte: from,
          $lte: to,
        },
      };
    }

    // Status filtering
    if (status) {
      whereConfig = {
        ...whereConfig,
        transactionStatus: status,
      };
    }

    // Pagination
    const paginate = await pagination({
      page,
      pageSize: limit,
      model: this.depositTransactionModel,
      condition: whereConfig,
      pagingRange: 5,
    });

    // Sorting configuration
    const sortQuery: any = {};
    if (sort) {
      // Custom sorting based on input
      for (const key in sort) {
        sortQuery[key] = sort[key] === 'descending' ? -1 : 1;
      }
    } else {
      // Default sorting by creation date (descending)
      sortQuery.createdAt = -1;
    }

    // Fetch paginated and populated results
    const list = await this.depositTransactionModel
      .find(whereConfig)
      .sort(sortQuery)
      .skip(paginate.offset)
      .limit(paginate.limit)
      .populate([
        { path: 'user' },
        { path: 'onChainWallet' },
        { path: 'token' },
        { path: 'settingsUsed' },
      ])
      .lean();

    // Return paginated results with metadata
    return {
      list,
      totalCount: paginate.total,
      totalPages: paginate.metadata.page.totalPage,
      currentPage: paginate.metadata.page.currentPage,
      paginate,
    };
  }

  // async getAllDepositsPaginated1(paginateDTO: WalletFilterDTO) {
  //   const { page, limit, query, status, fromDate, toDate, token, sort } =
  //     paginateDTO;

  //   const matchPipeline: any[] = [{ $match: { deletedAt: { $eq: null } } }];
  //   const mainPipeline = [];
  //   // const matchConditions: any[] = [{ deletedAt: { $eq: null } }];

  //   if (status) {
  //     matchPipeline.push({ $match: { transactionStatus: status } });
  //   }

  //   if (fromDate) {
  //     const from = new Date(fromDate);
  //     const to = toDate ? new Date(toDate) : new Date();
  //     to.setUTCHours(23, 59, 59, 999);
  //     matchPipeline.push({
  //       $match: {
  //         createdAt: {
  //           $gte: from,
  //           $lte: to,
  //         },
  //       },
  //     });
  //   }

  //   if (query) {
  //     matchPipeline.push(
  //       {
  //         $lookup: {
  //           from: 'users',
  //           localField: 'user',
  //           foreignField: '_id',
  //           as: 'user',
  //         },
  //       },
  //       {
  //         $unwind: { path: '$user', preserveNullAndEmptyArrays: true },
  //       },
  //     );
  //     const queryNumber = parseInt(query, 10);
  //     if (!isNaN(queryNumber)) {
  //       // matchConditions.push({
  //       //   $or: [
  //       //     { serialNumber: queryNumber },
  //       //     {
  //       //       'user.blockchainId': {
  //       //         $regex: query,
  //       //         $options: 'i',
  //       //       },
  //       //     },
  //       //   ],
  //       // });

  //       matchPipeline.push({
  //         $match: {
  //           $or: [
  //             { serialNumber: queryNumber },
  //             {
  //               'user.blockchainId': {
  //                 $regex: query,
  //                 $options: 'i',
  //               },
  //             },
  //           ],
  //         },
  //       });
  //     } else {
  //       // matchConditions.push({
  //       //   $or: [
  //       //     { requestId: { $regex: query, $options: 'i' } },
  //       //     {
  //       //       'user.email': {
  //       //         $regex: query,
  //       //         $options: 'i',
  //       //       },
  //       //     },
  //       //     { hash: { $regex: query, $options: 'i' } },
  //       //     { 'user.firstName': { $regex: query, $options: 'i' } },
  //       //     { 'user.lastName': { $regex: query, $options: 'i' } },
  //       //   ],
  //       // });

  //       matchPipeline.push({
  //         $match: {
  //           $or: [
  //             { requestId: { $regex: query, $options: 'i' } },
  //             {
  //               'user.email': {
  //                 $regex: query,
  //                 $options: 'i',
  //               },
  //             },
  //             { hash: { $regex: query, $options: 'i' } },
  //             { 'user.firstName': { $regex: query, $options: 'i' } },
  //             { 'user.lastName': { $regex: query, $options: 'i' } },
  //           ],
  //         },
  //       });
  //     }
  //   } else {
  //     mainPipeline.push(
  //       {
  //         $lookup: {
  //           from: 'users',
  //           localField: 'user',
  //           foreignField: '_id',
  //           as: 'user',
  //         },
  //       },
  //       {
  //         $unwind: { path: '$user', preserveNullAndEmptyArrays: true },
  //       },
  //     );
  //   }

  //   if (token) {
  //     matchPipeline.push(
  //       {
  //         $lookup: {
  //           from: 'wallets',
  //           localField: 'toWallet',
  //           foreignField: '_id',
  //           as: 'toWallet',
  //         },
  //       },
  //       {
  //         $unwind: { path: '$toWallet', preserveNullAndEmptyArrays: true },
  //       },
  //       {
  //         $lookup: {
  //           from: 'tokens',
  //           localField: 'toWallet.token',
  //           foreignField: '_id',
  //           as: 'toWallet.token',
  //         },
  //       },
  //       {
  //         $unwind: {
  //           path: '$toWallet.token',
  //           preserveNullAndEmptyArrays: true,
  //         },
  //       },
  //     );
  //     // matchConditions.push({ 'toWallet.token.symbol': token });
  //     matchPipeline.push({ $match: { 'toWallet.token.symbol': token } });
  //   } else {
  //     mainPipeline.push(
  //       {
  //         $lookup: {
  //           from: 'wallets',
  //           localField: 'toWallet',
  //           foreignField: '_id',
  //           as: 'toWallet',
  //         },
  //       },
  //       {
  //         $unwind: { path: '$toWallet', preserveNullAndEmptyArrays: true },
  //       },
  //       {
  //         $lookup: {
  //           from: 'tokens',
  //           localField: 'toWallet.token',
  //           foreignField: '_id',
  //           as: 'toWallet.token',
  //         },
  //       },
  //       {
  //         $unwind: {
  //           path: '$toWallet.token',
  //           preserveNullAndEmptyArrays: true,
  //         },
  //       },
  //     );
  //   }

  //   const sortQuery: any = {};
  //   if (sort) {
  //     for (const key in sort) {
  //       sortQuery[key] = sort[key] === 'descending' ? -1 : 1;
  //     }
  //   } else {
  //     sortQuery.createdAt = -1;
  //   }

  //   matchPipeline.push({
  //     $sort: sortQuery,
  //   });

  //   // const pipeline = [];

  //   mainPipeline.push(
  //     {
  //       $lookup: {
  //         from: 'wallettransactions',
  //         localField: 'toWalletTrx',
  //         foreignField: '_id',
  //         as: 'toWalletTrx',
  //       },
  //     },
  //     {
  //       $unwind: { path: '$toWalletTrx', preserveNullAndEmptyArrays: true },
  //     },
  //     {
  //       $lookup: {
  //         from: 'users',
  //         localField: 'fromUser',
  //         foreignField: '_id',
  //         as: 'fromUser',
  //       },
  //     },
  //     {
  //       $unwind: { path: '$fromUser', preserveNullAndEmptyArrays: true },
  //     },
  //     {
  //       $lookup: {
  //         from: 'depositsettings',
  //         localField: 'settingsUsed',
  //         foreignField: '_id',
  //         as: 'settingsUsed',
  //       },
  //     },
  //     {
  //       $unwind: {
  //         path: '$settingsUsed',
  //         preserveNullAndEmptyArrays: true,
  //       },
  //     },
  //   );

  //   // if (matchConditions.length > 0) {
  //   //   matchPipeline.push({ $match: { $and: matchConditions } });
  //   // }

  //   mainPipeline.push({
  //     $project: {
  //       'user.createdAt': 0,
  //       'user.updatedAt': 0,
  //       'toWalletTrx.updatedAt': 0,
  //       'toWalletTrx.user': 0,
  //       'toWalletTrx.wallet': 0,
  //       'toWallet.user': 0,
  //       'toWallet.createdAt': 0,
  //       'toWallet.updatedAt': 0,
  //       'toWallet.token.createdAt': 0,
  //       'toWallet.token.updatedAt': 0,
  //       updatedAt: 0,
  //     },
  //   });

  //   return await aggregatePaginate2(
  //     this.depositTransactionModel,
  //     matchPipeline,
  //     mainPipeline,
  //     page,
  //     limit,
  //   );
  // }

  // on chain deposite pagination ==============================================

  // async getAllOnChainDeposits(paginateDTO: WalletFilterDTO) {
  //   const { page, limit, query, status, fromDate, toDate, token, sort } =
  //     paginateDTO;

  //   const matchPipeline: any[] = [{ $match: { deletedAt: { $eq: null } } }];
  //   const mainPipeline: any[] = [];

  //   if (status) {
  //     matchPipeline.push({ $match: { transactionStatus: status } });
  //   }

  //   if (fromDate) {
  //     const from = new Date(fromDate);
  //     const to = toDate ? new Date(toDate) : new Date();
  //     to.setUTCHours(23, 59, 59, 999);
  //     matchPipeline.push({
  //       $match: {
  //         createdAt: {
  //           $gte: from,
  //           $lte: to,
  //         },
  //       },
  //     });
  //   }

  //   // const matchConditions: any[] = [{ deletedAt: { $eq: null } }];

  //   if (query) {
  //     matchPipeline.push(
  //       {
  //         $lookup: {
  //           from: 'users',
  //           localField: 'user',
  //           foreignField: '_id',
  //           as: 'user',
  //         },
  //       },
  //       {
  //         $unwind: { path: '$user', preserveNullAndEmptyArrays: true },
  //       },
  //       {
  //         $lookup: {
  //           from: 'onchainwallets',
  //           localField: 'onChainWallet',
  //           foreignField: '_id',
  //           as: 'onChainWallet',
  //         },
  //       },
  //       {
  //         $unwind: { path: '$onChainWallet', preserveNullAndEmptyArrays: true },
  //       },
  //     );
  //     const queryNumber = parseInt(query, 10);

  //     if (!isNaN(queryNumber) && queryNumber.toString() === query) {
  //       // matchConditions.push({
  //       //   $or: [
  //       //     { serialNumber: queryNumber },
  //       //     {
  //       //       'user.blockchainId': {
  //       //         $regex: query,
  //       //         $options: 'i',
  //       //       },
  //       //     },
  //       //   ],
  //       // });
  //       matchPipeline.push({
  //         $match: {
  //           $or: [
  //             { serialNumber: queryNumber },
  //             {
  //               'user.blockchainId': {
  //                 $regex: query,
  //                 $options: 'i',
  //               },
  //             },
  //           ],
  //         },
  //       });
  //     } else {
  //       // matchConditions.push({
  //       //   $or: [
  //       //     { requestId: { $regex: query, $options: 'i' } },
  //       //     {
  //       //       'user.email': {
  //       //         $regex: query,
  //       //         $options: 'i',
  //       //       },
  //       //     },
  //       //     { hash: { $regex: query, $options: 'i' } },
  //       //     { 'user.firstName': { $regex: query, $options: 'i' } },
  //       //     { 'user.lastName': { $regex: query, $options: 'i' } },
  //       //     { 'onChainWallet.address': { $regex: query, $options: 'i' } },
  //       //   ],
  //       // });

  //       matchPipeline.push({
  //         $match: {
  //           $or: [
  //             { requestId: { $regex: query, $options: 'i' } },
  //             {
  //               'user.email': {
  //                 $regex: query,
  //                 $options: 'i',
  //               },
  //             },
  //             { hash: { $regex: query, $options: 'i' } },
  //             { 'user.firstName': { $regex: query, $options: 'i' } },
  //             { 'user.lastName': { $regex: query, $options: 'i' } },
  //             { 'onChainWallet.address': { $regex: query, $options: 'i' } },
  //           ],
  //         },
  //       });
  //     }
  //   } else {
  //     mainPipeline.push(
  //       {
  //         $lookup: {
  //           from: 'users',
  //           localField: 'user',
  //           foreignField: '_id',
  //           as: 'user',
  //         },
  //       },
  //       {
  //         $unwind: { path: '$user', preserveNullAndEmptyArrays: true },
  //       },
  //       {
  //         $lookup: {
  //           from: 'onchainwallets',
  //           localField: 'onChainWallet',
  //           foreignField: '_id',
  //           as: 'onChainWallet',
  //         },
  //       },
  //       {
  //         $unwind: { path: '$onChainWallet', preserveNullAndEmptyArrays: true },
  //       },
  //     );
  //   }

  //   // Add match condition for fromToken.symbol equal to 'usdt'
  //   // matchConditions.push({ 'fromToken.symbol': 'usdt' });

  //   const sortQuery: any = {};
  //   if (sort) {
  //     for (const key in sort) {
  //       sortQuery[key] = sort[key] === 'descending' ? -1 : 1;
  //     }
  //   } else {
  //     sortQuery.createdAt = -1;
  //   }

  //   matchPipeline.push({
  //     $sort: sortQuery,
  //   });

  //   const pipeline = [];

  //   mainPipeline.push(
  //     // {
  //     //   $sort: sortQuery,
  //     // },
  //     {
  //       $lookup: {
  //         from: 'tokens',
  //         localField: 'fromToken',
  //         foreignField: '_id',
  //         as: 'fromToken',
  //       },
  //     },
  //     {
  //       $unwind: { path: '$fromToken', preserveNullAndEmptyArrays: true },
  //     },
  //     // the list become empty when use this match contition. just commented make the API works without knowing the logic.
  //     // { $match: { 'fromToken.symbol': 'usdt' } },
  //     {
  //       $lookup: {
  //         from: 'wallettransactions',
  //         localField: 'toWalletTrx',
  //         foreignField: '_id',
  //         as: 'toWalletTrx',
  //       },
  //     },
  //     {
  //       $unwind: { path: '$toWalletTrx', preserveNullAndEmptyArrays: true },
  //     },
  //     // {
  //     //   $lookup: {
  //     //     from: 'users',
  //     //     localField: 'user',
  //     //     foreignField: '_id',
  //     //     as: 'user',
  //     //   },
  //     // },
  //     // {
  //     //   $unwind: { path: '$user', preserveNullAndEmptyArrays: true },
  //     // },
  //     {
  //       $lookup: {
  //         from: 'wallets',
  //         localField: 'toWallet',
  //         foreignField: '_id',
  //         as: 'toWallet',
  //       },
  //     },
  //     {
  //       $unwind: { path: '$toWallet', preserveNullAndEmptyArrays: true },
  //     },
  //     {
  //       $lookup: {
  //         from: 'tokens',
  //         localField: 'toWallet.token',
  //         foreignField: '_id',
  //         as: 'toWallet.token',
  //       },
  //     },
  //     {
  //       $unwind: {
  //         path: '$toWallet.token',
  //         preserveNullAndEmptyArrays: true,
  //       },
  //     },
  //     {
  //       $lookup: {
  //         from: 'users',
  //         localField: 'fromUser',
  //         foreignField: '_id',
  //         as: 'fromUser',
  //       },
  //     },
  //     {
  //       $unwind: { path: '$fromUser', preserveNullAndEmptyArrays: true },
  //     },
  //     {
  //       $lookup: {
  //         from: 'depositsettings',
  //         localField: 'settingsUsed',
  //         foreignField: '_id',
  //         as: 'settingsUsed',
  //       },
  //     },
  //     {
  //       $unwind: {
  //         path: '$settingsUsed',
  //         preserveNullAndEmptyArrays: true,
  //       },
  //     },
  //     // {
  //     //   $lookup: {
  //     //     from: 'onchainwallets',
  //     //     localField: 'onChainWallet',
  //     //     foreignField: '_id',
  //     //     as: 'onChainWallet',
  //     //   },
  //     // },
  //     // {
  //     //   $unwind: { path: '$onChainWallet', preserveNullAndEmptyArrays: true },
  //     // },
  //   );

  //   // if (matchConditions.length > 0) {
  //   //   pipeline.push({ $match: { $and: matchConditions } });
  //   // }

  //   mainPipeline.push({
  //     $project: {
  //       'user.createdAt': 0,
  //       'user.updatedAt': 0,
  //       'toWalletTrx.updatedAt': 0,
  //       'toWalletTrx.user': 0,
  //       'toWalletTrx.wallet': 0,
  //       'toWallet.user': 0,
  //       'toWallet.createdAt': 0,
  //       'toWallet.updatedAt': 0,
  //       'toWallet.token.createdAt': 0,
  //       'toWallet.token.updatedAt': 0,
  //       updatedAt: 0,
  //     },
  //   });

  //   return await aggregatePaginate2(
  //     this.depositTransactionModel,
  //     matchPipeline,
  //     mainPipeline,
  //     page,
  //     limit,
  //   );
  // }

  async getAllOnChainDepositsV2(paginateDTO: WalletFilterDTO) {
    const { page, limit, status, fromDate, toDate, token, sort, query } =
      paginateDTO;

    const setupQueries = async () => {
      // Function to build base query
      const getBaseQuery = async () => {
        const baseQuery: any = { deletedAt: null };
        baseQuery.isOnChainDeposit = true;

        if (status) {
          baseQuery.transactionStatus = status;
        }

        if (fromDate) {
          const from = new Date(fromDate);
          const to = toDate ? new Date(toDate) : new Date();
          to.setUTCHours(23, 59, 59, 999);
          baseQuery.createdAt = {
            $gte: from,
            $lte: to,
          };
        }

        if (query) {
          const queryNumber = parseInt(query, 10);

          if (!isNaN(queryNumber) && queryNumber.toString() === query) {
            baseQuery.$or = [
              { serialNumber: queryNumber },
              { blockchainId: new RegExp(query, 'i') },
            ];
          } else {
            baseQuery.$or = [
              { requestId: new RegExp(query, 'i') },
              { hash: new RegExp(query, 'i') },
              // { 'user.email': new RegExp(query, 'i') },
              // { 'user.firstName': new RegExp(query, 'i') },
              // { 'user.lastName': new RegExp(query, 'i') },
              // { 'onChainWallet.address': new RegExp(query, 'i') },
            ];
          }
          const isUserCheck = validateValue(query);

          if (isUserCheck) {
            const userData = await this.userModel.findOne({
              $or: [
                { email: new RegExp(query, 'i') },
                { blockchainId: new RegExp(query, 'i') },
                { username: new RegExp(query, 'i') },
                { firstName: new RegExp(query, 'i') },
                { lastName: new RegExp(query, 'i') },
              ],
            });

            if (userData) {
              baseQuery.$or = [...baseQuery.$or, { user: userData._id }];
            }
          }

          const onchainwalletsData = await this.onChainWalletModel.findOne({
            $or: [{ address: new RegExp(query, 'i') }],
          });
          if (onchainwalletsData) {
            baseQuery.$or = [
              ...baseQuery.$or,
              { onChainWallet: onchainwalletsData._id },
            ];
          }
        }

        return baseQuery;
      };

      // Function to build sort options
      const getSortOptions = async () => {
        const sortOptions: any = {};
        if (sort) {
          Object.keys(sort).forEach((key) => {
            sortOptions[key] = sort[key] === 'descending' ? -1 : 1;
          });
        } else {
          sortOptions.createdAt = -1;
        }
        return sortOptions;
      };

      // Run all operations in parallel
      const [baseQuery, sortOptions, onchainTokens] = await Promise.all([
        getBaseQuery(),
        getSortOptions(),
        this.depositSettingModel.find({
          isEnable: true,
          isOnChainDeposit: true,
          deletedAt: { $eq: null },
        }),
      ]);

      const fromTokenIds = onchainTokens.map((token) => token.fromToken);

      if (token) {
        const tokenInfo = await this.tokenModel.findOne({ symbol: token });
        baseQuery.fromToken = tokenInfo?._id;
      }
      return { baseQuery, sortOptions, onchainTokens };
    };

    const { baseQuery, sortOptions, onchainTokens } = await setupQueries();

    // Calculate skip value for pagination

    const paginate = await pagination({
      page,
      pageSize: limit,
      model: this.depositTransactionModel,
      condition: baseQuery,
      pagingRange: 5,
    });

    const query_OnchainWallet = await this.depositTransactionModel
      .find(baseQuery)
      .sort(sortOptions)
      .skip(paginate.offset)
      .limit(paginate.limit)
      .populate({
        path: 'user',
        select: 'email blockchainId username firstName lastName -_id',
      })
      .populate('onChainWallet')
      .populate({
        path: 'fromToken',
        select: 'name iconUrl symbol -_id valueType',
      })
      .populate({
        path: 'toWallet',
        select: '-user -createdAt -updatedAt',
        populate: {
          path: 'token',
          select: 'name iconUrl symbol -_id',
        },
      })
      .lean()
      .exec();

    return {
      list: query_OnchainWallet,
      totalCount: paginate.total,
      totalPages: paginate.metadata.page.totalPage,
      currentPage: paginate.metadata.page.currentPage,
    };
  }

  //end

  async getAllWithdrawsPaginated(paginateDTO: WalletFilterDTO) {
    const { page, limit, query, type, status, fromDate, toDate, token, sort } =
      paginateDTO;

    let whereConfig: any = { deletedAt: null };

    let tokenInfo = null;
    if (token) {
      tokenInfo = await this.tokenModel.findOne({ symbol: token });
      whereConfig = {
        ...whereConfig,
        token: tokenInfo._id,
      };
    }

    if (query) {
      const newQuery = query.split(/[ ,]+/);
      const matchConditions = newQuery.map((str) => {
        const queryNumber = parseInt(str, 10);
        if (!isNaN(queryNumber)) {
          return { serialNumber: queryNumber };
        } else {
          return {
            $or: [
              { requestId: { $regex: str, $options: 'i' } },
              { receiverAddress: { $regex: str, $options: 'i' } },
            ],
          };
        }
      });

      whereConfig = {
        ...whereConfig,
        $or: matchConditions,
      };
    }

    if (type) {
      whereConfig = {
        ...whereConfig,
        $and: [
          {
            $or: [{ withdrawType: type }],
          },
        ],
      };
    }
    if (status) {
      whereConfig = {
        ...whereConfig,
        $and: [
          {
            $or: [{ requestStatus: status }],
          },
        ],
      };
    }

    if (fromDate) {
      const from = new Date(fromDate);
      const to = toDate ? new Date(toDate) : new Date();
      to.setUTCHours(23, 59, 59, 999);
      whereConfig = {
        ...whereConfig,
        createdAt: {
          $gte: from,
          $lte: to,
        },
      };
    }

    const paginate = await pagination({
      page,
      pageSize: limit,
      model: this.withdrawTransactionModel,
      condition: whereConfig,
      pagingRange: 5,
    });

    const sortQuery: any = {};
    if (sort) {
      for (const key in sort) {
        sortQuery[key] = sort[key] === 'descending' ? -1 : 1;
      }
    } else {
      sortQuery.createdAt = -1;
    }

    const list = await this.withdrawTransactionModel
      .find(whereConfig)
      .sort(sortQuery)
      .skip(paginate.offset)
      .limit(paginate.limit)
      // .select('-shops -favoritesProducts -favoritesShops')
      .populate([
        {
          path: 'user',
        },
        {
          path: 'fromWallet',
        },
        {
          path: 'token',
        },
        {
          path: 'network',
        },
      ]);
    const whereConfiguration = {
      ...whereConfig,
      $or: [
        { requestStatus: 'pending-for-admin' }, // Search for 'pending-for-admin'
        { requestStatus: 'pending' }, // Search for 'pending'
      ],
    };

    const amountoftotal =
      await this.withdrawTransactionModel.find(whereConfiguration);

    // Calculate the total amount from the fetched documents
    const totalAmount = amountoftotal.reduce(
      (sum, transaction) => sum + transaction.amount,
      0,
    );
    const totalNoOfPendingTransactions = amountoftotal.length;

    // const isPendingWithdrawApproval = await this.getWithdrawsApprovalCheck({
    //   token,
    // });

    return {
      list,
      totalCount: paginate.total,
      totalPages: paginate.metadata.page.totalPage,
      currentPage: paginate.metadata.page.currentPage,
      paginate,
      totalPendingAmount: totalAmount || 0,
      totalNoOfPendingTransactions: totalNoOfPendingTransactions || 0,
      isAllowtoApprove: true,
    };
  }

  async getWithdrawsApprovalCheck({
    token = 'lyk-w',
    hotwallettoken = 'lyk',
    networkType = 'arbitrum',
  }: {
    token?: string;
    hotwallettoken?: string;
    networkType?: string;
  }): Promise<{ isAllowtoApprove: boolean }> {
    // Your code here
    let isSufficientBalance = false as boolean;

    const [HotWalletBalance] = await Promise.all([
      this.kmallService.getHotWalletBalance(),
    ]);

    const matchConditions: any[] = [
      { deletedAt: { $eq: null } },
      { requestStatus: { $in: ['pending-for-admin', 'pending'] } },
    ];

    try {
      const pipeline: any[] = [
        {
          $match: {
            $and: matchConditions,
          },
        },
        {
          $lookup: {
            from: 'wallets',
            localField: 'fromWallet',
            foreignField: '_id',
            as: 'fromWallet',
            pipeline: [
              {
                $lookup: {
                  from: 'tokens',
                  localField: 'token',
                  foreignField: '_id',
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
          $match: {
            'fromWallet.token.symbol': token,
          },
        },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
        {
          $project: {
            _id: 0,
            totalAmount: 1,
            count: 1,
          },
        },
      ];

      const result = await this.withdrawTransactionModel
        .aggregate(pipeline)
        .exec();

      const totalAmount = result[0]?.totalAmount || 0;

      if (HotWalletBalance?.data?.data) {
        isSufficientBalance = HotWalletBalance.data.data.some(
          (item: { assetName: string; networkType: string; balance: string }) =>
            item.assetName === hotwallettoken &&
            item.networkType === networkType &&
            item.balance <= totalAmount,
        );
      }
      return {
        isAllowtoApprove: !isSufficientBalance,
      };
    } catch (error) {
      console.error('Aggregation Error:', error);
      throw error;
    }
  }
  // //
  // async getPendingRequestSummary(matchConditions: any[]): Promise<{
  //   totalAmount?: number;
  //   totalNoOfTransactions?: number;
  // }> {
  //   const conditions = matchConditions;
  //   const hasFromWalletTokenSymbol = conditions.some(
  //     (condition) => Object.keys(condition)[0] === 'fromWallet.token.symbol',
  //   );
  //   const pipeline = [
  //     ...(hasFromWalletTokenSymbol
  //       ? [
  //           {
  //             $lookup: {
  //               from: 'wallets',
  //               localField: 'fromWallet',
  //               foreignField: '_id',
  //               as: 'fromWallet',
  //               pipeline: [
  //                 {
  //                   $lookup: {
  //                     from: 'tokens',
  //                     localField: 'token',
  //                     foreignField: '_id',
  //                     as: 'token',
  //                   },
  //                 },
  //                 {
  //                   $unwind: {
  //                     path: '$token',
  //                     preserveNullAndEmptyArrays: true,
  //                   },
  //                 },
  //               ],
  //             },
  //           },
  //           {
  //             $unwind: {
  //               path: '$fromWallet',
  //               preserveNullAndEmptyArrays: true,
  //             },
  //           },
  //         ]
  //       : []),
  //     {
  //       $match: {
  //         $and: conditions,
  //       },
  //     },
  //     {
  //       $facet: {
  //         totalAmount: [
  //           {
  //             $group: {
  //               _id: null,
  //               totalAmount: { $sum: '$total' },
  //             },
  //           },
  //         ],
  //         totalCount: [
  //           {
  //             $count: 'totalCount',
  //           },
  //         ],
  //       },
  //     },
  //     {
  //       $project: {
  //         totalAmount: { $arrayElemAt: ['$totalAmount.totalAmount', 0] },
  //         totalNoOfTransactions: {
  //           $arrayElemAt: ['$totalCount.totalCount', 0],
  //         },
  //       },
  //     },
  //   ];

  //   try {
  //     const [result] = await this.withdrawTransactionModel
  //       .aggregate(pipeline)
  //       .exec();
  //     return result || { totalAmount: 0, totalNoOfTransactions: 0 };
  //   } catch (error) {
  //     console.error('Failed to get pending request summary:', error);
  //     throw new Error(
  //       `Failed to get pending request summary: ${error.message}`,
  //     );
  //   }
  // }
  // //
  async getUserById(userId: Types.ObjectId) {
    const user = await this.userModel.findById(userId);
    return user;
  }

  async getAllTransfersPaginated(paginateDTO: PaginateDTO) {
    const { page, limit, query, email, status, date } = paginateDTO;
    const matchConditions: any[] = [{ deletedAt: { $eq: null } }];

    if (query) {
      const queryNumber = parseInt(query, 10);
      if (!isNaN(queryNumber)) {
        matchConditions.push({
          $or: [
            { serialNumber: queryNumber },
            { receiverAddress: { $regex: query, $options: 'i' } },
          ],
        });
      } else {
        matchConditions.push({
          receiverAddress: { $regex: query, $options: 'i' },
        });
      }
    }

    if (status) {
      matchConditions.push({ requestStatus: status });
    }

    if (date) {
      const dateRange = getDateRange(date);
      matchConditions.push({
        createdAt: {
          $gte: dateRange.startDate,
          $lte: dateRange.endDate,
        },
      });

      if (email) {
        matchConditions.push({
          'user.email': { $regex: email, $options: 'i' },
        });
      }
      const pipeline = [
        {
          $match: {
            $and: matchConditions,
          },
        },
        {
          $sort: { createdAt: -1 },
        },
        {
          $lookup: {
            from: 'wallettransactions',
            localField: 'fromWalletTrx',
            foreignField: '_id',
            as: 'fromWalletTrx',
          },
        },
        {
          $unwind: { path: '$fromWalletTrx', preserveNullAndEmptyArrays: true },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'toUser',
            foreignField: '_id',
            as: 'toUser',
          },
        },
        {
          $unwind: { path: '$toUser', preserveNullAndEmptyArrays: true },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'user',
            foreignField: '_id',
            as: 'user',
          },
        },
        {
          $unwind: { path: '$user', preserveNullAndEmptyArrays: true },
        },
        {
          $lookup: {
            from: 'wallets',
            localField: 'fromWallet',
            foreignField: '_id',
            as: 'fromWallet',
          },
        },
        {
          $unwind: { path: '$fromWallet', preserveNullAndEmptyArrays: true },
        },
        {
          $lookup: {
            from: 'tokens',
            localField: 'fromWallet.token',
            foreignField: '_id',
            as: 'fromWallet.token',
          },
        },
        {
          $unwind: {
            path: '$fromWallet.token',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            'fromWallet.token.createdAt': 0,
            'fromWallet.token.updatedAt': 0,
            'fromWallet.user': 0,
            'fromWallet.createdAt': 0,
            'fromWallet.updatedAt': 0,
            'user.blockchainId': 0,
            'user.createdAt': 0,
            'user.updatedAt': 0,
            'toUser.blockchainId': 0,
            'toUser.createdAt': 0,
            'toUser.updatedAt': 0,
            'fromWalletTrx.updatedAt': 0,
            'fromWalletTrx.user': 0,
            'fromWalletTrx.wallet': 0,
            createdAt: 0,
            updatedAt: 0,
          },
        },
      ];

      return await aggregatePaginate(
        this.transferTransactionModel,
        pipeline,
        page,
        limit,
      );
    }
  }

  async availableDepositWallets(query: GetDepositSettingsDto) {
    const { platform } = query;
    const platformData = await this.platformModel.findOne({
      status: 'active',
      symbol: platform || PLATFORMS.HOMNIFI,
    });

    if (!platformData) {
      throw new Error('Platform configuration not found');
    }

    let settings = await this.depositSettingModel
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

    const availableTokens = settings.map((setting) => ({
      ...setting.fromToken,
      ...setting,
    }));
    await this.cacheService.setCacheUser(
      {
        type: CACHE_TYPE.WALLET_DEPOSIT_SETTINGS,
        user:
          String(CACHE_TYPE.STATIC_CACHE_KEY_FOR_DEPOSIT_SETTING) +
          `${platform || ''}`,
        data: availableTokens,
      },
      86400,
    );
    return availableTokens;
  }

  async getAllWithdrawSettings(query: CreateWithdrawSettingsDto) {
    const { platform, type } = query;

    const platformData = await this.platformModel.findOne({
      status: 'active',
      symbol: platform || PLATFORMS.HOMNIFI,
    });

    if (!platformData) {
      throw new Error('Platform configuration not found');
    }

    let settings = await this.withdrawSettingModel.aggregate([
      {
        $match: {
          type,
          deletedAt: null,
          isVisible: true,
          isEnable: true,
          platform: platformData._id,
        },
      },
      {
        $sort: {
          createdAt: -1,
        },
      },
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
          from: 'tokens',
          localField: 'toToken',
          foreignField: '_id',
          as: 'toToken',
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
      { $unwind: '$toToken' },
    ]);

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

    // const data = [];

    // for (const setting of settings) {
    //   const networks = await this.networkModel.find({
    //     _id: {
    //       $in: setting.networks,
    //     },
    //   });
    //   data.push({
    //     ...setting.fromToken.toJSON(),
    //     minAmount: setting.minDisplayAmount,
    //     fee: setting.fee,
    //     feeType: setting.feeType,
    //     commission: setting.commission,
    //     commissionType: setting.commissionType,
    //     type: setting.type,
    //     deletedAt: setting.deletedAt,
    //     isEnable: setting.isEnable,
    //     isVisible: setting.isVisible,
    //     networks,
    //   });
    // }

    const availableTokens = settings.map((setting: Record<string, any>) => {
      delete setting._id;
      return { ...setting.fromToken, ...setting };
    });
    await this.cacheService.setCacheUser(
      {
        type: CACHE_TYPE.WALLET_WITHDRAW_SETTINGS,
        user:
          String(CACHE_TYPE.STATIC_CACHE_KEY_FOR_WITHDRAW_SETTING) + `${type}`,
        data: availableTokens,
      },
      86400,
    );
    return availableTokens;
  }

  async createWalletSettings(createWalletSettingsDto: CreateWalletSettingsDto) {
    const walletSettings = await this.walletSettingsModel.create(
      createWalletSettingsDto,
    );

    return walletSettings;
  }

  async getWalletSettings(): Promise<any> {
    const results = await this.walletSettingsModel.aggregate([
      {
        $match: {
          type: { $in: [WalletSettingsType.SWAP, WalletSettingsType.WITHDRAW] },
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $group: {
          _id: '$type',
          doc: { $first: '$$ROOT' },
        },
      },
    ]);

    // The results will be an array with the two documents
    const swap = results.find((r) => r._id === WalletSettingsType.SWAP)?.doc;
    const withdraw = results.find(
      (r) => r._id === WalletSettingsType.WITHDRAW,
    )?.doc;

    return { swap, withdraw };
  }

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

  async getDepositAndStakePaginated(
    userId: Types.ObjectId,
    paginateDTO: PaginateDTO,
  ) {
    const { page, limit, query, status, fromDate, toDate } = paginateDTO;

    const matchConditions: any[] = [
      { user: new Types.ObjectId(userId), deletedAt: { $eq: null } },
    ];

    if (status) {
      matchConditions.push({ status: status });
    }

    if (fromDate) {
      const from = new Date(fromDate);
      const to = toDate ? new Date(toDate) : new Date();
      to.setUTCHours(23, 59, 59, 999);
      matchConditions.push({
        createdAt: {
          $gte: from,
          $lte: to,
        },
      });
    }

    const pipeline = [
      {
        $match: {
          $and: matchConditions,
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $lookup: {
          from: 'networks',
          localField: 'network',
          foreignField: '_id',
          as: 'network',
        },
      },
      {
        $unwind: { path: '$network', preserveNullAndEmptyArrays: true },
      },
      {
        $lookup: {
          from: 'tokens',
          localField: 'token',
          foreignField: '_id',
          as: 'token',
        },
      },
      {
        $unwind: { path: '$token', preserveNullAndEmptyArrays: true },
      },
      {
        $lookup: {
          from: 'depositAndStakeSettings',
          localField: 'depositAndStakeSettings',
          foreignField: '_id',
          as: 'depositAndStakeSettings',
        },
      },
      {
        $unwind: {
          path: '$depositAndStakeSettings',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $sort: {
          createdAt: -1,
        },
      },
    ];

    const paginated = await aggregatePaginate(
      this.depositAndStakeTransactionModel,
      pipeline,
      page,
      limit,
    );

    const list = paginated.list || [];

    return { ...paginated, list: list };
  }

  async swapTransactionFunction(inputData, session) {
    const {
      userId,
      fromUserWalletId,
      toUserWalletId,
      amount,
      fromTokenId,
      toTokenSymbol,
    } = inputData;
    const { walletBalance } = await this.getBalanceByWallet(
      userId,
      fromUserWalletId,
    );

    const { walletBalance: toTokenWalletBalance } =
      await this.getBalanceByWallet(userId, toUserWalletId);

    const fromUserWalletBalance = walletBalance;
    if (amount > fromUserWalletBalance)
      throw new HttpException('Insufficient balance', 400);

    const priceData = await this.tokenService.getCurrentPrice();
    const allSwapSettings: any =
      await this.tokenService.getSwapSettingsByFromToken(fromTokenId);

    const currentTokenSwapSettings = allSwapSettings.find(
      (setting) => toTokenSymbol.toLowerCase() === setting.symbol.toLowerCase(),
    );

    const fromTrx = await this.createRawWalletTransaction(
      {
        user: userId,
        wallet: fromUserWalletId,
        trxType: TrxType.SWAP,
        amount: amount,
        transactionFlow: TransactionFlow.OUT,
      },
      session,
    );
    const toTrx = await this.createRawWalletTransaction(
      {
        user: userId,
        wallet: toUserWalletId,
        trxType: TrxType.SWAP,
        // amount: amount * (rate || 1),
        amount: amount,

        transactionFlow: TransactionFlow.IN,
      },
      session,
    );

    const { requestId, serialNumber } = await this.generateUniqueRequestId(
      TrxType.SWAP,
    );

    const swapTrx = new this.swapTransactionModel({
      user: userId,
      fromWallet: fromUserWalletId,
      fromWalletTrx: fromTrx[0]._id,
      toWallet: toUserWalletId,
      toWalletTrx: toTrx[0]._id,
      amount: amount,
      swapAmount: amount,
      total: amount,
      commission: 0,
      commissionType: ChargesType.FIXED,
      serialNumber,
      requestId,
      tokenPrice: priceData.price,
      settingsUsed: currentTokenSwapSettings.settingId,
      newBalance: fromUserWalletBalance - amount,
      previousBalance: fromUserWalletBalance,
      newBalanceOfToToken: toTokenWalletBalance + amount,
      previousBalanceOfToToken: toTokenWalletBalance,
      platform: currentTokenSwapSettings.platform,
    });
    await swapTrx.save({ session });
    const swapTransactionHistory = new this.swapTransactionHistoryModel({
      swap_id: swapTrx._id,
      type: Swap_SpecialSwap_Type.SWAP,
      user: userId,
      fromWallet: fromUserWalletId,
      fromWalletTrx: fromTrx[0]._id,
      toWallet: toUserWalletId,
      toWalletTrx: toTrx[0]._id,
      amount: amount,
      swapAmount: amount,
      total: amount,
      commission: 0,
      commissionType: ChargesType.FIXED,
      serialNumber,
      requestId,
      tokenPrice: priceData.price,
      settingsUsed: currentTokenSwapSettings.settingId,
      newBalance: fromUserWalletBalance - amount,
      previousBalance: fromUserWalletBalance,
      newBalanceOfToToken: toTokenWalletBalance + amount,
      previousBalanceOfToToken: toTokenWalletBalance,
      platform: currentTokenSwapSettings.platform,
    });
    await swapTransactionHistory.save({ session });
  }
  async getWalletBalanceForCloudKWebhook(walletDto: CloudKWalletBalanceDto) {
    const { userBid, tokenSymbol } = walletDto;
    const user = await this.userModel.findOne({
      blockchainId: userBid,
    });
    if (!user) {
      throw new BadRequestException(WebhookMessages.BID);
    }
    const getToken = await this.getTokenBySymbol(tokenSymbol);
    if (!getToken) {
      throw new BadRequestException(WebhookMessages.TOKEN);
    }
    const balance = await this.getBalanceByToken(user._id as any, getToken._id);
    return balance;
  }

  async createCloudKWalletTransaction(walletDto: CloudKWalletTransactionDto) {
    const { userBid, tokenSymbol, amount } = walletDto;

    const user = await this.userModel.findOne({
      blockchainId: userBid,
    });

    if (!user) {
      throw new BadRequestException(WebhookMessages.BID);
    }

    const getToken = await this.getTokenBySymbol(tokenSymbol);

    if (!getToken) {
      throw new BadRequestException(WebhookMessages.TOKEN);
    }

    const session = await this.connection.startSession();

    const userWallet = await this.findUserWalletByTokenSymbol(
      tokenSymbol,
      user.id,
      session,
    );

    const cloudkTrx = await this.createRawWalletTransaction(
      {
        user: user.id,
        wallet: userWallet._id,
        trxType: TrxType.CLOUDK,
        amount: amount,
        transactionFlow: TransactionFlow.OUT,
      },
      session,
    );

    const response = {
      deductedAmount: amount,
    };

    if (cloudkTrx) return response;
    throw new BadRequestException('Something Went Wrong');
  }

  /**
   * Update or create a summary of withdrawSummary.
   * @param summaryData setDepositSummaryType
   * @returns boolean
   */
  async withdrawSummary(
    summaryData: WithdrawSummaryType,
    session?: ClientSession | null,
  ): Promise<boolean> {
    try {
      let filterQuery: Record<string, any> = {
        token: summaryData.token,
      };
      if (summaryData.withdrawType == 'external') {
        filterQuery = {
          token: summaryData.token,
          network: summaryData.networkId,
        };
      }

      const existsSummary =
        await this.withdrawSummaryModal.findOne(filterQuery);

      if (existsSummary) {
        existsSummary.amount = (existsSummary.amount || 0) + summaryData.amount;
        await existsSummary.save({ session });
      } else {
        await this.withdrawSummaryModal.create([summaryData], { session });
      }
      return true;
    } catch (error) {
      throw new Error(`Error updating deposit summary: ${error.message}`);
    }
  }
  // /**
  //  * A method to get the wallet by user id and token id.
  //  * @param userId user object id
  //  * @param tokenId token object id
  //  * @returns wallet object - a pure wallet object. return null if not found.
  //  */
  // async getWalletByTokenId(
  //   userId: Types.ObjectId,
  //   tokenId: Types.ObjectId,
  // ): Promise<
  //   Document<unknown, object, WalletI> &
  //     WalletI &
  //     Required<{ _id: Types.ObjectId }>
  // > {
  //   const wallet = await this.walletModel.findOne({
  //     user: userId,
  //     token: tokenId,
  //   });
  //   return wallet;
  // }

  async getWalletByTokenId(userId: Types.ObjectId, tokenId: Types.ObjectId) {
    const wallet = await this.walletModel.findOne({
      user: userId,
      token: tokenId,
    });
    return wallet;
  }

  async getAllOnChainWalletSettings(paginateDTO: OnChainWalletSettingsDTO) {
    const { page, limit, fromDate, toDate, status, query, token, network } =
      paginateDTO;

    const matchConditions: any[] = [{ deletedAt: { $eq: null } }];

    if (status) {
      matchConditions.push({
        status: status,
      });
    }

    if (fromDate) {
      const from = new Date(fromDate);
      const to = toDate ? new Date(toDate) : new Date();
      to.setUTCHours(23, 59, 59, 999);
      matchConditions.push({
        createdAt: {
          $gte: from,
          $lte: to,
        },
      });
    }

    if (token) {
      matchConditions.push({
        token: new Types.ObjectId(token),
      });
    }

    if (network) {
      matchConditions.push({
        network: new Types.ObjectId(network),
      });
    }

    const pipeline = [
      { $match: { $and: matchConditions } },
      { $sort: { createdAt: -1 } },
    ];

    const result = await aggregatePaginate(
      this.onChainWalletSettingModel,
      pipeline,
      page,
      limit,
    );

    return result;
  }

  async getOnChainWalletSettingById(id: Types.ObjectId) {
    return await this.onChainWalletSettingModel.findById(id).exec();
  }

  private buildWhereConfig(filterDTO: TokenFilterDTO) {
    const { fromDate, toDate } = filterDTO;
    const whereConfig: any = { deletedAt: null };

    if (fromDate) {
      const from = new Date(fromDate);
      const to = toDate ? new Date(toDate) : new Date();
      to.setUTCHours(23, 59, 59, 999);
      whereConfig.createdAt = { $gte: from, $lte: to };
    }

    return whereConfig;
  }

  async calculateDepositTokensSummary(filterDTO: TokenFilterDTO) {
    try {
      const whereConfig = this.buildWhereConfig(filterDTO);
      const tokenQuery = filterDTO.token ? { symbol: filterDTO.token } : {};
      const platformQuery = filterDTO.platform
        ? { platforms: filterDTO.platform }
        : {};

      const [totalAmount, tokens] = await Promise.all([
        (async () => {
          const filteredTokens = await this.tokenModel
            .find({
              deletedAt: null,
              ...tokenQuery,
              ...platformQuery,
            })
            .select('_id')
            .lean();

          const tokenIds = filteredTokens.map((t) => t._id);

          return this.depositTransactionModel.aggregate([
            {
              $match: {
                ...whereConfig,
                ...(tokenIds.length > 0 ? { token: { $in: tokenIds } } : {}),
              },
            },
            {
              $group: {
                _id: null,
                totalAmount: { $sum: '$amount' },
              },
            },
          ]);
        })(),

        (async () => {
          const allTokens = await this.tokenModel
            .find({
              deletedAt: null,
              ...tokenQuery,
              ...platformQuery,
            })
            .lean();

          const tokenDetailsPromises = allTokens.map(async (token) => {
            const wallets = await this.walletModel
              .find({
                token: token._id,
                deletedAt: null,
              })
              .lean();

            const walletIds = wallets.map((wallet) => wallet._id);

            const deposits = await this.depositTransactionModel.aggregate([
              {
                $match: {
                  ...whereConfig,
                  toWallet: { $in: walletIds },
                },
              },
              {
                $group: {
                  _id: '$token',
                  totalAmount: { $sum: '$amount' },
                  totalTransactions: { $sum: 1 },
                },
              },
            ]);

            return {
              token: {
                id: token._id,
                symbol: token.symbol,
                name: token.name,
                valueType: token.valueType,
              },
              totals: {
                amount: deposits[0]?.totalAmount || 0,
                transactions: deposits[0]?.totalTransactions || 0,
                walletCount: walletIds.length,
              },
            };
          });

          return Promise.all(tokenDetailsPromises);
        })(),
      ]);

      return {
        success: true,
        data: {
          totalDepositAmount: totalAmount[0]?.totalAmount || 0,
          tokenDetails: tokens.sort(
            (a, b) => b.totals.amount - a.totals.amount,
          ),
        },
      };
    } catch (error) {
      console.error('Error calculating totals:', error);
      throw error;
    }
  }

  async getDepositSummary(filterDTO: TokenFilterDTO) {
    const { network, status, fromDate, toDate, platform, query, token } =
      filterDTO;
    let matchCriteria: any = {
      deletedAt: null,
    };

    const matchCriteriaPipeline: any = {};
    if (status) {
      // check enum of status is TransactionStatus.SUCCESS
      matchCriteria['transactionStatus'] = status.toLowerCase();
    }
    if (token) {
      matchCriteriaPipeline['wallet.token.symbol'] = token.toLowerCase();
    }
    if (query) {
      const userSearchRegex = new RegExp(query, 'i');

      const users = await this.userModel
        .findOne({
          $or: [
            { email: userSearchRegex },
            { username: userSearchRegex },
            { blockchainId: userSearchRegex },
            { firstName: userSearchRegex },
          ],
          deletedAt: null,
        })
        .lean();
      if (users) {
        matchCriteria.user = users._id;
      }
    }

    if (network) {
      const networkData = await this.networkModel
        .findOne({
          deletedAt: { $eq: null },
          code: { $regex: new RegExp(`^${network}$`, 'i') },
        })
        .lean();

      if (networkData) {
        matchCriteria.network = networkData._id;
      }
    }
    if (fromDate) {
      const fromDate3 = new Date(fromDate);
      const toDate2 = toDate ? new Date(toDate) : new Date();
      toDate2.setUTCHours(23, 59, 59, 999);

      matchCriteria = {
        ...matchCriteria,
        createdAt: {
          $gte: fromDate3,
          $lte: toDate2,
        },
      };
    }

    // if (fromDate) {
    //   const from = new Date(fromDate);
    //   const to = toDate ? new Date(toDate) : new Date();
    //   to.setUTCHours(23, 59, 59, 999);
    //   matchCriteria.createdAt = { $gte: from, $lte: to };
    // }
    if (platform) {
      const platformData = await this.platformModel
        .findOne({
          status: 'active',
          symbol: platform,
          deletedAt: null,
        })
        .lean();
      if (platformData) {
        matchCriteria.platform = platformData._id;
      }
    }

    const pipeline: PipelineStage[] = [
      // Perform initial matching to reduce the dataset early
      { $match: matchCriteria },

      // Lookup and unwind only necessary fields
      {
        $lookup: {
          from: 'wallets',
          localField: 'toWallet',
          foreignField: '_id',
          as: 'wallet',
        },
      },
      { $unwind: { path: '$wallet', preserveNullAndEmptyArrays: true } },

      {
        $lookup: {
          from: 'tokens',
          localField: 'wallet.token',
          foreignField: '_id',
          as: 'wallet.token',
        },
      },
      { $unwind: { path: '$wallet.token', preserveNullAndEmptyArrays: true } },
      // Lookup only relevant transaction data
      { $match: matchCriteriaPipeline },
      {
        $lookup: {
          from: 'deposittransactions',
          localField: 'wallet._id',
          foreignField: 'toWallet',
          as: 'depositTransaction',
        },
      },
      {
        $unwind: {
          path: '$depositTransaction',
          preserveNullAndEmptyArrays: true,
        },
      },

      // Lookup and unwind for onChainWallet and network
      {
        $lookup: {
          from: 'onchainwallets',
          localField: 'depositTransaction.onChainWallet',
          foreignField: '_id',
          as: 'onChainWallet',
        },
      },
      {
        $unwind: { path: '$onChainWallet', preserveNullAndEmptyArrays: false },
      },

      {
        $lookup: {
          from: 'networks',
          localField: 'onChainWallet.network',
          foreignField: '_id',
          as: 'network',
        },
      },
      { $unwind: { path: '$network', preserveNullAndEmptyArrays: false } },

      // Reapply the match criteria after lookups

      // Group and summarize the data
      {
        $group: {
          _id: {
            tokenId: '$wallet.token._id',
            networkId: '$onChainWallet.network',
          },
          totalAmount: { $sum: '$amount' },
          tokenName: { $first: '$wallet.token.name' },
          tokenSymbol: { $first: '$wallet.token.symbol' },
          // depositAmount: { $sum: '$depositTransaction.amount' },
          networkName: { $first: '$network.name' },
          token: { $first: '$wallet.token._id' },
          network: { $first: '$network._id' },
        },
      },

      // Project the result in a more compact format
      {
        $project: {
          _id: 0,
          token: '$tokenName',
          symbol: '$tokenSymbol',
          network: '$networkName',
          tokenId: '$token',
          networkId: '$network',
          totalAmount: 1,
        },
      },

      // Sort the final results
      {
        $sort: { network: 1, symbol: 1 },
      },
    ];

    try {
      const results = await this.depositTransactionModel
        .aggregate(pipeline)
        .exec();

      const totalDepositAmount = results.reduce(
        (sum, item) => sum + (item.totalAmount || 0),
        0,
      );
      return {
        data: {
          list: results,
          summary: { title: 'Total Deposit Amount', totalDepositAmount },
        },
        status: true,
        message: 'Ok',
      };
    } catch (error) {
      throw new Error(`Error fetching deposit summary: ${error.message}`);
    }
  }

  private async buildFilters(filterDTO: WithdrawFilterDTO) {
    const { fromDate, toDate, token, platform, network } = filterDTO;
    const whereConfig: any = { deletedAt: null };

    if (fromDate) {
      const from = new Date(fromDate);
      const to = toDate ? new Date(toDate) : new Date();
      to.setUTCHours(23, 59, 59, 999);
      whereConfig.createdAt = { $gte: from, $lte: to };
    }

    let tokenIds = [];
    if (token || platform) {
      const tokens = await this.tokenModel
        .find({
          deletedAt: null,
          ...(token ? { symbol: token } : {}),
          ...(platform ? { platforms: platform } : {}),
        })
        .select('_id')
        .lean();
      tokenIds = tokens.map((t) => t._id);
      if (tokenIds.length > 0) {
        whereConfig.token = { $in: tokenIds };
      }
    }

    if (network) {
      const networkDoc = await this.networkModel
        .findOne({
          code: network,
          deletedAt: null,
        })
        .select('_id')
        .lean();

      if (networkDoc) {
        whereConfig.network = networkDoc._id;
      }
    }

    return whereConfig;
  }

  async getWithdrawTotals(filterDTO: WithdrawFilterDTO) {
    try {
      const whereConfig = await this.buildFilters(filterDTO);

      const networks = await this.networkModel
        .find({
          deletedAt: null,
        })
        .lean();

      const [totalAmounts, tokenDetails] = await Promise.all([
        (async () => {
          const [overallTotal, withdrawTypeTotal, networkTotals] =
            await Promise.all([
              this.withdrawTransactionModel.aggregate([
                {
                  $match: {
                    ...whereConfig,
                    requestStatus: 'approved',
                  },
                },
                {
                  $group: {
                    _id: null,
                    totalAmount: { $sum: '$amount' },
                  },
                },
              ]),

              this.withdrawTransactionModel.aggregate([
                {
                  $match: {
                    ...whereConfig,
                    requestStatus: 'approved',
                  },
                },
                {
                  $group: {
                    _id: '$withdrawType',
                    totalAmount: { $sum: '$amount' },
                    count: { $sum: 1 },
                  },
                },
              ]),

              this.withdrawTransactionModel.aggregate([
                {
                  $match: {
                    ...whereConfig,
                    withdrawType: 'external',
                    requestStatus: 'approved',
                    network: { $ne: null },
                  },
                },
                {
                  $lookup: {
                    from: 'networks',
                    localField: 'network',
                    foreignField: '_id',
                    as: 'networkInfo',
                  },
                },
                {
                  $unwind: '$networkInfo',
                },
                {
                  $group: {
                    _id: {
                      networkId: '$network',
                      code: '$networkInfo.code',
                      name: '$networkInfo.name',
                    },
                    totalAmount: { $sum: '$amount' },
                    count: { $sum: 1 },
                  },
                },
              ]),
            ]);

          const networkTotalsMap = new Map(
            networks.map((network) => [
              network._id.toString(),
              {
                network: {
                  id: network._id,
                  name: network.name,
                  code: network.code,
                },
                totalAmount: 0,
                count: 0,
              },
            ]),
          );

          networkTotals.forEach((total) => {
            if (
              total._id?.networkId &&
              networkTotalsMap.has(total._id.networkId.toString())
            ) {
              const networkData = networkTotalsMap.get(
                total._id.networkId.toString(),
              );
              networkData.totalAmount = total.totalAmount;
              networkData.count = total.count;
            }
          });

          const filteredNetworkTotals = Array.from(
            networkTotalsMap.values(),
          ).filter(
            (nt) => nt.totalAmount > 0 || nt.network.code === filterDTO.network,
          );

          return {
            overall: overallTotal[0]?.totalAmount || 0,
            byWithdrawType: {
              internal:
                withdrawTypeTotal.find((t) => t._id === 'internal')
                  ?.totalAmount || 0,
              external:
                withdrawTypeTotal.find((t) => t._id === 'external')
                  ?.totalAmount || 0,
            },
            byNetwork: filteredNetworkTotals,
          };
        })(),

        (async () => {
          const tokens = await this.tokenModel
            .find({
              deletedAt: null,
              ...(filterDTO.token ? { symbol: filterDTO.token } : {}),
              ...(filterDTO.platform ? { platforms: filterDTO.platform } : {}),
            })
            .lean();

          const tokenDetailsPromises = tokens.map(async (token) => {
            const [internalTotal, externalTotal] = await Promise.all([
              this.withdrawTransactionModel.aggregate([
                {
                  $match: {
                    ...whereConfig,
                    token: token._id,
                    withdrawType: 'internal',
                    requestStatus: 'approved',
                  },
                },
                {
                  $group: {
                    _id: null,
                    totalAmount: { $sum: '$amount' },
                    count: { $sum: 1 },
                  },
                },
              ]),

              this.withdrawTransactionModel.aggregate([
                {
                  $match: {
                    ...whereConfig,
                    token: token._id,
                    withdrawType: 'external',
                    requestStatus: 'approved',
                    network: { $ne: null },
                  },
                },
                {
                  $lookup: {
                    from: 'networks',
                    localField: 'network',
                    foreignField: '_id',
                    as: 'networkInfo',
                  },
                },
                {
                  $unwind: '$networkInfo',
                },
                {
                  $group: {
                    _id: {
                      networkId: '$network',
                      code: '$networkInfo.code',
                      name: '$networkInfo.name',
                    },
                    totalAmount: { $sum: '$amount' },
                    count: { $sum: 1 },
                  },
                },
              ]),
            ]);

            return {
              token: {
                id: token._id,
                symbol: token.symbol,
                name: token.name,
                valueType: token.valueType,
              },
              totals: {
                internal: {
                  amount: internalTotal[0]?.totalAmount || 0,
                  count: internalTotal[0]?.count || 0,
                },
                external: {
                  networkTotals: externalTotal.map((et) => ({
                    networkId: et._id.networkId,
                    code: et._id.code,
                    name: et._id.name,
                    amount: et.totalAmount,
                    count: et.count,
                  })),
                  totalAmount: externalTotal.reduce(
                    (sum, et) => sum + et.totalAmount,
                    0,
                  ),
                  totalCount: externalTotal.reduce(
                    (sum, et) => sum + et.count,
                    0,
                  ),
                },
              },
            };
          });

          return Promise.all(tokenDetailsPromises);
        })(),
      ]);

      return {
        success: true,
        data: {
          totals: totalAmounts,
          tokenDetails: tokenDetails.sort(
            (a, b) =>
              b.totals.internal.amount +
              b.totals.external.totalAmount -
              (a.totals.internal.amount + a.totals.external.totalAmount),
          ),
        },
      };
    } catch (error) {
      console.error('Error calculating withdraw totals:', error);
      throw error;
    }
  }

  async getWithdrawSummary(filterDTO: WithdrawFilterDTO) {
    const { token, network, type, status, query, fromDate, toDate } = filterDTO;

    let match: any = {
      deletedAt: null,
      ...(type ? { withdrawType: type } : {}),
      ...(status ? { requestStatus: status } : {}),
    };

    const matchCriteriaPipeline: any = {
      ...(token ? { 'token.symbol': token.toLowerCase() } : {}),
    };
    if (query) {
      const userSearchRegex = new RegExp(query, 'i');

      const users = await this.userModel
        .findOne({
          $or: [
            { email: userSearchRegex },
            { username: userSearchRegex },
            { blockchainId: userSearchRegex },
            { firstName: userSearchRegex },
          ],
          deletedAt: null,
        })
        .lean();
      if (users) {
        match.user = users._id;
      }
    }

    if (network) {
      const networkData = await this.networkModel
        .findOne({
          deletedAt: { $eq: null },
          code: { $regex: new RegExp(`^${network}$`, 'i') },
        })
        .lean();

      if (networkData) {
        match.network = networkData._id;
      }
    }

    if (fromDate) {
      const fromDate3 = new Date(fromDate);
      const toDate2 = toDate ? new Date(toDate) : new Date();
      toDate2.setUTCHours(23, 59, 59, 999);

      match = {
        ...match,
        createdAt: {
          $gte: fromDate3,
          $lte: toDate2,
        },
      };
    }
    // if (platform) {
    //   const platformData = await this.platformModel
    //     .findOne({
    //       status: 'active',
    //       symbol: { $regex: new RegExp(`^${platform}$`, 'i') },
    //     })
    //     .lean();
    //   if (platformData) {
    //     match.platform = platformData._id;
    //   }
    // }
    const pipeline = [
      {
        $match: match,
      },
      {
        $lookup: {
          from: 'wallets',
          localField: 'fromWallet',
          foreignField: '_id',
          as: 'wallet',
        },
      },
      { $unwind: '$wallet' },
      {
        $lookup: {
          from: 'tokens',
          localField: 'wallet.token',
          foreignField: '_id',
          as: 'token',
        },
      },
      { $unwind: '$token' },
      {
        $lookup: {
          from: 'networks',
          localField: 'network',
          foreignField: '_id',
          as: 'network',
        },
      },
      {
        $unwind: {
          path: '$network',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: matchCriteriaPipeline,
      },
      {
        $group: {
          _id: {
            token: '$token.name',
            symbol: '$token.symbol',
            network: '$network.name',
            withdrawType: '$withdrawType',
          },
          totalAmount: { $sum: '$amount' },
        },
      },
      {
        $project: {
          token: '$_id.token',
          symbol: '$_id.symbol',
          network: '$_id.network',
          withdrawType: '$_id.withdrawType',
          totalAmount: 1,
          _id: 0,
        },
      },
    ];

    const result = await this.withdrawTransactionModel
      // .find()
      // .populate('token', 'name');
      .aggregate(pipeline)
      .exec();

    // const results = result.map((d) => {
    //   return {
    //     token: d.token?.name,
    //     symbol: d.symbol,
    //     network: d.networkName,
    //     withdrawType: d.withdrawType,
    //     totalAmount: d.amount,
    //   };
    // });

    const totalWithdrawAmount = result.reduce(
      (sum, item) => sum + (item.totalAmount || 0),
      0,
    );
    return {
      data: {
        list: result,
        summary: { title: 'Total Withdraw Amount', totalWithdrawAmount },
      },

      status: true,
      message: 'Ok',
    };
  }

  async getSwapSummary(filterDTO: SwapFilterDTO) {
    const { fromToken, toToken, query, fromDate, toDate } = filterDTO;
    let match: any = {
      deletedAt: null,
    };

    if (fromDate) {
      const fromDate3 = new Date(fromDate);
      const toDate2 = toDate ? new Date(toDate) : new Date();
      toDate2.setUTCHours(23, 59, 59, 999);

      match = {
        ...match,
        createdAt: {
          $gte: fromDate3,
          $lte: toDate2,
        },
      };
    }

    const matchCriteria: any = {};

    if (fromToken) {
      matchCriteria['fromToken.symbol'] = fromToken.toLowerCase();
    }

    if (toToken) {
      matchCriteria['toToken.symbol'] = toToken.toLowerCase();
    }

    if (query) {
      const userSearchRegex = new RegExp(query, 'i');

      const users = await this.userModel
        .findOne({
          $or: [
            { email: userSearchRegex },
            { username: userSearchRegex },
            { blockchainId: userSearchRegex },
            { firstName: userSearchRegex },
          ],
          deletedAt: null,
        })
        .lean();
      if (users) {
        match.user = users._id;
      }
    }

    const pipeline: PipelineStage[] = [
      {
        $match: match,
      },
      {
        $lookup: {
          from: 'wallets',
          localField: 'fromWallet',
          foreignField: '_id',
          as: 'fromWallet',
        },
      },
      { $unwind: '$fromWallet' },
      {
        $lookup: {
          from: 'wallets',
          localField: 'toWallet',
          foreignField: '_id',
          as: 'toWallet',
        },
      },
      { $unwind: '$toWallet' },
      {
        $lookup: {
          from: 'tokens',
          localField: 'fromWallet.token',
          foreignField: '_id',
          as: 'fromToken',
        },
      },
      { $unwind: '$fromToken' },
      {
        $lookup: {
          from: 'tokens',
          localField: 'toWallet.token',
          foreignField: '_id',
          as: 'toToken',
        },
      },
      { $unwind: '$toToken' },

      {
        $match: matchCriteria,
      },

      {
        $group: {
          _id: {
            fromToken: '$fromToken.name',
            // fromTokenSymbol: '$fromToken.symbol',
            toToken: '$toToken.name',
            // toTokenSymbol: '$toToken.symbol',
          },
          totalAmount: { $sum: '$amount' },
        },
      },
      {
        $project: {
          // fromTokenId: '$_id.fromTokenId',
          fromTokenSymbol: '$_id.fromToken',
          // toTokenId: '$_id.toTokenId',
          toTokenSymbol: '$_id.toToken',
          totalAmount: 1,
          // totalFee: 1,
          // totalCommission: 1,
          _id: 0,
        },
      },
      {
        $sort: {
          fromTokenSymbol: 1,
          toTokenSymbol: 1,
        },
      },
    ];

    const results = await this.swapTransactionModel.aggregate(pipeline).exec();

    const totalSwapAmount = results.reduce(
      (sum, item) => sum + (item.totalAmount || 0),
      0,
    );
    return {
      data: {
        list: results,
        summary: { title: 'Total Swap Amount', totalSwapAmount },
      },

      status: true,
      message: 'Ok',
    };
  }

  async createWalletsIfNotExist(userId: Types.ObjectId) {
    const tokens = await this.tokenModel.find({
      showZeroBalance: true,
      deletedAt: { $eq: null },
    });
    const walletCreationPromises = tokens.map((token) => {
      return this.findUserWalletByTokenSymbol(token.symbol, userId);
    });
    await Promise.all(walletCreationPromises);
  }

  async getUserByWalletTrx(
    walletTrxId: Types.ObjectId,
  ): Promise<{ user: Types.ObjectId | null; wallet: any }> {
    const walletTrx = await this.walletTransactionModel.findOne({
      _id: walletTrxId,
    });
    const user = walletTrx?.user || null;
    const wallet = walletTrx?.wallet || null;

    return { user, wallet };
  }

  async processWalletsByUser(userId: Types.ObjectId, wallet: Types.ObjectId) {
    const balance = await this.getBalanceByWallet(userId, wallet);
    await this.walletModel.updateOne(
      { _id: new Types.ObjectId(wallet) },
      {
        $set: {
          totalBalanceinToken: balance.walletBalance,
        },
      },
    );
  }

  async getTBalanceSwapTotalService(
    userId: Types.ObjectId,
    fromToken: Types.ObjectId,
    toToken: Types.ObjectId,
  ) {
    // find the wallet
    const [fromWallets, toWallets] = await Promise.all([
      this.getWalletByTokenId(userId, fromToken),
      this.getWalletByTokenId(userId, toToken),
    ]);
    if (!fromWallets || !toWallets) {
      return null;
    }
    const swapBalances = await this.swapTransactionModel.aggregate([
      {
        $match: {
          user: new Types.ObjectId(userId),
          fromWallet: fromWallets._id,
          toWallet: toWallets._id,
          deletedAt: null,
        },
      },
      {
        $lookup: {
          from: 'wallets',
          localField: 'fromWallet',
          foreignField: '_id',
          as: 'fromWallet',
        },
      },
      { $unwind: '$fromWallet' },
      {
        $lookup: {
          from: 'wallets',
          localField: 'toWallet',
          foreignField: '_id',
          as: 'toWallet',
        },
      },
      { $unwind: '$toWallet' },
      {
        $lookup: {
          from: 'tokens',
          localField: 'fromWallet.token',
          foreignField: '_id',
          as: 'fromToken',
        },
      },
      { $unwind: '$fromToken' },
      {
        $lookup: {
          from: 'tokens',
          localField: 'toWallet.token',
          foreignField: '_id',
          as: 'toToken',
        },
      },
      { $unwind: '$toToken' },
      {
        $group: {
          _id: {
            fromToken: '$fromToken._id',
            fromTokenName: '$fromToken.name',
            fromTokenSymbol: '$fromToken.symbol',
            toToken: '$toToken._id',
            toTokenName: '$toToken.name',
            toTokenSymbol: '$toToken.symbol',
          },
          totalAmount: { $sum: '$amount' },
        },
      },
      {
        $project: {
          fromTokenId: '$_id.fromToken',
          fromTokenName: '$_id.fromTokenName',
          fromTokenSymbol: '$_id.fromTokenSymbol',
          toTokenId: '$_id.toToken',
          toTokenName: '$_id.toTokenName',
          toTokenSymbol: '$_id.toTokenSymbol',
          totalAmount: 1,
          _id: 0,
        },
      },
    ]);

    return swapBalances;
  }
}
