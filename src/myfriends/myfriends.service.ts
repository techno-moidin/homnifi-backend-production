import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { WalletService } from '../wallet/wallet.service';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, PipelineStage, Types } from 'mongoose';
import { MyBlockchainIdService } from '../my-blockchain-id/my-blockchain-id.service';
import { CloudKProduct } from '../cloud-k/schemas/cloudk-products.schema';
import { MyFriendsProductPurhcaseBonusSetting } from './schemas/product-purchase-bonus-setting.schema';
import { MyFriendsBonusTransaction } from './schemas/bonus-transactions.schema';
import { User } from '../users/schemas/user.schema';
import { BONUS_TYPES } from './enums/bonus-types.enum';
import { TransactionFlow } from '../wallet/enums/transcation.flow.enum';
import {
  Deposit_Transaction_Type,
  TrxType,
} from '../global/enums/trx.type.enum';
import { TransactionStatus } from '../global/enums/transaction.status.enum';
import { PaginateDTO } from '../admin/global/dto/paginate.dto';
import { aggregatePaginate } from '../utils/pagination.service';
import { pipeline } from 'stream';
import { CHART_TIMELIME_TYPES } from './enums/chart-timelines.enum';
import {
  startOfMonth,
  endOfMonth,
  format,
  startOfWeek,
  endOfWeek,
  addWeeks,
  eachDayOfInterval,
  getDay,
} from 'date-fns';
import { CacheService } from '../cache/cache.service';
import { CACHE_TYPE } from '../cache/Enums/cache.enum';

@Injectable()
export class MyFriendsService {
  constructor(
    @Inject(forwardRef(() => WalletService))
    private walletService: WalletService,
    private myBidService: MyBlockchainIdService,
    @InjectModel(MyFriendsBonusTransaction.name)
    readonly bonusTrxModel: Model<MyFriendsBonusTransaction>,
    @InjectModel(MyFriendsProductPurhcaseBonusSetting.name)
    readonly productPurchaseBonusSettingModel: Model<MyFriendsProductPurhcaseBonusSetting>,
    private cacheService: CacheService,
  ) {}

  async getProductPurhcaseBonusSetting(): Promise<MyFriendsProductPurhcaseBonusSetting> | null {
    return await this.productPurchaseBonusSettingModel
      .findOne({})
      .populate('rewardToken')
      .sort({ createdAt: -1 });
  }

  async createBonusTransaction(
    user: Types.ObjectId,
    fromUser: Types.ObjectId | null,
    bonusType: BONUS_TYPES,
    tokenAmount: number,
    totalTokenPrice: number,
    token: Types.ObjectId,
    product: Types.ObjectId,
    session: ClientSession,
  ) {
    const bonusTrx = await this.bonusTrxModel.create(
      [
        {
          user,
          fromUser,
          bonusType,
          tokenAmount,
          totalTokenPrice,
          product,
          token,
        },
      ],
      {
        session,
      },
    );

    return bonusTrx[0];
  }

  async createProductPurchaseBonus(
    user: User,
    product: CloudKProduct,
    session: ClientSession,
  ) {
    const parent = await this.myBidService.syncUserUplineByBid(
      user.blockchainId,
    );

    if (!parent) return;

    const bonusSetting = await this.getProductPurhcaseBonusSetting();
    if (!bonusSetting) return;

    const totalAmount = (product.price * bonusSetting.percentage) / 100;

    const userRewardWallet =
      await this.walletService.findUserWalletByTokenSymbol(
        bonusSetting.rewardToken.symbol,
        parent._id,
        session,
      );
    const { walletBalance } = await this.walletService.getBalanceByWallet(
      parent._id,
      userRewardWallet._id,
    );
    const bonusTrx = await this.walletService.createRawWalletTransaction(
      {
        user: parent._id,
        amount: totalAmount,
        transactionFlow: TransactionFlow.IN,
        trxType: TrxType.BONUS,
        wallet: userRewardWallet._id,
      },
      session,
    );

    await this.createBonusTransaction(
      parent._id,
      user._id as Types.ObjectId,
      BONUS_TYPES.PRODUCT_PURCHASE,
      totalAmount,
      totalAmount,
      bonusSetting.rewardToken._id as Types.ObjectId,
      product._id as Types.ObjectId,
      session,
    );

    const { serialNumber: sN, requestId } =
      await this.walletService.generateUniqueRequestId(TrxType.BONUS, session);

    const newDeposit = new this.walletService.depositTransactionModel({
      user: parent._id,
      toWallet: userRewardWallet._id,
      toWalletTrx: bonusTrx[0]._id,
      amount: totalAmount,
      confirmation: '0',
      hash: TrxType.BONUS,
      onChainWallet: null,
      serialNumber: sN,
      requestId,
      transactionStatus: TransactionStatus.SUCCESS,
      newBalance: walletBalance + totalAmount,
      previousBalance: walletBalance,
      token: userRewardWallet?.token || null,
      network: null,
      blockchainId: user?.blockchainId || null,
    });
    await newDeposit.save({ session });
    const newDepositTransactionHistory =
      new this.walletService.depositTransactionHistoryModel({
        deposit_id: newDeposit._id,
        from: Deposit_Transaction_Type.Deposit,
        type: bonusTrx[0]?.trxType || 'deposit',
        user: parent._id,
        toWallet: userRewardWallet._id,
        toWalletTrx: bonusTrx[0]._id,
        amount: totalAmount,
        confirmation: '0',
        hash: TrxType.BONUS,
        onChainWallet: null,
        serialNumber: sN,
        requestId,
        transactionStatus: TransactionStatus.SUCCESS,
        newBalance: walletBalance + totalAmount,
        previousBalance: walletBalance,
        token: userRewardWallet?.token || null,
        network: null,
        blockchainId: user?.blockchainId || null,
      });
    await newDepositTransactionHistory.save({ session });
  }

  async getBonusHistory(
    user: Types.ObjectId,
    paginateDTO: PaginateDTO,
    {
      token,
      type,
      from,
      to,
      query,
    }: {
      machine?: string;
      token?: string;
      type?: BONUS_TYPES;
      from?: string;
      to?: string;
      query?: string;
    },
  ) {
    const { page, limit } = paginateDTO;
    const matchConditions: any[] = [{ user }];
    const searchConditions: any[] = [];
    if (token) {
      matchConditions.push({ token: new Types.ObjectId(token) });
    }
    if (type) {
      matchConditions.push({ bonusType: type });
    }
    if (from) {
      const fromDate = new Date(from);
      const toDate = to ? new Date(to) : new Date();
      toDate.setUTCHours(23, 59, 59, 999);
      matchConditions.push({
        createdAt: {
          $gte: fromDate,
          $lte: toDate,
        },
      });
    }

    if (query) {
      const queryNumber = parseInt(query, 10);
      if (!isNaN(queryNumber)) {
        searchConditions.push({
          $or: [
            // { serialNumber: queryNumber },
            {
              'fromUser.blockchainId': {
                $regex: query,
                $options: 'i',
              },
            },
          ],
        });
      } else {
        searchConditions.push({
          $or: [
            { requestId: { $regex: query, $options: 'i' } },
            {
              'fromUser.email': {
                $regex: query,
                $options: 'i',
              },
            },
            {
              'fromUser.firstName': {
                $regex: query,
                $options: 'i',
              },
            },
            {
              'fromUser.lastName': {
                $regex: query,
                $options: 'i',
              },
            },
          ],
        });
      }
    }

    const search = query
      ? {
          $match: {
            $and: searchConditions,
          },
        }
      : { $match: {} }; // Ensure you have a valid $match stage even when query is falsy

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
        $group: {
          _id: '$fromUser',
          totalTokenAmount: {
            $sum: '$tokenAmount',
          },
          totalMachines: {
            $sum: {
              $cond: {
                if: { $eq: ['$bonusType', 'product-purchase'] },
                then: 1,
                else: 0,
              },
            },
          },
          tokenId: { $first: '$token' },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'fromUser',
        },
      },
      {
        $unwind: {
          path: '$fromUser',
          preserveNullAndEmptyArrays: true,
        },
      },
      // {
      //   $lookup: {
      //     from: 'cloudkproducts',
      //     localField: 'product',
      //     foreignField: '_id',
      //     as: 'product',
      //     pipeline: [
      //       {
      //         $project: {
      //           name: 1,
      //           imageUrl: 1,
      //           price: 1,
      //         },
      //       },
      //     ],
      //   },
      // },
      // {
      //   $unwind: {
      //     path: '$product',
      //     preserveNullAndEmptyArrays: true,
      //   },
      // },
      { ...search },
      {
        $lookup: {
          from: 'tokens',
          localField: 'tokenId',
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
    ];

    const data = await aggregatePaginate(
      this.bonusTrxModel,
      pipeline,
      page,
      limit,
    );

    return data;
  }

  async getTotalRewards(userId: Types.ObjectId) {
    const pipeline: PipelineStage[] = [
      {
        $match: {
          user: userId,
        },
      },
      {
        $group: {
          _id: null,
          total: {
            $sum: '$totalTokenPrice',
          },
        },
      },
    ];

    const result = await this.bonusTrxModel.aggregate(pipeline);
    const setting = await this.getProductPurhcaseBonusSetting();

    const data = {
      totalRewards: result[0] ? result[0].total : 0,
      token: {
        name: setting.rewardToken.name,
        symbol: setting.rewardToken.symbol,
        iconUrl: setting.rewardToken.iconUrl,
      },
    };

    return data;
  }

  async getMonthlyBonusChartData(userId: Types.ObjectId) {
    const graphDataCache = await this.cacheService.getCacheUser({
      type: CACHE_TYPE.MONTHLY_GRAPH_DATA,
      user: String(userId),
    });

    if (graphDataCache) {
      return graphDataCache;
    }

    const startDate = new Date(2024, 0, 1); // January 1, 2024
    const pipeline: PipelineStage[] = [
      {
        $match: {
          createdAt: { $gte: startDate },
          user: userId,
        },
      },
      {
        $group: {
          _id: {
            month: { $month: '$createdAt' },
            year: { $year: '$createdAt' },
          },
          totalTokenAmount: { $sum: '$tokenAmount' },
        },
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 },
      },
      {
        $project: {
          _id: 0,
          month: '$_id.month',
          year: '$_id.year',
          totalTokenAmount: 1,
        },
      },
    ];

    const result = await this.bonusTrxModel.aggregate(pipeline).exec();

    const months = [
      { month: 1, name: 'Jan' },
      { month: 2, name: 'Feb' },
      { month: 3, name: 'Mar' },
      { month: 4, name: 'Apr' },
      { month: 5, name: 'May' },
      { month: 6, name: 'Jun' },
      { month: 7, name: 'Jul' },
      { month: 8, name: 'Aug' },
      { month: 9, name: 'Sep' },
      { month: 10, name: 'Oct' },
      { month: 11, name: 'Nov' },
      { month: 12, name: 'Dec' },
    ];

    const currentMonth = new Date().getMonth();

    const monthlyTokenAmounts = months.map((month, index) => {
      const found = result.find(
        (item) => item.month === month.month && item.year === 2024,
      );
      return {
        x: month.name,
        y: found ? found.totalTokenAmount : currentMonth >= index ? 0 : null,
      };
    });

    await this.cacheService.setCacheUser(
      {
        type: CACHE_TYPE.MONTHLY_GRAPH_DATA,
        user: String(userId),
        data: monthlyTokenAmounts,
      },
      86400,
    );

    return monthlyTokenAmounts;
  }

  async getWeeklyBonusChartData(userId: Types.ObjectId) {
    const graphDataCache = await this.cacheService.getCacheUser({
      type: CACHE_TYPE.WEEK_GRAPH_DATA,
      user: String(userId),
    });

    if (graphDataCache) {
      return graphDataCache;
    }

    const startDate = new Date(2024, 6, 1); // July 1, 2024
    const endDate = new Date(2024, 11, 31); // December 31, 2024 (end of the year)

    const pipeline: PipelineStage[] = [
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          user: userId,
        },
      },
      {
        $group: {
          _id: {
            week: { $week: '$createdAt' },
            year: { $year: '$createdAt' },
          },
          totalTokenAmount: { $sum: '$tokenAmount' },
        },
      },
      {
        $sort: { '_id.year': 1, '_id.week': 1 },
      },
      {
        $project: {
          _id: 0,
          week: '$_id.week',
          year: '$_id.year',
          totalTokenAmount: 1,
        },
      },
    ];

    const result = await this.bonusTrxModel.aggregate(pipeline).exec();

    // Generate all weeks from the start date to the end of the year
    let currentWeekStart = startOfWeek(startDate, { weekStartsOn: 0 });
    const weeks = [];

    while (currentWeekStart <= endDate) {
      weeks.push({
        start: currentWeekStart,
        end: endOfWeek(currentWeekStart, { weekStartsOn: 0 }),
      });
      currentWeekStart = addWeeks(currentWeekStart, 1);
    }

    // Map results to include all weeks
    const weeklyTokenAmounts = weeks.map((week) => {
      const found = result.find((item) => {
        const weekStart = startOfWeek(
          new Date(item.year, 0, (item.week - 1) * 7 + 1),
          { weekStartsOn: 0 },
        );
        return week.start.getTime() === weekStart.getTime();
      });

      return {
        // x: `${format(week.start, 'MMM d')} - ${format(week.end, 'MMM d')}`,
        x: `${format(week.start, 'MMM d')}`,
        y: found ? found.totalTokenAmount : 0,
      };
    });

    await this.cacheService.setCacheUser(
      {
        type: CACHE_TYPE.WEEK_GRAPH_DATA,
        user: String(userId),
        data: weeklyTokenAmounts,
      },
      86400,
    );

    return weeklyTokenAmounts;
  }

  async getCurrentWeekChartData(userId: Types.ObjectId) {
    const graphDataCache = await this.cacheService.getCacheUser({
      type: CACHE_TYPE.WEEK_GRAPH_DATA,
      user: String(userId),
    });
    if (graphDataCache) {
      //
      return graphDataCache;
    } else {
      const now = new Date();
      const startOfCurrentWeek = startOfWeek(now, { weekStartsOn: 1 }); // Monday
      const endOfCurrentWeek = endOfWeek(now, { weekStartsOn: 1 }); // Sunday

      const pipeline: PipelineStage[] = [
        {
          $match: {
            createdAt: {
              $gte: startOfCurrentWeek,
              $lte: endOfCurrentWeek,
            },
            user: userId,
          },
        },
        {
          $group: {
            _id: {
              day: { $dayOfMonth: '$createdAt' },
              month: { $month: '$createdAt' },
              year: { $year: '$createdAt' },
            },
            totalTokenAmount: { $sum: '$tokenAmount' },
          },
        },
        {
          $sort: {
            '_id.year': 1,
            '_id.month': 1,
            '_id.day': 1,
          },
        },
        {
          $project: {
            _id: 0,
            day: '$_id.day',
            month: '$_id.month',
            year: '$_id.year',
            totalTokenAmount: 1,
          },
        },
      ];

      const result = await this.bonusTrxModel.aggregate(pipeline).exec();

      // Generate all days for the current week
      const daysOfWeek = eachDayOfInterval({
        start: startOfCurrentWeek,
        end: endOfCurrentWeek,
      });

      // Map results to include all days of the current week
      const dailyTokenAmounts = daysOfWeek.map((day, index) => {
        const found = result.find(
          (item) =>
            item.day === day.getDate() &&
            item.month === day.getMonth() + 1 &&
            item.year === day.getFullYear(),
        );

        const dayIndex = getDay(new Date());
        const weekdayIndex = (dayIndex + 6) % 7;

        return {
          x: format(day, 'EEE'),
          y: found ? found.totalTokenAmount : weekdayIndex >= index ? 0 : null,
        };
      });
      await this.cacheService.setCacheUser(
        {
          type: CACHE_TYPE.WEEK_GRAPH_DATA,
          user: String(userId),
          data: dailyTokenAmounts,
        },
        86400,
      );

      return dailyTokenAmounts;
    }
  }

  async getYearlyBonusChartData(userId: Types.ObjectId) {
    const graphDataCache = await this.cacheService.getCacheUser({
      type: CACHE_TYPE.YEARLY_GRAPH_DATA,
      user: String(userId),
    });

    if (graphDataCache) {
      return graphDataCache;
    }
    const startDate = new Date(2024, 0, 1); // January 1, 2024

    const pipeline: PipelineStage[] = [
      {
        $match: {
          createdAt: { $gte: startDate },
          user: userId,
        },
      },
      {
        $group: {
          _id: { year: { $year: '$createdAt' } },
          totalTokenAmount: { $sum: '$tokenAmount' },
        },
      },
      {
        $sort: { '_id.year': 1 },
      },
      {
        $project: {
          _id: 0,
          year: '$_id.year',
          totalTokenAmount: 1,
        },
      },
    ];

    const result = await this.bonusTrxModel.aggregate(pipeline).exec();

    // Create an array for all years starting from 2024 to the current year
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let year = 2024; year <= currentYear; year++) {
      years.push(year);
    }

    // Map results to include all years
    const yearlyTokenAmounts = years.map((year) => {
      const found = result.find((item) => item.year === year);
      return {
        x: year.toString(),
        y: found ? found.totalTokenAmount : null,
      };
    });

    await this.cacheService.setCacheUser(
      {
        type: CACHE_TYPE.YEARLY_GRAPH_DATA,
        user: String(userId),
        data: yearlyTokenAmounts,
      },
      86400,
    );

    return yearlyTokenAmounts;
  }

  async getRewardsChartData(
    userId: Types.ObjectId,
    timeline: CHART_TIMELIME_TYPES,
  ) {
    if (timeline === CHART_TIMELIME_TYPES.MONTHLY)
      return await this.getMonthlyBonusChartData(userId);
    if (timeline === CHART_TIMELIME_TYPES.YEARLY)
      return await this.getYearlyBonusChartData(userId);
    if (timeline === CHART_TIMELIME_TYPES.WEEKLY)
      return await this.getCurrentWeekChartData(userId);
  }
}
