import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcryptjs';
import { User } from '../users/schemas/user.schema';
import { aggregatePaginate } from '../utils/pagination.service';
import { AdminI } from './auth/admin.interface';
import { Admin } from './schemas/admin.schema';
import mongoose, {
  isValidObjectId,
  Model,
  PipelineStage,
  Types,
} from 'mongoose';
import ApiResponse from '../utils/api-response.util';
import { UpdateAdminDTO, UpdateAdminPasswordDTO } from './dto/update.admin.dto';
import { catchException } from './global/helpers/handle.exceptionh.helper';
import { ACTION, PERMISSION_MODULE, permissionList } from '../enums/permission';
import { AdminSignupDto } from './auth/dto/admin.auth.dto';
import { CreateRoleDto } from './dto/create.role.dto';
import {
  CloudKFilterDTO,
  PaginateDTO,
  PromotionDTO,
} from './global/dto/paginate.dto';
import { Role } from './schemas/role.schema';
import { WEBHOOK_STATUS, WebhookStatus } from './schemas/webhook-error.schema';
import { IsIdDTO } from './global/dto/id.dto';
import { UpdateRoleDto } from './dto/update.role.dto';
import { Notification } from '../notification/schemas/notification.schema';
import { CreateNotificationByBidDto } from '../notification/dto/create.notification.by.bid.dto';
import { CreateNewsDto } from '../news/dto/create.news.dto';
import { News } from '../news/schemas/news.schema';
import { GatewayService } from '../gateway/gateway.service';
import { ConfigService } from '@nestjs/config';
import { MyBlockchainIdService } from '../my-blockchain-id/my-blockchain-id.service';
import { DatabaseDump } from './schemas/database-dump.schema';
import { DatabaseDumpDto } from './dto/create.database-dump.dto';
import { AppRequest } from '../utils/app-request';
import { Token } from '../token/schemas/token.schema';
import { WithdrawTransaction } from '../wallet/schemas/withdraw.transaction.schema';
import { CloudKMachine } from '../cloud-k/schemas/cloudk-machine.schema';
import { WalletTransaction } from '../wallet/schemas/wallet.transaction.schema.';
import { DepositTransaction } from '../wallet/schemas/deposit.transaction.schema';
import { SwapTransaction } from '../wallet/schemas/swap.transaction.schema';
import { CloudKReward } from '../cloud-k/schemas/cloudk-reward.schema';
import { SN_BONUS_TYPE } from '../supernode/enums/sn-bonus-type.enum';
import moment from 'moment';
import { SNBonusTransaction } from '../supernode/schemas/sn-bonus-transaction.schema';
import { DAY_OF_WEEK_SHORT_NAMES, MONTH_SHORT_NAMES } from '../utils/constants';
import { CHART_TIMELIME_TYPES } from '@/src/myfriends/enums/chart-timelines.enum';
import { CloudKGlobalAutoCompound } from '../cloud-k/schemas/global-autocompound.schema';
import { TransactionFlow } from '../wallet/enums/transcation.flow.enum';
import {
  CloudKTransactions,
  CloudKTransactionTypes,
} from '../cloud-k/schemas/cloudk-transactions.schema';
import { CloudKSetting } from '../cloud-k/schemas/cloudk-setting.schema';
import {
  getCurrentDay,
  getCustomRange,
  validatePromotionsDates,
} from '../utils/common/common.functions';
import { AdditionalMintingPromotion } from './schemas/additional-minting-promotion.schema';
import { CreatePromotionDto, PromotionStatusDto } from './dto/promotion.dto';
import {
  AdditionalCountryLevelSetting,
  CountryChangeType,
  IAdditionalMintingCountryItem,
} from './schemas/additional.product.minting.Schema';
import { CreateProductPromotionDto } from './dto/promotion.dto';
import { AdditionalMintingPromotionStatus } from './schemas/additional-minting-promotion.schema';
import { UpdatePromotionAndSettingsDto } from './dto/promotion.dto';
import {
  IInactiveAdditionalMintingCountryItem,
  InactiveAdditionalCountryLevelSetting,
} from './schemas/inactive-additional.product.minting.Schema';

@Injectable()
export class AdminCloudkService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Admin.name) private adminModel: Model<AdminI>,
    @InjectModel(Role.name) private adminRole: Model<Role>,
    @InjectModel(DatabaseDump.name)
    private adminDatabaseDump: Model<DatabaseDump>,
    @InjectModel(Token.name) private tokenModel: Model<Token>,
    @InjectModel(CloudKMachine.name)
    private cloudKMachineModel: Model<CloudKMachine>,
    @InjectModel(WalletTransaction.name)
    private walletTransactionModel: Model<WalletTransaction>,

    @InjectModel(CloudKTransactions.name)
    private cloudkTransactionModel: Model<CloudKTransactions>,
    @InjectModel(CloudKSetting.name)
    private cloudKSettingModel: Model<CloudKSetting>,
    @InjectModel(User.name)
    private usermModel: Model<User>,

    @InjectModel(CloudKMachine.name)
    public machineModel: Model<CloudKMachine>,
    @InjectModel(AdditionalMintingPromotion.name)
    private additionalMintingPromotionModel: Model<AdditionalMintingPromotion>,
    @InjectModel(AdditionalCountryLevelSetting.name)
    private additionalCountryLevelSettingModel: Model<AdditionalCountryLevelSetting>,
    @InjectModel(InactiveAdditionalCountryLevelSetting.name)
    private inactiveAdditionalCountryLevelSettingModel: Model<InactiveAdditionalCountryLevelSetting>,
  ) {}

  async getCloudKTransactionsStatsv2(
    paginateDTO: CloudKFilterDTO,
  ): Promise<any> {
    const { fromDate, toDate, type, query, product } = paginateDTO;
    const transactionTypes = ['ac-debit', 'daily-reward', 'add-stake'];
    const stateTokenType = ['ac-debit', 'add-stake'];
    const rewardTokenType = ['daily-reward'];

    const TokenSetting = await this.cloudKSettingModel
      .findOne({ deletedAt: null })
      .populate(['rewardToken', 'stakeToken'])
      .lean()
      .exec();

    const matchConditions: any = {
      $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
      type: { $in: type ? [type] : transactionTypes },
    };

    if (product) {
      try {
        const machines = await this.cloudKMachineModel.find({
          product: new Types.ObjectId(product),
          $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
        });

        if (machines && machines.length > 0) {
          const machineIds = machines.map((machine) => machine._id);
          matchConditions.machine = { $in: machineIds };
        } else {
          return {
            totalTransaction: {
              type:
                `Total ${
                  type == 'ac-debit'
                    ? 'Auto Link'
                    : type == 'daily-reward'
                      ? 'Daily Reward'
                      : type == 'add-stake'
                        ? 'Stake'
                        : type
                } Amount ` || 'all',
              totalTokenAmount: 0,
            },
            totalTransactionByProduct: [],
          };
        }
      } catch (error) {
        console.error('Error processing product ID:', error);
        return {
          totalTransaction: {
            type:
              `Total ${
                type == 'ac-debit'
                  ? 'Auto Link'
                  : type == 'daily-reward'
                    ? 'Daily Reward'
                    : type == 'add-stake'
                      ? 'Stake'
                      : type
              } Amount ` || 'all',
            totalTokenAmount: 0,
          },
          totalTransactionByProduct: [],
        };
      }
    }

    if (query) {
      const searchRegex = new RegExp(query, 'i');
      const userQuery = {
        $or: [
          { email: { $regex: searchRegex } },
          { blockchainId: { $regex: searchRegex } },
          { firstName: { $regex: searchRegex } },
          { lastName: { $regex: searchRegex } },
          { userName: { $regex: searchRegex } },
        ],
      };
      const user = await this.userModel.findOne(userQuery).exec();
      if (!user) {
        return {
          totalTransaction: {
            type:
              `Total ${
                type == 'ac-debit'
                  ? 'Auto Link'
                  : type == 'daily-reward'
                    ? 'Daily Reward'
                    : type == 'add-stake'
                      ? 'Stake'
                      : type
              } Amount ` || 'all',
            totalTokenAmount: 0,
          },
          totalTransactionByProduct: [],
        };
      }
      matchConditions.user = new Types.ObjectId(user._id.toString());
    }

    let dateFrom: any = null;
    let dateTo: any = null;
    let dateRange: string = '';

    if (fromDate) {
      const from = new Date(fromDate);
      from.setUTCHours(0, 0, 0, 0);
      const to = toDate ? new Date(toDate) : new Date();
      to.setUTCHours(23, 59, 59, 999);
      matchConditions.createdAt = { $gte: from, $lte: to };
      dateFrom = from;
      dateTo = to;

      // Generate month array
      dateRange = `${from} to ${to}`;
    } else {
      const now = new Date();
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setUTCDate(now.getUTCDate() - 30); // Subtract 30 days
      thirtyDaysAgo.setUTCHours(0, 0, 0, 0); // Set time to start of the day

      now.setUTCHours(23, 59, 59, 999); // Set time to end of the current day

      matchConditions.createdAt = { $gte: thirtyDaysAgo, $lte: now };
      dateFrom = thirtyDaysAgo;
      dateTo = now;

      // Generate month array
      dateRange = 'Last 30 Days';
    }
    // Get total transactions by type
    const totalsByType = await this.cloudkTransactionModel.aggregate([
      { $match: matchConditions },
      {
        $group: {
          _id: '$type',
          totalAmount: { $sum: '$tokenAmount' },
        },
      },
      {
        $addFields: {
          token: rewardTokenType.includes(type)
            ? TokenSetting.rewardToken.name
            : stateTokenType.includes(type)
              ? TokenSetting.stakeToken.name
              : '',
        },
      },
    ]);

    const ProductWiseTotals = await this.cloudkTransactionModel.aggregate([
      { $match: matchConditions },
      {
        $lookup: {
          from: 'cloudkmachines',
          localField: 'machine',
          foreignField: '_id',
          as: 'machine',
        },
      },
      { $unwind: '$machine' },
      {
        $lookup: {
          from: 'cloudkproducts',
          localField: 'machine.product',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $unwind: '$product' },
      {
        $group: {
          _id: {
            productId: '$product._id',
            productName: '$product.name',
            externalProductId: '$product.externalProductId',
            imageUrl: '$product.imageUrl',
          },
          totalTokenAmount: { $sum: '$tokenAmount' },
        },
      },
      {
        $addFields: {
          token: rewardTokenType.includes(type)
            ? TokenSetting.rewardToken.name
            : stateTokenType.includes(type)
              ? TokenSetting.stakeToken.name
              : '',
        },
      },
    ]);

    const transactionSummary =
      totalsByType?.length > 0
        ? {
            type: totalsByType[0]._id,
            token: totalsByType[0].token,
            dateFrom: dateFrom,
            dateTo: dateTo,
            dateRange: dateRange,
            totalTokenAmount: totalsByType[0].totalAmount,
            name: `Total ${
              totalsByType[0]._id == 'ac-debit'
                ? 'Auto Link'
                : totalsByType[0]._id == 'daily-reward'
                  ? 'Daily Reward'
                  : totalsByType[0]._id == 'add-stake'
                    ? 'Stake'
                    : totalsByType[0]._id
            } Amount `,
          }
        : {
            token: '',
            type:
              `Total ${
                type == 'ac-debit'
                  ? 'Auto Link'
                  : type == 'daily-reward'
                    ? 'Daily Reward'
                    : type == 'add-stake'
                      ? 'Stake'
                      : type
              } Amount ` || 'all',
            totalTokenAmount: 0,
            dateFrom: dateFrom,
            dateTo: dateTo,
            dateRange: dateRange,
          };

    return {
      totalTransaction: transactionSummary,
      totalTransactionByProduct: ProductWiseTotals.map((item) => ({
        _id: item?._id?.productId || '',
        name: item?._id?.productName || '',
        externalProductId: item?._id?.externalProductId || '',
        imageUrl: item?._id?.imageUrl || '',
        totalTokenAmount: item?.totalTokenAmount || '',
        token: item?.token || '',
        dateFrom: dateFrom,
        dateTo: dateTo,
        dateRange: dateRange,
      })),
    };
  }

  async getCloudKTransactionsStatsv3(
    paginateDTO: CloudKFilterDTO,
  ): Promise<any> {
    const productId = paginateDTO.product;
    const { fromDate, toDate, type, query } = paginateDTO;

    const transactionTypes = ['ac-debit', 'daily-reward', 'add-stake'];
    const tokenMapping = {
      'ac-debit': 'stakeToken',
      'daily-reward': 'rewardToken',
      'add-stake': 'stakeToken',
    };

    const tokenSetting = await this.cloudKSettingModel
      .findOne({ deletedAt: null })
      .populate(['rewardToken', 'stakeToken'])
      .lean()
      .exec();

    const tokenType = tokenMapping[type] || '';
    const tokenName = tokenType ? tokenSetting?.[tokenType]?.name || '' : '';

    const matchConditions: any = {
      $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
      type: { $in: type ? [type] : transactionTypes },
    };

    if (productId) {
      try {
        const machines = await this.cloudKMachineModel.find({
          product: new Types.ObjectId(productId),
          $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
        });

        if (machines && machines.length > 0) {
          const machineIds = machines.map((machine) => machine._id);
          matchConditions.machine = { $in: machineIds };
        } else {
          return {
            totalTransaction: {
              type: `Total ${type || 'all'} Amount`,
              token: tokenName,
              totalTokenAmount: 0,
              fromDate: null,
              toDate: null,
              dateRange: '',
            },
            totalTransactionByProduct: [],
          };
        }
      } catch (error) {
        console.error('Error processing product ID:', error);
        return {
          totalTransaction: {
            type: `Total ${type || 'all'} Amount`,
            token: tokenName,
            totalTokenAmount: 0,
            fromDate: null,
            toDate: null,
            dateRange: '',
          },
          totalTransactionByProduct: [],
        };
      }
    }

    if (query) {
      const searchRegex = new RegExp(query, 'i');
      const userQuery = {
        $or: [
          { email: { $regex: searchRegex } },
          { blockchainId: { $regex: searchRegex } },
          { firstName: { $regex: searchRegex } },
          { lastName: { $regex: searchRegex } },
          { userName: { $regex: searchRegex } },
        ],
      };
      const user = await this.userModel.findOne(userQuery).exec();
      if (!user) {
        return {
          totalTransaction: {
            type: `Total ${type || 'all'} Amount`,
            token: tokenName,
            totalTokenAmount: 0,
            fromDate: null,
            toDate: null,
            dateRange: '',
          },
          totalTransactionByProduct: [],
        };
      }
      matchConditions.user = new Types.ObjectId(user._id.toString());
    }

    let dateFrom: any = null;
    let dateTo: any = null;
    let dateRange: string = '';

    if (fromDate) {
      const from = new Date(fromDate);
      const to = toDate ? new Date(toDate) : new Date();

      const customdate = await getCustomRange(from, to);
      matchConditions.createdAt = {
        $gte: customdate.startDate,
        $lte: customdate.endDate,
      };
      dateFrom = customdate.startDate;
      dateTo = customdate.endDate;
      dateRange = `${customdate.startDate} to ${customdate.endDate}`;
    } else {
      const curentDate = await getCurrentDay();
      matchConditions.createdAt = {
        $gte: curentDate.startDate,
        $lte: curentDate.endDate,
      };

      dateFrom = curentDate.startDate;
      dateTo = curentDate.endDate;
      dateRange = `${curentDate.startDate} to ${curentDate.endDate}`;

      dateRange = 'Current Day';
    }

    const results = await this.cloudkTransactionModel.aggregate([
      { $match: matchConditions },
      {
        $lookup: {
          from: 'cloudkmachines',
          localField: 'machine',
          foreignField: '_id',
          as: 'machine',
        },
      },
      { $unwind: { path: '$machine', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'cloudkproducts',
          localField: 'machine.product',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: {
            type: '$type',
            productId: '$product._id',
            productName: '$product.name',
            externalProductId: '$product.externalProductId',
            imageUrl: '$product.imageUrl',
          },
          totalTokenAmount: { $sum: '$tokenAmount' },
        },
      },
      {
        $addFields: {
          token: tokenName,
        },
      },
    ]);

    const grandTotalAmount = await results.reduce(
      (acc, data) => acc + data.totalTokenAmount,
      0,
    );
    const transactionSummary = {
      token: tokenName,
      type: type,
      name: `Total ${
        type === 'ac-debit'
          ? 'Auto Link'
          : type === 'daily-reward'
            ? 'Daily Reward'
            : type === 'add-stake'
              ? 'Stake'
              : 'All'
      } Amount`,
      totalTokenAmount: grandTotalAmount || 0,
      fromDate: dateFrom,
      toDate: dateTo,
      dateRange: dateRange,
    };
    // // const transactionSummary = results.map((item) => ({
    // //   type: item._id.type,
    // //   token: item.token,
    // //   fromDate: dateFrom,
    // //   toDate: dateTo,
    // //   dateRange: dateRange,
    // //   totalTokenAmount: item.totalTokenAmount || 0,
    //   name: `Total ${
    //     item._id.type === 'ac-debit'
    //       ? 'Auto Link'
    //       : item._id.type === 'daily-reward'
    //         ? 'Daily Reward'
    //         : item._id.type === 'add-stake'
    //           ? 'Stake'
    //           : 'All'
    //   } Amount`,
    // }))[0] || {
    //     token: tokenName,
    //     type: `Total ${type || 'all'} Amount`,
    //     totalTokenAmount: grandTotalAmount,
    //     fromDate: dateFrom,
    //     toDate: dateTo,
    //     dateRange: dateRange,
    //   } || {
    //     token: tokenName,
    //     type: `Total ${type || 'all'} Amount`,
    //     totalTokenAmount: 0,
    //     fromDate: dateFrom,
    //     toDate: dateTo,
    //     dateRange: dateRange,
    //   };

    const productTotals = results
      .filter((item) => item._id.productId)
      .map((item) => ({
        _id: item._id.productId || '',
        name: item._id.productName || '',
        externalProductId: item._id.externalProductId || '',
        imageUrl: item._id.imageUrl || '',
        totalTokenAmount: item.totalTokenAmount || 0,
        token: item.token || '',
        fromDate: dateFrom,
        toDate: dateTo,
        dateRange: dateRange,
      }));

    return {
      totalTransaction: transactionSummary,
      totalTransactionByProduct: productTotals,
    };
  }

  async getAllTransactions(
    paginateDTO: PaginateDTO,
    {
      machine,
      token,
      type,
      from,
      to,
      query,
      product,
    }: {
      machine?: string;
      token?: string;
      type?: CloudKTransactionTypes;
      from?: string;
      to?: string;
      query?: string;
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

    if (query) {
      const searchRegex = new RegExp(query, 'i');
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

      whereConfig.user = { $in: matchingUsers.map((u) => u._id) };
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

  async getAllPromotions(paginateDto: PromotionDTO) {
    const { page, limit, name, fromDate, toDate, status } = paginateDto;

    const query: any = { deletedAt: null };

    if (name) {
      query.promotionName = { $regex: name, $options: 'i' };
    }

    // Date filtering ignoring time component
    if (fromDate || toDate) {
      // Initialize the $expr operator if we're using date filtering
      query.$expr = query.$expr || {};

      if (fromDate) {
        const formattedFromDate = new Date(fromDate)
          .toISOString()
          .split('T')[0];
        // Ensure endDate is on or after fromDate (comparing only date part)
        query.$expr.$and = query.$expr.$and || [];
        query.$expr.$and.push({
          $gte: [
            { $substr: [{ $toString: '$endDate' }, 0, 10] },
            formattedFromDate,
          ],
        });
      }

      if (toDate) {
        const formattedToDate = new Date(toDate).toISOString().split('T')[0];
        // Ensure startDate is on or before toDate (comparing only date part)
        query.$expr.$and = query.$expr.$and || [];
        query.$expr.$and.push({
          $lte: [
            { $substr: [{ $toString: '$startDate' }, 0, 10] },
            formattedToDate,
          ],
        });
      }
    }

    if (status && status.length > 0) {
      query.status = { $in: status };
    }

    const isExpiredPromotion = await this.markExpiredPromotions();

    const skip = (page - 1) * limit;

    const total = await this.additionalMintingPromotionModel
      .countDocuments(query)
      .exec();

    const data = await this.additionalMintingPromotionModel
      .find(query)
      // .select('_id ')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    const formattedData = data.map((item) => {
      // Create a plain JS object copy
      const formatted = item.toObject
        ? item.toObject()
        : JSON.parse(JSON.stringify(item));

      // Now TypeScript won't complain because we're working with a plain object
      if (formatted.expiredDate) {
        // Use type assertion if needed
        formatted.expiredDate =
          formatted.expiredDate instanceof Date
            ? formatted.expiredDate.toISOString().split('T')[0]
            : formatted.expiredDate;
      }
      if (formatted.note) {
        formatted.note =
          formatted.status === AdditionalMintingPromotionStatus.EXPIRED
            ? 'Additional Minting Promotions is Automatically Expired'
            : formatted.status === AdditionalMintingPromotionStatus.STOPPED
              ? 'Additional Minting Promotions has been Stopped'
              : formatted.status === AdditionalMintingPromotionStatus.ACTIVE
                ? 'Additional Minting Promotions is Active'
                : formatted.status === AdditionalMintingPromotionStatus.DELETED
                  ? 'Additional Minting Promotions is Deleted'
                  : 'Unknown Status';
      }

      return formatted;
    });

    const totalPages = Math.ceil(total / limit);

    return {
      data: formattedData,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  async createPromotion(
    createPromotionDto: CreatePromotionDto,
  ): Promise<AdditionalMintingPromotion> {
    const validatePromotion = await validatePromotionsDates(
      createPromotionDto.startDate,
      createPromotionDto.endDate,
    );
    if (!validatePromotion) {
      throw new Error('Invalid promotion dates');
    }

    await this.validateNoOverlappingPromotions(
      createPromotionDto.startDate,
      createPromotionDto.endDate,
    );

    const newPromotion = new this.additionalMintingPromotionModel(
      createPromotionDto,
    );
    return newPromotion.save();
  }

  private async validateNoOverlappingPromotions(
    startDate: Date,
    endDate: Date,
  ): Promise<void> {
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Extract only the date part (YYYY-MM-DD)
    const startDateString = start.toISOString().split('T')[0];
    const endDateString = end.toISOString().split('T')[0];

    console.log('Checking overlaps for new promotion:', {
      startDateString,
      endDateString,
    });

    // Fetch only active promotions
    const activePromotions = await this.additionalMintingPromotionModel
      .find({
        status: AdditionalMintingPromotionStatus.ACTIVE,
        deletedAt: null,
      })
      .exec();

    console.log('Active promotions fetched:', activePromotions.length);

    for (const promotion of activePromotions) {
      const existingStart = promotion.startDate.toISOString().split('T')[0];
      const existingEnd = promotion.endDate.toISOString().split('T')[0];

      // Ensure new promotion's endDate is not the start date of another promotion
      if (endDateString === existingStart) {
        throw new BadRequestException(
          `Cannot create promotion: End date (${endDateString}) cannot be the start of another promotion (${existingStart}).`,
        );
      }

      // Ensure new promotion does not fully fall inside an existing promotion
      if (startDateString >= existingStart && endDateString <= existingEnd) {
        throw new BadRequestException(
          `Cannot create promotion: It completely falls within an existing promotion "${promotion.promotionName}" ` +
            `running from ${existingStart} to ${existingEnd}.`,
        );
      }

      // Ensure new promotion does not partially overlap
      if (startDateString <= existingEnd && endDateString >= existingStart) {
        throw new BadRequestException(
          `Cannot create promotion: It overlaps with an existing promotion "${promotion.promotionName}" ` +
            `running from ${existingStart} to ${existingEnd}.`,
        );
      }
    }
  }

  async updatePromotionAndSettings(
    id: string,
    updateDto: UpdatePromotionAndSettingsDto,
    adminId?: string,
  ): Promise<{
    promotion: AdditionalMintingPromotion;
    settingsResults: {
      updated: number;
      failed: Array<{ productId: string; error: string }>;
    };
  }> {
    console.log('Updating promotion and specific settings:', {
      id,
      updateData: JSON.stringify(updateDto),
    });

    // Step 1: Fetch the existing promotion
    const existingPromotion = await this.additionalMintingPromotionModel
      .findById(id)
      .exec();

    if (!existingPromotion) {
      throw new BadRequestException('Promotion not found');
    }
    if (updateDto.startDate && updateDto.endDate) {
      const validatePromotion = await validatePromotionsDates(
        updateDto.startDate,
        updateDto.endDate,
      );
      if (!validatePromotion) {
        throw new Error('Invalid promotion dates');
      }
    }

    // Step 2: Prepare promotion update data
    const promotionUpdateData: any = {};

    if (updateDto.promotionName !== undefined) {
      promotionUpdateData.promotionName = updateDto.promotionName;
    }

    if (updateDto.status !== undefined) {
      promotionUpdateData.status = updateDto.status;

      if (
        updateDto.status === AdditionalMintingPromotionStatus.STOPPED &&
        existingPromotion.status !== AdditionalMintingPromotionStatus.STOPPED
      ) {
        promotionUpdateData.stoppedDate = new Date();
        promotionUpdateData.note = `Promotion stopped by Admin: ${adminId} at ${new Date()}`;
      } else if (updateDto.status === AdditionalMintingPromotionStatus.ACTIVE) {
        promotionUpdateData.stoppedDate = null;
        promotionUpdateData.deletedAt = null;
        promotionUpdateData.note = `Promotion Restarted by Admin: ${adminId} at ${new Date()}`;
      }
    }
    if (updateDto.startDate && new Date(updateDto.startDate)) {
      promotionUpdateData.startDate = new Date(updateDto.startDate);
    }
    if (updateDto.endDate && new Date(updateDto.endDate)) {
      promotionUpdateData.endDate = new Date(updateDto.endDate);
    }
    if (updateDto.startDate || updateDto.endDate) {
      await this.validateNoOverlappingPromotionsForUpdate(
        id,
        new Date(updateDto.startDate),
        new Date(updateDto.endDate),
      );
    }
    // Step 3: Update the promotion
    let updatedPromotion = existingPromotion;
    if (Object.keys(promotionUpdateData).length > 0) {
      updatedPromotion = await this.additionalMintingPromotionModel
        .findByIdAndUpdate(id, promotionUpdateData, { new: true })
        .exec();
    }

    // Step 4: Process product settings
    const settingsResults = {
      updated: 0,
      failed: [],
    };

    if (updateDto.productSettings && updateDto.productSettings.length > 0) {
      // Step 4.1: Fetch existing product settings for the given promotion
      const existingSettings = await this.additionalCountryLevelSettingModel
        .find({
          promotionId: new Types.ObjectId(id),
          deletedAt: null,
        })
        .exec();

      for (const productSetting of updateDto.productSettings) {
        try {
          const countryIds = productSetting.countryList.map(
            (item) => item.countryId,
          );
          const uniqueCountryIds = new Set(countryIds);

          if (countryIds.length !== uniqueCountryIds.size) {
            settingsResults.failed.push({
              productId: productSetting.productId,
              error: 'Duplicate countries found in countryList',
            });
            continue;
          }
          console.log(
            `Processing product setting: ${productSetting.productId}`,
          );

          // Step 4.2: Find the corresponding existing product setting
          const existingSetting: any = existingSettings.find(
            (setting) =>
              String(setting.productId) === String(productSetting.productId),
          );

          // Step 4.3: If the product setting is not found, create a new one
          if (!existingSetting) {
            console.log(
              `Creating new product setting for product ${productSetting.productId}`,
            );
            const newSetting = new this.additionalCountryLevelSettingModel({
              promotionId: new Types.ObjectId(id),
              productId: new Types.ObjectId(productSetting.productId),
              countryList: productSetting.countryList,
              deletedAt: null,
            });
            await newSetting.save();
            settingsResults.updated++;
          } else {
            // Step 4.4: If the product setting is found, update it
            console.log(
              `Updating existing product setting for product ${productSetting.productId}`,
            );
            const changes: Array<IInactiveAdditionalMintingCountryItem> = [];

            // Convert existing DB data to a Map for quick lookup
            const originalMap = new Map(
              existingSetting.countryList.map((item) => [item.countryId, item]),
            );

            // Check for updates
            productSetting.countryList.forEach((newItem) => {
              const oldItem = originalMap.get(newItem.countryId);

              if (oldItem) {
                // If exists, check for updates
                if (JSON.stringify(newItem) !== JSON.stringify(oldItem)) {
                  changes.push({
                    countryId: newItem.countryId,
                    type: CountryChangeType.UPDATED,
                    name: newItem.name,
                    countryCodeAlpha3: newItem.countryCodeAlpha3,
                    percentage: newItem.percentage,
                    adminId: new Types.ObjectId(adminId),
                    changesMadeAt: new Date(),
                  });
                }
                // Remove from originalMap to track removals later
                originalMap.delete(newItem.countryId);
              }
            });

            // Remaining items in originalMap are removed
            originalMap.forEach((removedItem: any) => {
              changes.push({
                countryId: removedItem.countryId,
                type: CountryChangeType.REMOVED,
                name: removedItem.name,
                countryCodeAlpha3: removedItem.countryCodeAlpha3,
                percentage: removedItem.percentage,
                adminId: new Types.ObjectId(adminId),
                changesMadeAt: new Date(),
              });
            });

            // Apply updates
            existingSetting.countryList = productSetting.countryList;
            existingSetting.markModified('countryList');
            await existingSetting.save();
            settingsResults.updated++;
            // Updating Changes

            if (changes.length > 0) {
              const existingInactiveCountrySettings =
                await this.inactiveAdditionalCountryLevelSettingModel
                  .find({
                    additionalMintingProductId: new Types.ObjectId(
                      existingSetting._id,
                    ),
                    promotionId: new Types.ObjectId(id),
                    productId: new Types.ObjectId(productSetting.productId),
                    deletedAt: null,
                  })
                  .exec();

              if (existingInactiveCountrySettings.length === 0) {
                // No existing settings found, creating a new inactive setting
                const newInactiveSetting =
                  new this.inactiveAdditionalCountryLevelSettingModel({
                    additionalMintingProductId: new Types.ObjectId(
                      existingSetting._id,
                    ),
                    promotionId: new Types.ObjectId(id),
                    productId: new Types.ObjectId(productSetting.productId),
                    countryList: changes.map((item) => ({
                      ...item,
                      countryId: isValidObjectId(item.countryId)
                        ? new Types.ObjectId(item.countryId)
                        : item.countryId, // Only convert to ObjectId if it's valid
                    })),
                  });

                await newInactiveSetting.save();
              } else {
                // Existing inactive setting found, updating countryList
                const inactiveSetting = existingInactiveCountrySettings[0];
                const oldCountryList = inactiveSetting.countryList || [];

                inactiveSetting.countryList = [
                  ...oldCountryList,
                  ...changes.map((item) => ({
                    ...item,
                    countryId: isValidObjectId(item.countryId)
                      ? new Types.ObjectId(item.countryId)
                      : item.countryId, // Only convert to ObjectId if it's valid
                  })),
                ];

                await inactiveSetting.save();
              }
            }

            console.log(
              `Changes detected for product ${productSetting.productId}:`,
              changes,
            );
          }
        } catch (error) {
          console.log(
            `Error processing product setting for ${productSetting.productId}:`,
            error,
          );
          settingsResults.failed.push({
            productId: productSetting.productId,
            error: error.message,
          });
        }
      }

      // Step 4.5: Soft delete any products that are missing from the update payload
      const updatedProductIds = updateDto.productSettings.map(
        (setting) => setting.productId,
      );
      const productsToSoftDelete = existingSettings.filter(
        (setting) => !updatedProductIds.includes(String(setting.productId)),
      );

      for (const productToDelete of productsToSoftDelete) {
        console.log(
          `Soft deleting product setting for product ${productToDelete.productId}`,
        );
        productToDelete.deletedAt = new Date();
        productToDelete.note = `The promotion was deleted on ${new Date().toISOString()} by admin ${adminId ?? ''}.`;

        await productToDelete.save();
        settingsResults.updated++;
      }
    }

    return { promotion: updatedPromotion, settingsResults };
  }

  private async validateNoOverlappingPromotionsForUpdate(
    id: string,
    startDate: Date,
    endDate: Date,
  ): Promise<void> {
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Extract only the date part (YYYY-MM-DD) to avoid time discrepancies
    const startDateString = start.toISOString().split('T')[0];
    const endDateString = end.toISOString().split('T')[0];

    console.log('Checking overlaps for update:', {
      id,
      startDateString,
      endDateString,
    });

    // Fetch all active promotions except the current one being updated
    const activePromotions = await this.additionalMintingPromotionModel
      .find({
        _id: { $ne: id },
        status: AdditionalMintingPromotionStatus.ACTIVE,
        deletedAt: null,
      })
      .exec();

    for (const promotion of activePromotions) {
      const existingStart = promotion.startDate.toISOString().split('T')[0];
      const existingEnd = promotion.endDate.toISOString().split('T')[0];

      // Ensure updated promotion's endDate is not the start date of another promotion
      if (endDateString === existingStart) {
        throw new BadRequestException(
          `Cannot update promotion: End date (${endDateString}) cannot be the start of another promotion (${existingStart}).`,
        );
      }

      // Ensure updated promotion does not fully fall inside an existing promotion
      if (startDateString >= existingStart && endDateString <= existingEnd) {
        throw new BadRequestException(
          `Cannot update promotion: It completely falls within an existing promotion "${promotion.promotionName}" ` +
            `running from ${existingStart} to ${existingEnd}.`,
        );
      }

      // Ensure updated promotion does not partially overlap
      if (startDateString <= existingEnd && endDateString >= existingStart) {
        throw new BadRequestException(
          `Cannot update promotion: It overlaps with an existing promotion "${promotion.promotionName}" ` +
            `running from ${existingStart} to ${existingEnd}.`,
        );
      }

      // Ensure updated promotion does not have the same start or end date as an existing promotion
      if (startDateString === existingStart || endDateString === existingEnd) {
        throw new BadRequestException(
          `Cannot update promotion: It shares the same start (${existingStart}) or end (${existingEnd}) date as an existing promotion.`,
        );
      }
    }
  }

  async removePromotion(
    id: string,
    adminId?: string,
  ): Promise<AdditionalMintingPromotion> {
    const _id = new mongoose.Types.ObjectId(id);
    const promotion = await this.additionalMintingPromotionModel.findOne({
      _id: _id,
      deletedAt: null,
      status: { $ne: AdditionalMintingPromotionStatus.DELETED },
    });

    if (!promotion) {
      throw new BadRequestException('Promotion not found');
    }

    return this.additionalMintingPromotionModel
      .findByIdAndUpdate(
        {
          _id: _id,
        },
        {
          deletedAt: new Date(),
          status: AdditionalMintingPromotionStatus.DELETED,
          note: `Promotion is deleted by Admin: ${adminId} at ${new Date()}`,
        },
        { new: true },
      )
      .exec();
  }

  async promotionStatusUpdate(
    id: string,
    promotionStatusDto: PromotionStatusDto,
    adminId?: string,
  ): Promise<AdditionalMintingPromotion> {
    const { status, date } = promotionStatusDto;
    const _id = new mongoose.Types.ObjectId(id);

    // Find the promotion if it exists with the correct status
    const promotion = await this.additionalMintingPromotionModel.findOne({
      _id: _id,
      status: { $ne: status },
    });

    if (!promotion) {
      throw new BadRequestException('Promotion not found');
    }

    // Prepare update object based on status and dates
    const updateData: any = {
      status: status,
    };

    if (status === AdditionalMintingPromotionStatus.STOPPED) {
      updateData.stoppedDate = date || new Date();
      updateData.note = `Promotion is stopped by Admin: ${adminId} at ${new Date()}`;
    } else if (status === AdditionalMintingPromotionStatus.ACTIVE) {
      updateData.stoppedDate = null;
      updateData.note = `Promotion is Restarted by Admin: ${adminId} at ${new Date()}`;
      updateData.deletedAt = null;
    } else {
      updateData.deletedAt = date || new Date();
      updateData.note = `Promotion is deleted by Admin: ${adminId} at ${new Date()}`;
    }

    // Perform the update and return the updated promotion
    return this.additionalMintingPromotionModel
      .findByIdAndUpdate(_id, updateData, { new: true })
      .exec();
  }

  async createProductPromotion(
    batchDto: CreateProductPromotionDto,
  ): Promise<{ successful: any[]; failed: any[] }> {
    const { promotionId, products } = batchDto;

    if (!Types.ObjectId.isValid(promotionId)) {
      throw new BadRequestException('Invalid promotion ID');
    }

    const promotion = await this.additionalMintingPromotionModel
      .findOne({ _id: promotionId, deletedAt: null })
      .exec();

    if (!promotion) {
      throw new BadRequestException('Promotion not found or has been deleted');
    }

    const successful = [];
    const failed = [];

    const productIds = products.map((p) => new Types.ObjectId(p.productId));

    // Fetch existing promotions in one query for efficiency
    const existingPromotions = await this.additionalCountryLevelSettingModel
      .find({
        promotionId: new Types.ObjectId(promotionId),
        productId: { $in: productIds },
        deletedAt: null,
      })
      .exec();

    const existingPromotionMap = new Map(
      existingPromotions.map((entry) => [entry.productId.toString(), entry]),
    );

    const newPromotions = [];

    for (const productItem of products) {
      try {
        if (!Types.ObjectId.isValid(productItem.productId)) {
          failed.push({
            productId: productItem.productId,
            error: 'Invalid product ID',
          });
          continue;
        }

        if (existingPromotionMap.has(productItem.productId)) {
          failed.push({
            productId: productItem.productId,
            error: 'A promotion for this product already exists',
          });
          continue;
        }

        const countryIds = productItem.countryList.map(
          (item) => item.countryId,
        );
        const duplicateCountries = countryIds.filter(
          (id, index) => countryIds.indexOf(id) !== index,
        );

        if (duplicateCountries.length > 0) {
          failed.push({
            productId: productItem.productId,
            error: `Duplicate countries found: ${[...new Set(duplicateCountries)].join(', ')}`,
          });
          continue;
        }

        newPromotions.push({
          promotionId: new Types.ObjectId(promotionId),
          productId: new Types.ObjectId(productItem.productId),
          countryList: productItem.countryList.map((item) => ({
            countryId: item.countryId === 'All' ? 'All' : item.countryId,
            countryCodeAlpha3: item.countryCodeAlpha3,
            percentage: item.percentage,
            name: item.name,
          })),
        });
      } catch (error) {
        failed.push({
          productId: productItem.productId,
          error: error.message || 'Unknown error occurred',
        });
      }
    }

    if (newPromotions.length > 0) {
      const inserted =
        await this.additionalCountryLevelSettingModel.insertMany(newPromotions);
      successful.push(...inserted);
    }

    return { successful, failed };
  }

  async getProductsByPromotion(promotionId: string) {
    // Fetch promotion details
    const promotion = await this.additionalMintingPromotionModel
      .findOne({
        _id: new Types.ObjectId(promotionId),
        deletedAt: null,
      })
      .lean();

    if (!promotion) {
      throw new BadRequestException('Promotion not found or has been deleted');
    }

    // Fetch product settings directly (no need for aggregation)
    const settings = await this.additionalCountryLevelSettingModel
      .find({
        promotionId: new Types.ObjectId(promotionId),
        deletedAt: null,
      })
      .lean();

    if (!settings.length) {
      return {
        promotionName: promotion.promotionName,
        status: promotion.status,
        startDate: promotion.startDate,
        endDate: promotion.endDate,
        deletedAt: promotion.deletedAt,
        stoppedDate: promotion.stoppedDate,
        productSettings: [],
      };
    }

    // Transform the data into expected output format
    const productSettings = settings.map((setting) => ({
      productId: setting.productId.toString(),
      countryList: setting.countryList.map((country) => ({
        countryId: country.countryId?.toString() || null,
        name: country?.name || null,
        countryCodeAlpha3: country.countryCodeAlpha3 || null,
        percentage: country.percentage ?? null,
      })),
    }));

    return {
      promotionName: promotion.promotionName,
      startDate: promotion.startDate,
      endDate: promotion.endDate,
      deletedAt: promotion.deletedAt,
      stoppedDate: promotion.stoppedDate,
      status: promotion.status,
      productSettings,
      expiredDate:
        promotion && promotion.expiredDate
          ? promotion.expiredDate.toISOString().split('T')[0]
          : promotion.expiredDate,
    };
  }

  async markExpiredPromotions(): Promise<boolean> {
    const now = new Date();
    const today = now.toISOString().split('T')[0]; // Extract YYYY-MM-DD

    // Fetch active promotions
    const promotions = await this.additionalMintingPromotionModel.find({
      status: AdditionalMintingPromotionStatus.ACTIVE,
      deletedAt: null,
    });

    const expiredPromotions = promotions.filter((promo) => {
      const promoEndDate = promo.endDate?.toISOString().split('T')[0]; // Extract YYYY-MM-DD
      return promoEndDate && promoEndDate < today;
    });

    if (expiredPromotions.length > 0) {
      const promotionIds = expiredPromotions.map((promo) => promo._id);

      await this.additionalMintingPromotionModel.updateMany(
        { _id: { $in: promotionIds } },
        {
          $set: {
            expiredDate: new Date(),
            status: AdditionalMintingPromotionStatus.EXPIRED,
            note: `Promotion has been expired automatically due to date passing validation at ${new Date()}`,
          },
        },
      );
    }
    return expiredPromotions.length > 0;
  }
}
