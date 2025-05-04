import {
  BadRequestException,
  HttpException,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
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
import { NetworkI } from '@/src/token/interfaces/network.interface';
import { UsersService } from '@/src/users/users.service';
import { CacheService } from '@/src/cache/cache.service';
import {
  PaginateDTO,
  SortDTO,
  SwapFilterDTO,
  TokenFilterDTO,
  WalletFilterDTO,
  WithdrawFilterDTO,
} from '@/src/admin/global/dto/paginate.dto';
import { User } from '@/src/users/schemas/user.schema';
import { WithdrawTransaction } from '../wallet/schemas/withdraw.transaction.schema';
import { Network } from '@/src/token/schemas/network.schema';
import { pagination } from '@/src/utils/helpers';
import { StaticToken, TokenI } from '@/src/token/interfaces/token.interface';
import { Token, ValueType } from '@/src/token/schemas/token.schema';
import { DepositTransaction } from '../wallet/schemas/deposit.transaction.schema';
import { DepositTransactionI } from '../wallet/interfaces/deposit-transaction.interface';
import { Platform } from '@/src/platform/schemas/platform.schema';
import { SwapTransaction } from '../wallet/schemas/swap.transaction.schema';
import { SpecialSwapTransaction } from '../wallet/schemas/special.swap.transaction.schema';
import { SwapTransactionI } from '../wallet/interfaces/swap-transaction.interface';
import { aggregatePaginate } from '@/src/utils/pagination.service';
import { pipe } from 'rxjs';
import { Wallet } from '../wallet/schemas/wallet.schema';
import { WalletTransaction } from '../wallet/schemas/wallet.transaction.schema.';
import ApiResponse from '../utils/api-response.util';
import { CONVERSION_TYPES } from '../global/enums/wallet.enum';
import { WalletService } from '../wallet/wallet.service';
import { toFullDecimalString } from '../utils/common/common.functions';
@Injectable()
export class AdminWalletService {
  private readonly tronWeb: any;
  constructor(
    private readonly httpService: HttpService,
    private readonly usersService: UsersService,
    private readonly walletService: WalletService,

    private cacheService: CacheService,
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    @InjectModel(Network.name)
    private readonly networkModel: Model<NetworkI>,
    @InjectModel(WithdrawTransaction.name)
    private readonly withdrawTransactionModel: Model<WithdrawTransaction>,
    @InjectModel(Token.name)
    private readonly tokenModel: Model<TokenI>,
    @InjectModel(DepositTransaction.name)
    readonly depositTransactionModel: Model<DepositTransactionI>,
    @InjectModel(Platform.name)
    private readonly platformModel: Model<Platform>,
    @InjectModel(SwapTransaction.name)
    private readonly swapTransactionModel: Model<SwapTransactionI>,
    @InjectModel(SpecialSwapTransaction.name)
    private readonly specialSwapTransactionModel: Model<SpecialSwapTransaction>,

    @InjectModel(Wallet.name)
    private readonly walletModel: Model<Wallet>,
    @InjectModel(WalletTransaction.name)
    private readonly walletTransactionModel: Model<WalletTransaction>,
  ) {}
  // async getWalletSummary(filterDTO: WithdrawFilterDTO) {
  //   const { token, query, fromDate, toDate, transactionFlow } = filterDTO;
  //   let match: any = {
  //     deletedAt: null,
  //     ...(transactionFlow ? { transactionFlow: transactionFlow } : {}),
  //   };
  //   const matchCriteriaPipeline: any = {
  //     ...(token ? { 'token.symbol': token.toLowerCase() } : {}),
  //   };
  //   if (query) {
  //     const userSearchRegex = new RegExp(query, 'i');
  //     const users = await this.userModel
  //       .findOne({
  //         $or: [
  //           { email: userSearchRegex },
  //           { username: userSearchRegex },
  //           { blockchainId: userSearchRegex },
  //           { firstName: userSearchRegex },
  //         ],
  //         deletedAt: null,
  //       })
  //       .lean();
  //     if (users) {
  //       match.user = users._id;
  //     }
  //   }
  //   if (fromDate) {
  //     const fromDate3 = new Date(fromDate);
  //     const toDate2 = toDate ? new Date(toDate) : new Date();
  //     toDate2.setUTCHours(23, 59, 59, 999);
  //     match = {
  //       ...match,
  //       createdAt: {
  //         $gte: fromDate3,
  //         $lte: toDate2,
  //       },
  //     };
  //   }

  //   const pipeline: PipelineStage[] = [
  //     {
  //       $match: match,
  //     },
  //     {
  //       $lookup: {
  //         from: 'wallets',
  //         localField: 'wallet',
  //         foreignField: '_id',
  //         as: 'wallet',
  //       },
  //     },
  //     { $unwind: '$wallet' },
  //     {
  //       $lookup: {
  //         from: 'tokens',
  //         localField: 'wallet.token',
  //         foreignField: '_id',
  //         as: 'token',
  //       },
  //     },
  //     { $unwind: '$token' },
  //     {
  //       $match: matchCriteriaPipeline,
  //     },
  //     {
  //       $group: {
  //         _id: {
  //           token: '$token.name',
  //           symbol: '$token.symbol',
  //           valueType: '$token.valueType',
  //         },
  //         incomingBalance: {
  //           $sum: {
  //             $cond: [{ $eq: ['$transactionFlow', 'in'] }, '$amount', 0],
  //           },
  //         },
  //         outgoingBalance: {
  //           $sum: {
  //             $cond: [{ $eq: ['$transactionFlow', 'out'] }, '$amount', 0],
  //           },
  //         },
  //         totalStaked: {
  //           $sum: {
  //             $cond: [
  //               {
  //                 $and: [
  //                   { $eq: ['$trxType', 'stake'] },
  //                   { $eq: ['$transactionFlow', 'out'] },
  //                 ],
  //               },
  //               '$amount',
  //               0,
  //             ],
  //           },
  //         },
  //       },
  //     },
  //     {
  //       $addFields: {
  //         totalAmount: {
  //           $subtract: ['$incomingBalance', '$outgoingBalance'],
  //         },
  //         tokenSortOrder: { $toLower: '$_id.symbol' },
  //       },
  //     },
  //     {
  //       $project: {
  //         token: '$_id.token',
  //         symbol: '$_id.symbol',
  //         valueType: '$_id.valueType',
  //         incomingBalance: 1,
  //         outgoingBalance: 1,
  //         totalStaked: 1,
  //         totalAmount: 1,
  //         _id: 0,
  //       },
  //     },
  //     {
  //       $sort: {
  //         tokenSortOrder: 1, // Sort alphabetically by token symbol
  //       },
  //     },
  //   ];

  //   const result = await this.walletTransactionModel.aggregate(pipeline).exec();

  //   // Convert the amount to USD =================================================================
  //   // const { price } = await this.walletService.getCurrentPrice();

  //   // const pipelineWithUSDConversion: PipelineStage[] = [
  //   //   {
  //   //     $match: match,
  //   //   },
  //   //   {
  //   //     $lookup: {
  //   //       from: 'wallets',
  //   //       localField: 'wallet',
  //   //       foreignField: '_id',
  //   //       as: 'wallet',
  //   //     },
  //   //   },
  //   //   { $unwind: '$wallet' },
  //   //   {
  //   //     $lookup: {
  //   //       from: 'tokens',
  //   //       localField: 'wallet.token',
  //   //       foreignField: '_id',
  //   //       as: 'token',
  //   //     },
  //   //   },
  //   //   { $unwind: '$token' },
  //   //   {
  //   //     $match: matchCriteriaPipeline,
  //   //   },
  //   //   {
  //   //     $group: {
  //   //       _id: {
  //   //         token: '$token.name',
  //   //         symbol: '$token.symbol',
  //   //         valueType: '$token.valueType',
  //   //       },
  //   //       incomingBalance: {
  //   //         $sum: {
  //   //           $cond: [
  //   //             { $eq: ['$transactionFlow', 'in'] },
  //   //             {
  //   //               $cond: [
  //   //                 { $eq: ['$token.conversionType', CONVERSION_TYPES.CUSTOM] },
  //   //                 { $multiply: ['$amount', '$token.customRate'] },
  //   //                 {
  //   //                   $cond: [
  //   //                     { $eq: ['$token.valueType', ValueType.LYK] },
  //   //                     { $multiply: ['$amount', price] },
  //   //                     '$amount', // Normal amount
  //   //                   ],
  //   //                 },
  //   //               ],
  //   //             },
  //   //             0,
  //   //           ],
  //   //         },
  //   //       },
  //   //       outgoingBalance: {
  //   //         $sum: {
  //   //           $cond: [
  //   //             { $eq: ['$transactionFlow', 'out'] },
  //   //             {
  //   //               $cond: [
  //   //                 { $eq: ['$token.conversionType', CONVERSION_TYPES.CUSTOM] },
  //   //                 { $multiply: ['$amount', '$token.customRate'] },
  //   //                 {
  //   //                   $cond: [
  //   //                     { $eq: ['$token.valueType', ValueType.LYK] },
  //   //                     { $multiply: ['$amount', price] },
  //   //                     '$amount', // Normal amount
  //   //                   ],
  //   //                 },
  //   //               ],
  //   //             },
  //   //             0,
  //   //           ],
  //   //         },
  //   //       },
  //   //       totalStaked: {
  //   //         $sum: {
  //   //           $cond: [
  //   //             {
  //   //               $and: [
  //   //                 { $eq: ['$trxType', 'stake'] },
  //   //                 { $eq: ['$transactionFlow', 'out'] },
  //   //               ],
  //   //             },
  //   //             {
  //   //               $cond: [
  //   //                 { $eq: ['$token.conversionType', CONVERSION_TYPES.CUSTOM] },
  //   //                 { $multiply: ['$amount', '$token.customRate'] },
  //   //                 {
  //   //                   $cond: [
  //   //                     { $eq: ['$token.valueType', ValueType.LYK] },
  //   //                     { $multiply: ['$amount', price] },
  //   //                     '$amount', // Normal amount
  //   //                   ],
  //   //                 },
  //   //               ],
  //   //             },
  //   //             0,
  //   //           ],
  //   //         },
  //   //       },
  //   //     },
  //   //   },
  //   //   {
  //   //     $addFields: {
  //   //       totalAmount: {
  //   //         $subtract: ['$incomingBalance', '$outgoingBalance'],
  //   //       },
  //   //       tokenSortOrder: { $toLower: '$_id.symbol' },
  //   //     },
  //   //   },
  //   //   {
  //   //     $project: {
  //   //       token: '$_id.token',
  //   //       symbol: '$_id.symbol',
  //   //       valueType: '$_id.valueType',
  //   //       incomingBalance: 1,
  //   //       outgoingBalance: 1,
  //   //       totalStaked: 1,
  //   //       totalAmount: 1,
  //   //       _id: 0,
  //   //     },
  //   //   },
  //   //   {
  //   //     $sort: {
  //   //       tokenSortOrder: 1, // Sort alphabetically by token symbol
  //   //     },
  //   //   },
  //   // ];

  //   // const result = await this.walletTransactionModel.aggregate(pipelineWithUSDConversion).exec();
  //   // =================================================================

  //   const totalWalletAmount = result.reduce(
  //     (sum, item) => sum + (item.totalAmount || 0),
  //     0,
  //   );
  //   return {
  //     data: {
  //       list: result,
  //       summary: { title: 'Total Wallet Amount', totalWalletAmount },
  //     },
  //     status: true,
  //     message: 'Ok',
  //   };
  // }

  async getWalletSummaryV1() {
    // Get all tokens first
    const allTokens = await this.tokenModel.find({ deletedAt: null }).lean();

    // Simple pipeline that only groups by token and sums balances
    const pipeline: PipelineStage[] = [
      {
        $match: {
          deletedAt: null,
        },
      },
      {
        $group: {
          _id: '$token',
          totalAmount: { $sum: '$totalBalanceinToken' },
        },
      },
      {
        $project: {
          token: '$_id',
          totalAmount: 1,
          _id: 0,
        },
      },
    ];

    // Execute the aggregation
    const result = await this.walletModel.aggregate(pipeline).exec();

    // Enhance result with token details
    const enhancedResult = result.map((item) => {
      // Find the token details from allTokens
      const tokenDetails: any = allTokens.find(
        (token) => token._id.toString() === item.token.toString(),
      );

      if (tokenDetails) {
        return {
          ...item,
          token: tokenDetails.name,
          tokenName: tokenDetails.name,
          symbol: tokenDetails.symbol,
          valueType: tokenDetails.valueType,
          borderColor: tokenDetails.borderColor,
          color: tokenDetails.color,
          networks: tokenDetails.networks,
          iconUrl: tokenDetails.iconUrl,
        };
      }

      return item;
    });

    enhancedResult.sort((a, b) => a.token.localeCompare(b.token));
    const totalWalletAmount = enhancedResult.reduce(
      (sum, item) => sum + (item.totalAmount || 0),
      0,
    );

    return {
      data: {
        list: enhancedResult,
        summary: { title: 'Total Wallet Token Amount', totalWalletAmount },
      },
      status: true,
      message: 'Ok',
    };
  }
  async getAllWalletPaginated(
    paginateDTO: WalletFilterDTO,
    joinDateFilter?: string,
  ) {
    const {
      page,
      limit,
      query,
      transactionFlow,
      fromDate,
      toDate,
      token,
      sort,
    } = paginateDTO;

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
      const searchRegex = new RegExp(query, 'i');
      const matchingUsers = await this.userModel
        .find({
          deletedAt: { $eq: null },
          $or: [{ email: searchRegex }, { blockchainId: searchRegex }],
        })
        .select('_id');
      whereConfig = {
        ...whereConfig,
        $or: [
          { requestId: searchRegex },
          { user: { $in: matchingUsers.map((u) => u._id) } },
        ],
      };
    }
    if (transactionFlow) {
      // Changed: Directly add withdrawType to whereConfig
      whereConfig = {
        ...whereConfig,
        transactionFlow: transactionFlow,
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
    // Requirement: Add a filter to display withdrawal requests based on the user's joined date.
    // - Users who joined before September 1st, 2024
    // - Users who joined on or after September 1st, 2024
    let userIds = [];
    if (joinDateFilter) {
      let joinDateCondition = {};
      if (joinDateFilter === 'before') {
        joinDateCondition = {
          dateJoined: { $lt: new Date('2025-01-01T00:00:00Z') },
        };
      } else if (joinDateFilter === 'after') {
        joinDateCondition = {
          dateJoined: { $gte: new Date('2025-01-01T00:00:00Z') },
        };
      }
      const users = await this.userModel
        .find(joinDateCondition)
        .select('_id')
        .lean();
      userIds = users.map((user) => user._id);
    }
    if (userIds.length > 0) {
      whereConfig = {
        ...whereConfig,
        user: { $in: userIds },
      };
    }
    const paginate = await pagination({
      page,
      pageSize: limit,
      model: this.walletTransactionModel,
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
    const list = await this.walletTransactionModel
      .find(whereConfig)
      .sort(sortQuery)
      .skip(paginate.offset)
      .limit(paginate.limit)
      .populate([
        {
          path: 'user',
          select:
            '_id blockchainId firstName lastName username profilePicture email',
          strictPopulate: false,
        },
        {
          path: 'wallet',
          select: '_id token',
          populate: {
            path: 'token',
            select:
              '_id name symbol networks iconUrl valueType color borderColor type',
            strictPopulate: false,
          },
          strictPopulate: false,
        },
      ]);

    return {
      list,
      totalCount: paginate.total,
      totalPages: paginate.metadata.page.totalPage,
      currentPage: paginate.metadata.page.currentPage,
      paginate,
    };
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
    const pipeline: any = [
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
        $addFields: {
          // Dynamically adding sorting keys for token and network
          tokenSortOrder: { $toLower: '$_id.symbol' },
          networkSortOrder: { $toLower: '$_id.network' },
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
      {
        $sort: {
          networkSortOrder: 1, // Sort first by network name alphabetically
          network: 1, // Then by the original network name
          tokenSortOrder: 1, // Sort by token symbol alphabetically
          symbol: 1, // Then by the original token symbol
        },
      },
    ];
    const result = await this.withdrawTransactionModel
      .aggregate(pipeline)
      .exec();
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
  async getAllWithdrawsPaginated(
    paginateDTO: WalletFilterDTO,
    joinDateFilter?: string,
  ) {
    const { page, limit, query, type, status, fromDate, toDate, token, sort } =
      paginateDTO;
    console.log(
      page,
      limit,
      query,
      type,
      status,
      fromDate,
      toDate,
      token,
      sort,
    );
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
      const searchRegex = new RegExp(query, 'i');
      const matchingUsers = await this.userModel
        .find({
          deletedAt: { $eq: null },
          $or: [{ email: searchRegex }, { blockchainId: searchRegex }],
        })
        .select('_id');
      whereConfig = {
        ...whereConfig,
        $or: [
          { requestId: searchRegex },
          { user: { $in: matchingUsers.map((u) => u._id) } },
        ],
      };
    }
    if (type) {
      // Changed: Directly add withdrawType to whereConfig
      whereConfig = {
        ...whereConfig,
        withdrawType: type,
      };
    }
    if (status) {
      // Changed: Directly add requestStatus to whereConfig
      whereConfig = {
        ...whereConfig,
        requestStatus: status,
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
    // Requirement: Add a filter to display withdrawal requests based on the user's joined date.
    // - Users who joined before September 1st, 2024
    // - Users who joined on or after September 1st, 2024
    let userIds = [];
    if (joinDateFilter) {
      let joinDateCondition = {};
      if (joinDateFilter === 'before') {
        joinDateCondition = {
          dateJoined: { $lt: new Date('2025-01-01T00:00:00Z') },
        };
      } else if (joinDateFilter === 'after') {
        joinDateCondition = {
          dateJoined: { $gte: new Date('2025-01-01T00:00:00Z') },
        };
      }
      const users = await this.userModel
        .find(joinDateCondition)
        .select('_id')
        .lean();
      userIds = users.map((user) => user._id);
    }
    if (userIds.length > 0) {
      whereConfig = {
        ...whereConfig,
        user: { $in: userIds },
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
    console.log(JSON.stringify(whereConfig, null, 2), 'whereConfiguration');
    const list = await this.withdrawTransactionModel
      .find(whereConfig)
      .sort(sortQuery)
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
        {
          path: 'network',
        },
      ]);
    const amountoftotal = await this.withdrawTransactionModel.find(whereConfig);
    // Calculate the total amount from the fetched documents
    const totalAmount = amountoftotal.reduce(
      (sum, transaction) => sum + transaction.amount,
      0,
    );
    const totalNoOfPendingTransactions = amountoftotal.length;
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
        $sort: { token: 1, symbol: 1 },
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
        $or: [{ transactionStatus: status }, { status: status }],
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
        $sort: {
          fromTokenSymbol: 1,
          toTokenSymbol: 1,
        },
      },
      {
        $group: {
          _id: {
            fromToken: '$fromToken.name',
            fromTokenName: '$fromToken.name',
            fromTokenSymbol: '$fromToken.symbol',
            toToken: '$toToken.name',
            toTokenName: '$toToken.name',
            toTokenSymbol: '$toToken.symbol',
          },
          totalAmount: { $sum: '$amount' },
        },
      },
      {
        $addFields: {
          // Sorting all tokens alphabetically for fromTokenSymbol
          fromTokenSortOrder: { $toLower: '$fromTokenSymbol' }, // Sort by lowercase representation to ensure case insensitivity
          toTokenSortOrder: { $toLower: '$toTokenSymbol' }, // Sort by lowercase representation to ensure case insensitivity
        },
      },
      {
        $project: {
          fromTokenId: '$_id.fromTokenId',
          fromTokenName: '$_id.fromToken',
          fromTokenSymbol: '$_id.fromTokenSymbol',
          toTokenId: '$_id.toTokenId',
          toTokenName: '$_id.toToken',
          toTokenSymbol: '$_id.toTokenSymbol',
          totalAmount: 1,
          totalFee: 1,
          totalCommission: 1,
          _id: 0,
        },
      },
      {
        $sort: {
          fromTokenSortOrder: 1, // Sort first by the alphabetically sorted fromTokenSymbol
          fromTokenSymbol: 1, // Then sort alphabetically by the original fromTokenSymbol
          toTokenSortOrder: 1, // Then sort by alphabetically sorted toTokenSymbol
          toTokenSymbol: 1, // Finally sort alphabetically by the original toTokenSymbol
        },
      },
    ];
    // const pipeline: PipelineStage[] = [
    //   {
    //     $match: match,
    //   },
    //   {
    //     $lookup: {
    //       from: 'wallets',
    //       localField: 'fromWallet',
    //       foreignField: '_id',
    //       as: 'fromWallet',
    //     },
    //   },
    //   { $unwind: '$fromWallet' },
    //   {
    //     $lookup: {
    //       from: 'wallets',
    //       localField: 'toWallet',
    //       foreignField: '_id',
    //       as: 'toWallet',
    //     },
    //   },
    //   { $unwind: '$toWallet' },
    //   {
    //     $lookup: {
    //       from: 'tokens',
    //       localField: 'fromWallet.token',
    //       foreignField: '_id',
    //       as: 'fromToken',
    //     },
    //   },
    //   { $unwind: '$fromToken' },
    //   {
    //     $lookup: {
    //       from: 'tokens',
    //       localField: 'toWallet.token',
    //       foreignField: '_id',
    //       as: 'toToken',
    //     },
    //   },
    //   { $unwind: '$toToken' },
    //   {
    //     $match: matchCriteria,
    //   },
    //   {
    //     $sort: {
    //       fromTokenSymbol: 1,
    //       toTokenSymbol: 1,
    //     },
    //   },
    //   {
    //     $group: {
    //       _id: {
    //         fromToken: '$fromToken.name',
    //         fromTokenSymbol: '$fromToken.name',
    //         toToken: '$toToken.name',
    //         toTokenSymbol: '$toToken.name',
    //       },
    //       totalAmount: { $sum: '$amount' },
    //     },
    //   },
    //   {
    //     $project: {
    //       fromTokenId: '$_id.fromTokenId',
    //       fromTokenSymbol: '$_id.fromTokenSymbol',
    //       toTokenId: '$_id.toTokenId',
    //       toTokenSymbol: '$_id.toTokenSymbol',
    //       totalAmount: 1,
    //       totalFee: 1,
    //       totalCommission: 1,
    //       _id: 0,
    //     },
    //   },
    // ];
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
    const matchConditions: any[] = [{ deletedAt: { $eq: null } }];
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

  // Origin Code for getAllUserWalletBalance
  async getAllUserWalletBalance(paginateDTO: PaginateDTO) {
    const { page, limit, query } = paginateDTO;
    const skip = (page - 1) * limit;
    // Build the search criteria
    const searchCriteria = { deletedAt: null };
    if (query) {
      searchCriteria['$or'] = [
        { email: { $regex: query, $options: 'i' } },
        { blockchainId: { $regex: query, $options: 'i' } },
        { username: { $regex: query, $options: 'i' } },
      ];
    }
    const users = await this.userModel
      .find(searchCriteria, 'email blockchainId username name')
      .skip(skip)
      .limit(limit)
      .lean();
    const userIds = users.map((user) => user._id);
    const wallets = await this.walletModel
      .find({ user: { $in: userIds }, deletedAt: null }, '_id user token')
      .lean();
    const walletIds = wallets.map((wallet) => wallet._id);
    const walletUserIds = wallets.map((wallet) => wallet.user);
    const paginate = await pagination({
      page,
      pageSize: limit,
      model: this.userModel,
      condition: searchCriteria,
      pagingRange: 5,
    });
    const walletTransactions = await this.walletTransactionModel
      .find({
        wallet: { $in: [...walletIds, ...walletUserIds] },
        deletedAt: null,
      })
      // .skip(skip)
      // .limit(limit)
      .lean();
    const tokenIds = wallets.map((wallet) => wallet.token);
    const tokens = await this.tokenModel
      .find({ _id: { $in: tokenIds } })
      .lean();
    const userWalletBalances = users.map((user) => {
      const userWallets = wallets.filter(
        (wallet) => wallet.user.toString() === user._id.toString(),
      );
      const tokenBalances = userWallets.reduce((acc, wallet) => {
        const userTransactions = walletTransactions.filter(
          (transaction) =>
            transaction.wallet.toString() === wallet._id.toString(),
        );
        const totalIn = userTransactions
          .filter((transaction) => transaction.transactionFlow === 'in')
          .reduce((sum, transaction) => sum + transaction.amount, 0);
        const totalOut = userTransactions
          .filter((transaction) => transaction.transactionFlow === 'out')
          .reduce((sum, transaction) => sum + transaction.amount, 0);
        const remainingBalance = totalIn - totalOut;
        const token = tokens.find(
          (t) => t._id.toString() === wallet.token.toString(),
        );
        const tokenSymbol = token ? token.symbol : 'unknown';
        if (!acc[tokenSymbol]) {
          acc[tokenSymbol] = 0;
        }
        acc[tokenSymbol] += remainingBalance;
        return acc;
      }, {});
      const walletArray = Object.keys(tokenBalances)
        .filter((key) => tokenBalances[key] > 0)
        .map((key) => ({
          [key]: tokenBalances[key],
        }));
      return {
        user,
        wallet: walletArray,
      };
    });
    return new ApiResponse(
      {
        userWalletBalances,
        totalCount: paginate.total,
        totalPages: paginate.metadata.page.totalPage,
        currentPage: paginate.metadata.page.currentPage,
      },
      'All User Wallet Balance',
    );
  }

  async getAllUserWalletBalanceWithSorting(paginatSortDTO: SortDTO) {
    const { page, limit, query, sort } = paginatSortDTO;

    try {
      // Ensure page and limit are numbers
      const pageNum = Number(page) || 1;
      const limitNum = Number(limit) || 10;
      const skip = (pageNum - 1) * limitNum;
      const allTokenData = await this.tokenModel.find({});
      let paginateWithoutSort: any = null;
      // Default sort by createdAt ascending
      let sortOrder = 1;
      let tokenToSort = null;
      let walletQuery: any = { deletedAt: null };
      let userQuery: any = { deletedAt: null };

      let limitedUserData: any;

      if (query && sort) {
        const users = await this.userModel
          .find({
            $or: [
              { blockchainId: { $regex: query, $options: 'i' } },
              { email: { $regex: query, $options: 'i' } },
              { username: { $regex: query, $options: 'i' } },
            ],
            deletedAt: null,
          })
          .select('_id')
          .lean();
        const userIds = users.map((user) => user._id);

        // If no users found matching query, return empty result
        if (userIds.length === 0 && query) {
          return new ApiResponse(
            {
              userWalletBalances: [],
              totalCount: 0,
              totalPages: 0,
              currentPage: pageNum,
              allTokens: allTokenData,
            },
            'All User Wallet Balance',
          );
        }

        if (userIds.length > 0) {
          walletQuery.user = { $in: userIds };
          userQuery = { ...userQuery };
        }
      } else {
        if (query) {
          userQuery['$or'] = [
            { email: { $regex: query, $options: 'i' } },
            { blockchainId: { $regex: query, $options: 'i' } },
            { username: { $regex: query, $options: 'i' } },
          ];
        }
      }
      let tokenData: any;
      if (sort && Object.keys(sort).length > 0) {
        tokenToSort = Object.keys(sort)[0];

        tokenData = await this.tokenModel.findOne({
          symbol: tokenToSort,
        });
        if (tokenData) {
          walletQuery = {
            ...walletQuery,
            token: tokenData._id,
            totalBalanceinToken: { $ne: 0 },
          };
        }

        sortOrder = sort[tokenToSort] === 'descending' ? -1 : 1;
      } else {
        limitedUserData = await this.userModel
          .find(userQuery, '_id email blockchainId username name')
          .skip(skip)
          .limit(limit)
          .lean();
        const userIds = limitedUserData.map((user) => user._id);
        console.log(limitedUserData.length, 'users');
        const total = await this.userModel.countDocuments(userQuery);
        paginateWithoutSort = {
          meta: {
            total: total,
            page: page,
            pageSize: limit,
            totalPages: Math.ceil(total / limit),
          },
        };

        console.log(paginateWithoutSort, 'paginateWithoutSort');

        walletQuery = { ...walletQuery, user: { $in: userIds } };
      }

      // Get all relevant wallets with populated token and user data
      const wallets = await this.walletModel
        .find(walletQuery, '_id user token totalBalanceinToken')
        .populate('token')
        .populate('user')
        // .sort({ totalBalanceinToken: -1 })  -- i Commented because this not sorted Properly
        .lean();

      // Group wallets by user and token
      const userWalletMap = new Map();

      // Add null checks before accessing properties
      wallets.forEach((wallet: any) => {
        // Skip wallets with null user or token
        if (!wallet.user || !wallet.token) {
          return; // Skip this iteration
        }

        const userId = wallet.user._id?.toString();
        // Skip if userId is undefined or null
        if (!userId) {
          return;
        }

        const tokenSymbol = wallet.token.symbol;
        // Skip if tokenSymbol is undefined or null
        if (!tokenSymbol) {
          return;
        }

        const balance = wallet.totalBalanceinToken || 0;

        if (!userWalletMap.has(userId)) {
          userWalletMap.set(userId, {
            user: {
              _id: wallet.user._id,
              email: wallet.user.email || '',
              blockchainId: wallet.user.blockchainId || '',
              username: wallet.user.username || '',
              name: wallet.user.name || '',
            },
            tokens: {},
            tokenSortValue: 0, // For sorting by token value if needed
          });
        }

        const userData = userWalletMap.get(userId);

        // Add or update token balance
        if (!userData.tokens[tokenSymbol]) {
          userData.tokens[tokenSymbol] = balance;
        } else {
          userData.tokens[tokenSymbol] += balance;
        }

        // Update sort value if this is the token we're sorting by
        if (tokenToSort && tokenSymbol === tokenToSort) {
          userData.tokenSortValue = userData.tokens[tokenSymbol];
        }
      });

      if (limitedUserData?.length > 0 && !tokenToSort && query) {
        // Add users from limitedUserData who don't have wallets
        limitedUserData.forEach((user: any) => {
          const userId = user._id.toString();

          // Only add if the user doesn't already exist in the map
          if (!userWalletMap.has(userId)) {
            userWalletMap.set(userId, {
              user: {
                _id: user._id,
                email: user.email || '',
                blockchainId: user.blockchainId || '',
                username: user.username || '',
              },
              tokens: {},
              tokenSortValue: 0,
            });
          }
        });
      }
      // Convert map to array for further processing
      const userWalletArray = Array.from(userWalletMap.values());

      // Calculate total number of users with wallets (for pagination)
      const totalCount = userWalletArray?.length || 0;

      // Sort results based on sort criteria
      if (tokenToSort) {
        // Sort by specific token balance
        userWalletArray.sort((a, b) => {
          const aValue = a.tokenSortValue || 0;
          const bValue = b.tokenSortValue || 0;
          return (aValue - bValue) * sortOrder;
        });
      }

      // Debug pagination parameters

      // Apply pagination
      let paginatedArray = userWalletArray;
      if (tokenToSort) {
        paginatedArray = userWalletArray.slice(skip, skip + limitNum);
      }

      const formattedBalances = [];
      if (paginatedArray?.length > 0) {
        for (let i = 0; i < paginatedArray.length; i++) {
          const item = paginatedArray[i];

          // Initialize walletArray using all tokens with zero balances
          const walletArray: any = allTokenData.map((token) => {
            return { [token.symbol]: 0 };
          });

          // Update with actual balances from user
          const tokenEntries = Object.entries(item.tokens);
          for (let j = 0; j < tokenEntries.length; j++) {
            const [symbol, balance] = tokenEntries[j];
            // Check if balance is in scientific notation (very small number)
            const formattedBalance =
              Math.abs(balance as number) < 1e-6
                ? await toFullDecimalString(balance)
                : balance;
            // Find and update the corresponding token in walletArray
            const tokenIndex = walletArray.findIndex(
              (wallet) => Object.keys(wallet)[0] === symbol,
            );

            if (tokenIndex !== -1) {
              walletArray[tokenIndex] = { [symbol]: formattedBalance };
            } else {
              // If token not found (which shouldn't happen), add it
              walletArray.push({ [symbol]: formattedBalance });
            }
          }

          // Get additional wallets if tokenToSort is provided
          if (tokenToSort && tokenData?._id) {
            const mappedUserwallets: any = await this.walletModel
              .find(
                { user: item.user._id, token: { $ne: tokenData._id } },
                '_id token totalBalanceinToken',
              )
              .populate('token')
              .lean();

            for (let k = 0; k < mappedUserwallets.length; k++) {
              const wallet = mappedUserwallets[k];
              if (wallet?.token?.symbol) {
                // Find and update the corresponding token in walletArray
                const tokenIndex = walletArray.findIndex(
                  (w) => Object.keys(w)[0] === wallet.token.symbol,
                );

                if (tokenIndex !== -1) {
                  // Type assertion for totalBalanceinToken
                  const balance = wallet.totalBalanceinToken as number;
                  // Handle small numbers if needed
                  const formattedBalance =
                    Math.abs(balance) < 1e-6
                      ? await toFullDecimalString(balance)
                      : balance;

                  walletArray[tokenIndex] = {
                    [wallet.token.symbol]: formattedBalance,
                  };
                }
              }
            }
          }

          const sortedData = walletArray.sort((a, b) => {
            const keyA = Object.keys(a)[0].toLowerCase();
            const keyB = Object.keys(b)[0].toLowerCase();
            return keyA.localeCompare(keyB);
          });

          const result = {
            user: item.user,
            wallet: sortedData,
          };

          formattedBalances.push(result);
        }
      }

      // Calculate total pages
      const totalPages = Math.ceil(totalCount / limitNum);

      return {
        userWalletBalances: formattedBalances,
        limit: limitNum,
        totalCount: tokenToSort ? totalCount : paginateWithoutSort.meta.total,
        totalPages: tokenToSort ? totalPages : paginateWithoutSort.meta.total,
        currentPage: tokenToSort ? pageNum : paginateWithoutSort.meta.page,
      };
    } catch (error) {
      console.error('Error fetching user wallet balances:', error);
      throw new Error(`Error fetching user wallet balances: ${error.message}`);
    }
  }

  async getAllUserWalletBalanceWithoutSorting(paginatSortDTO: SortDTO) {
    const { page, limit, query } = paginatSortDTO;
    console.log(paginatSortDTO, 'paginatSortDTO');

    try {
      // Ensure page and limit are numbers
      const pageNum = Number(page) || 1;
      const limitNum = Number(limit) || 10;
      const skip = (pageNum - 1) * limitNum;
      let paginateWithoutSort: any = null;
      // Default sort by createdAt ascending
      let walletQuery: any = { deletedAt: null };
      const userQuery: any = { deletedAt: null };

      if (query) {
        userQuery['$or'] = [
          { email: { $regex: query, $options: 'i' } },
          { blockchainId: { $regex: query, $options: 'i' } },
          { username: { $regex: query, $options: 'i' } },
        ];
      }

      const users = await this.userModel
        .find(userQuery, '_id email blockchainId username name')
        .skip(skip)
        .limit(limit)
        .lean();
      const userIds = users.map((user) => user._id);

      paginateWithoutSort = await pagination({
        page,
        pageSize: limit,
        model: this.userModel,
        condition: userQuery,
        pagingRange: 5,
      });

      walletQuery = { ...walletQuery, user: { $in: userIds } };
      console.log(JSON.stringify(walletQuery, null, -2));

      // Get all relevant wallets with populated token and user data
      const wallets = await this.walletModel
        .find(walletQuery, '_id user token totalBalanceinToken')
        .populate('token')
        .populate('user')
        .lean();

      console.log(`Found ${wallets.length} wallets before grouping`);

      // Group wallets by user and token
      const userWalletMap = new Map();

      // Add null checks before accessing properties
      wallets.forEach((wallet: any) => {
        // Skip wallets with null user or token
        if (!wallet.user || !wallet.token) {
          return; // Skip this iteration
        }

        const userId = wallet.user._id?.toString();
        // Skip if userId is undefined or null
        if (!userId) {
          return;
        }

        const tokenSymbol = wallet.token.symbol;
        // Skip if tokenSymbol is undefined or null
        if (!tokenSymbol) {
          return;
        }

        const balance = wallet.totalBalanceinToken || 0;

        if (!userWalletMap.has(userId)) {
          userWalletMap.set(userId, {
            user: {
              _id: wallet.user._id,
              email: wallet.user.email || '',
              blockchainId: wallet.user.blockchainId || '',
              username: wallet.user.username || '',
              name: wallet.user.name || '',
            },
            tokens: {},
            tokenSortValue: 0, // For sorting by token value if needed
          });
        }

        const userData = userWalletMap.get(userId);

        // Add or update token balance
        if (!userData.tokens[tokenSymbol]) {
          userData.tokens[tokenSymbol] = balance;
        } else {
          userData.tokens[tokenSymbol] += balance;
        }

        // Update sort value if this is the token we're sorting by
      });

      // Convert map to array for further processing
      const userWalletArray = Array.from(userWalletMap.values());

      console.log(`Found ${userWalletArray.length} unique users with wallets`);

      // Calculate total number of users with wallets (for pagination)
      const totalCount = userWalletArray.length;

      // Apply pagination
      const paginatedArray = userWalletArray;

      console.log(`Array length after slice: ${paginatedArray.length}`);

      // Format the final response
      const formattedBalances = paginatedArray.map((item) => {
        const walletArray = Object.entries(item.tokens)
          .filter(([_, balance]) => (balance as number) > 0)
          .map(([symbol, balance]) => ({ [symbol]: balance }));

        if (walletArray.length > 0) {
          return {
            user: item.user,
            wallet: walletArray,
          };
        } else {
          return {
            user: item.user,
            wallet: [],
          };
        }
      });

      return new ApiResponse(
        {
          userWalletBalances: formattedBalances,
          limit: limitNum,
          totalCount: paginateWithoutSort.total,
          totalPages: paginateWithoutSort.metadata.page.totalPage,
          currentPage: paginateWithoutSort.metadata.page.currentPage,
        },
        'All User Wallet Balance',
      );
    } catch (error) {
      console.error('Error fetching user wallet balances:', error);
      throw new Error(`Error fetching user wallet balances: ${error.message}`);
    }
  }
}
