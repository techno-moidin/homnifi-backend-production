import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotAcceptableException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Token, ValueType } from './schemas/token.schema';
import {
  ClientSession,
  Connection,
  Model,
  PipelineStage,
  Types,
} from 'mongoose';
import { TokenI } from './interfaces/token.interface';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Network } from './schemas/network.schema';
import { NetworkI } from './interfaces/network.interface';
import { UpdateTokenDto } from './dto/update-token.dto';
import { UpdateTokenSettingsDto } from './dto/update-token-settings.dto';
import { TokenSetting } from './schemas/token.setting.schema';
import { TokenSettingI } from './interfaces/token.setting.interface';
import { TrxType } from '../global/enums/trx.type.enum';
import { SwapSetting } from './schemas/swap.settings.schema';
import { CreateSwapSettingDto } from './dto/create-swap-setting.dto';
import { TokenATHPrice } from './schemas/token-price.schema';
import { AxiosResponse } from 'axios';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { CreateDepositSettingDto } from './dto/create-deposit-setting.dto';
import { DepositSetting } from './schemas/deposit.settings.schema';
import { WithdrawSetting } from './schemas/withdraw.settings.schema';
import { CreateWithdrawSettingDto } from './dto/create-withdraw-setting.dto';
import { CreateNetworkDto } from './dto/create-network.dto'; // .aggregate(pipeline)
// .exec();
import { UpdateWithdrawSettingDto } from './dto/update-withdraw-setting.dto';
import { UpdateSwapSettingDto } from './dto/update-swap-setting.dto';
import { UpdateDepositSettingDto } from './dto/update-deposit-setting.dto';
import { CreateTokenDto } from './dto/create-token.dto';
import {
  DepositAndStakeSettingsFilterDTO,
  PaginateDTO,
  SpecialSwapSettingsDTO,
  WithdrawSettingsDTO,
} from '../admin/global/dto/paginate.dto';
import { TransactionFlow } from '../wallet/enums/transcation.flow.enum';
import { WalletTransactionI } from '../wallet/interfaces/wallet-transaction.interface';
import { WalletTransaction } from '../wallet/schemas/wallet.transaction.schema.';
import { DepositTransactionI } from '../wallet/interfaces/deposit-transaction.interface';
import { DepositTransaction } from '../wallet/schemas/deposit.transaction.schema';
import { TransactionStatus } from '../global/enums/transaction.status.enum';
import { WithdrawTransaction } from '../wallet/schemas/withdraw.transaction.schema';
import { RequestStatus } from '../wallet/enums/request.status.enum';
import { SwapTransactionI } from '../wallet/interfaces/swap-transaction.interface';
import { SwapTransaction } from '../wallet/schemas/swap.transaction.schema';
import { aggregatePaginate } from '../utils/pagination.service';
import { DepositAndStakeSettings } from './schemas/depositAndStackSettings.schema';
import { CreateDepositAndStakeSettingsDto } from './dto/create-deposit-and-stake-settings.dto';
import { Platform } from '../platform/schemas/platform.schema';
import { YesOrNo } from '../enums/common.enums';
import { UpdateDepositAndStakeSettingsDto } from './dto/update-deposit-and-stack-settings.dto';
import { CreateSpecialSwapSettingDto } from '@/src/token/dto/create-special-swap-setting.dto';
import { SpecialSwapSetting } from '@/src/token/schemas/special.swap.settings.schema';
import { GetDepositSettingsDto } from '../admin/dto/wallet.dto';
import {
  CONVERSION_TYPES,
  PLATFORMS,
  TOKEN_TYPES,
} from '../global/enums/wallet.enum';
import { catchException } from '../admin/global/helpers/handle.exceptionh.helper';
import { DepositTransactionSummary } from '../wallet/schemas/deposit.summary.schema';
import { WithdrawSummary } from '../wallet/schemas/withdraw.summary.schema';
import { pagination } from '../utils/helpers';
import { CACHE_TYPE } from '../cache/Enums/cache.enum';
import { CacheService } from '../cache/cache.service';
import { CreateOnChainWalletSettingsDto } from '../wallet/dto/create-on-chain-wallet-settings.dto';
import {
  OnChainWalletSetting,
  OnChainWalletSettingStatus,
} from './schemas/on.chain.wallet.setting.schema';
import { OnChainAttempt } from './schemas/on.chain.attempt.schema';
import { startOfDay, endOfDay } from 'date-fns';
import { User } from '../users/schemas/user.schema';

@Injectable()
export class TokenService {
  constructor(
    @InjectModel(Token.name)
    private readonly tokenModel: Model<TokenI>,
    @InjectModel(TokenSetting.name)
    private readonly tokenSettingModel: Model<TokenSettingI>,
    @InjectModel(Network.name)
    private readonly networkModel: Model<NetworkI>,
    @InjectModel(SwapSetting.name)
    private readonly swapSettingModel: Model<SwapSetting>,
    @InjectModel(SpecialSwapSetting.name)
    private readonly specialSwapSettingModel: Model<SpecialSwapSetting>,
    @InjectModel(DepositSetting.name)
    private readonly depositSettingModel: Model<DepositSetting>,
    @InjectModel(WithdrawSetting.name)
    private readonly withdrawSettingModel: Model<WithdrawSetting>,
    @InjectModel(TokenATHPrice.name)
    private readonly tokenATHPriceModel: Model<TokenATHPrice>,
    private readonly httpService: HttpService,
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(WalletTransaction.name)
    readonly walletTransactionModel: Model<WalletTransactionI>,
    @InjectModel(DepositTransaction.name)
    readonly depositTransactionModel: Model<DepositTransactionI>,
    @InjectModel(WithdrawTransaction.name)
    readonly withdrawTransactionModel: Model<WithdrawTransaction>,
    @InjectModel(SwapTransaction.name)
    private readonly swapTransactionModel: Model<SwapTransactionI>,
    @InjectModel(DepositAndStakeSettings.name)
    private readonly depositAndStakeSettingsModel: Model<DepositAndStakeSettings>,
    @InjectModel(Platform.name)
    private readonly platformModel: Model<Platform>,
    @InjectModel(OnChainWalletSetting.name)
    private readonly onChainWalletSettingModel: Model<OnChainWalletSetting>,
    @InjectModel(OnChainAttempt.name)
    private readonly onChainAttemptModel: Model<OnChainAttempt>,

    @InjectModel(DepositTransactionSummary.name)
    readonly depositTransactionSummaryModel: Model<DepositTransactionSummary>,

    @InjectModel(WithdrawSummary.name)
    readonly withdrawSummaryModel: Model<WithdrawSummary>,

    @InjectModel(User.name)
    readonly UserModel: Model<User>,

    private cacheService: CacheService,
  ) {}

  async createToken(adminId: Types.ObjectId, createTokenDto: CreateTokenDto) {
    const session = await this.connection.startSession();
    session.startTransaction();
    const existingToken = await this.tokenModel
      .findOne({
        $or: [{ symbol: createTokenDto.symbol }, { name: createTokenDto.name }],
      })
      .exec();

    if (existingToken) {
      throw new BadRequestException(
        `A token with symbol "${createTokenDto.symbol}" or name "${createTokenDto.name}" is already exists.`,
      );
    }
    try {
      const createdToken = new this.tokenModel({
        ...createTokenDto,
        createdBy: adminId,
      });
      await createdToken.save({ session });

      const createdSettings = new this.tokenSettingModel({
        token: createdToken,
      });
      await createdSettings.save({ session });

      await session.commitTransaction();
      return createdToken;
    } catch (e) {
      await session.abortTransaction();
      throw new Error(e);
    } finally {
      await session.endSession();
    }
  }

  async findAllTokens2(
    paginateDto?: PaginateDTO,
    symbol?: string,
    withdrawType?: string,
  ) {
    const { page, limit, query } = paginateDto;

    let whereConfig = {};

    if (query) {
      whereConfig = {
        ...whereConfig,
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { symbol: { $regex: query, $options: 'i' } },
        ],
      };
    }

    if (symbol) {
      whereConfig = {
        ...whereConfig,
        symbol: symbol.toLowerCase(),
      };
    }

    if (withdrawType) {
      whereConfig = {
        ...whereConfig,
        withdrawType: withdrawType,
      };
    }

    const paginate = await pagination({
      page,
      pageSize: limit,
      model: this.tokenModel,
      condition: whereConfig,
      pagingRange: 5,
    });

    // Fetch tokens with filtering (match) and pagination
    const tokens = await this.tokenModel
      .find(whereConfig, {
        name: 1,
        symbol: 1,
        type: 1,
        withdrawType: 1,
        color: 1,
        borderColor: 1,
        iconUrl: 1,
        valueType: 1,
        showZeroBalance: 1,
        isDebitEnable: 1,
        conversionType: 1,
        customRate: 1,
        pairValue: 1,
      })
      .skip(paginate.offset)
      .limit(paginate.limit);

    // Fetch related settings for each token
    const tokenIds = tokens.map((token) => token._id);
    const settings = await this.tokenSettingModel.find({
      token: { $in: tokenIds },
    });

    // Fetch networks for all tokens
    const networkIds = tokens.flatMap((token) => token.networks);
    const networks = await this.networkModel.find({ _id: { $in: networkIds } });

    // Merge the related data
    const enrichedTokens = tokens.map((token) => {
      const tokenSettings = settings.find(
        (setting) => String(setting.token) === String(token._id),
      );
      const tokenNetworks = networks.filter((network) =>
        token.networks.includes(network._id),
      );

      return {
        ...token.toObject(),
        settings: {
          withdrawEnabled: tokenSettings?.withdrawEnabled || false,
          depositEnabled: tokenSettings?.depositEnabled || false,
          swapEnabled: tokenSettings?.toSwapEnabled || false,
        },
        networks: tokenNetworks,
      };
    });

    return {
      tokens: enrichedTokens,
      totalCount: paginate.total,
      totalPages: paginate.metadata.page.totalPage,
      currentPage: paginate.metadata.page.currentPage,
    };
  }

  //deprecated
  async findAllTokens(
    paginateDto?: PaginateDTO,
    symbol?: string,
    withdrawType?: string,
    conversionType?: CONVERSION_TYPES,
  ) {
    const { page, limit, query } = paginateDto;

    const pageNumber = page ? parseInt(page as any, 10) : 1;
    const limitNumber = limit ? parseInt(limit as any, 10) : 10;

    const match: any = {};

    if (query) {
      match.$or = [
        { name: { $regex: query, $options: 'i' } },
        { symbol: { $regex: query, $options: 'i' } },
      ];
    }

    if (symbol) {
      match.symbol = symbol.toLowerCase();
    }

    if (withdrawType) {
      match.withdrawType = withdrawType;
    }

    if (conversionType) {
      match.conversionType = conversionType;
    }

    console.log(new Date());

    const tokens = await this.tokenModel.aggregate([
      {
        $match: match,
      },
      {
        $lookup: {
          from: 'tokensettings',
          localField: '_id',
          foreignField: 'token',
          as: 'settings',
        },
      },
      {
        $unwind: { path: '$settings', preserveNullAndEmptyArrays: true },
      },
      {
        $lookup: {
          from: 'networks',
          localField: 'networks',
          foreignField: '_id',
          as: 'networks',
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          symbol: 1,
          type: 1,
          withdrawType: 1,
          color: 1,
          borderColor: 1,
          iconUrl: 1,
          valueType: 1,
          isDebitEnable: 1,
          showZeroBalance: 1,
          conversionType: 1,
          customRate: 1,
          pairValue: 1,
          'settings.withdrawEnabled': 1,
          'settings.depositEnabled': 1,
          'settings.swapEnabled': 1,
        },
      },
      {
        $skip: (pageNumber - 1) * limitNumber,
      },
      {
        $limit: limitNumber,
      },
    ]);

    // console.log(new Date());
    //

    //
    console.log(new Date());

    const totalCount = await this.tokenModel.countDocuments(match);

    //

    // console.log(new Date());

    return {
      tokens,
      totalCount,
      currentPage: pageNumber,
      totalPages: Math.ceil(totalCount / limitNumber),
    };
  }

  async findOnChainAllTokens(paginateDto?: PaginateDTO, symbol?: string) {
    const { page, limit, query } = paginateDto;

    const pageNumber = page ? parseInt(page as any, 10) : 1;
    const limitNumber = limit ? parseInt(limit as any, 10) : 10;

    const match: any = {
      isOnChainDeposit: true,
      deletedAt: { $eq: null },
    };

    if (query) {
      match.$or = [
        { 'token.name': { $regex: query, $options: 'i' } },
        { 'token.symbol': { $regex: query, $options: 'i' } },
      ];
    }

    if (symbol) {
      match.symbol = symbol.toLowerCase();
    }

    const tokens = await this.depositSettingModel.aggregate([
      {
        $match: match,
      },
      {
        $lookup: {
          from: 'tokens',
          localField: 'fromToken',
          foreignField: '_id',
          as: 'token',
        },
      },
      {
        $addFields: {
          token: { $arrayElemAt: ['$token', 0] },
        },
      },
      {
        $replaceRoot: {
          newRoot: { $ifNull: ['$token', {}] },
        },
      },
      {
        $skip: (pageNumber - 1) * limitNumber,
      },
      {
        $limit: limitNumber,
      },
    ]);

    const totalCount = await this.tokenModel.countDocuments(match);

    return {
      tokens,
      totalCount,
      currentPage: pageNumber,
      totalPages: Math.ceil(totalCount / limitNumber),
    };
  }
  async getAllTokens() {
    const tokens = await this.tokenModel.find({ deletedAt: null });
    return tokens;
  }

  async findTokenBysymbol(symbol: string) {
    const data = await this.tokenModel.findOne({
      symbol,
    });
    return data;
  }

  async findTokenSettingsById(id: Types.ObjectId) {
    const data = await this.tokenSettingModel
      .findOne({
        token: id,
      })
      .sort({ createdAt: -1 })
      .populate('token');

    return {
      _id: data._id,
      name: data.token.name,
      symbol: data.token.symbol,
      settings: {
        withdrawEnabled: data.withdrawEnabled,
        depositEnabled: data.depositEnabled,
        fromSwapEnabled: data.fromSwapEnabled,
        toSwapEnabled: data.toSwapEnabled,
      },
    };
  }

  async createNetwork(createNetworkDto: CreateNetworkDto) {
    if (createNetworkDto.code.match(/\s/g))
      throw new HttpException('code will not allow space', 400);
    const network = await this.networkModel.create(createNetworkDto);
    return network;
  }

  async updateNetwork(
    networkId: Types.ObjectId,
    createNetworkDto: CreateNetworkDto,
  ) {
    if (createNetworkDto.code.match(/\s/g))
      throw new HttpException('code will not allow space', 400);
    try {
      const network = await this.networkModel.findByIdAndUpdate(
        networkId,
        createNetworkDto,
        { new: true, runValidators: true },
      );
      return network;
    } catch (e) {
      throw new Error(e);
    }
  }

  async findAllNetworks() {
    const networks = await this.networkModel.find({ deletedAt: null });
    return networks;
  }

  async findSupportedNetworkByTokenId(tokenId: Types.ObjectId) {
    return this.networkModel
      .findOne({ supportedTokens: { $in: [tokenId] } })
      .select('-supportedTokens');
  }

  async updateTokenById(
    userId: Types.ObjectId,
    tokenId: Types.ObjectId,
    updateTokenDto: UpdateTokenDto,
  ) {
    return await this.tokenModel.findOneAndUpdate(
      new Types.ObjectId(tokenId),
      { ...updateTokenDto, updatedBy: userId, updatedAt: new Date() },
      {
        new: true,
      },
    );
  }

  async updateTokenSettingsByTokenId(
    userId: Types.ObjectId,
    tokenId: Types.ObjectId,
    updateTokenSettingsDto: UpdateTokenSettingsDto,
  ) {
    return await this.tokenSettingModel.findOneAndUpdate(
      { token: tokenId, updatedBy: userId },
      updateTokenSettingsDto,
      { new: true, projection: { token: 0 } },
    );
  }

  async createSwapSetting(createSwapSettingDto: CreateSwapSettingDto) {
    const isSettingAvalible = await this.swapSettingModel.findOne({
      fromToken: createSwapSettingDto.fromToken,
      toToken: createSwapSettingDto.toToken,
      isEnable: true,
      platform: createSwapSettingDto.platform,
      deletedAt: null,
    });

    // const isSettingFromTokenAvalible =
    //   await this.specialSwapSettingModel.findOne({
    //     fromToken: createSwapSettingDto.fromToken,
    //     toToken: createSwapSettingDto.toToken,
    //     platform: createSwapSettingDto.platform,
    //     deletedAt: null,
    //   });
    // if (isSettingFromTokenAvalible)
    //   throw new HttpException(
    //     'Only one token combination is allowed per token, delete the existing one before creating a new one',
    //     400,
    //   );

    if (isSettingAvalible)
      throw new HttpException(
        'To create new swap setting, please disable the existing one first',
        400,
      );

    const swapSetting =
      await this.swapSettingModel.create(createSwapSettingDto);
    await this.tokenSettingModel.findByIdAndUpdate(swapSetting.fromToken, {
      swapEnabled: true,
    });

    await this.cacheService.deleteUserCache({
      type: CACHE_TYPE.WALLET_SWAP_SETTINGS,
      user:
        String(CACHE_TYPE.STATIC_CACHE_KEY_FOR_WALLET_SWAP_SETTING) +
        `${createSwapSettingDto.platform}`,
    });

    return swapSetting;
  }

  async createSpecialSwapSetting(
    createSpecialSwapSettingDto: CreateSpecialSwapSettingDto,
  ) {
    const isSettingFromTokenAvalible =
      await this.specialSwapSettingModel.findOne({
        fromToken: createSpecialSwapSettingDto.fromToken,
        toToken: createSpecialSwapSettingDto.toToken,

        deletedAt: null,
      });

    if (isSettingFromTokenAvalible)
      throw new HttpException(
        'Only one token combination is allowed per token, delete the existing one before creating a new one',
        400,
      );

    const swapSetting = await this.specialSwapSettingModel.create(
      createSpecialSwapSettingDto,
    );
    await this.tokenSettingModel.findByIdAndUpdate(swapSetting.fromToken, {
      specialSwapEnabled: true,
    });
    await this.cacheService.deleteUserCache({
      type: CACHE_TYPE.WALLET_SPECIAL_SWAP_SETTINGS,
      user: String(CACHE_TYPE.STATIC_CACHE_KEY_FOR_WALLET_SPECIAL_SWAP_SETTING),
    });
    return swapSetting;
  }

  async updateSwapSetting(
    id: Types.ObjectId,
    adminId: Types.ObjectId,
    updateSwapSettingDto: UpdateSwapSettingDto,
  ) {
    const currentSetting = await this.swapSettingModel.findById(id);
    if (!currentSetting) throw new HttpException('Swap setting not found', 404);

    currentSetting.isEnable = false;
    currentSetting.deletedAt = new Date();
    currentSetting.updatedBy = adminId;
    await currentSetting.save();

    const newSetting = new this.swapSettingModel({
      ...updateSwapSettingDto,
    });

    await newSetting.save();

    await this.cacheService.deleteUserCache({
      type: CACHE_TYPE.WALLET_SWAP_SETTINGS,
      user:
        String(CACHE_TYPE.STATIC_CACHE_KEY_FOR_WALLET_SWAP_SETTING) +
        `${currentSetting.platform}`,
    });
    return newSetting;
  }

  async updateSpecialSwapSetting(
    id: Types.ObjectId,
    adminId: Types.ObjectId,
    updateSwapSettingDto: UpdateSwapSettingDto,
  ) {
    const currentSetting = await this.specialSwapSettingModel.findByIdAndUpdate(
      id,
      {
        isEnable: false,
        deletedAt: new Date(),
        updatedBy: adminId,
      },
    );
    if (!currentSetting)
      throw new NotFoundException('Special swap setting not found');

    const createSwapSettingDto = Object.assign(
      {},
      currentSetting.toJSON(),
      { isEnable: true },
      updateSwapSettingDto,
    );
    delete createSwapSettingDto._id;

    const newSetting = new this.specialSwapSettingModel(createSwapSettingDto);

    await newSetting.save();
    await this.cacheService.deleteUserCache({
      type: CACHE_TYPE.WALLET_SPECIAL_SWAP_SETTINGS,
      user: String(CACHE_TYPE.STATIC_CACHE_KEY_FOR_WALLET_SPECIAL_SWAP_SETTING),
    });
    return newSetting;
  }

  async createDepositSetting(createDepositSettingDto: CreateDepositSettingDto) {
    const isSettingAvailable = await this.depositSettingModel.findOne({
      fromToken: createDepositSettingDto.fromToken,
      toToken: createDepositSettingDto.toToken,
      isEnable: true,
      platform: createDepositSettingDto.platform,
      deletedAt: null,
    });

    const isSettingWithTokenAvailable = await this.depositSettingModel.findOne({
      fromToken: createDepositSettingDto.fromToken,
      platform: createDepositSettingDto.platform,
      deletedAt: null,
    });
    if (isSettingWithTokenAvailable)
      throw new HttpException(
        'Deposit setting for this token is already created, please delete the existing one first',
        400,
      );

    if (isSettingAvailable)
      throw new HttpException(
        'To create new deposit setting, please disable the existing one first',
        400,
      );

    createDepositSettingDto.networks = createDepositSettingDto.networks.map(
      (n) => {
        n.networkId = new Types.ObjectId(n.networkId);
        return n;
      },
    );

    const deposit = await this.depositSettingModel.create(
      createDepositSettingDto,
    );

    if (createDepositSettingDto.isOnChainDeposit) {
      for (const network of createDepositSettingDto.networks) {
        const createOnChainWalletSettingsDto = {
          token: createDepositSettingDto.fromToken,
          network: network.networkId,
          maxAttempts: createDepositSettingDto.onChainAttemptCount,
          status: OnChainWalletSettingStatus.ACTIVE,
          depositSetting: deposit.id,
        };
        await this.createOnChainWalletSetting(createOnChainWalletSettingsDto);
      }
    } else {
      for (const network of createDepositSettingDto.networks) {
        const createOnChainWalletSettingsDto = {
          token: createDepositSettingDto.fromToken,
          network: network.networkId,
          maxAttempts: createDepositSettingDto.onChainAttemptCount,
          status: OnChainWalletSettingStatus.ACTIVE,
          depositSetting: deposit.id,
        };
        await this.disableOnChainWalletSetting(createOnChainWalletSettingsDto);
      }
    }
    // await this.cacheService.deleteUserCache({
    //   type: CACHE_TYPE.WALLET_DEPOSIT_SETTINGS,
    //   user:
    //     String(CACHE_TYPE.STATIC_CACHE_KEY_FOR_DEPOSIT_SETTING) +
    //     `${createDepositSettingDto.platform || ''}`,
    // });
    return deposit;
  }

  async toggleDepostSettingEnable(id: Types.ObjectId) {
    const currentSetting = await this.depositSettingModel.findById(id);
    if (!currentSetting)
      throw new HttpException('Deposit setting not found', 404);

    if (!currentSetting.isEnable) {
      await this.depositSettingModel.updateOne(
        {
          fromToken: currentSetting.fromToken,
          toToken: currentSetting.toToken,
          isEnable: true,
          _id: { $eq: id },
        },
        { isEnable: false },
      );
    }

    currentSetting.isEnable = !currentSetting.isEnable;
    // await this.cacheService.deleteUserCache({
    //   type: CACHE_TYPE.WALLET_DEPOSIT_SETTINGS,
    //   user:
    //     String(CACHE_TYPE.STATIC_CACHE_KEY_FOR_DEPOSIT_SETTING) +
    //     `${currentSetting.platform}`,
    // });
    return await currentSetting.save();
  }

  async toggleWithdrawSettingEnable(id: Types.ObjectId) {
    const currentSetting = await this.withdrawSettingModel.findOneAndUpdate(
      {
        _id: id,
      },
      [{ $set: { isEnable: { $eq: [false, '$isEnable'] } } }],
      { returnDocument: 'after' },
    );
    if (!currentSetting) {
      throw new HttpException('Current Setting not found', 404);
    }
    await this.cacheService.deleteUserCache({
      type: CACHE_TYPE.WALLET_WITHDRAW_SETTINGS,
      user:
        String(CACHE_TYPE.STATIC_CACHE_KEY_FOR_WITHDRAW_SETTING) +
        `${currentSetting.type}`,
    });

    return currentSetting;
  }

  async visibilityToggleWithdrawSettingEnable(id: Types.ObjectId) {
    const currentSetting = await this.withdrawSettingModel.findById(id);
    if (!currentSetting)
      throw new HttpException('Withdraw setting not found', 404);

    if (!currentSetting.isEnable) {
      throw new HttpException('Withdraw setting is not enabled', 404);
    }

    currentSetting.isVisible = !currentSetting.isVisible;
    await this.cacheService.deleteUserCache({
      type: CACHE_TYPE.WALLET_WITHDRAW_SETTINGS,
      user:
        String(CACHE_TYPE.STATIC_CACHE_KEY_FOR_WITHDRAW_SETTING) +
        `${currentSetting.type}`,
    });
    return await currentSetting.save();
  }

  async toggleSwapSettingEnable(id: Types.ObjectId) {
    const currentSetting = await this.swapSettingModel.findById(id);

    if (!currentSetting) throw new HttpException('Swap setting not found', 404);

    if (!currentSetting.isEnable) {
      await this.swapSettingModel.updateMany(
        {
          fromToken: currentSetting.fromToken,
          toToken: currentSetting.toToken,
          isEnable: true,
          _id: { $ne: id },
        },
        { isEnable: false },
      );
    }

    currentSetting.isEnable = !currentSetting.isEnable;
    const platform = currentSetting.platform;

    await this.cacheService.deleteUserCache({
      type: CACHE_TYPE.WALLET_SWAP_SETTINGS,
      user:
        String(CACHE_TYPE.STATIC_CACHE_KEY_FOR_WALLET_SWAP_SETTING) +
        `${currentSetting.platform}`,
    });

    return await currentSetting.save();
  }

  async toggleSpecialSwapSettingEnable(id: Types.ObjectId) {
    const currentSetting = await this.specialSwapSettingModel.findOneAndUpdate(
      {
        _id: id,
      },
      [{ $set: { isEnable: { $eq: [false, '$isEnable'] } } }],
      { returnDocument: 'after' },
    );
    if (!currentSetting) {
      throw new HttpException('Special swap setting not found', 404);
    }
    await this.cacheService.deleteUserCache({
      type: CACHE_TYPE.WALLET_SPECIAL_SWAP_SETTINGS,
      user: String(CACHE_TYPE.STATIC_CACHE_KEY_FOR_WALLET_SPECIAL_SWAP_SETTING),
    });

    return currentSetting;
  }

  async updateDepositSetting(
    id: Types.ObjectId,
    adminId: Types.ObjectId,
    updateDepositSettingDto: UpdateDepositSettingDto,
  ) {
    // If it's related to minAmount or minDisplayAmount
    const currentSetting = await this.depositSettingModel.findById(id);
    if (!currentSetting)
      throw new HttpException('Deposit setting not found', 404);

    currentSetting.isEnable = false;
    currentSetting.deletedAt = new Date();
    currentSetting.updatedBy = adminId;
    await currentSetting.save();

    if (updateDepositSettingDto.networks) {
      updateDepositSettingDto.networks = updateDepositSettingDto.networks.map(
        (n) => {
          n.networkId = new Types.ObjectId(n.networkId);
          return n;
        },
      );
    }

    const newSettingData: any = {
      ...currentSetting.toObject(),
      // What ever in payload it will overwrite with currentSetting
      ...updateDepositSettingDto,
    };
    delete newSettingData._id; // Delete the old ID in order to prevent conflicts ID exists.
    newSettingData.updatedAt = new Date();
    newSettingData.deletedAt = null;

    const newSetting = new this.depositSettingModel(newSettingData);
    await newSetting.save();

    if (updateDepositSettingDto.isOnChainDeposit) {
      for (const network of updateDepositSettingDto.networks) {
        const createOnChainWalletSettingsDto = {
          token: updateDepositSettingDto.fromToken,
          network: network.networkId,
          maxAttempts: updateDepositSettingDto.onChainAttemptCount,
          status: OnChainWalletSettingStatus.ACTIVE,
          depositSetting: newSetting.id,
        };
        await this.createOnChainWalletSetting(createOnChainWalletSettingsDto);
      }
    } else {
      for (const network of updateDepositSettingDto.networks) {
        const createOnChainWalletSettingsDto = {
          token: updateDepositSettingDto.fromToken,
          network: network.networkId,
          maxAttempts: updateDepositSettingDto.onChainAttemptCount,
          status: OnChainWalletSettingStatus.ACTIVE,
          depositSetting: newSetting.id,
        };
        await this.disableOnChainWalletSetting(createOnChainWalletSettingsDto);
      }
    }

    await this.cacheService.deleteUserCache({
      type: CACHE_TYPE.WALLET_DEPOSIT_SETTINGS,
      user:
        String(CACHE_TYPE.STATIC_CACHE_KEY_FOR_DEPOSIT_SETTING) +
        `${currentSetting.platform || ''}`,
    });

    return newSetting;
  }

  async createWithdrawSetting(
    createWithdrawSettingDto: CreateWithdrawSettingDto,
  ) {
    const isSettingFromTokenAvalible = await this.withdrawSettingModel.findOne({
      fromToken: createWithdrawSettingDto.fromToken,
      platform: createWithdrawSettingDto.platform,
      deletedAt: null,
    });

    if (isSettingFromTokenAvalible)
      throw new HttpException(
        'withdraw setting for this token is already create , please delete the existing one first',
        400,
      );

    const isSettingAvalible = await this.withdrawSettingModel.findOne({
      fromToken: createWithdrawSettingDto.fromToken,
      toToken: createWithdrawSettingDto.toToken,
      type: createWithdrawSettingDto.type,
      isEnable: true,
      platform: createWithdrawSettingDto.platform,
      deletedAt: null,
    });

    if (isSettingAvalible)
      throw new HttpException(
        'To create new withdraw setting, please disable the existing one first',
        400,
      );

    createWithdrawSettingDto.networks = createWithdrawSettingDto.networks.map(
      (n) => {
        n.networkId = new Types.ObjectId(n.networkId);
        return n;
      },
    );
    const withdrawSetting = await this.withdrawSettingModel.create(
      createWithdrawSettingDto,
    );

    // await this.tokenSettingModel.findByIdAndUpdate(withdrawSetting.fromToken, {
    //   withdrawEnabled: true,
    // });

    await this.cacheService.deleteUserCache({
      type: CACHE_TYPE.WALLET_WITHDRAW_SETTINGS,
      user:
        String(CACHE_TYPE.STATIC_CACHE_KEY_FOR_WITHDRAW_SETTING) +
        `${createWithdrawSettingDto.type}`,
    });
    return withdrawSetting;
  }

  async updateWithdrawSetting(
    id: Types.ObjectId,
    adminId: Types.ObjectId,
    updateWithdrawSettingDto: UpdateWithdrawSettingDto,
  ) {
    const currentSetting = await this.withdrawSettingModel.findById(id);

    if (!currentSetting)
      throw new HttpException('Withdraw setting not found', 404);

    await this.withdrawSettingModel.findByIdAndUpdate(id, {
      isEnable: false,
      deletedAt: new Date(),
      updatedBy: adminId,
    });

    if (updateWithdrawSettingDto.networks) {
      updateWithdrawSettingDto.networks = updateWithdrawSettingDto.networks.map(
        (n) => {
          n.networkId = new Types.ObjectId(n.networkId);
          return n;
        },
      );
    }

    const toSave = {
      ...currentSetting.toObject(),
      ...updateWithdrawSettingDto,
    };
    delete toSave._id;
    toSave.updatedAt = new Date();
    toSave.deletedAt = null;

    const newSetting = new this.withdrawSettingModel(toSave);

    await newSetting.save();
    await this.cacheService.deleteUserCache({
      type: CACHE_TYPE.WALLET_WITHDRAW_SETTINGS,
      user:
        String(CACHE_TYPE.STATIC_CACHE_KEY_FOR_WITHDRAW_SETTING) +
        `${currentSetting.type}`,
    });

    return newSetting;
  }

  async getSwapSettingsByFromToken(tokenId: Types.ObjectId) {
    const settings = await this.swapSettingModel
      .find({
        fromToken: tokenId,
        isEnable: true,
      })
      .sort({
        createdAt: -1,
      })
      .populate([{ path: 'toToken', select: 'name symbol iconUrl color' }])
      .exec();

    const data = settings
      .filter((setting) => !!setting.toToken)
      .map((setting) => ({
        ...setting.toToken.toJSON(),
        settingId: setting._id,
        minAmount: setting.minAmount,
        maxAmount: setting.maxAmount,
        commission: setting.commission,
        commissionType: setting.commissionType,
        rate: setting.rate,
        platform: setting.platform,
      }));

    return data;
  }

  async getSpecialSwapSettingsByFromToken(tokenId: Types.ObjectId) {
    const settings = await this.specialSwapSettingModel
      .find({
        fromToken: tokenId,
        isEnable: true,
      })
      .sort({
        createdAt: -1,
      })
      .populate([{ path: 'toToken', select: 'name symbol iconUrl color' }])
      .exec();

    const data = settings
      .filter((setting) => !!setting.toToken)
      .map((setting) => ({
        ...setting.toToken.toJSON(),
        settingId: setting._id,
        minAmount: setting.minAmount,
        maxAmount: setting.maxAmount,
        commission: setting.commission,
        commissionType: setting.commissionType,
        rate: setting.rate,
      }));

    return data;
  }

  async getAllSwapSettings(getDepositSettingsDto: GetDepositSettingsDto) {
    const { platform } = getDepositSettingsDto;
    const platformData = await this.platformModel.findOne({
      status: 'active',
      symbol: platform || PLATFORMS.HOMNIFI,
    });

    if (!platformData) {
      throw new Error('Platform configuration not found');
    }

    const alltokens = await this.tokenModel.find();
    const list = [];

    for (const token of alltokens) {
      const settings: any = await this.swapSettingModel
        .find({
          fromToken: token._id,
          isEnable: true,
          platform: platformData._id,
          deletedAt: null,
        })
        .sort({
          createdAt: -1,
        })
        .populate([{ path: 'toToken' }])
        .exec();

      if (settings.length > 0) {
        const toTokens: any = settings.map((setting) => {
          if (!setting.toToken) {
            return settings;
          }
          return {
            ...setting.toToken?.toObject(),
            minAmount: setting.minAmount,
            maxAmount: setting.maxAmount,
            commission: setting.commission,
            commissionType: setting.commissionType,
            rate: setting.rate,
          };
        });

        list.push({
          ...token.toObject(),
          toTokens,
        });
      }
    }
    await this.cacheService.setCacheUser(
      {
        type: CACHE_TYPE.WALLET_SWAP_SETTINGS,
        user:
          String(CACHE_TYPE.STATIC_CACHE_KEY_FOR_WALLET_SWAP_SETTING) +
          `${platformData._id}`,
        data: list,
      },
      86400,
    );
    return list;
  }

  async acceptTermAndCondition(userId) {
    const userData = await this.UserModel.findById(userId);

    if (!userData) throw new Error('Invalid user');

    if (!userData.isTomoConditionAccepted) {
      userData.isTomoConditionAccepted = !userData.isTomoConditionAccepted;
      await userData.save();
    }

    // only updated when the is Tomocat terms and condition not accepted other only send the messsage
    return 'Updated successfully.';
  }

  async getAllSpecialSwapSettings(countryCode?: string, platform?: string) {
    const getWalletSpecialSwapSettingCache =
      await this.cacheService.getCacheUser({
        type: CACHE_TYPE.WALLET_SPECIAL_SWAP_SETTINGS,
        user: String(
          CACHE_TYPE.STATIC_CACHE_KEY_FOR_WALLET_SPECIAL_SWAP_SETTING,
        ),
      });
    if (getWalletSpecialSwapSettingCache) {
      //
      return getWalletSpecialSwapSettingCache;
    } else {
      const platformData = await this.platformModel.findOne({
        status: 'active',
        symbol: platform || PLATFORMS.HOMNIFI,
      });

      if (!platformData) {
        throw new Error('Platform configuration not found');
      }
      const filter: any = {
        $expr: {
          $and: [
            {
              $in: ['$_id', '$$countries'],
            },
            // {
            //   $eq: ['$platform', platformData._id],
            // },
          ],
        },
      };
      if (typeof countryCode === 'string') {
        filter.$expr.$and.push({
          $or: [
            {
              $eq: ['$countryCode', countryCode],
            },
            {
              $eq: ['$countryCodeAlpha3', countryCode],
            },
          ],
        });
      }

      const specialSwapSettings = await this.specialSwapSettingModel.aggregate([
        {
          $match: {
            isEnable: true,
            platform: platformData._id,
            deletedAt: null,
          },
        },
        {
          $lookup: {
            from: 'countries',
            as: 'countries',
            let: { countries: '$countries' },
            pipeline: [
              {
                $match: filter,
              },
              {
                $project: {
                  _id: 1,
                  countryCode: 1,
                  countryCodeAlpha3: 1,
                  flag: 1,
                  name: 1,
                  region: 1,
                },
              },
            ],
          },
        },
        {
          $match: {
            countries: {
              $gt: [{ $size: '$countries' }, 0],
            },
          },
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
          $unwind: {
            path: '$fromToken',
            preserveNullAndEmptyArrays: false,
          },
        },
        {
          $lookup: {
            from: 'tokens',
            localField: 'toToken',
            foreignField: '_id',
            as: 'toTokens',
          },
        },
        {
          $addFields: {
            'fromToken.toToken': '$toToken',
            'fromToken.countries': '$countries',
            'fromToken.toTokens': {
              $map: {
                input: '$toTokens',
                as: 'item',
                in: {
                  $mergeObjects: [
                    '$$item',
                    {
                      minAmount: '$minAmount',
                      maxAmount: '$maxAmount',
                      commission: '$commission',
                      commissionType: '$commissionType',
                      rate: '$rate',
                    },
                  ],
                },
              },
            },
          },
        },
        {
          $replaceRoot: {
            newRoot: '$fromToken',
          },
        },
        {
          $project: {
            toToken: 0,
          },
        },
        {
          $sort: {
            createdAt: -1,
          },
        },
      ]);
      await this.cacheService.setCacheUser(
        {
          type: CACHE_TYPE.WALLET_SPECIAL_SWAP_SETTINGS,
          user: String(
            CACHE_TYPE.STATIC_CACHE_KEY_FOR_WALLET_SPECIAL_SWAP_SETTING,
          ),
          data: specialSwapSettings,
        },
        86400,
      );

      return specialSwapSettings;
    }
  }

  async getAllDepositSetting() {
    const alltokens = await this.tokenModel.find();

    const list = [];

    for (const token of alltokens) {
      const settings = await this.depositSettingModel
        .find({
          fromToken: token._id,
          deletedAt: null,
        })
        .sort({
          createdAt: -1,
        })
        .populate([{ path: 'toToken', select: 'name symbol iconUrl color' }])
        .exec();

      if (settings.length > 0) {
        const toTokens = settings.map((setting) => ({
          ...setting.toToken.toJSON(),
          minAmount: setting.minAmount,
          minDisplayAmount: setting.minDisplayAmount,
        }));

        list.push({
          ...token.toJSON(),
          toTokens,
        });
      }
    }

    return list;
  }

  async getAllWithdrawSetting() {
    const alltokens = await this.tokenModel.find();

    const list = [];

    for (const token of alltokens) {
      const settings = await this.withdrawSettingModel
        .find({
          fromToken: token._id,
        })
        .sort({
          createdAt: -1,
        })
        .populate([{ path: 'toToken', select: 'name symbol iconUrl color' }])
        .exec();

      if (settings.length > 0) {
        const toTokens = settings.map((setting) => ({
          ...setting.toToken.toJSON(),
          type: setting.type,
          minAmount: setting.minAmount,
          minDisplayAmount: setting.minDisplayAmount,
          fee: setting.fee,
          feeType: setting.feeType,
          commission: setting.commission,
          commissionType: setting.commissionType,
        }));

        list.push({
          ...token.toJSON(),
          toTokens,
        });
      }
    }

    return list;
  }

  async setTokenOnChainDayATHPrice() {
    const priceData = await this.getCurrentPrice();
    const token = await this.tokenModel.findOne({ symbol: ValueType.LYK });

    await this.tokenATHPriceModel.create({
      token: token._id,
      dayAth: priceData.high,
    });
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

  async getTokenOnChainDayATHPrice() {
    const token = await this.tokenModel.findOne({
      symbol: { $regex: '^LYK$', $options: 'i' },
    });
    const highPrice = await this.tokenATHPriceModel
      .findOne({ token: token._id })
      .sort({
        dayAth: -1,
      });

    return highPrice ? highPrice.dayAth : 0;
  }

  async getAdminSwapSettingsList(paginateDto: WithdrawSettingsDTO) {
    const { page, limit, fromToken, toToken, platforms, isEnable, query } =
      paginateDto;
    const matchAnd: any[] = [{ deletedAt: null }];
    if (fromToken) {
      matchAnd.push({ fromToken: new Types.ObjectId(fromToken) });
    }
    if (toToken) {
      matchAnd.push({ toToken: new Types.ObjectId(toToken) });
    }
    if (platforms) {
      matchAnd.push({ platform: new Types.ObjectId(platforms) });
    }
    if (isEnable) {
      matchAnd.push({ isEnable: isEnable === 'yes' });
    }

    const pipeline = [
      {
        $match: {
          $and: matchAnd,
        },
      },
      {
        $sort: {
          createdAt: -1,
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
          from: 'tokens',
          localField: 'fromToken',
          foreignField: '_id',
          as: 'fromToken',
        },
      },
      {
        $lookup: {
          from: 'platforms',
          localField: 'platform',
          foreignField: '_id',
          as: 'platform',
        },
      },
      {
        $unwind: {
          path: '$fromToken',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: '$platform',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: '$toToken',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: query
          ? {
              $or: [
                {
                  'fromToken.name': {
                    $regex: query,
                    $options: 'i',
                  },
                },
                {
                  'fromToken.symbol': {
                    $regex: query,
                    $options: 'i',
                  },
                },
                {
                  platforms: {
                    $regex: query,
                    $options: 'i',
                  },
                },
              ],
            }
          : {},
      },
    ];

    const result = await aggregatePaginate(
      this.swapSettingModel,
      pipeline,
      page,
      limit,
    );

    return result;
  }

  async getAdminSpecialSwapSettingsList(paginateDto: SpecialSwapSettingsDTO) {
    const {
      countries,
      page,
      limit,
      fromToken,
      toToken,
      platforms,
      isEnable,
      query,
    } = paginateDto;
    const matchAnd: any[] = [{ deletedAt: null }];
    if (countries) {
      matchAnd.push({
        countries: { $in: countries.map((id) => new Types.ObjectId(id)) },
      });
    }
    if (fromToken) {
      matchAnd.push({ fromToken: new Types.ObjectId(fromToken) });
    }
    if (toToken) {
      matchAnd.push({ toToken: new Types.ObjectId(toToken) });
    }
    if (platforms) {
      matchAnd.push({ platform: new Types.ObjectId(platforms) });
    }
    if (isEnable) {
      matchAnd.push({ isEnable: isEnable === 'yes' });
    }

    const pipeline = [
      {
        $match: {
          $and: matchAnd,
        },
      },
      {
        $sort: {
          createdAt: -1,
        },
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
        $unwind: {
          path: '$fromToken',
          preserveNullAndEmptyArrays: false,
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
        $unwind: {
          path: '$toToken',
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $lookup: {
          from: 'platforms',
          localField: 'platform',
          foreignField: '_id',
          as: 'platform',
        },
      },
      {
        $unwind: {
          path: '$platform',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'countries',
          as: 'countries',
          let: {
            countries: '$countries',
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: ['$_id', '$$countries'],
                },
              },
            },
            {
              $project: {
                _id: 1,
                countryCode: 1,
                flag: 1,
                name: 1,
                region: 1,
              },
            },
          ],
        },
      },
      {
        $match: query
          ? {
              $or: [
                {
                  'fromToken.name': {
                    $regex: query,
                    $options: 'i',
                  },
                },
                {
                  'fromToken.symbol': {
                    $regex: query,
                    $options: 'i',
                  },
                },
                {
                  platforms: {
                    $regex: query,
                    $options: 'i',
                  },
                },
              ],
            }
          : {},
      },
    ];

    return await aggregatePaginate(
      this.specialSwapSettingModel,
      pipeline,
      page,
      limit,
    );
  }

  async visibilityToggleDepositSettingEnable(id: Types.ObjectId) {
    const currentSetting = await this.depositSettingModel.findById(id);
    if (!currentSetting)
      throw new UnprocessableEntityException('Deposit setting not found');

    if (!currentSetting.isEnable) {
      throw new NotAcceptableException('Deposit setting is not enabled');
    }

    currentSetting.isVisible = !currentSetting.isVisible;

    await this.cacheService.deleteUserCache({
      type: CACHE_TYPE.WALLET_DEPOSIT_SETTINGS,
      user:
        String(CACHE_TYPE.STATIC_CACHE_KEY_FOR_DEPOSIT_SETTING) +
        `${currentSetting.platform}`,
    });

    return await currentSetting.save();
  }

  // async getAdminDepositSettingsList() {
  //   const settings = await this.depositSettingModel.aggregate([
  //     {
  //       $match: {
  //         deletedAt: null,
  //       },
  //     },
  //     {
  //       $lookup: {
  //         from: 'tokens',
  //         localField: 'toToken',
  //         foreignField: '_id',
  //         as: 'toToken',
  //       },
  //     },
  //     {
  //       $unwind: '$toToken',
  //     },
  //     {
  //       $lookup: {
  //         from: 'networks',
  //         pipeline: [
  //           {
  //             $project: {
  //               name: 1,
  //               _id: 1,
  //             },
  //           },
  //         ],
  //         as: 'allNetworks',
  //       },
  //     },
  //     {
  //       $addFields: {
  //         'toToken.networks': {
  //           $map: {
  //             input: '$allNetworks',
  //             as: 'network',
  //             in: {
  //               id: '$$network._id',
  //               name: '$$network.name',
  //               isActive: {
  //                 $in: ['$$network._id', { $ifNull: ['$network', []] }],
  //               },
  //             },
  //           },
  //         },
  //       },
  //     },
  //     {
  //       $lookup: {
  //         from: 'tokens',
  //         localField: 'fromToken',
  //         foreignField: '_id',
  //         as: 'fromToken',
  //       },
  //     },
  //     {
  //       $unwind: '$fromToken',
  //     },
  //     {
  //       $project: {
  //         _id: 1,
  //         deletedAt: 1,
  //         isEnable: 1,
  //         isVisible: 1,
  //         minAmount: 1,
  //         minDisplayAmount: 1,
  //         toToken: {
  //           _id: '$toToken._id',
  //           name: '$toToken.name',
  //           symbol: '$toToken.symbol',
  //           iconUrl: '$toToken.iconUrl',
  //           color: '$toToken.color',
  //           networks: '$toToken.networks',
  //         },
  //         fromToken: {
  //           _id: '$fromToken._id',
  //           name: '$fromToken.name',
  //           symbol: '$fromToken.symbol',
  //           iconUrl: '$fromToken.iconUrl',
  //           color: '$fromToken.color',
  //         },
  //       },
  //     },
  //     {
  //       $sort: { createdAt: -1 },
  //     },
  //   ]);

  //   return settings;
  // }
  async getAdminDepositSettingsList(paginateDto: WithdrawSettingsDTO) {
    const {
      page,
      limit,
      fromToken,
      toToken,
      platforms,
      isEnable,
      isVisible,
      query,
      isOnChainDeposit,
    } = paginateDto;
    const matchAnd: any[] = [{ deletedAt: null }];
    if (fromToken) {
      matchAnd.push({ fromToken: new Types.ObjectId(fromToken) });
    }
    if (toToken) {
      matchAnd.push({ toToken: new Types.ObjectId(toToken) });
    }
    if (platforms) {
      matchAnd.push({ platform: new Types.ObjectId(platforms) });
    }
    if (isEnable) {
      matchAnd.push({ isEnable: isEnable === 'yes' });
    }
    if (isVisible) {
      matchAnd.push({ isVisible: isVisible === 'yes' });
    }
    if (isOnChainDeposit) {
      if (isOnChainDeposit === 'yes') {
        matchAnd.push({ isOnChainDeposit: true });
      } else if (isOnChainDeposit === 'no') {
        matchAnd.push({
          $or: [
            { isOnChainDeposit: false },
            { isOnChainDeposit: { $exists: false } },
          ],
        });
      }
    }
    const pipeline = [
      {
        $match: {
          $and: matchAnd,
        },
      },
      {
        $sort: {
          createdAt: -1,
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
      {
        $lookup: {
          from: 'platforms',
          localField: 'platform',
          foreignField: '_id',
          as: 'platform',
        },
      },
      {
        $match: query
          ? {
              $or: [
                {
                  'fromToken.name': {
                    $regex: query,
                    $options: 'i',
                  },
                },
                {
                  'fromToken.symbol': {
                    $regex: query,
                    $options: 'i',
                  },
                },
                {
                  platforms: {
                    $regex: query,
                    $options: 'i',
                  },
                },
              ],
            }
          : {},
      },
      {
        $unwind: {
          path: '$fromToken',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: '$toToken',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: '$platform',
          preserveNullAndEmptyArrays: true,
        },
      },
    ];

    const result = await aggregatePaginate(
      this.depositSettingModel,
      pipeline,
      page,
      limit,
    );
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());
    result.list = result?.list?.map((res) => {
      if (res.isResetOnChainAttemps) {
        const resetDate = new Date(res.resetOnChainAt);
        // If the resetOnChainAt date is not today, set isResetOnChainAttemps to false
        if (resetDate < todayStart || resetDate > todayEnd) {
          res.isResetOnChainAttemps = false;
        }
      }
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
    return result;
  }

  async getDepositSettings(paginateDto: WithdrawSettingsDTO) {
    const {
      page,
      limit,
      fromToken,
      toToken,
      platforms,
      isEnable,
      isVisible,
      query,
    } = paginateDto;
    const matchAnd: any[] = [{ deletedAt: null }];
    if (fromToken) {
      matchAnd.push({ fromToken: new Types.ObjectId(fromToken) });
    }
    if (toToken) {
      matchAnd.push({ toToken: new Types.ObjectId(toToken) });
    }
    if (platforms) {
      matchAnd.push({ platform: new Types.ObjectId(platforms) });
    }
    if (isEnable) {
      matchAnd.push({ isEnable: isEnable === 'yes' });
    }
    if (isVisible) {
      matchAnd.push({ isVisible: isVisible === 'yes' });
    }

    const pipeline = [
      {
        $match: {
          $and: matchAnd,
        },
      },
      {
        $sort: {
          createdAt: -1,
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
      {
        $lookup: {
          from: 'platforms',
          localField: 'platform',
          foreignField: '_id',
          as: 'platform',
        },
      },
      {
        $match: query
          ? {
              $or: [
                {
                  'fromToken.name': {
                    $regex: query,
                    $options: 'i',
                  },
                },
                {
                  'fromToken.symbol': {
                    $regex: query,
                    $options: 'i',
                  },
                },
                {
                  platforms: {
                    $regex: query,
                    $options: 'i',
                  },
                },
              ],
            }
          : {},
      },
      {
        $unwind: {
          path: '$fromToken',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: '$toToken',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: '$platform',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          'fromToken._id': 1,
          'fromToken.name': 1,
          'fromToken.symbol': 1,
          'fromToken.createdAt': 1,
          'fromToken.updatedAt': 1,
          'toToken._id': 1,
          'toToken.name': 1,
          'toToken.symbol': 1,
          'toToken.createdAt': 1,
          'toToken.updatedAt': 1,
          minAmount: 1,
          maxAmount: 1,
          minDisplayAmount: 1,
          isEnable: 1,
          isVisible: 1,
          deletedAt: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      },
    ];

    const result = await aggregatePaginate(
      this.depositSettingModel,
      pipeline,
      page,
      limit,
    );

    result.list = result?.list?.map((res) => {
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
    return result;
  }

  async getAdminWithdrawSettingsList(paginationDto: WithdrawSettingsDTO) {
    const {
      page,
      limit,
      fromToken,
      toToken,
      type,
      platforms,
      query,
      isEnable,
      isVisible,
    } = paginationDto;
    const matchLevel1: Record<string, any> = {};
    const matchAnd: any[] = [{ deletedAt: null }];

    if (fromToken) {
      matchAnd.push({ fromToken: new Types.ObjectId(fromToken) });
    }
    if (toToken) {
      matchAnd.push({ toToken: new Types.ObjectId(toToken) });
    }
    if (type) {
      matchAnd.push({ type });
    }
    if (platforms) {
      matchAnd.push({ platform: new Types.ObjectId(platforms) });
    }
    if (isEnable) {
      matchAnd.push({ isEnable: isEnable == 'yes' });
    }
    if (isVisible) {
      matchAnd.push({ isVisible: isVisible == 'yes' });
    }
    matchLevel1.$and = matchAnd;

    const pipeline = [
      {
        $match: matchLevel1,
      },
      {
        $sort: {
          createdAt: -1,
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
          from: 'tokens',
          localField: 'fromToken',
          foreignField: '_id',
          as: 'fromToken',
        },
      },
      {
        $lookup: {
          from: 'platforms',
          localField: 'platform',
          foreignField: '_id',
          as: 'platform',
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
      {
        $unwind: {
          path: '$fromToken',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: '$toToken',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: '$platform',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: query
          ? {
              $or: [
                {
                  'fromToken.name': {
                    $regex: query,
                    $options: 'i',
                  },
                },
                {
                  'fromToken.symbol': {
                    $regex: query,
                    $options: 'i',
                  },
                },
                {
                  platforms: {
                    $regex: query,
                    $options: 'i',
                  },
                },
              ],
            }
          : {},
      },
    ];

    const result = await aggregatePaginate(
      this.withdrawSettingModel,
      pipeline,
      page,
      limit,
    );

    result.list = result?.list?.map((res) => {
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
    return result;
  }

  async getAvailableTransactionSettings(tokenId) {
    const swapAvailable = await this.swapSettingModel.countDocuments({
      fromToken: tokenId,
      isEnable: true,
    });
    const depositAvailable = await this.depositSettingModel.countDocuments({
      fromToken: tokenId,
      isEnable: true,
    });
    const withdrawAvailable = await this.withdrawSettingModel.countDocuments({
      fromToken: tokenId,
      isEnable: true,
    });

    return {
      swapEnabled: swapAvailable > 0,
      depositEnabled: depositAvailable > 0,
      withdrawEnabled: withdrawAvailable > 0,
    };
  }

  async findAllHorysmallTokens(platform: string) {
    const platformModel: any = await this.platformModel.findOne({
      symbol: platform,
    });

    if (!platformModel) {
      throw new NotFoundException('Platform not found');
    }

    const item = this.withdrawSettingModel.aggregate([
      {
        $match: {
          platform: platformModel._id,
          isEnable: true,
          deletedAt: null,
        },
      },
      {
        $lookup: {
          from: 'tokens',
          localField: 'fromToken',
          foreignField: '_id',
          as: 'token',
        },
      },
      {
        $unwind: {
          path: '$token',
        },
      },
      {
        $project: {
          _id: 0,
          'token.name': true,
          'token.symbol': true,
        },
      },
      {
        $addFields: {
          token: '$token.name',
          symbol: '$token.symbol',
        },
      },
    ]);

    return item;
  }
  // old api
  // async getDepositSummary(token?: string, network?: string) {
  //   const matchCriteria: any = {
  //     transactionStatus: TransactionStatus.SUCCESS,
  //     deletedAt: { $eq: null },
  //   };

  //   if (token) {
  //     matchCriteria['wallet.token.symbol'] = token.toLowerCase();
  //   }

  //   if (network) {
  //     matchCriteria['network.name'] = network;
  //   }

  //   const pipeline: PipelineStage[] = [
  //     {
  //       $lookup: {
  //         from: 'wallets',
  //         localField: 'toWallet',
  //         foreignField: '_id',
  //         as: 'wallet',
  //       },
  //     },
  //     {
  //       $unwind: { path: '$wallet', preserveNullAndEmptyArrays: true },
  //     },
  //     {
  //       $lookup: {
  //         from: 'tokens',
  //         localField: 'wallet.token',
  //         foreignField: '_id',
  //         as: 'wallet.token',
  //       },
  //     },
  //     {
  //       $unwind: { path: '$wallet.token', preserveNullAndEmptyArrays: true },
  //     },
  //     {
  //       $lookup: {
  //         from: 'deposittransactions',
  //         localField: 'wallet._id',
  //         foreignField: 'toWallet',
  //         as: 'depositTransaction',
  //       },
  //     },
  //     {
  //       $unwind: {
  //         path: '$depositTransaction',
  //         preserveNullAndEmptyArrays: true,
  //       },
  //     },
  //     {
  //       $lookup: {
  //         from: 'onchainwallets',
  //         localField: 'depositTransaction.onChainWallet',
  //         foreignField: '_id',
  //         as: 'onChainWallet',
  //       },
  //     },
  //     {
  //       $unwind: { path: '$onChainWallet', preserveNullAndEmptyArrays: false },
  //     },
  //     {
  //       $lookup: {
  //         from: 'networks',
  //         localField: 'onChainWallet.network',
  //         foreignField: '_id',
  //         as: 'network',
  //       },
  //     },
  //     {
  //       $unwind: { path: '$network', preserveNullAndEmptyArrays: false },
  //     },
  //     {
  //       $match: matchCriteria,
  //     },
  //     {
  //       $group: {
  //         _id: {
  //           tokenId: '$wallet.token._id',
  //           networkId: '$onChainWallet.network',
  //         },
  //         totalAmount: { $sum: '$amount' },
  //         tokenName: { $first: '$wallet.token.name' },
  //         tokenSymbol: { $first: '$wallet.token.symbol' },
  //         depositAmount: { $sum: '$depositTransaction.amount' },
  //         networkName: { $first: '$network.name' },
  //       },
  //     },
  //     {
  //       $project: {
  //         _id: 0,
  //         token: '$tokenName',
  //         symbol: '$tokenSymbol',
  //         network: '$networkName',
  //         totalAmount: 1,
  //       },
  //     },
  //     {
  //       $sort: {
  //         network: 1,
  //         symbol: 1,
  //       },
  //     },
  //   ];

  //   const results = await this.depositTransactionModel
  //     .aggregate(pipeline)
  //     .exec();

  //   return { data: results };
  // }

  // new api

  async getDepositSummaryScript(token?: string, network?: string) {
    const matchCriteria: any = {
      transactionStatus: TransactionStatus.SUCCESS,
      deletedAt: { $eq: null },
    };

    if (token) {
      matchCriteria['tokenSymbol'] = token.toLowerCase();
    }

    if (network) {
      matchCriteria['networkName'] = network;
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
      { $match: matchCriteria },

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

      // const result = await this.depositTransactionSummaryModel.find({
      //   deletedAt: { $ne: null },
      // });
      // const results = result.map((d) => {
      //   return {
      //     token: d.token,
      //     symbol: d.tokenSymbol,
      //     network: d.networkName,
      //     totalAmount: d.amount,
      //   };
      // });
      return { data: results };
    } catch (error) {
      throw new Error(`Error fetching deposit summary: ${error.message}`);
    }
  }

  async getDepositSummary(token?: string, network?: string) {
    const matchCriteria: any = {
      transactionStatus: TransactionStatus.SUCCESS,
      deletedAt: { $eq: null },
    };

    if (token) {
      matchCriteria['tokenSymbol'] = token.toLowerCase();
    }

    if (network) {
      matchCriteria['networkName'] = network;
    }

    // const pipeline: PipelineStage[] = [
    //   // Perform initial matching to reduce the dataset early
    //   { $match: matchCriteria },

    //   // Lookup and unwind only necessary fields
    //   {
    //     $lookup: {
    //       from: 'wallets',
    //       localField: 'toWallet',
    //       foreignField: '_id',
    //       as: 'wallet',
    //     },
    //   },
    //   { $unwind: { path: '$wallet', preserveNullAndEmptyArrays: true } },

    //   {
    //     $lookup: {
    //       from: 'tokens',
    //       localField: 'wallet.token',
    //       foreignField: '_id',
    //       as: 'wallet.token',
    //     },
    //   },
    //   { $unwind: { path: '$wallet.token', preserveNullAndEmptyArrays: true } },

    //   // Lookup only relevant transaction data
    //   {
    //     $lookup: {
    //       from: 'deposittransactions',
    //       localField: 'wallet._id',
    //       foreignField: 'toWallet',
    //       as: 'depositTransaction',
    //     },
    //   },
    //   {
    //     $unwind: {
    //       path: '$depositTransaction',
    //       preserveNullAndEmptyArrays: true,
    //     },
    //   },

    //   // Lookup and unwind for onChainWallet and network
    //   {
    //     $lookup: {
    //       from: 'onchainwallets',
    //       localField: 'depositTransaction.onChainWallet',
    //       foreignField: '_id',
    //       as: 'onChainWallet',
    //     },
    //   },
    //   {
    //     $unwind: { path: '$onChainWallet', preserveNullAndEmptyArrays: false },
    //   },

    //   {
    //     $lookup: {
    //       from: 'networks',
    //       localField: 'onChainWallet.network',
    //       foreignField: '_id',
    //       as: 'network',
    //     },
    //   },
    //   { $unwind: { path: '$network', preserveNullAndEmptyArrays: false } },

    //   // Reapply the match criteria after lookups
    //   { $match: matchCriteria },

    //   // Group and summarize the data
    //   {
    //     $group: {
    //       _id: {
    //         tokenId: '$wallet.token._id',
    //         networkId: '$onChainWallet.network',
    //       },
    //       totalAmount: { $sum: '$amount' },
    //       tokenName: { $first: '$wallet.token.name' },
    //       tokenSymbol: { $first: '$wallet.token.symbol' },
    //       // depositAmount: { $sum: '$depositTransaction.amount' },
    //       networkName: { $first: '$network.name' },
    //       token: { $first: '$wallet.token._id' },
    //       network: { $first: '$network._id' },
    //     },
    //   },

    //   // Project the result in a more compact format
    //   {
    //     $project: {
    //       _id: 0,
    //       token: '$tokenName',
    //       symbol: '$tokenSymbol',
    //       network: '$networkName',
    //       tokenId: '$token',
    //       networkId: '$network',
    //       totalAmount: 1,
    //     },
    //   },

    //   // Sort the final results
    //   {
    //     $sort: { network: 1, symbol: 1 },
    //   },
    // ];

    try {
      // const results = await this.depositTransactionModel
      //   .aggregate(pipeline)
      //   .exec();

      const result = await this.depositTransactionSummaryModel
        .find()
        .populate('token', 'name');

      const results = result.map((d) => {
        return {
          token: d.token?.name,
          symbol: d.tokenSymbol,
          network: d.networkName,
          totalAmount: d.amount,
        };
      });
      return { data: results };
    } catch (error) {
      throw new Error(`Error fetching deposit summary: ${error.message}`);
    }
  }

  async getSwapSummary(fromToken?: string, toToken?: string) {
    const matchCriteria: any = {
      deletedAt: { $eq: null },
    };

    if (fromToken) {
      matchCriteria['fromToken.symbol'] = fromToken.toLowerCase();
    }

    if (toToken) {
      matchCriteria['toToken.symbol'] = toToken.toLowerCase();
    }

    const pipeline: PipelineStage[] = [
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
            fromTokenSymbol: '$fromToken.symbol',
            toToken: '$toToken.name',
            toTokenSymbol: '$toToken.symbol',
          },
          totalAmount: { $sum: '$amount' },
        },
      },
      {
        $project: {
          fromTokenId: '$_id.fromTokenId',
          fromTokenSymbol: '$_id.fromTokenSymbol',
          toTokenId: '$_id.toTokenId',
          toTokenSymbol: '$_id.toTokenSymbol',
          totalAmount: 1,
          totalFee: 1,
          totalCommission: 1,
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
    return { data: results };
  }

  async getTokenStatusSummary(type: TrxType, token?: string) {
    const matchCriteria: any = {
      trxType: type,
      transactionFlow:
        type === TrxType.DEPOSIT ? TransactionFlow.IN : TransactionFlow.OUT,
      deletedAt: { $eq: null },
    };

    if (token) {
      matchCriteria['wallet.token.symbol'] = token.toLowerCase();
    }

    const pipeline = [
      {
        $lookup: {
          from: 'wallets',
          localField: 'wallet',
          foreignField: '_id',
          as: 'wallet',
        },
      },
      {
        $unwind: { path: '$wallet', preserveNullAndEmptyArrays: true },
      },
      {
        $lookup: {
          from: 'tokens',
          localField: 'wallet.token',
          foreignField: '_id',
          as: 'wallet.token',
        },
      },
      {
        $match: matchCriteria,
      },
      {
        $unwind: { path: '$wallet.token', preserveNullAndEmptyArrays: true },
      },
      {
        $group: {
          _id: '$wallet.token._id',
          totalAmount: { $sum: '$amount' },
          tokenName: { $first: '$wallet.token.name' },
          tokenSymbol: { $first: '$wallet.token.symbol' },
        },
      },
      {
        $project: {
          _id: 0,
          token: '$tokenName',
          symbol: '$tokenSymbol',
          totalAmount: 1,
        },
      },
    ];

    const results = await this.walletTransactionModel
      .aggregate(pipeline)
      .exec();

    return { data: results };
  }

  async getWithdrawSummaryScript(
    token?: string,
    network?: string,
    withdrawType?: string,
  ) {
    const matchCriteria: any = {
      deletedAt: { $eq: null },
      requestStatus: RequestStatus.COMPLETED,
      ...(token ? { 'token.symbol': token.toLowerCase() } : {}),
      ...(network
        ? { $or: [{ 'network.name': network }, { network: null }] }
        : {}),
      ...(withdrawType ? { withdrawType: withdrawType } : {}),
    };

    const pipeline = [
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
        $match: matchCriteria,
      },
      {
        $group: {
          _id: {
            token: '$token.name',
            symbol: '$token.symbol',
            network: '$network.name',
            withdrawType: '$withdrawType',
            tokenId: '$token._id',
            networkId: '$network._id',
          },
          totalAmount: { $sum: '$amount' },
        },
      },
      {
        $project: {
          token: '$_id.tokenId',
          tokenName: '$_id.tokenName',
          symbol: '$_id.symbol',
          network: '$_id.network',
          withdrawType: '$_id.withdrawType',
          tokenId: '$_id.tokenId',
          networkId: '$_id.networkId',
          totalAmount: 1,
          _id: 0,
        },
      },
    ];
    const results = await this.withdrawTransactionModel
      .aggregate(pipeline)
      .exec();
    return { data: results };
  }

  async getWithdrawSummary(
    token?: string,
    network?: string,
    withdrawType?: string,
  ) {
    // const matchCriteria: any = {
    //   deletedAt: { $eq: null },
    //   requestStatus: RequestStatus.COMPLETED,
    //   ...(token ? { 'token.symbol': token.toLowerCase() } : {}),
    //   ...(network
    //     ? { $or: [{ 'network.name': network }, { network: null }] }
    //     : {}),
    //   ...(withdrawType ? { withdrawType: withdrawType } : {}),
    // };

    // const pipeline = [
    //   {
    //     $lookup: {
    //       from: 'wallets',
    //       localField: 'fromWallet',
    //       foreignField: '_id',
    //       as: 'wallet',
    //     },
    //   },
    //   { $unwind: '$wallet' },
    //   {
    //     $lookup: {
    //       from: 'tokens',
    //       localField: 'wallet.token',
    //       foreignField: '_id',
    //       as: 'token',
    //     },
    //   },
    //   { $unwind: '$token' },
    //   {
    //     $lookup: {
    //       from: 'networks',
    //       localField: 'network',
    //       foreignField: '_id',
    //       as: 'network',
    //     },
    //   },
    //   {
    //     $unwind: {
    //       path: '$network',
    //       preserveNullAndEmptyArrays: true,
    //     },
    //   },
    //   {
    //     $match: matchCriteria,
    //   },
    //   {
    //     $group: {
    //       _id: {
    //         token: '$token.name',
    //         symbol: '$token.symbol',
    //         network: '$network.name',
    //         withdrawType: '$withdrawType',
    //       },
    //       totalAmount: { $sum: '$amount' },
    //     },
    //   },
    //   {
    //     $project: {
    //       token: '$_id.token',
    //       symbol: '$_id.symbol',
    //       network: '$_id.network',
    //       withdrawType: '$_id.withdrawType',
    //       totalAmount: 1,
    //       _id: 0,
    //     },
    //   },
    // ];

    const result = await this.withdrawSummaryModel
      .find()
      .populate('token', 'name');
    // .aggregate(pipeline)
    // .exec();

    const results = result.map((d) => {
      return {
        token: d.token?.name,
        symbol: d.symbol,
        network: d.networkName,
        withdrawType: d.withdrawType,
        totalAmount: d.amount,
      };
    });
    return { data: results };
  }

  async getDetailedWithdrawSummary(token?: string, network?: string) {
    const [withdrawalAmount, networkWithdrawalSummary] = await Promise.all([
      this.getWithdrawalAmountByToken(token, network),
      this.getNetworkWithdrawalSummary(token, network),
    ]);
    const withdrawAmountByStatus = await this.getTotalWithdrawAmountByStatus(
      token,
      network,
    );
    const withdrawCountsByStatus = await this.getWithdrawCountsByStatus(token);

    return {
      detailedWithdrawSummary: {
        withdrawalSummaryByToken: withdrawalAmount.data,
        withdrawalSummaryByNetwork: networkWithdrawalSummary.data,
      },
      withdrawSummaryByStatus: withdrawAmountByStatus,
      withdrawCountsByStatus: withdrawCountsByStatus,
    };
  }

  async getWithdrawalAmountByToken(token?: string, network?: string) {
    const matchCriteria: any = {
      deletedAt: { $eq: null },
      network: { $ne: null },
      requestStatus: RequestStatus.COMPLETED,
      ...(network ? { 'network.name': network } : {}),
    };

    const pipeline: PipelineStage[] = [
      {
        $lookup: {
          from: 'wallets',
          localField: 'fromWallet',
          foreignField: '_id',
          as: 'wallet',
        },
      },
      {
        $unwind: '$wallet',
      },
      {
        $lookup: {
          from: 'tokens',
          localField: 'wallet.token',
          foreignField: '_id',
          as: 'token',
        },
      },
      {
        $unwind: '$token',
      },
      ...(token
        ? [
            {
              $match: { 'token.symbol': token.toLowerCase() },
            },
          ]
        : []),
      {
        $lookup: {
          from: 'networks',
          localField: 'network',
          foreignField: '_id',
          as: 'network',
        },
      },
      {
        $unwind: '$network',
      },
      {
        $match: matchCriteria,
      },
      {
        $group: {
          _id: {
            tokenName: '$token.name',
            tokenSymbol: '$token.symbol',
            networkName: '$network.name',
            networkCode: '$network.code',
          },
          totalAmount: { $sum: '$amount' },
        },
      },
      {
        $project: {
          tokenName: '$_id.tokenName',
          tokenSymbol: '$_id.tokenSymbol',
          networkName: '$_id.networkName',
          networkCode: '$_id.networkCode',
          totalAmount: 1,
          _id: 0,
        },
      },
    ];

    const results = await this.withdrawTransactionModel
      .aggregate(pipeline)
      .exec();

    if (token && results.length === 0) {
      const tokenData = await this.tokenModel
        .findOne({ symbol: token.toLowerCase() })
        .exec();
      return {
        data: [
          {
            totalAmount: 0,
            tokenName: tokenData?.name,
            tokenSymbol: tokenData?.symbol,
          },
        ],
      };
    }
    return { data: results };
  }

  async getNetworkWithdrawalSummary(token?: string, network?: string) {
    const matchCriteria: any = {
      deletedAt: { $eq: null },
      network: { $ne: null },
      requestStatus: RequestStatus.COMPLETED,
      ...(network ? { 'network.name': network } : {}),
    };

    const pipeline: PipelineStage[] = [
      {
        $lookup: {
          from: 'wallets',
          localField: 'fromWallet',
          foreignField: '_id',
          as: 'wallet',
        },
      },
      {
        $unwind: '$wallet',
      },
      {
        $lookup: {
          from: 'tokens',
          localField: 'wallet.token',
          foreignField: '_id',
          as: 'token',
        },
      },
      {
        $unwind: '$token',
      },
      ...(token
        ? [
            {
              $match: { 'token.symbol': token },
            },
          ]
        : []),
      {
        $lookup: {
          from: 'networks',
          localField: 'network',
          foreignField: '_id',
          as: 'network',
        },
      },
      {
        $unwind: '$network',
      },
      {
        $match: matchCriteria,
      },
      {
        $group: {
          _id: {
            networkName: '$network.name',
            networkCode: '$network.code',
          },
          totalAmount: { $sum: '$amount' },
        },
      },
      {
        $project: {
          token: '$_id.token',
          symbol: '$_id.symbol',
          networkName: '$_id.networkName',
          networkCode: '$_id.networkCode',
          totalAmount: 1,
          _id: 0,
        },
      },
    ];

    const results = await this.withdrawTransactionModel
      .aggregate(pipeline)
      .exec();
    return { data: results };
  }

  async getTotalWithdrawAmountByStatus(token?: string, network?: string) {
    const matchCriteria: any = {
      deletedAt: { $eq: null },
      network: { $ne: null },
      ...(token ? { 'token.symbol': token } : {}),
      ...(network ? { 'network.name': network } : {}),
    };

    const pipeline = [
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
      { $unwind: '$network' },
      {
        $match: matchCriteria,
      },
      {
        $group: {
          _id: {
            tokenName: '$token.name',
            tokenSymbol: '$token.symbol',
            networkName: '$network.name',
            networkCode: '$network.code',
          },
          approved: {
            $sum: {
              $cond: [
                { $eq: ['$requestStatus', RequestStatus.APPROVED] },
                '$amount',
                0,
              ],
            },
          },
          pending: {
            $sum: {
              $cond: [
                { $eq: ['$requestStatus', RequestStatus.PENDING_FOR_ADMIN] },
                '$amount',
                0,
              ],
            },
          },
          completed: {
            $sum: {
              $cond: [
                { $eq: ['$requestStatus', RequestStatus.COMPLETED] },
                '$amount',
                0,
              ],
            },
          },
        },
      },
      {
        $project: {
          tokenName: '$_id.tokenName',
          tokenSymbol: '$_id.tokenSymbol',
          networkName: '$_id.networkName',
          networkCode: '$_id.networkCode',
          totalAmountByStatus: {
            approved: '$approved',
            pending: '$pending',
            completed: '$completed',
          },
          _id: 0,
        },
      },
    ];

    const result = await this.withdrawTransactionModel
      .aggregate(pipeline)
      .exec();

    if (token && result.length === 0) {
      const tokenData = await this.tokenModel.findOne({ symbol: token }).exec();
      return {
        tokenName: tokenData?.name,
        tokenSymbol: tokenData?.symbol,
        totalAmountByStatus: {
          approved: 0,
          pending: 0,
          completed: 0,
        },
      };
    }
    return result;
  }

  async getWithdrawCountsByStatus(token?: string) {
    const matchCriteria: any = {
      deletedAt: { $eq: null },
      network: { $ne: null },
      ...(token ? { 'token.symbol': token } : {}),
    };

    const pipeline: PipelineStage[] = [
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
      { $unwind: '$network' },
      {
        $match: matchCriteria,
      },
      {
        $group: {
          _id: null,
          approved: {
            $sum: {
              $cond: [
                { $eq: ['$requestStatus', RequestStatus.APPROVED] },
                1,
                0,
              ],
            },
          },
          pending: {
            $sum: {
              $cond: [
                { $eq: ['$requestStatus', RequestStatus.PENDING_FOR_ADMIN] },
                1,
                0,
              ],
            },
          },
          completed: {
            $sum: {
              $cond: [
                { $eq: ['$requestStatus', RequestStatus.COMPLETED] },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          approved: 1,
          pending: 1,
          completed: 1,
        },
      },
    ];

    const result = await this.withdrawTransactionModel
      .aggregate(pipeline)
      .exec();

    return result.length
      ? result[0]
      : { approved: 0, pending: 0, completed: 0 };
  }

  async createDepositAndStackSetting(
    createDepositAndStakeSettingDto: CreateDepositAndStakeSettingsDto,
    adminId: string,
  ) {
    // Checking the duplicate settings
    const existingSetting = await this.hasDuplicateDepositAndStackSettings(
      new Types.ObjectId(createDepositAndStakeSettingDto.platform),
      new Types.ObjectId(createDepositAndStakeSettingDto.fromToken),
      new Types.ObjectId(createDepositAndStakeSettingDto.toToken),
    );
    if (existingSetting) {
      throw new UnprocessableEntityException(
        'Deposit and stake setting already exists',
      );
    }

    createDepositAndStakeSettingDto.networks =
      createDepositAndStakeSettingDto.networks.map((n) => {
        n.networkId = new Types.ObjectId(n.networkId);
        return n;
      });

    await this.validateNetworkAndPlatform(createDepositAndStakeSettingDto);
    return await this.depositAndStakeSettingsModel.create({
      ...createDepositAndStakeSettingDto,
      adminId,
    });
  }

  /**
   * Checks whether the deposit and stack settings are already exist.
   * @param platformId  Platform Object ID to
   * @param fromToken From Token Object ID
   * @param toToken To Token Object ID
   * @param id Optional. The ID of the settings entry to exclude from the check.
   * Pass this ID when updating settings to ensure no duplicates exist, except for the current one being updated.
   * @returns Promise boolean
   */
  async hasDuplicateDepositAndStackSettings(
    platformId: Types.ObjectId,
    fromToken: Types.ObjectId,
    toToken: Types.ObjectId,
    id?: Types.ObjectId,
  ): Promise<boolean> {
    const filter: any = {
      platform: platformId,
      fromToken,
      toToken,
    };
    if (id) {
      filter._id = { $ne: id };
    }
    const res = await this.depositAndStakeSettingsModel.find(filter);
    return !!res.length;
  }

  private async validateNetworkAndPlatform(
    createDepositAndStackSettingsDto:
      | CreateDepositAndStakeSettingsDto
      | UpdateDepositAndStakeSettingsDto,
  ) {
    const { fromToken, toToken, networks, platform } =
      createDepositAndStackSettingsDto;

    for (const network of networks) {
      const networkExists = await this.networkModel.findById(network.networkId);
      if (!networkExists) {
        throw new NotFoundException(
          `Network with ID ${network.networkId} does not exist`,
        );
      }
    }

    const platformExists = await this.platformModel.findById(platform);
    if (!platformExists) {
      throw new NotFoundException(
        `Platform with ID ${platform} does not exist`,
      );
    }

    const fromTokenExists = await this.tokenModel.findById(fromToken);
    if (!fromTokenExists) {
      throw new NotFoundException(`Token with ID ${fromToken} does not exist`);
    }

    const toTokenExists = await this.tokenModel.findById(toToken);
    if (!toTokenExists) {
      throw new NotFoundException(`Token with ID ${toToken} does not exist`);
    }
  }

  async getDepositAndStackSettingsList(
    filterDto: DepositAndStakeSettingsFilterDTO,
  ) {
    const {
      page = 1,
      limit = 10,
      fromToken,
      toToken,
      platforms,
      isEnable,
      isVisible,
      query,
    } = filterDto;

    const matchAnd: any[] = [{ deletedAt: null }];

    if (fromToken && Types.ObjectId.isValid(fromToken)) {
      matchAnd.push({ fromToken: new Types.ObjectId(fromToken) });
    } else if (fromToken) {
      throw new BadRequestException('Invalid fromToken ID');
    }

    if (toToken && Types.ObjectId.isValid(toToken)) {
      matchAnd.push({ toToken: new Types.ObjectId(toToken) });
    } else if (toToken) {
      throw new BadRequestException('Invalid toToken ID');
    }

    if (platforms && Types.ObjectId.isValid(platforms)) {
      matchAnd.push({ platform: new Types.ObjectId(platforms) });
    } else if (platforms) {
      throw new BadRequestException('Invalid platforms ID');
    }

    if (isEnable) {
      matchAnd.push({ isEnable: isEnable === YesOrNo.YES });
    }

    if (isVisible) {
      matchAnd.push({ isVisible: isVisible === YesOrNo.YES });
    }
    const pipeline = [
      {
        $match: {
          $and: matchAnd,
        },
      },
      {
        $sort: {
          createdAt: -1,
        },
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
          as: 'platform',
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
      {
        $match: query
          ? {
              $or: [
                {
                  'fromToken.name': {
                    $regex: query,
                    $options: 'i',
                  },
                },
                {
                  'toToken.name': {
                    $regex: query,
                    $options: 'i',
                  },
                },
                {
                  'platformData.name': {
                    $regex: query,
                    $options: 'i',
                  },
                },
              ],
            }
          : {},
      },
      {
        $unwind: {
          path: '$fromToken',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: '$toToken',
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $unwind: {
          path: '$platform',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: query
          ? {
              $or: [
                { 'fromToken.name': { $regex: query, $options: 'i' } },
                { 'toToken.name': { $regex: query, $options: 'i' } },
                { 'platform.name': { $regex: query, $options: 'i' } },
                { 'networksData.name': { $regex: query, $options: 'i' } },
              ],
            }
          : {},
      },
    ];

    const result = await aggregatePaginate(
      this.depositAndStakeSettingsModel,
      pipeline,
      page,
      limit,
    );

    result.list = result?.list?.map((res) => {
      res.networks = res?.networks?.map((network: any) => {
        if (typeof network === 'string') {
          return null;
        }
        network.networksData = res.networksData?.find(
          (p) => p._id.toString() === network.networkId.toString(),
        );
        return network;
      });
      delete res.networksData;
      return res;
    });

    return result;
  }

  async depositAndStackToggleEnable(id: Types.ObjectId) {
    const currentSetting = await this.depositAndStakeSettingsModel.findById(id);
    if (!currentSetting) throw new HttpException('Setting not found', 404);

    if (!currentSetting.isEnable) {
      await this.depositAndStakeSettingsModel.updateMany(
        {
          fromToken: currentSetting.fromToken,
          toToken: currentSetting.toToken,
          isEnable: true,
          _id: { $ne: id },
        },
        { isEnable: false },
      );
    }

    currentSetting.isEnable = !currentSetting.isEnable;
    return await currentSetting.save();
  }

  async depositAndStackToggleVisible(id: Types.ObjectId) {
    const currentSetting = await this.depositAndStakeSettingsModel.findById(id);
    if (!currentSetting)
      throw new UnprocessableEntityException('Setting not found');

    if (!currentSetting.isEnable) {
      throw new NotAcceptableException('Setting is not enabled');
    }

    currentSetting.isVisible = !currentSetting.isVisible;
    return await currentSetting.save();
  }

  async updateDepositAndStakeSetting(
    depositAndStakeSettingsId: Types.ObjectId,
    updateDepositAndStakeDto: UpdateDepositAndStakeSettingsDto,
    adminId: string,
  ): Promise<DepositAndStakeSettings> {
    await this.validateNetworkAndPlatform(updateDepositAndStakeDto);

    // Checking the duplicate settings
    const existingSetting = await this.hasDuplicateDepositAndStackSettings(
      new Types.ObjectId(updateDepositAndStakeDto.platform),
      new Types.ObjectId(updateDepositAndStakeDto.fromToken),
      new Types.ObjectId(updateDepositAndStakeDto.toToken),
      new Types.ObjectId(depositAndStakeSettingsId),
    );
    if (existingSetting) {
      throw new UnprocessableEntityException(
        'Deposit and stake setting already exists',
      );
    }

    updateDepositAndStakeDto.networks = updateDepositAndStakeDto.networks.map(
      (n) => {
        n.networkId = new Types.ObjectId(n.networkId);
        return n;
      },
    );

    const updatedSetting =
      await this.depositAndStakeSettingsModel.findByIdAndUpdate(
        depositAndStakeSettingsId,
        {
          ...updateDepositAndStakeDto,
          adminId,
        },
        { new: true },
      );

    if (!updatedSetting) {
      throw new NotFoundException(
        `Deposit and stake setting with ID ${depositAndStakeSettingsId} not found.`,
      );
    }

    return updatedSetting;
  }

  async getEnabledSpecialSwapSettingsByFromTokenAndToToken(
    fromToken: Types.ObjectId | string,
    toToken: Types.ObjectId | string,
  ) {
    return this.swapSettingModel
      .findOne({
        isEnable: true,
        fromToken:
          typeof fromToken === 'string'
            ? new Types.ObjectId(fromToken)
            : fromToken,
        toToken:
          typeof toToken === 'string' ? new Types.ObjectId(toToken) : toToken,
      })
      .sort({ createdAt: -1 })
      .populate(['fromToken', 'toToken']);
  }

  async softDeleteWithdrawSetting(id: string) {
    // TODO: Deleted By adminUserId
    try {
      // First check the record
      const existingRecord = await this.withdrawSettingModel.findOne({
        _id: id,
        deletedAt: { $eq: null },
      });

      if (!existingRecord) {
        throw new NotFoundException(
          `Record with ID "${id}" not found or is already deleted`,
        );
      }

      // { deletedAt: new Date(), deletedBy: userId },
      const result = await this.withdrawSettingModel.findByIdAndUpdate(
        id,
        { deletedAt: new Date() },
        { new: true },
      );
      await this.cacheService.deleteUserCache({
        type: CACHE_TYPE.WALLET_WITHDRAW_SETTINGS,
        user:
          String(CACHE_TYPE.STATIC_CACHE_KEY_FOR_WITHDRAW_SETTING) +
          `${existingRecord.type}`,
      });
      return { message: `Record at id :${id} deleted successfully` };
    } catch (error) {
      catchException(error);
    }
  }

  async softDeleteDepositSetting(id: string) {
    // TODO: Deleted By adminUserId
    try {
      // First check the record
      const existingRecord = await this.depositSettingModel.findOne({
        _id: id,
        deletedAt: { $eq: null },
      });

      if (!existingRecord) {
        throw new NotFoundException(
          `Record with ID "${id}" not found or is already deleted`,
        );
      }

      // { deletedAt: new Date(), deletedBy: userId },
      const result = await this.depositSettingModel.findByIdAndUpdate(
        id,
        { deletedAt: new Date() },
        { new: true },
      );
      await this.cacheService.deleteUserCache({
        type: CACHE_TYPE.WALLET_DEPOSIT_SETTINGS,
        user:
          String(CACHE_TYPE.STATIC_CACHE_KEY_FOR_DEPOSIT_SETTING) +
          `${existingRecord.platform || ''}`,
      });
      return { message: `Record at id :${id} deleted successfully` };
    } catch (error) {
      catchException(error);
    }
  }

  async softDeleteDepositAndStakeSetting(id: string) {
    // TODO: Deleted By adminUserId
    try {
      // First check the record
      const existingRecord = await this.depositAndStakeSettingsModel.findOne({
        _id: id,
        deletedAt: { $eq: null },
      });

      if (!existingRecord) {
        throw new NotFoundException(
          `Record with ID "${id}" not found or is already deleted`,
        );
      }

      // { deletedAt: new Date(), deletedBy: userId },
      const result = await this.depositAndStakeSettingsModel.findByIdAndUpdate(
        id,
        { deletedAt: new Date() },
        { new: true },
      );

      return { message: `Record at id :${id} deleted successfully` };
    } catch (error) {
      catchException(error);
    }
  }

  async softDeleteSwapSetting(id: string) {
    // TODO: Deleted By adminUserId
    try {
      // First check the record
      const existingRecord = await this.swapSettingModel.findOne({
        _id: id,
        deletedAt: { $eq: null },
      });

      if (!existingRecord) {
        throw new NotFoundException(
          `Record with ID "${id}" not found or is already deleted`,
        );
      }

      // { deletedAt: new Date(), deletedBy: userId },
      const result = await this.swapSettingModel.findByIdAndUpdate(
        id,
        { deletedAt: new Date() },
        { new: true },
      );

      return { message: `Record at id :${id} deleted successfully` };
    } catch (error) {
      catchException(error);
    }
  }

  async softDeleteSpecialSwapSetting(id: string) {
    // TODO: Deleted By adminUserId
    try {
      // First check the record
      const existingRecord = await this.specialSwapSettingModel.findOne({
        _id: id,
        deletedAt: { $eq: null },
      });

      if (!existingRecord) {
        throw new NotFoundException(
          `Record with ID "${id}" not found or is already deleted`,
        );
      }

      // { deletedAt: new Date(), deletedBy: userId },
      const result = await this.specialSwapSettingModel.findByIdAndUpdate(
        id,
        { deletedAt: new Date() },
        { new: true },
      );
      await this.cacheService.deleteUserCache({
        type: CACHE_TYPE.WALLET_SPECIAL_SWAP_SETTINGS,
        user: String(
          CACHE_TYPE.STATIC_CACHE_KEY_FOR_WALLET_SPECIAL_SWAP_SETTING,
        ),
      });
      return { message: `Record at id :${id} deleted successfully` };
    } catch (error) {
      catchException(error);
    }
  }

  async disableOnChainWalletSetting(
    createOnChainWalletSettingsDto: CreateOnChainWalletSettingsDto,
  ) {
    const { token, network } = createOnChainWalletSettingsDto;
    const existingSettings = await this.onChainWalletSettingModel.find({
      token,
      network,
      status: OnChainWalletSettingStatus.ACTIVE,
    });
    if (existingSettings.length > 0) {
      await this.onChainWalletSettingModel.updateMany(
        { token, network, status: OnChainWalletSettingStatus.ACTIVE },
        { status: OnChainWalletSettingStatus.INACTIVE },
      );
    }
  }

  async createOnChainWalletSetting(
    createOnChainWalletSettingsDto: CreateOnChainWalletSettingsDto,
  ) {
    const { token, network } = createOnChainWalletSettingsDto;
    const existingSettings = await this.onChainWalletSettingModel.find({
      token,
      network,
      status: OnChainWalletSettingStatus.ACTIVE,
    });
    if (existingSettings.length > 0) {
      await this.onChainWalletSettingModel.updateMany(
        { token, network, status: OnChainWalletSettingStatus.ACTIVE },
        { status: OnChainWalletSettingStatus.INACTIVE },
      );
    }
    const newSetting = new this.onChainWalletSettingModel(
      createOnChainWalletSettingsDto,
    );
    return await newSetting.save();
  }

  async resetUserOnChainAttempts(depositSetting: Types.ObjectId) {
    const currentSetting =
      await this.depositSettingModel.findById(depositSetting);
    if (!currentSetting)
      throw new HttpException('Deposit setting not found', 404);

    currentSetting.isResetOnChainAttemps = true;
    currentSetting.resetOnChainAt = new Date();
    await currentSetting.save();
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setUTCHours(23, 59, 59, 999);

    const onChainWalletSettings = await this.onChainWalletSettingModel.find({
      token: currentSetting.fromToken,
      status: OnChainWalletSettingStatus.ACTIVE,
    });
    for (const setting of onChainWalletSettings) {
      await this.onChainAttemptModel.updateMany(
        {
          onChainWalletSetting: setting._id,
          date: { $gte: startOfDay, $lte: endOfDay },
          isReset: { $ne: true },
        },
        {
          $set: { isReset: true },
        },
      );
    }
    return currentSetting;
  }

  async getConversionRate(
    tokenSymbol: string,
    network: string,
    amount: number,
    coin: string = 'usd',
  ): Promise<{ conversionRate: number; currentRate: number }> {
    if (!tokenSymbol || !network) {
      throw new Error('Missing tokenSymbol or network');
    }

    const apiKey = process.env.KMALL_API_KEY;
    const platform = process.env.PB_PAY_PLATFORM;

    try {
      const currency = `${tokenSymbol}-${network}`.toLowerCase();

      // Make sure all environment variables are available
      if (
        !process.env.KMALL_BASE_URL ||
        !process.env.PB_PAY_API_KEY ||
        !process.env.PB_PAY_PLATFORM
      ) {
        throw new Error('Missing required environment variables');
      }

      // Use GET instead of POST and pass parameters as query params
      const response = await firstValueFrom(
        this.httpService.get(
          `${process.env.KMALL_BASE_URL}/partner/payments/pb-pay/conversion-rate`,
          {
            params: {
              currency,
              amount,
              coin,
            },
            headers: {
              'x-api-key': process.env.PB_PAY_API_KEY,
              platform: process.env.PB_PAY_PLATFORM,
              Accept: 'application/json',
            },
          },
        ),
      );

      if (!response.data?.data?.data?.rate) {
        console.warn('Rate not available for:', currency);
      }
      console.log(response);

      return {
        conversionRate: Number(response.data.data.data.toAmount) || 0,
        currentRate: Number(response.data.data.data.rate) || 0,
      };
    } catch (error) {
      console.log('error fetching conversion rate:');
      return {
        conversionRate: 0,
        currentRate: 0,
      };
    }
  }

  async getConvertedCoinTOUSDT(
    coinSymbol: string,
    network: string,
    quantity: number,
  ): Promise<{ conversionRate: number; currentRate: number }> {
    try {
      const currentCoinSymbol = await this.getConversionRate(
        coinSymbol,
        network,
        quantity,
      );

      if (!currentCoinSymbol.conversionRate) {
        return { conversionRate: 0, currentRate: 0 };
      }

      return currentCoinSymbol;
    } catch (error) {
      // Return a default value on failure
      return { conversionRate: 0, currentRate: 0 };
    }
  }

  async depositSettingToggleMinAmountValidation(id: Types.ObjectId) {
    const currentSetting = await this.depositSettingModel.findById(id);
    if (!currentSetting)
      throw new HttpException('Deposit setting not found', 404);

    currentSetting.isValidateMinAmount = !currentSetting.isValidateMinAmount;
    await this.cacheService.deleteUserCache({
      type: CACHE_TYPE.WALLET_DEPOSIT_SETTINGS,
      user:
        String(CACHE_TYPE.STATIC_CACHE_KEY_FOR_DEPOSIT_SETTING) +
        `${currentSetting.type}`,
    });
    return await currentSetting.save();
  }

  async getConversionRateOnChainDepositSettings(
    depositSetting: Types.ObjectId,
  ) {
    const responseData: any = { conversionRate: 0 };
    const matchDepositSetting: any = {
      deletedAt: null,
      _id: depositSetting,
      isOnChainDeposit: true,
    };

    const currentSetting: any = await this.depositSettingModel
      .findById(matchDepositSetting)
      .populate('fromToken')
      .populate({
        path: 'networks',
        populate: {
          path: 'networkId',
          select: 'code',
        },
      });
    if (!currentSetting)
      throw new HttpException('Deposit setting not found', 404);

    if (currentSetting) {
      const convertedCoinSymbol = await this.getConversionRate(
        currentSetting.fromToken.symbol,
        currentSetting.networks[0].networkId.code,
        1,
      );
      if (convertedCoinSymbol.currentRate) {
        currentSetting.conversionRate = convertedCoinSymbol.conversionRate;
        currentSetting.save();
        responseData.conversionRate = convertedCoinSymbol.conversionRate;
      }
    }

    return responseData;
  }
  async toggleTokenIsDebitEnable(id: Types.ObjectId) {
    const currentToken = await this.tokenModel.findOneAndUpdate(
      {
        _id: id,
      },
      [{ $set: { isDebitEnable: { $eq: [false, '$isDebitEnable'] } } }],
      { returnDocument: 'after' },
    );
    if (!currentToken) {
      throw new HttpException('Current Token not found', 404);
    }

    return currentToken;
  }

  async getPairValues(symbol?: string, type?: TOKEN_TYPES) {
    try {
      const response: AxiosResponse<any> = await firstValueFrom(
        this.httpService.get(`https://openapi.koinbay.com/sapi/v1/symbols`),
      );

      if (!response.data || !response.data.symbols) {
        throw new HttpException(
          'No data received from API',
          HttpStatus.BAD_GATEWAY,
        );
      }
      const data = response.data.symbols;
      if (!Array.isArray(data)) {
        throw new HttpException(
          'Unexpected data format received from API',
          HttpStatus.BAD_GATEWAY,
        );
      }

      // Symbol filter is currently disabled but retained for future use
      // let filteredData = data;
      // if (symbol) {
      //   filteredData = data.filter((pair) =>
      //     pair.symbol.toLowerCase().includes(symbol.toLowerCase()),
      //   );
      // }

      let filteredData = data;
      const lykPairValue =
        process.env.LYK_PAIR_VALUE?.toLowerCase() || 'lykusdt';

      if (type === TOKEN_TYPES.OFF_CHAIN) {
        filteredData = data.filter(
          (pair) => pair.symbol.toLowerCase() === lykPairValue,
        );
      }

      return filteredData;
    } catch (error) {
      throw new Error(error.response.data);
    }
  }
}
