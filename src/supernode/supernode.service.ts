import {
  forwardRef,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import {
  eachDayOfInterval,
  endOfWeek,
  format,
  getDay,
  startOfWeek,
} from 'date-fns';
import mongoose, {
  ClientSession,
  Connection,
  Model,
  PipelineStage,
  Types,
} from 'mongoose';
import { CacheService } from '../cache/cache.service';
import { CACHE_TYPE } from '../cache/Enums/cache.enum';
import { CloudKService } from '../cloud-k/cloud-k.service';
import {
  CLOUDK_MACHINE_STATUS,
  CloudKMachine,
} from '../cloud-k/schemas/cloudk-machine.schema';
import { CloudKReward } from '../cloud-k/schemas/cloudk-reward.schema';
import {
  CloudKTransactions,
  CloudKTransactionTypes,
} from '../cloud-k/schemas/cloudk-transactions.schema';
import { TransactionStatus } from '../global/enums/transaction.status.enum';
import {
  Deposit_Transaction_Type,
  TrxType,
} from '../global/enums/trx.type.enum';
import { CHART_TIMELIME_TYPES } from '../myfriends/enums/chart-timelines.enum';
import { ActiveUserTree } from '../users/schemas/active-user-tree.schema';
import { UsersService } from '../users/users.service';
import { aggregatePaginate } from '../utils/pagination.service';
import { TransactionFlow } from '../wallet/enums/transcation.flow.enum';
import { WalletService } from '../wallet/wallet.service';
import { CreateBuilderReferralSettingsDto } from './dto/builder-referral-settings.schema.dto';
import {
  CreateBasRefSettingDto,
  CreateBuilderGenerationSettingDto,
} from './dto/create-base-ref-setting.dto';
import { createGaskdtos } from './dto/gask.dtos';
import { GlobalPoolResponseDto } from './dto/global-pool.dto';
import {
  DailyRewardsResponseDto,
  RewardLossResponseDto,
  TotalProductionResponseDto,
  UserTotalProductionResponseDto,
} from './dto/sn-bonus.dto';
import { SngpDto, SngpQueryFilters, UpdateSngpDto } from './dto/sngp.dto';
import {
  SN_BONUS_SUMMARY_TYPE,
  SN_BONUS_SUMMARY_TYPE_REPORT,
  SN_BONUS_TYPE,
} from './enums/sn-bonus-type.enum';
import { LostReason } from './enums/sn-lost-reason.enum';
import { POOL_TYPE, STATUS_TYPE } from './enums/sngp-type.enum';
import { BaseReferralLevelSetting } from './schemas/base-referral-level-settings.schema';
import { BaseReferralSetting } from './schemas/base-referral-setting.schema';
import { BuilderGenerationLevelSetting } from './schemas/builder-generation-level-settings.schema';
import { BuilderGenerationSetting } from './schemas/builder-generation-settings';
import { BuilderReferralSetting } from './schemas/builder-referral-settings.schema';
import { SNBonusTransaction } from './schemas/sn-bonus-transaction.schema';
import { GlobalPool } from './schemas/sn-global-pool.schema';
import { SnSetting } from './schemas/sn-settings.schema';
import { SngpDistribution } from './schemas/sngp-distribution.schema';
import { SngpRewards } from './schemas/sngp-rewards.schema';
import { Sngp } from './schemas/sngp.schema';
import { UserGask } from './schemas/user-gask.schema';
import { UserSngp } from './schemas/user-sngp.schema';
import { Token } from '../token/schemas/token.schema';
import { SuperNodeGaskSetting } from './schemas/sn-gask-setting.schema';
import { User } from '../users/schemas/user.schema';
import { pagination } from '../utils/helpers';
import { SupernodeTransactionDTO } from '../admin/global/dto/paginate.dto';
import { title } from 'process';
import { UserRewards } from '../users/schemas/user-rewards';
import { TIME_PERIOD } from '../utils/constants';
import moment from 'moment';

import { SupernodeSummaryService } from './supernode.summary.service';
import {
  formatToFixed5,
  generateNoteTransactionDetails,
  getCurrentDay,
  getCustomRange,
  getTypeTitle,
  groupByUpline,
  groupByUser,
} from '../utils/common/common.functions';
import { DepositTransaction } from '../wallet/schemas/deposit.transaction.schema';
import { WalletDepositService } from '../wallet/wallet.deposit.service';
import { DueRemarks, DueType } from '../wallet/enums/request.status.enum';
import { DueReferenceMetaData } from '../wallet/interfaces/withdraw-transaction.interface';
import { StaticToken } from '../token/interfaces/token.interface';
import { TwoAccessService } from '../two-access/two-access.service';

@Injectable()
export class SupernodeService {
  constructor(
    @InjectModel(UserGask.name)
    private readonly userGaskModel: Model<UserGask>,
    @InjectModel(BaseReferralSetting.name)
    private readonly baseReferralSettingModel: Model<BaseReferralSetting>,
    @InjectModel(BaseReferralLevelSetting.name)
    private readonly baseReferralLevelSettingsModel: Model<BaseReferralLevelSetting>,
    @InjectModel(SNBonusTransaction.name)
    private readonly SNBonusTransactionModel: Model<SNBonusTransaction>,
    @InjectModel(CloudKReward.name)
    private readonly cloudKRewardModel: Model<CloudKReward>,
    @InjectModel(CloudKTransactions.name)
    private readonly cloudKTransactionsModel: Model<CloudKTransactions>,
    @InjectModel(UserRewards.name)
    private readonly userRewardsModel: Model<UserRewards>,
    @InjectModel(GlobalPool.name)
    private readonly globalPoolModel: Model<GlobalPool>,
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(CloudKMachine.name)
    public machineModel: Model<CloudKMachine>,
    @InjectModel(SnSetting.name)
    public supernodeSettingModel: Model<SnSetting>,
    @InjectModel(BuilderGenerationSetting.name)
    public builderGenerationSettingModel: Model<BuilderGenerationSetting>,
    @InjectModel(BuilderGenerationLevelSetting.name)
    public builderGenerationLevelSettingModel: Model<BuilderGenerationLevelSetting>,
    @InjectModel(BuilderReferralSetting.name)
    public builderReferralSettingModel: Model<BuilderReferralSetting>,
    @InjectModel(Token.name)
    @InjectModel(DepositTransaction.name)
    private readonly depositTransactionModel: Model<DepositTransaction>,
    @InjectModel(SuperNodeGaskSetting.name)
    @InjectModel(SuperNodeGaskSetting.name)
    private readonly snGaskSettingModel: Model<SuperNodeGaskSetting>,
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    // SNGP models
    @InjectModel(Sngp.name)
    public sngpModel: Model<Sngp>,
    @InjectModel(UserSngp.name)
    public userSngpModel: Model<UserSngp>,
    @InjectModel(UserRewards.name)
    public userReward: Model<UserRewards>,
    @InjectModel(SngpRewards.name)
    public sngpRewardsModel: Model<SngpRewards>,
    @InjectModel(SngpDistribution.name)
    public sngpDistributionModel: Model<SngpDistribution>,
    // End SNGP models

    @InjectModel(ActiveUserTree.name)
    private readonly activeUserTree: Model<ActiveUserTree>,

    @InjectModel(UserRewards.name)
    private readonly userRewards: Model<UserRewards>,
    private userService: UsersService,
    @Inject(forwardRef(() => WalletService))
    private walletService: WalletService,
    @Inject(forwardRef(() => CloudKService))
    private cloudKService: CloudKService,
    private cacheService: CacheService,
    private superNodeSummary: SupernodeSummaryService,
    @Inject(forwardRef(() => WalletDepositService))
    private walletDepositService: WalletDepositService,
    private twoAccesService: TwoAccessService,
  ) {}

  //Method to create gask entries for particular users
  async createGasKService(request: createGaskdtos, session?: ClientSession) {
    const { user, amount, flow, machine, from, reward } = request;

    // const customDate = '2024-11-17T00:03:07.352+00:00';
    // Create instance of usergask model
    const gask = new this.userGaskModel({
      user,
      amount,
      flow,
      machine,
      from,
      reward,
    });
    await this.cacheService.deleteUserCache({
      type: CACHE_TYPE.ACTIVE_USER,
      user,
    });
    //check the session is exist or not
    if (session) {
      await session.startTransaction();
      try {
        await gask.save({ session });
        await session.commitTransaction();
        return gask;
      } catch (err) {
        await session.abortTransaction();
        throw err;
      }
    } else {
      return await gask.save();
    }
  }

  async fetchGasKService(userId: Types.ObjectId) {
    const pipeline = [
      {
        $match: {
          deletedAt: null,
          user: new Types.ObjectId(userId),
        },
      },
      {
        $group: {
          _id: null,
          totalIncoming: {
            $sum: {
              $cond: [{ $eq: ['$flow', TransactionFlow.IN] }, '$amount', 0],
            },
          },
          totalOutgoing: {
            $sum: {
              $cond: [{ $eq: ['$flow', TransactionFlow.OUT] }, '$amount', 0],
            },
          },
        },
      },
      {
        // Subtract outgoing total from incoming total
        $project: {
          _id: 0, // Exclude the _id field from the result
          netTotal: { $subtract: ['$totalIncoming', '$totalOutgoing'] },
        },
      },
    ];

    //Get all incoming transaction
    const transactionFlowData = await this.userGaskModel
      .aggregate(pipeline)
      .exec();

    // Return the net total, or 0 if no results found
    return transactionFlowData.length > 0 ? transactionFlowData[0].netTotal : 0;
  }

  async fetchGasKServiceAll_Yesterday(userId: Types.ObjectId) {
    const currentDate = new Date();

    const endOfPeriodYesterday = moment
      .utc(currentDate)
      .subtract(1, 'days')
      .endOf('day')
      .toDate();

    const pipeline = [
      {
        $match: {
          user: new Types.ObjectId(userId),
          deletedAt: null,
        },
      },
      {
        $group: {
          _id: null,
          totalIncoming: {
            $sum: {
              $cond: [{ $eq: ['$flow', TransactionFlow.IN] }, '$amount', 0],
            },
          },
          totalOutgoing: {
            $sum: {
              $cond: [{ $eq: ['$flow', TransactionFlow.OUT] }, '$amount', 0],
            },
          },
        },
      },
      {
        // Subtract outgoing total from incoming total
        $project: {
          _id: 0, // Exclude the _id field from the result
          netTotal: { $subtract: ['$totalIncoming', '$totalOutgoing'] },
        },
      },
    ];
    const pipelineYesterday = [
      {
        $match: {
          user: new Types.ObjectId(userId),
          deletedAt: null,
          createdAt: {
            $lt: endOfPeriodYesterday, // Match documents created before the end of Yesterday
          },
        },
      },
      {
        $group: {
          _id: null,
          totalIncoming: {
            $sum: {
              $cond: [{ $eq: ['$flow', TransactionFlow.IN] }, '$amount', 0],
            },
          },
          totalOutgoing: {
            $sum: {
              $cond: [{ $eq: ['$flow', TransactionFlow.OUT] }, '$amount', 0],
            },
          },
        },
      },
      {
        // Subtract outgoing total from incoming total
        $project: {
          _id: 0, // Exclude the _id field from the result
          netTotal: { $subtract: ['$totalIncoming', '$totalOutgoing'] },
        },
      },
    ];
    //Get all incoming transaction
    const transactionFlowData = await this.userGaskModel
      .aggregate(pipeline)
      .exec();
    const transactionFlowDataYesterday = await this.userGaskModel
      .aggregate(pipelineYesterday)
      .exec();
    // Return the net total, or 0 if no results found
    return {
      netTotal:
        transactionFlowData.length > 0 ? transactionFlowData[0].netTotal : 0,
      lastDay: {
        totalGaskAmout:
          transactionFlowDataYesterday.length > 0
            ? transactionFlowDataYesterday[0].netTotal
            : 0,
      },
    };
  }

  async getBuilderGenerationSettings() {
    const currentSetting = await this.builderGenerationSettingModel.findOne({
      isActive: true,
    });
    if (!currentSetting)
      throw new HttpException(
        'Admin does not add the settings for builder generation yet.',
        400,
      );

    const productSetting = await this.builderGenerationLevelSettingModel
      .find({
        setting: currentSetting._id,
      })
      .sort({
        percentage: -1,
      });

    if (!currentSetting) throw new HttpException('Something went wrong', 400);
    return {
      setting: currentSetting,
      levels: productSetting,
    };
  }

  // async getSupernodeRewardsByUserId(userId: string) {
  //   try {
  //     // const pipeline = [
  //     //   {
  //     //     $match: {
  //     //       user: new Types.ObjectId(userId),
  //     //     },
  //     //   },
  //     //   {
  //     //     $group: {
  //     //       _id: null,
  //     //       totalRewards: {
  //     //         $sum: {
  //     //           $cond: [{ $eq: ['$receivable', true] }, '$tokenAmount', 0],
  //     //         },
  //     //       },
  //     //       baseReferralRewards: {
  //     //         $sum: {
  //     //           $cond: [
  //     //             {
  //     //               $and: [
  //     //                 { $eq: ['$type', SN_BONUS_TYPE.BASE_REFERRAL] },
  //     //                 { $eq: ['$receivable', true] },
  //     //               ],
  //     //             },
  //     //             '$tokenAmount',
  //     //             0,
  //     //           ],
  //     //         },
  //     //       },
  //     //       builderGenerationalRewards: {
  //     //         $sum: {
  //     //           $cond: [
  //     //             {
  //     //               $and: [
  //     //                 { $eq: ['$type', SN_BONUS_TYPE.BUILDER_GENERATIONAl] },
  //     //                 { $eq: ['$receivable', true] },
  //     //               ],
  //     //             },
  //     //             '$tokenAmount',
  //     //             0,
  //     //           ],
  //     //         },
  //     //       },
  //     //       builderReferralRewards: {
  //     //         $sum: {
  //     //           $cond: [
  //     //             {
  //     //               $and: [
  //     //                 { $eq: ['$type', SN_BONUS_TYPE.BUILDER_REFERRAL] },
  //     //                 { $eq: ['$receivable', true] },
  //     //               ],
  //     //             },
  //     //             '$tokenAmount',
  //     //             0,
  //     //           ],
  //     //         },
  //     //       },
  //     //       claimableRewards: {
  //     //         $sum: {
  //     //           $cond: [
  //     //             {
  //     //               $and: [
  //     //                 { $eq: ['$claimed', false] },
  //     //                 { $eq: ['$receivable', true] },
  //     //               ],
  //     //             },
  //     //             '$tokenAmount',
  //     //             0,
  //     //           ],
  //     //         },
  //     //       },
  //     //     },
  //     //   },
  //     //   { $project: { _id: 0 } },
  //     // ];

  //     // const pipeline = [
  //     //   {
  //     //     $match: {
  //     //       receivable: true,
  //     //       user: new Types.ObjectId(userId),
  //     //     },
  //     //   },
  //     //   {
  //     //     $group: {
  //     //       _id: {
  //     //         type: '$type',
  //     //         day: {
  //     //           $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
  //     //         },
  //     //       },
  //     //       dailyTotal: { $sum: '$tokenAmount' }, // Total reward for each type per day
  //     //     },
  //     //   },
  //     //   {
  //     //     $group: {
  //     //       _id: '$_id.day',
  //     //       baseReferralAmount: {
  //     //         $sum: {
  //     //           $cond: [
  //     //             { $eq: ['$_id.type', 'base-referral'] },
  //     //             '$dailyTotal',
  //     //             0,
  //     //           ],
  //     //         },
  //     //       },
  //     //       builderGenerationalAmount: {
  //     //         $sum: {
  //     //           $cond: [
  //     //             { $eq: ['$_id.type', 'builder-generational'] },
  //     //             '$dailyTotal',
  //     //             0,
  //     //           ],
  //     //         },
  //     //       },
  //     //     },
  //     //   },
  //     //   {
  //     //     $addFields: {
  //     //       dailyMaxReward: {
  //     //         $max: ['$baseReferralAmount', '$builderGenerationalAmount'],
  //     //       },
  //     //       remainingDailyMaxReward: {
  //     //         $subtract: [
  //     //           { $max: ['$baseReferralAmount', '$builderGenerationalAmount'] },
  //     //           { $min: ['$baseReferralAmount', '$builderGenerationalAmount'] },
  //     //         ],
  //     //       },
  //     //     },
  //     //   },
  //     //   {
  //     //     $addFields: {
  //     //       updatedBaseReferralAmount: {
  //     //         $cond: [
  //     //           { $gte: ['$baseReferralAmount', '$builderGenerationalAmount'] },
  //     //           {
  //     //             $subtract: [
  //     //               '$baseReferralAmount',
  //     //               '$builderGenerationalAmount',
  //     //             ],
  //     //           },
  //     //           0,
  //     //         ],
  //     //       },
  //     //       updatedBuilderGenerationalAmount: {
  //     //         $cond: [
  //     //           { $gte: ['$builderGenerationalAmount', '$baseReferralAmount'] },
  //     //           {
  //     //             $subtract: [
  //     //               '$builderGenerationalAmount',
  //     //               '$baseReferralAmount',
  //     //             ],
  //     //           },
  //     //           0,
  //     //         ],
  //     //       },
  //     //       showBaseReferral: {
  //     //         $cond: [
  //     //           { $lte: ['$baseReferralAmount', '$builderGenerationalAmount'] },
  //     //           '$baseReferralAmount',
  //     //           '$remainingDailyMaxReward',
  //     //         ],
  //     //       },
  //     //       showBuilderGenerational: {
  //     //         $cond: [
  //     //           { $lte: ['$builderGenerationalAmount', '$baseReferralAmount'] },
  //     //           '$builderGenerationalAmount',
  //     //           '$remainingDailyMaxReward',
  //     //         ],
  //     //       },
  //     //     },
  //     //   },
  //     //   {
  //     //     $project: {
  //     //       _id: 0,
  //     //       day: '$_id',
  //     //       baseReferralAmount: 1,
  //     //       builderGenerationalAmount: 1,
  //     //       dailyMaxReward: 1,
  //     //       updatedBaseReferralAmount: 1,
  //     //       updatedBuilderGenerationalAmount: 1,
  //     //       remainingDailyMaxReward: 1,
  //     //       showBaseReferral: 1,
  //     //       showBuilderGenerational: 1,
  //     //     },
  //     //   },
  //     //   {
  //     //     $group: {
  //     //       _id: null,
  //     //       totalBaseReferralAmount: { $sum: '$baseReferralAmount' }, // Sum of actual baseReferralAmount
  //     //       totalBuilderGenerationalAmount: {
  //     //         $sum: '$builderGenerationalAmount',
  //     //       },
  //     //       totalShowBaseReferral: { $sum: '$showBaseReferral' },
  //     //       totalShowBuilderGenerational: { $sum: '$showBuilderGenerational' },
  //     //     },
  //     //   },
  //     //   {
  //     //     $addFields: {
  //     //       amountToClaim: {
  //     //         $add: ['$totalShowBaseReferral', '$totalShowBuilderGenerational'],
  //     //       },
  //     //     },
  //     //   },
  //     //   {
  //     //     $project: {
  //     //       _id: 0,
  //     //       totalBaseReferralAmount: 1, // Output total actual baseReferralAmount
  //     //       totalBuilderGenerationalAmount: 1, //
  //     //       totalShowBaseReferral: 1,
  //     //       totalShowBuilderGenerational: 1,
  //     //       amountToClaim: 1,
  //     //     },
  //     //   },
  //     // ];

  //     const rewardsAnalyticsCache = await this.cacheService.getCacheUser({
  //       type: CACHE_TYPE.REWARDS_ANALYTICS,
  //       user: userId,
  //     });
  //     if (rewardsAnalyticsCache) return rewardsAnalyticsCache;
  //     const pipeline = [
  //       {
  //         $match: {
  //           receivable: true,
  //           user: new Types.ObjectId(userId),
  //           deletedAt: null,
  //         },
  //       },
  //       {
  //         $group: {
  //           _id: {
  //             type: '$type',
  //             day: {
  //               $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
  //             },
  //           },
  //           dailyTotal: { $sum: '$tokenAmount' }, // Total reward for each type per day
  //         },
  //       },
  //       {
  //         $group: {
  //           _id: '$_id.day',
  //           baseReferralAmount: {
  //             $sum: {
  //               $cond: [
  //                 { $eq: ['$_id.type', 'base-referral'] },
  //                 '$dailyTotal',
  //                 0,
  //               ],
  //             },
  //           },
  //           builderGenerationalAmount: {
  //             $sum: {
  //               $cond: [
  //                 { $eq: ['$_id.type', 'builder-generational'] },
  //                 '$dailyTotal',
  //                 0,
  //               ],
  //             },
  //           },
  //         },
  //       },
  //       {
  //         $addFields: {
  //           dailyMaxReward: {
  //             $max: ['$baseReferralAmount', '$builderGenerationalAmount'],
  //           },
  //           remainingDailyMaxReward: {
  //             $subtract: [
  //               { $max: ['$baseReferralAmount', '$builderGenerationalAmount'] },
  //               { $min: ['$baseReferralAmount', '$builderGenerationalAmount'] },
  //             ],
  //           },
  //         },
  //       },
  //       {
  //         $addFields: {
  //           updatedBaseReferralAmount: {
  //             $cond: [
  //               { $gte: ['$baseReferralAmount', '$builderGenerationalAmount'] },
  //               {
  //                 $subtract: [
  //                   '$baseReferralAmount',
  //                   '$builderGenerationalAmount',
  //                 ],
  //               },
  //               0,
  //             ],
  //           },
  //           updatedBuilderGenerationalAmount: {
  //             $cond: [
  //               { $gte: ['$builderGenerationalAmount', '$baseReferralAmount'] },
  //               {
  //                 $subtract: [
  //                   '$builderGenerationalAmount',
  //                   '$baseReferralAmount',
  //                 ],
  //               },
  //               0,
  //             ],
  //           },
  //           showBaseReferral: {
  //             $cond: [
  //               { $lte: ['$baseReferralAmount', '$builderGenerationalAmount'] },
  //               '$baseReferralAmount',
  //               '$remainingDailyMaxReward',
  //             ],
  //           },
  //           showBuilderGenerational: {
  //             $cond: [
  //               { $lte: ['$builderGenerationalAmount', '$baseReferralAmount'] },
  //               '$builderGenerationalAmount',
  //               '$remainingDailyMaxReward',
  //             ],
  //           },
  //         },
  //       },
  //       {
  //         $project: {
  //           _id: 0,
  //           day: '$_id',
  //           baseReferralAmount: 1,
  //           builderGenerationalAmount: 1,
  //           dailyMaxReward: 1,
  //           updatedBaseReferralAmount: 1,
  //           updatedBuilderGenerationalAmount: 1,
  //           remainingDailyMaxReward: 1,
  //           showBaseReferral: 1,
  //           showBuilderGenerational: 1,
  //         },
  //       },
  //       {
  //         $group: {
  //           _id: null,
  //           totalBaseReferralAmount: { $sum: '$baseReferralAmount' }, // Sum of actual baseReferralAmount
  //           totalBuilderGenerationalAmount: {
  //             $sum: '$builderGenerationalAmount',
  //           },
  //           totalShowBaseReferral: { $sum: '$showBaseReferral' },
  //           totalShowBuilderGenerational: { $sum: '$showBuilderGenerational' },
  //         },
  //       },
  //       {
  //         $addFields: {
  //           amountToClaim: {
  //             $add: ['$totalShowBaseReferral', '$totalShowBuilderGenerational'],
  //           },
  //         },
  //       },
  //       {
  //         $project: {
  //           _id: 0,
  //           totalBaseReferralAmount: 1, // Output total actual baseReferralAmount
  //           totalBuilderGenerationalAmount: 1, //
  //           totalShowBaseReferral: 1,
  //           totalShowBuilderGenerational: 1,
  //           amountToClaim: 1,
  //         },
  //       },
  //     ];

  //     const claimedPipeline = [
  //       {
  //         $match: {
  //           claimed: false,
  //           receivable: true,
  //           user: new Types.ObjectId(userId),
  //           deletedAt: null,
  //         },
  //       },
  //       {
  //         $group: {
  //           _id: {
  //             type: '$type',
  //             day: {
  //               $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
  //             },
  //           },
  //           dailyTotal: { $sum: '$tokenAmount' }, // Total reward for each type per day
  //         },
  //       },
  //       {
  //         $group: {
  //           _id: '$_id.day',
  //           baseReferralAmount: {
  //             $sum: {
  //               $cond: [
  //                 { $eq: ['$_id.type', 'base-referral'] },
  //                 '$dailyTotal',
  //                 0,
  //               ],
  //             },
  //           },
  //           builderGenerationalAmount: {
  //             $sum: {
  //               $cond: [
  //                 { $eq: ['$_id.type', 'builder-generational'] },
  //                 '$dailyTotal',
  //                 0,
  //               ],
  //             },
  //           },
  //         },
  //       },
  //       {
  //         $addFields: {
  //           dailyMaxReward: {
  //             $max: ['$baseReferralAmount', '$builderGenerationalAmount'],
  //           },
  //           remainingDailyMaxReward: {
  //             $subtract: [
  //               { $max: ['$baseReferralAmount', '$builderGenerationalAmount'] },
  //               { $min: ['$baseReferralAmount', '$builderGenerationalAmount'] },
  //             ],
  //           },
  //         },
  //       },
  //       {
  //         $addFields: {
  //           updatedBaseReferralAmount: {
  //             $cond: [
  //               { $gte: ['$baseReferralAmount', '$builderGenerationalAmount'] },
  //               {
  //                 $subtract: [
  //                   '$baseReferralAmount',
  //                   '$builderGenerationalAmount',
  //                 ],
  //               },
  //               0,
  //             ],
  //           },
  //           updatedBuilderGenerationalAmount: {
  //             $cond: [
  //               { $gte: ['$builderGenerationalAmount', '$baseReferralAmount'] },
  //               {
  //                 $subtract: [
  //                   '$builderGenerationalAmount',
  //                   '$baseReferralAmount',
  //                 ],
  //               },
  //               0,
  //             ],
  //           },
  //           showBaseReferral: {
  //             $cond: [
  //               { $lte: ['$baseReferralAmount', '$builderGenerationalAmount'] },
  //               '$baseReferralAmount',
  //               '$remainingDailyMaxReward',
  //             ],
  //           },
  //           showBuilderGenerational: {
  //             $cond: [
  //               { $lte: ['$builderGenerationalAmount', '$baseReferralAmount'] },
  //               '$builderGenerationalAmount',
  //               '$remainingDailyMaxReward',
  //             ],
  //           },
  //         },
  //       },
  //       {
  //         $project: {
  //           _id: 0,
  //           day: '$_id',
  //           baseReferralAmount: 1,
  //           builderGenerationalAmount: 1,
  //           dailyMaxReward: 1,
  //           updatedBaseReferralAmount: 1,
  //           updatedBuilderGenerationalAmount: 1,
  //           remainingDailyMaxReward: 1,
  //           showBaseReferral: 1,
  //           showBuilderGenerational: 1,
  //         },
  //       },
  //       {
  //         $group: {
  //           _id: null,
  //           totalBaseReferralAmount: { $sum: '$baseReferralAmount' }, // Sum of actual baseReferralAmount
  //           totalBuilderGenerationalAmount: {
  //             $sum: '$builderGenerationalAmount',
  //           },
  //           totalShowBaseReferral: { $sum: '$showBaseReferral' },
  //           totalShowBuilderGenerational: { $sum: '$showBuilderGenerational' },
  //         },
  //       },
  //       {
  //         $addFields: {
  //           amountToClaim: {
  //             $add: ['$totalShowBaseReferral', '$totalShowBuilderGenerational'],
  //           },
  //         },
  //       },
  //       {
  //         $project: {
  //           _id: 0,
  //           totalBaseReferralAmount: 1, // Output total actual baseReferralAmount
  //           totalBuilderGenerationalAmount: 1, //
  //           totalShowBaseReferral: 1,
  //           totalShowBuilderGenerational: 1,
  //           amountToClaim: 1,
  //         },
  //       },
  //     ];
  //     const supernodeSetting = await this.supernodeSettingModel
  //       .findOne({})
  //       .sort({
  //         createdAt: -1,
  //       })
  //       .populate('rewardToken');

  //     const snRewardsAnalyzed =
  //       await this.SNBonusTransactionModel.aggregate(pipeline).exec();

  //     const snClaimableRewardsAnalyzed =
  //       await this.SNBonusTransactionModel.aggregate(claimedPipeline).exec();

  //     const oSnRewardsAnalyzed =
  //       snRewardsAnalyzed.length > 0 &&
  //       Object.keys(snRewardsAnalyzed[0]).length > 0
  //         ? snRewardsAnalyzed[0]
  //         : {
  //             totalRewards: 0,
  //             baseReferralRewards: 0,
  //             builderGenerationalRewards: 0,
  //             builderReferralRewards: 0,
  //             claimableRewards: 0,
  //           };

  //     const obj = {
  //       totalRewards: snRewardsAnalyzed[0]?.amountToClaim || 0,
  //       baseReferralRewards: snRewardsAnalyzed[0]?.totalShowBaseReferral || 0,
  //       builderGenerationalRewards:
  //         snRewardsAnalyzed[0]?.totalShowBuilderGenerational || 0,
  //       claimableRewards: snClaimableRewardsAnalyzed[0]?.amountToClaim || 0,
  //       actutalbaseReferralRewards:
  //         snRewardsAnalyzed[0]?.totalBaseReferralAmount || 0,
  //       actualbuilderGenerationalRewards:
  //         snRewardsAnalyzed[0]?.totalBuilderGenerationalAmount || 0,
  //       builderReferralRewards: 0,
  //       rewardToken: supernodeSetting?.rewardToken,
  //     };
  //     await this.cacheService.setCacheUser({
  //       type: CACHE_TYPE.REWARDS_ANALYTICS,
  //       user: userId,
  //       data: obj,
  //     });
  //     return obj;
  //   } catch (error) {
  //     throw error;
  //   }
  // }

  async getSupernodeRewardsByUserId(userId: string) {
    try {
      const pipeline = [
        {
          $match: {
            user: new Types.ObjectId(userId),
            deletedAt: null,
          },
        },
        {
          $group: {
            _id: null,
            totalRewards: {
              $sum: {
                $cond: [{ $eq: ['$receivable', true] }, '$tokenAmount', 0],
              },
            },
            baseReferralRewards: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ['$type', SN_BONUS_TYPE.BASE_REFERRAL] },
                      { $eq: ['$receivable', true] },
                    ],
                  },
                  '$tokenAmount',
                  0,
                ],
              },
            },
            builderGenerationalRewards: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ['$type', SN_BONUS_TYPE.BUILDER_GENERATIONAl] },
                      { $eq: ['$receivable', true] },
                    ],
                  },
                  '$tokenAmount',
                  0,
                ],
              },
            },
            builderReferralRewards: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ['$type', SN_BONUS_TYPE.BUILDER_REFERRAL] },
                      { $eq: ['$receivable', true] },
                    ],
                  },
                  '$tokenAmount',
                  0,
                ],
              },
            },
            claimableRewards: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ['$claimed', false] },
                      { $eq: ['$receivable', true] },
                    ],
                  },
                  '$tokenAmount',
                  0,
                ],
              },
            },
          },
        },
        { $project: { _id: 0 } },
      ];
      const currentDate = new Date();

      const startOfPeriodYesterday = moment
        .utc(currentDate)
        .subtract(1, 'days')
        .startOf('day')
        .toDate();
      const endOfPeriodYesterday = moment
        .utc(currentDate)
        .subtract(1, 'days')
        .endOf('day')
        .toDate();
      const pipelineYesterday = [
        {
          $match: {
            user: new Types.ObjectId(userId),
            deletedAt: null,
            createdAt: {
              $lt: endOfPeriodYesterday, // Match documents created before the end of today
            },
          },
        },
        {
          $group: {
            _id: null,

            claimableRewards: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ['$claimed', false] },
                      { $eq: ['$receivable', true] },
                    ],
                  },
                  '$tokenAmount',
                  0,
                ],
              },
            },
          },
        },
        { $project: { _id: 0 } },
      ];

      const supernodeSetting = await this.supernodeSettingModel
        .findOne({})
        .sort({
          createdAt: -1,
        })
        .populate('rewardToken');

      const { startDate, endDate } = await getCurrentDay();
      console.log(startDate, endDate);

      const lastClaimedTransaction: any =
        await this.walletService.depositTransactionModel
          .findOne({
            user: userId,
            hash: 'supernode-reward',
            deletedAt: null,
            createdAt: { $gte: startDate, $lt: endDate },
          })
          .sort({ createdAt: -1 })
          .lean();

      const snRewardsAnalyzed =
        await this.SNBonusTransactionModel.aggregate(pipeline).exec();
      const snRewardsAnalyzedYesterday_Claimable =
        await this.SNBonusTransactionModel.aggregate(pipelineYesterday).exec();
      const oSnRewardsAnalyzed =
        snRewardsAnalyzed.length > 0 &&
        Object.keys(snRewardsAnalyzed[0]).length > 0
          ? snRewardsAnalyzed[0]
          : {
              totalRewards: 0,
              baseReferralRewards: 0,
              builderGenerationalRewards: 0,
              builderReferralRewards: 0,
              claimableRewards: 0,
            };
      let lastClaimedReward: number = 0;
      if (
        lastClaimedTransaction &&
        lastClaimedTransaction.meta &&
        lastClaimedTransaction.meta.isDeducted
      ) {
        if (lastClaimedTransaction && lastClaimedTransaction.fromAmount) {
          lastClaimedReward = lastClaimedTransaction
            ? (lastClaimedTransaction as any).fromAmount
            : null;
        } else {
          lastClaimedReward = lastClaimedTransaction
            ? (lastClaimedTransaction as any).amount
            : null;
        }
      } else {
        lastClaimedReward = lastClaimedTransaction
          ? (lastClaimedTransaction as any).amount
          : null;
      }
      return {
        ...oSnRewardsAnalyzed,
        rewardToken: supernodeSetting?.rewardToken,
        lastDay: {
          claimableRewards: lastClaimedReward
            ? lastClaimedReward
            : snRewardsAnalyzedYesterday_Claimable.length > 0
              ? snRewardsAnalyzedYesterday_Claimable[0].claimableRewards
              : 0,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  async getTotalClaimedRewards(userId: any) {
    try {
      console.log('userId', userId);
      // Aggregation pipeline to get total claimed rewards from SNBonusTransactionModel
      const snBonusPipeline = [
        {
          $match: {
            user: userId,
            deletedAt: null,
          },
        },
        {
          $group: {
            _id: null,
            totalClaimedRewards: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ['$receivable', true] },
                      { $eq: ['$claimed', true] },
                    ],
                  },
                  '$tokenAmount',
                  0,
                ],
              },
            },
          },
        },
        { $project: { _id: 0 } },
      ];

      const snRewardsAnalyzed =
        await this.SNBonusTransactionModel.aggregate(snBonusPipeline).exec();

      const totalClaimedRewards =
        snRewardsAnalyzed.length > 0 && snRewardsAnalyzed[0].totalClaimedRewards
          ? snRewardsAnalyzed[0].totalClaimedRewards
          : 0;

      // Find the last claimed reward from deposittransactions

      const lastClaimedTransaction: any =
        await this.walletService.depositTransactionModel
          .findOne({
            user: userId,
            hash: 'supernode-reward',
            deletedAt: null,
          })
          .sort({ createdAt: -1 })
          .lean();

      let lastClaimedReward: number = 0;
      if (
        lastClaimedTransaction &&
        lastClaimedTransaction.meta &&
        lastClaimedTransaction.meta.isDeducted
      ) {
        if (lastClaimedTransaction && lastClaimedTransaction.fromAmount) {
          lastClaimedReward = lastClaimedTransaction
            ? (lastClaimedTransaction as any).fromAmount
            : null;
        } else {
          lastClaimedReward = lastClaimedTransaction
            ? (lastClaimedTransaction as any).amount
            : null;
        }
      } else {
        lastClaimedReward = lastClaimedTransaction
          ? (lastClaimedTransaction as any).amount
          : null;
      }

      const lastClaimedDate = lastClaimedTransaction
        ? new Date((lastClaimedTransaction as any).createdAt)
            .toISOString()
            .split('T')[0]
        : null;

      return {
        totalClaimedRewards,
        lastClaimedReward,
        lastClaimedDate,
      };
    } catch (error) {
      console.error('Error in getTotalClaimedRewards:', error);
      throw error;
    }
  }

  async getUserReceivableSupernodeReward(userId: Types.ObjectId) {
    try {
      const pipeline = [
        {
          $match: {
            user: new Types.ObjectId(userId),
            deletedAt: null,
          },
        },
        {
          $group: {
            _id: null,
            totalRewards: {
              $sum: {
                $cond: [{ $eq: ['$receivable', true] }, '$tokenAmount', 0],
              },
            },
          },
        },
        { $project: { _id: 0 } },
      ];

      const snRewardsAnalyzed =
        await this.SNBonusTransactionModel.aggregate(pipeline).exec();
      const oSnRewardsAnalyzed =
        snRewardsAnalyzed.length > 0 &&
        Object.keys(snRewardsAnalyzed[0]).length > 0
          ? snRewardsAnalyzed[0]
          : {
              totalRewards: 0,
            };
      return {
        ...oSnRewardsAnalyzed,
      };
    } catch (error) {
      throw error;
    }
  }

  async getReceivableRewardFromUser(toUser, fromUser) {
    const result = await this.SNBonusTransactionModel.aggregate([
      {
        $match: {
          fromUser: new Types.ObjectId(fromUser),
          user: new Types.ObjectId(toUser),
          receivable: true,
          deletedAt: null,
        },
      },

      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$tokenAmount' },
        },
      },
    ]);

    // If no documents match, return 0 or a default value
    return result.length > 0 ? result[0].totalAmount : 0;
  }

  // Get current loss of rewards
  async getCurrentLoss(userId: Types.ObjectId, period: TIME_PERIOD) {
    let startOfPeriod: number, endOfPeriod: number;
    const currentDate = new Date();

    if (period === TIME_PERIOD.DAY) {
      startOfPeriod = currentDate.setHours(0, 0, 0, 0);
      endOfPeriod = currentDate.setHours(23, 59, 59, 999);
    } else if (period === TIME_PERIOD.WEEK) {
      // Last 7 days
      startOfPeriod = currentDate.setDate(currentDate.getDate() - 7);
      endOfPeriod = new Date().setHours(23, 59, 59, 999);
    } else if (period === TIME_PERIOD.MONTH) {
      // Last 30 days
      startOfPeriod = currentDate.setDate(currentDate.getDate() - 30);
      endOfPeriod = new Date().setHours(23, 59, 59, 999);
    } else if (period === TIME_PERIOD.YEAR) {
      // Last 365 days
      startOfPeriod = currentDate.setDate(currentDate.getDate() - 365);
      endOfPeriod = new Date().setHours(23, 59, 59, 999);
    } else {
      startOfPeriod = currentDate.setHours(0, 0, 0, 0);
      endOfPeriod = currentDate.setHours(23, 59, 59, 999);
    }

    const getCurrentLossCache = await this.cacheService.getCacheMulipleKeyUser({
      type: CACHE_TYPE.SUPERNODE_CURRENT_LOSS,
      user: String(userId),
      other_Type: String(period),
    });

    if (getCurrentLossCache) {
      //
      return getCurrentLossCache;
    } else {
      const pipeline = [
        {
          $match: {
            user: new Types.ObjectId(userId),
            receivable: false,
            deletedAt: null,
            createdAt: {
              $gte: new Date(startOfPeriod),
              $lte: new Date(endOfPeriod),
            },
          },
        },
        {
          $group: {
            _id: null,
            inActiveFirstUser: {
              $sum: {
                $cond: [
                  { $eq: ['$lostReason', LostReason.INACTIVE_FIRST_USER] },
                  '$tokenAmount',
                  0,
                ],
              },
            },
            dailyCapping: {
              $sum: {
                $cond: [
                  { $eq: ['$lostReason', LostReason.DAILY_CAPPING] },
                  '$tokenAmount',
                  0,
                ],
              },
            },
            insufficientGask: {
              $sum: {
                $cond: [
                  { $eq: ['$lostReason', LostReason.INSUFFICIENT_GASK] },
                  '$tokenAmount',
                  0,
                ],
              },
            },
          },
        },
        {
          $project: {
            _id: 0, // Exclude the _id field from the result
            inActiveFirstUser: '$inActiveFirstUser',
            dailyCapping: '$dailyCapping',
            insufficientGask: '$insufficientGask',
            netTotal: {
              $sum: [
                '$inActiveFirstUser',
                '$dailyCapping',
                '$insufficientGask',
              ],
            },
          },
        },
      ];

      //Get total loss of rewards
      const rewardLoss =
        await this.SNBonusTransactionModel.aggregate(pipeline).exec();
      const token = await this.cloudKService.getCurrentCloudkSettings();
      // Structuring the result into a DTO for better readability and usage
      let lossData: RewardLossResponseDto;
      if (rewardLoss && rewardLoss.length > 0) {
        lossData = { ...rewardLoss[0], token: token.rewardToken };
      } else {
        lossData = {
          inActiveFirstUser: 0,
          dailyCapping: 0,
          insufficientGask: 0,
          netTotal: 0,
          token: token.rewardToken,
        };
      }
      await this.cacheService.setCacheMulipleUser(
        {
          type: CACHE_TYPE.SUPERNODE_CURRENT_LOSS,
          user: String(userId),
          other_Type: String(period),

          data: lossData,
        },
        86400,
      );
      return lossData;
    }
  }
  // Get total production
  async getTeamTotalProduction(
    userId: Types.ObjectId,
  ): Promise<TotalProductionResponseDto> {
    // logic here
    const getTeamTotalProductionCache = await this.cacheService.getCacheUser({
      type: CACHE_TYPE.SUPERNODE_TEAM_TOTAL_PRODUCTION,
      user: String(userId),
    });

    if (getTeamTotalProductionCache) {
      //
      return getTeamTotalProductionCache;
    } else {
      let totalFirstLineUserCloudk = 0;
      let totalTeamUserCloudk = 0;

      //Fetch my production value from coudkreward table
      const myProduction = await this.cloudKRewardModel.aggregate([
        {
          $match: { user: new Types.ObjectId(userId), deletedAt: null },
        },
        {
          $group: {
            _id: null,
            totalPriceAmount: {
              $sum: '$tokenAmount',
            },
          },
        },
      ]);

      // Team Production
      const teamMembers = await this.userService.getTeamMembersByUser(userId);

      for (const uplineId of teamMembers) {
        const teamUserCloudk = await this.cloudKService.getUserCloudK(uplineId);
        totalTeamUserCloudk += teamUserCloudk;
      }

      // First Line Production
      const firstLineUsers = await this.activeUserTree.aggregate([
        {
          $match: { upline: new Types.ObjectId(userId), deletedAt: null },
        },
      ]);

      if (firstLineUsers && firstLineUsers.length > 0) {
        for (const record of firstLineUsers) {
          const firstLineUser = record?.user;
          if (firstLineUser) {
            const firstLineUserCloudk =
              await this.cloudKService.getUserCloudK(firstLineUser);
            totalFirstLineUserCloudk += firstLineUserCloudk;
          }
        }
      }

      const token = await this.cloudKService.getCurrentCloudkSettings();

      const totalProduction: TotalProductionResponseDto = {
        myProduction:
          myProduction.length > 0 ? myProduction[0].totalPriceAmount : 0,
        teamProduction: totalTeamUserCloudk,
        firstLineProduction: totalFirstLineUserCloudk,
        netTotal: 0,
        token: token.rewardToken,
      };

      await this.cacheService.setCacheUser(
        {
          type: CACHE_TYPE.SUPERNODE_TEAM_TOTAL_PRODUCTION,
          user: String(userId),
          data: totalProduction,
        },
        86400,
      );
      return totalProduction;
    }
  }

  async getUserTotalProduction(
    userId: Types.ObjectId,
  ): Promise<UserTotalProductionResponseDto> {
    // logic here

    //Fetch my production value from coudkreward table
    const myProduction = await this.cloudKTransactionsModel.aggregate([
      {
        $match: {
          user: new Types.ObjectId(userId),
          type: CloudKTransactionTypes.DAILY_REWARD,
          deletedAt: null,
        },
      },
      {
        $group: {
          _id: null,
          totalPriceAmount: {
            $sum: '$tokenAmount',
          },
        },
      },
    ]);

    return {
      myProduction:
        myProduction.length > 0 ? myProduction[0].totalPriceAmount : 0,
    };
  }

  async getDailyTeamTotalProduction(
    userId: Types.ObjectId,
  ): Promise<TotalProductionResponseDto> {
    // logic here
    const getTeamTotalProductionCache = await this.cacheService.getCacheUser({
      type: CACHE_TYPE.SUPERNODE_TEAM_TOTAL_PRODUCTION,
      user: String(userId),
    });

    if (getTeamTotalProductionCache) {
      return getTeamTotalProductionCache;
    } else {
      let totalFirstLineUserCloudk = 0;
      let totalTeamUserCloudk = 0;

      // Get the start and end of today
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0));
      const endOfDay = new Date(today.setHours(23, 59, 59, 999));

      // Fetch my production value from cloudkreward table for today
      const myProduction = await this.cloudKRewardModel.aggregate([
        {
          $match: {
            user: new Types.ObjectId(userId),
            deletedAt: null,
            createdAt: { $gte: startOfDay, $lt: endOfDay }, // Filter for today's date
          },
        },
        {
          $group: {
            _id: null,
            totalPriceAmount: {
              $sum: '$tokenAmount',
            },
          },
        },
      ]);

      // Team Production
      const teamMembers = await this.userService.getTeamMembersByUser(userId);

      for (const uplineId of teamMembers) {
        const teamUserCloudk =
          await this.cloudKService.getUserDailyCloudK(uplineId);
        totalTeamUserCloudk += teamUserCloudk;
      }

      // First Line Production
      const firstLineUsers = await this.activeUserTree.aggregate([
        {
          $match: {
            upline: new Types.ObjectId(userId),
            deletedAt: null,
          },
        },
      ]);

      if (firstLineUsers && firstLineUsers.length > 0) {
        for (const record of firstLineUsers) {
          const firstLineUser = record?.user;
          if (firstLineUser) {
            const firstLineUserCloudk =
              await this.cloudKService.getUserDailyCloudK(firstLineUser);
            totalFirstLineUserCloudk += firstLineUserCloudk;
          }
        }
      }

      const token = await this.cloudKService.getCurrentCloudkSettings();

      const totalProduction: TotalProductionResponseDto = {
        myProduction:
          myProduction.length > 0 ? myProduction[0].totalPriceAmount : 0,
        teamProduction: totalTeamUserCloudk,
        firstLineProduction: totalFirstLineUserCloudk,
        netTotal: 0,
        token: token.rewardToken,
      };

      await this.cacheService.setCacheUser(
        {
          type: CACHE_TYPE.SUPERNODE_TEAM_TOTAL_PRODUCTION,
          user: String(userId),
          data: totalProduction,
        },
        86400,
      );
      return totalProduction;
    }
  }

  async getDailyRewards(userId: Types.ObjectId) {
    //pipeline for daily rewards
    const currentDate = new Date();
    const startOfPeriodToday = moment.utc(currentDate).startOf('day').toDate();
    const endOfPeriodToday = moment.utc(currentDate).endOf('day').toDate();

    const startOfPeriodYesterday = moment
      .utc(currentDate)
      .subtract(1, 'days')
      .startOf('day')
      .toDate();
    const endOfPeriodYesterday = moment
      .utc(currentDate)
      .subtract(1, 'days')
      .endOf('day')
      .toDate();

    // const start = new Date();
    // start.setHours(0, 0, 0, 0);
    // const oneDayInMilliseconds = 24 * 60 * 60 * 1000; // Hours * Minutes * Seconds * Milliseconds
    // const oneDayAgo = new Date(start.getTime() - oneDayInMilliseconds);

    // const end = new Date();
    // end.setHours(23, 59, 59, 999);
    const pipeline = [
      {
        $match: {
          user: new Types.ObjectId(userId),
          receivable: true,
          deletedAt: null,
          createdAt: {
            $gte: startOfPeriodToday, // Match documents created at or after the start of today
            $lt: endOfPeriodToday, // Match documents created before the end of today
          },
        },
      },
      {
        $group: {
          _id: null,
          totalToken: {
            $sum: '$tokenAmount',
          },
          totalAmount: {
            $sum: '$amount',
          },
        },
      },
      {
        $project: {
          _id: 0, // Exclude the _id field from the result
          totalToken: '$totalToken',
          totalAmount: '$totalAmount',
        },
      },
    ];
    const pipelineYesterday = [
      {
        $match: {
          user: new Types.ObjectId(userId),
          receivable: true,
          deletedAt: null,
          createdAt: {
            $gte: startOfPeriodYesterday, // Match documents created at or after the start of Yesterday
            $lt: endOfPeriodYesterday, // Match documents created before the end of Yesterday
          },
        },
      },
      {
        $group: {
          _id: null,
          totalToken: {
            $sum: '$tokenAmount',
          },
          totalAmount: {
            $sum: '$amount',
          },
        },
      },
      {
        $project: {
          _id: 0, // Exclude the _id field from the result
          totalToken: '$totalToken',
          totalAmount: '$totalAmount',
        },
      },
    ];
    //Fetch data from snBonusTransaction table
    const dailyReward =
      await this.SNBonusTransactionModel.aggregate(pipeline).exec();
    const YesterdayReward =
      await this.SNBonusTransactionModel.aggregate(pipelineYesterday).exec();

    const supernodeSetting = await this.supernodeSettingModel
      .findOne({})
      .sort({
        createdAt: -1,
      })
      .populate('rewardToken');

    let dailyRewardData: DailyRewardsResponseDto;
    let YesterdayRewardData: DailyRewardsResponseDto;

    if (dailyReward && dailyReward.length > 0) {
      dailyRewardData = { ...dailyReward[0] };
    } else {
      dailyRewardData = {
        totalToken: 0,
        totalAmount: 0,
      };
    }

    if (pipelineYesterday && pipelineYesterday.length > 0) {
      YesterdayRewardData = { ...YesterdayReward[0] };
    } else {
      YesterdayRewardData = {
        totalToken: 0,
        totalAmount: 0,
      };
    }

    return {
      ...dailyRewardData,
      lastDay: YesterdayRewardData,
      rewardToken: supernodeSetting.rewardToken,
    };
  }

  //Service for get global pool balance
  async getGlobalPool(userId: Types.ObjectId): Promise<GlobalPoolResponseDto> {
    const pipeline = [
      {
        $match: {
          user: new Types.ObjectId(userId),
        },
      },
      {
        $group: {
          _id: null,
          amount: {
            $sum: '$amount',
          },
        },
      },
    ];

    //Fetch data from GlobalPoolModel table
    const globalPool = await this.globalPoolModel.aggregate(pipeline).exec();

    let globalPoolData: GlobalPoolResponseDto;
    if (globalPool && globalPool.length > 0) {
      globalPoolData = { totalAmount: globalPool[0].amount };
    } else {
      globalPoolData = {
        totalAmount: 0,
      };
    }

    return globalPoolData;
  }
  async getSngpActivityPool(userid: string) {
    const SngpActivityData = { balance: 35, claimed: 75 };
    return SngpActivityData;
  }
  //Get Total SNGP Score / Static Data
  async getTotalSNGP_Score(userid: string) {
    const SngpTotalScoreData = { totalScore: 6348 };
    return SngpTotalScoreData;
  }
  //Get Total SNGP Rewards / Static Data
  async getTotalSNGP_Rewards(userid: string) {
    const SngpTotalRewardData = { totalReward: 3725 };
    return SngpTotalRewardData;
  }
  //Get ScoreHistory/ Static Data
  async getScoreHistory(userid, paginateDTO) {
    const { page, limit, query, fromDate, toDate, type } = paginateDTO;
    const SngpScoreHistoryData = [
      {
        name: 'Minter Name-1',
        price: 48765,
        score: 4654,
        date: new Date(),
      },
      {
        name: 'Minter Name-2',
        price: 37895,
        score: 5684,
        date: new Date(),
      },
    ];

    return SngpScoreHistoryData;
  }
  //Get Country Active Pools/ Static Data
  async getCountryActivePools(userid, paginateDTO) {
    const { page, limit, query, fromDate, toDate, type } = paginateDTO;
    const CountryActivePoolsData: {
      name: string;
      status: { claimed: number; available: number };
      startDate: Date;
      maximum: number;
    }[] = [
      {
        name: 'Pool-1',
        status: { claimed: 5000, available: 2000 },
        startDate: new Date(),
        maximum: 20000,
      },
      {
        name: 'Pool-2',
        status: { claimed: 5000, available: 2000 },
        startDate: new Date(),
        maximum: 20000,
      },
    ];

    return CountryActivePoolsData;
  }
  //Get Country My Score/ Static Data
  async getCountryMyScoe(userid, year) {
    const CountryMyScoreData: {
      poolName: string;
      chartData: any;
      score: number;
    }[] = [
      {
        poolName: 'County-1',
        chartData: null,
        score: 20000,
      },
      {
        poolName: 'County-2',
        chartData: null,
        score: 20000,
      },
    ];

    return CountryMyScoreData;
  }
  //Get Country Upcoming Pools/ Static Data
  async getCountryUpcomingPools(userid) {
    const CountryMyScoreData: {
      flag: string;
      poolName: string;
      date: Date;
    }[] = [
      {
        flag: 'flagurl1',
        poolName: 'County-1',
        date: new Date(),
      },
      {
        flag: 'flagurl2',
        poolName: 'County-2',
        date: new Date(),
      },
    ];

    return CountryMyScoreData;
  }
  //Get Country Pool History / Static Data
  async getCountryPoolScoreHistory(userid, paginateDTO) {
    const { page, limit, query, fromDate, toDate, type } = paginateDTO;
    const PoolScoreHistoryData: {
      minterName: string;
      poolName: string;
      date: Date;
      score: number;
    }[] = [
      {
        minterName: 'Pool-1',
        poolName: 'USA',
        date: new Date(),
        score: 5684,
      },
      {
        minterName: 'Pool-2',
        poolName: 'Canada',
        date: new Date(),
        score: 5684,
      },
    ];

    return PoolScoreHistoryData;
  }
  //Get Country Pool Reward History / Static Data
  async getCountryPoolRewardHistory(userid, paginateDTO) {
    const { page, limit, query, fromDate, toDate, type } = paginateDTO;
    const PoolRewardHistoryData: {
      poolName: string;
      date: Date;
      rewards: number;
    }[] = [
      {
        poolName: 'Pool Name-1',
        date: new Date(),
        rewards: 230,
      },
      {
        poolName: 'Pool Name-2',
        date: new Date(),
        rewards: 230,
      },
    ];

    return PoolRewardHistoryData;
  }
  async fetchUserHighestMachine(
    userId: string | Types.ObjectId,
  ): Promise<CloudKMachine | null> {
    const machines = await this.machineModel
      .find({
        user: new Types.ObjectId(userId),
        status: CLOUDK_MACHINE_STATUS.ACTIVE,
        $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
      })
      .sort({ productPrice: -1 })
      .populate('product');

    if (!machines || machines.length === 0) {
      return null;
    }

    return machines[0];
  }

  async fetchHighestValidMachine(
    userId: string | Types.ObjectId,
    user?: any,
  ): Promise<CloudKMachine | null> {
    let machines = null;
    if (user) {
      const machineOfUsers = user.products;
      machines = machineOfUsers.filter((machine) => {
        const isActive = machine.status === CLOUDK_MACHINE_STATUS.ACTIVE;
        const isNotDeleted = machine.deletedAt == null;
        return isActive && isNotDeleted;
      });
    } else {
      machines = await this.machineModel
        .find({
          user: new Types.ObjectId(userId),
          status: CLOUDK_MACHINE_STATUS.ACTIVE,
          $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
        })
        .sort({ productPrice: -1 })
        .populate('product');
    }

    if (!machines || machines.length === 0) {
      return null;
    }

    // Return the first machine where collateral >= productPrice
    const highestPricedMachine = machines.find(
      (machine) => machine.collatoral >= machine.productPrice,
    );

    if (!highestPricedMachine) {
      const machines = await this.machineModel
        .find({
          user: new Types.ObjectId(userId),
          status: CLOUDK_MACHINE_STATUS.ACTIVE,
          $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
        })
        .sort({ productPrice: -1 })
        .populate('product');

      return machines[0];
    }

    return highestPricedMachine || null;
  }

  async getUserDailyCapEligibility(
    userId: Types.ObjectId,
    bonusAmount: number,
    userHighestMachine: any,
  ) {
    // const userHighestMachine = await this.fetchHighestValidMachine(userId);
    if (!userHighestMachine)
      return {
        status: false,
        reward: bonusAmount,
        note: ` no machine available`,
      }; // this means unlimited;

    const dailyCap: number = (userHighestMachine.product as any)
      .superNodeCapping;

    if (!dailyCap)
      return {
        status: true,
        reward: bonusAmount,
        note: ` no limit currrent reward ${bonusAmount} totap cap : ${dailyCap}`,
      }; // this means unlimited

    const userDailyReward = await this.getDailyRewards(userId);
    if (userDailyReward.totalAmount == dailyCap) {
      return {
        status: false,
        reward: 0,
        note: `all super node reward ${userDailyReward.totalAmount} currrent reward ${0} totap cap : ${dailyCap}`,
      };
    }
    if (userDailyReward.totalAmount + bonusAmount > dailyCap) {
      const reward = dailyCap - userDailyReward.totalAmount;
      return {
        status: true,
        reward,
        note: `all super node reward ${userDailyReward.totalAmount} currrent reward ${reward} totap cap : ${dailyCap}`,
      };
    }
    return {
      status: true,
      reward: bonusAmount,
      note: `all super node reward ${userDailyReward.totalAmount} currrent reward ${bonusAmount} totap cap : ${dailyCap}`,
    };
  }

  async getUserDailyStakeEligibility(
    userId: Types.ObjectId,
    bonusAmount: number,
    machineCollatral: number,
  ) {
    const userDailyReward = await this.getDailyRewards(userId);
    if (userDailyReward.totalAmount == machineCollatral) {
      return { status: false, reward: 0 };
    }
    if (userDailyReward.totalAmount + bonusAmount > machineCollatral) {
      const reward = machineCollatral - userDailyReward.totalAmount;
      return { status: true, reward };
    }
    return { status: true, reward: bonusAmount };
  }
  async checkUserGaskEligiblity(
    userId: Types.ObjectId,
    bonusAmount: number,
  ): Promise<number> {
    const userGask = await this.fetchGasKService(userId);
    if (bonusAmount > userGask) return 0;
    return userGask;
  }

  async isUserActiveNode(userId: string, session?: ClientSession) {
    const machines = await this.machineModel
      .find({
        user: new Types.ObjectId(userId),
        status: CLOUDK_MACHINE_STATUS.ACTIVE,
        $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
      })
      .sort({ productPrice: -1, collatoral: -1 })
      .populate('user')
      .session(session); // Apply session if provided

    if (!machines || machines.length === 0) {
      return false;
    }

    const highestPricedMachine = machines[0];
    if (highestPricedMachine.collatoral >= highestPricedMachine.productPrice) {
      return true;
    }

    return false;
  }

  async isBuilderGenerationUserActiveNode(
    userId: Types.ObjectId,
    session?: ClientSession,
  ) {
    const machines = await this.machineModel
      .find({
        user: userId,
        status: CLOUDK_MACHINE_STATUS.ACTIVE,
        $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
      })
      .sort({ productPrice: -1 })
      .populate('user')
      .populate('product');
    // .session(session);

    if (!machines.length) {
      return false;
    }

    return machines.some(
      (machine) => machine.collatoral >= machine.productPrice,
    );
  }

  async baseRefereralUserActiveMachine(
    userId: Types.ObjectId,
    session?: ClientSession,
  ) {
    const machines = await this.machineModel
      .find({
        user: userId,
        status: CLOUDK_MACHINE_STATUS.ACTIVE,
        collatoral: { $gte: 100 },
        $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
      })
      .sort({ productPrice: -1 })
      .populate('user product');
    // Apply session if provided

    if (!machines || machines.length === 0) {
      return { status: false, data: null };
    }
    const highestCollatralMachine = machines[0];

    return { status: true, data: highestCollatralMachine };
  }

  async checkUserFirstLineEligibilty(
    userId: Types.ObjectId,
    minActiveDownline: number,
  ): Promise<boolean> {
    let activeUsers = 0;
    const user = await this.userModel.findById(userId);
    if (!user) {
      return false;
    }
    const userFirstLineUsers =
      await this.twoAccesService.findFistLineActiveUsers(user?.blockchainId);

    for (const firstLineUser of userFirstLineUsers) {
      const fUser = await this.userService.findUserByBlockchainId(
        firstLineUser?.id,
      );
      if (!fUser) {
        continue;
      }
      const { status }: any = await this.baseRefereralUserActiveMachine(
        new Types.ObjectId(fUser?.id),
      );

      if (status) {
        activeUsers++;
        if (activeUsers >= minActiveDownline) {
          return true;
        }
      }
    }
    return false;
  }

  async checkUserActiveStatus(
    userId: Types.ObjectId,
    isActiveNode: boolean,
    bonusAmount: number,
    bonusType: SN_BONUS_TYPE,
    firstLevelNodes: number, // only for base referral
    user?: any,
  ): Promise<{
    isActive: boolean;
    lostReasons: any;
    availableGask: number;
    bonusAmount: number;
  }> {
    const lostReasons = [];
    let isActive = true;

    // const user = await this.userModel.findById(userId);
    // const machineData = await this.baseRefereralUserActiveMachine(
    //   new Types.ObjectId(userId),
    // );

    //      user: userId,
    //     status: CLOUDK_MACHINE_STATUS.ACTIVE,
    //     collatoral: { $gte: 100 },
    //     $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],

    const machineOfUsers = user.products;
    const machineData = machineOfUsers
      .sort((a, b) => b.productPrice - a.productPrice) // Sort by productPrice in descending order
      .find((machine) => {
        const hasRequiredCollateral = machine.collatoral >= 100;
        const isActive = machine.status === CLOUDK_MACHINE_STATUS.ACTIVE;
        const isNotDeleted = machine.deletedAt == null; // Covers both null and undefined

        return hasRequiredCollateral && isActive && isNotDeleted;
      });

    // console.log('machineData :>>>>>>>>>>>>>>>>>>', machineData);
    // return;
    if (!machineData) {
      isActive = false;
      lostReasons.push({
        meta: {
          machineData: machineData,
        },
        reason: LostReason.USER_MACHINE_NOT_ELIGIBLE,
      });
    } else if (!machineData.status) {
      isActive = false;
      lostReasons.push({
        meta: {
          machineData: machineData,
        },
        reason: LostReason.USER_MACHINE_NOT_ELIGIBLE,
      });
    }

    const machineCollatral = machineData?.data?.collatoral;

    // const isNodeKActive = isActiveNode;
    // gask amount
    const userGaskEligible = await this.checkUserGaskEligiblity(
      userId,
      bonusAmount,
    );

    // dsily cap Amount
    const userDailyCap: any = await this.getUserDailyCapEligibility(
      userId,
      bonusAmount,
      machineData,
    );
    // bonusAmount = userDailyCap.reward;
    const userDailyCapEligible = userDailyCap.status;
    // let userDailyStakeCap;

    // if (machineCollatral) {
    //   userDailyStakeCap = await this.getUserDailyStakeEligibility(
    //     userId,
    //     bonusAmount,
    //     machineCollatral,
    //   );
    // }
    // check Daily reward is greter than machine collatral

    // if (!isNodeKActive) {
    //   isActive = false;
    // }
    if (bonusType === SN_BONUS_TYPE.BASE_REFERRAL) {
      const userTotalFirstLineActiveUsers =
        await this.checkUserFirstLineEligibilty(userId, firstLevelNodes);
      if (!userTotalFirstLineActiveUsers) {
        isActive = false;
        lostReasons.push({
          meta: {
            data: userTotalFirstLineActiveUsers,
          },
          reason: LostReason.INACTIVE_FIRST_USER,
        });
        return {
          isActive,
          lostReasons,
          availableGask: userGaskEligible,
          bonusAmount,
        };
      }
    }

    if (user?.isBlocked === true || user?.isBaseReferralEnabled === false) {
      const reason =
        user?.isBlocked === true
          ? LostReason.USER_BLOCKED
          : LostReason.BLOCKED_FOR_BASE_REFERRAL;
      const meta =
        user?.isBlocked === true
          ? { data: user?.isBlocked, isBlocked: user?.isBlocked }
          : {
              data: user?.isBaseReferralEnabled,
              isBaseReferralEnabled: user?.isBaseReferralEnabled,
            };

      isActive = false;
      lostReasons.push({
        meta,
        reason,
      });
    }
    // if (!userDailyStakeCap?.status) {
    //   isActive = false;
    //   lostReasons.push({
    //     meta: {
    //       data: userDailyStakeCap,
    //     },
    //     reason: LostReason.INSUFFICIENT_STAKE_LIMIT,
    //   });
    // }

    if (!userGaskEligible) {
      isActive = false;
      lostReasons.push({
        meta: {
          data: 0,
        },
        reason: LostReason.INSUFFICIENT_GASK,
      });
    }
    if (!userDailyCapEligible) {
      isActive = false;
      lostReasons.push({
        meta: {
          data: userDailyCap,
        },
        reason: LostReason.DAILY_CAPPING,
      });
    }
    // if (isActive) {
    //   bonusAmount = Math.min(
    //     userDailyStakeCap.reward,
    //     userDailyCap.reward,
    //     userGaskEligible,
    //   );

    //   // if (userDailyCap.reward > userDailyStakeCap.reward) {
    //   //   bonusAmount = userDailyStakeCap.reward;
    //   // } else if (){

    //   // }else {
    //   //   bonusAmount = userDailyCap.reward;
    //   // }
    // }

    return {
      isActive,
      lostReasons,
      availableGask: userGaskEligible,
      bonusAmount,
    };
  }

  // async claimRewards(userId: string) {
  //   // const pipeline = [
  //   //   {
  //   //     $match: {
  //   //       claimed: false,
  //   //       receivable: true,
  //   //       user: new Types.ObjectId(userId),
  //   //     },
  //   //   },
  //   //   {
  //   //     $group: {
  //   //       _id: null,
  //   //       total: { $sum: '$tokenAmount' },
  //   //     },
  //   //   },
  //   // ];

  //   // const pipeline = [
  //   //   {
  //   //     $match: {
  //   //       claimed: false,
  //   //       receivable: true,
  //   //       user: new Types.ObjectId(userId),
  //   //     },
  //   //   },
  //   //   {
  //   //     $group: {
  //   //       _id: {
  //   //         type: '$type',
  //   //         day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, // Group by type and day
  //   //       },
  //   //       dailyTotal: { $sum: '$tokenAmount' }, // Total reward for each type per day
  //   //     },
  //   //   },
  //   //   {
  //   //     $group: {
  //   //       _id: '$_id.day', // Group by day
  //   //       baseReferralAmount: {
  //   //         $sum: {
  //   //           $cond: [{ $eq: ['$_id.type', 'base-referral'] }, '$dailyTotal', 0],
  //   //         },
  //   //       },
  //   //       builderGenerationalAmount: {
  //   //         $sum: {
  //   //           $cond: [{ $eq: ['$_id.type', 'builder-generational'] }, '$dailyTotal', 0],
  //   //         },
  //   //       },
  //   //     },
  //   //   },
  //   //   {
  //   //     $addFields: {
  //   //       dailyMaxReward: {
  //   //         $max: ['$baseReferralAmount', '$builderGenerationalAmount'], // Determine daily max reward
  //   //       },
  //   //       maxType: {
  //   //         $cond: [
  //   //           { $gte: ['$baseReferralAmount', '$builderGenerationalAmount'] },
  //   //           'base-referral',
  //   //           'builder-generational',
  //   //         ], // Identify the type with the max reward
  //   //       },
  //   //     },
  //   //   },
  //   //   {
  //   //     $project: {
  //   //       _id: 0,
  //   //       day: '$_id', // Day
  //   //       baseReferralAmount: 1,
  //   //       builderGenerationalAmount: 1,
  //   //       dailyMaxReward: 1,
  //   //       maxType: 1,
  //   //     },
  //   //   },
  //   // ];

  //   const pipeline = [
  //     {
  //       $match: {
  //         claimed: false,
  //         receivable: true,
  //         user: new Types.ObjectId(userId),
  //         deletedAt: null,
  //       },
  //     },
  //     {
  //       $group: {
  //         _id: {
  //           type: '$type',
  //           day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
  //         },
  //         dailyTotal: { $sum: '$tokenAmount' }, // Total reward for each type per day
  //       },
  //     },
  //     {
  //       $group: {
  //         _id: '$_id.day',
  //         baseReferralAmount: {
  //           $sum: {
  //             $cond: [
  //               { $eq: ['$_id.type', 'base-referral'] },
  //               '$dailyTotal',
  //               0,
  //             ],
  //           },
  //         },
  //         builderGenerationalAmount: {
  //           $sum: {
  //             $cond: [
  //               { $eq: ['$_id.type', 'builder-generational'] },
  //               '$dailyTotal',
  //               0,
  //             ],
  //           },
  //         },
  //       },
  //     },
  //     {
  //       $addFields: {
  //         dailyMaxReward: {
  //           $max: ['$baseReferralAmount', '$builderGenerationalAmount'],
  //         },
  //         remainingDailyMaxReward: {
  //           $subtract: [
  //             { $max: ['$baseReferralAmount', '$builderGenerationalAmount'] },
  //             { $min: ['$baseReferralAmount', '$builderGenerationalAmount'] },
  //           ],
  //         },
  //       },
  //     },
  //     {
  //       $addFields: {
  //         updatedBaseReferralAmount: {
  //           $cond: [
  //             { $gte: ['$baseReferralAmount', '$builderGenerationalAmount'] },
  //             {
  //               $subtract: [
  //                 '$baseReferralAmount',
  //                 '$builderGenerationalAmount',
  //               ],
  //             },
  //             0,
  //           ],
  //         },
  //         updatedBuilderGenerationalAmount: {
  //           $cond: [
  //             { $gte: ['$builderGenerationalAmount', '$baseReferralAmount'] },
  //             {
  //               $subtract: [
  //                 '$builderGenerationalAmount',
  //                 '$baseReferralAmount',
  //               ],
  //             },
  //             0,
  //           ],
  //         },
  //         showBaseReferral: {
  //           $cond: [
  //             { $lte: ['$baseReferralAmount', '$builderGenerationalAmount'] },
  //             '$baseReferralAmount',
  //             '$remainingDailyMaxReward',
  //           ],
  //         },
  //         showBuilderGenerational: {
  //           $cond: [
  //             { $lte: ['$builderGenerationalAmount', '$baseReferralAmount'] },
  //             '$builderGenerationalAmount',
  //             '$remainingDailyMaxReward',
  //           ],
  //         },
  //       },
  //     },
  //     {
  //       $project: {
  //         _id: 0,
  //         day: '$_id',
  //         baseReferralAmount: 1,
  //         builderGenerationalAmount: 1,
  //         dailyMaxReward: 1,
  //         updatedBaseReferralAmount: 1,
  //         updatedBuilderGenerationalAmount: 1,
  //         remainingDailyMaxReward: 1,
  //         showBaseReferral: 1,
  //         showBuilderGenerational: 1,
  //       },
  //     },
  //     {
  //       $group: {
  //         _id: null,
  //         totalBaseReferralAmount: { $sum: '$baseReferralAmount' }, // Sum of actual baseReferralAmount
  //         totalBuilderGenerationalAmount: {
  //           $sum: '$builderGenerationalAmount',
  //         },
  //         totalShowBaseReferral: { $sum: '$showBaseReferral' },
  //         totalShowBuilderGenerational: { $sum: '$showBuilderGenerational' },
  //       },
  //     },
  //     {
  //       $addFields: {
  //         amountToClaim: {
  //           $add: ['$totalShowBaseReferral', '$totalShowBuilderGenerational'],
  //         },
  //       },
  //     },
  //     {
  //       $project: {
  //         _id: 0,
  //         totalBaseReferralAmount: 1, // Output total actual baseReferralAmount
  //         totalBuilderGenerationalAmount: 1, //
  //         totalShowBaseReferral: 1,
  //         totalShowBuilderGenerational: 1,
  //         amountToClaim: 1,
  //       },
  //     },
  //   ];

  //   const claimableRewards =
  //     await this.SNBonusTransactionModel.aggregate(pipeline).exec();

  //   const amountToClaim =
  //     claimableRewards.length > 0 ? claimableRewards[0].amountToClaim : 0;

  //   if (!amountToClaim || amountToClaim <= 0) {
  //     // return 'Nothing to claim';
  //     throw new HttpException('Nothing to claim', 400);
  //   }

  //   const supernodeSetting = await this.supernodeSettingModel
  //     .findOne({})
  //     .sort({
  //       createdAt: -1,
  //     })
  //     .populate('rewardToken');

  //   // const userWithdrawWallet =
  //   //   await this.walletService.findUserWalletByTokenSymbol(
  //   //     cloudkSettings.rewardToken.symbol,
  //   //     new Types.ObjectId(userId),
  //   //   );
  //   const userRewardWallet =
  //     await this.walletService.findUserWalletByTokenSymbol(
  //       supernodeSetting.rewardToken.symbol,
  //       new Types.ObjectId(userId),
  //     );

  //   // if (!userWithdrawWallet)
  //   //   throw new HttpException('User LYK-D wallet not found', 400);
  //   if (!userRewardWallet)
  //     throw new HttpException(
  //       `${supernodeSetting.rewardToken.symbol} wallet not found`,
  //       400,
  //     );

  //   const session = await this.connection.startSession();
  //   await session.startTransaction();

  //   try {
  //     const claimedTrx = await this.walletService.createRawWalletTransaction(
  //       {
  //         user: new Types.ObjectId(userId),
  //         wallet: userRewardWallet._id,
  //         trxType: TrxType.SUPERNODE_REWARD,
  //         amount: amountToClaim,
  //         transactionFlow: TransactionFlow.IN,
  //       },
  //       session,
  //     );

  //     const { serialNumber: sN, requestId } =
  //       await this.walletService.generateUniqueRequestId(
  //         TrxType.SUPERNODE_REWARD,
  //       );

  //     const { walletBalance } = await this.walletService.getBalanceByWallet(
  //       new Types.ObjectId(userId),
  //       userRewardWallet._id,
  //     );
  //     const userData = await this.userModel.findOne({
  //       _id: new Types.ObjectId(userId),
  //     });

  //     const newDeposit = new this.walletService.depositTransactionModel({
  //       user: new Types.ObjectId(userId),
  //       toWallet: userRewardWallet._id,
  //       toWalletTrx: claimedTrx[0]._id,
  //       amount: amountToClaim,
  //       confirmation: '0',
  //       hash: TrxType.SUPERNODE_REWARD,
  //       onChainWallet: null,
  //       serialNumber: sN,
  //       requestId,
  //       transactionStatus: TransactionStatus.SUCCESS,
  //       newBalance: walletBalance + amountToClaim,
  //       previousBalance: walletBalance,
  //       note: JSON.stringify(claimableRewards),
  //       token: userRewardWallet?.token || null,
  //       network: null,
  //       blockchainId: userData?.blockchainId || null,
  //     });
  //     await newDeposit.save({ session });
  //     const newDepositTransactionHistory =
  //       new this.walletService.depositTransactionHistoryModel({
  //         deposit_id: newDeposit._id,
  //         from: Deposit_Transaction_Type.Deposit,
  //         type: claimedTrx[0]?.trxType || 'deposit',
  //         user: new Types.ObjectId(userId),
  //         toWallet: userRewardWallet._id,
  //         toWalletTrx: claimedTrx[0]._id,
  //         amount: amountToClaim,
  //         confirmation: '0',
  //         hash: TrxType.SUPERNODE_REWARD,
  //         onChainWallet: null,
  //         serialNumber: sN,
  //         requestId,
  //         transactionStatus: TransactionStatus.SUCCESS,
  //         newBalance: walletBalance + amountToClaim,
  //         previousBalance: walletBalance,
  //         remarks: JSON.stringify(claimableRewards),
  //         token: userRewardWallet?.token || null,
  //         network: null,
  //         blockchainId: userData?.blockchainId || null,
  //       });
  //     await newDepositTransactionHistory.save({ session });

  //     await this.SNBonusTransactionModel.updateMany(
  //       {
  //         claimed: false,
  //         receivable: true,
  //         user: new Types.ObjectId(userId),
  //         deletedAt: null,
  //       },
  //       {
  //         claimed: true,
  //         note: `calimable - new logic  actual base-refer ${claimableRewards[0]?.totalBaseReferralAmount} - we gave ${claimableRewards[0]?.totalShowBaseReferral} and actual builder gen amount ${claimableRewards[0]?.totalBuilderGenerationalAmount} give builder gen amount ${claimableRewards[0]?.totalShowBuilderGenerational}`,
  //       },
  //       {
  //         session,
  //       },
  //     );

  //     await session.commitTransaction();

  //     await this.cacheService.deleteUserCache({
  //       type: CACHE_TYPE.REWARDS_ANALYTICS,
  //       user: userId,
  //     });
  //     return 'Tokens Claimed Successfully';
  //   } catch (error) {
  //     await session.abortTransaction();
  //     throw new HttpException('Failed to claim tokens', 400);
  //   } finally {
  //     session.endSession();
  //   }
  // }

  async claimRewards(userId: string) {
    const pipeline = [
      {
        $match: {
          claimed: false,
          receivable: true,
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
    const { price } = await this.cloudKService.getCurrentPrice();

    const claimableRewards =
      await this.SNBonusTransactionModel.aggregate(pipeline).exec();

    const claimableRewards_ = await this.SNBonusTransactionModel.find({
      claimed: false,
      receivable: true,
      user: new Types.ObjectId(userId),
      deletedAt: null,
    }).exec();

    let amountToClaim =
      claimableRewards.length > 0 ? claimableRewards[0].total : 0;

    if (!amountToClaim || amountToClaim <= 0) {
      // return 'Nothing to claim';
      throw new HttpException('Nothing to claim', 400);
    }

    const supernodeSetting = await this.supernodeSettingModel
      .findOne({})
      .sort({
        createdAt: -1,
      })
      .populate('rewardToken');

    // const userWithdrawWallet =
    //   await this.walletService.findUserWalletByTokenSymbol(
    //     cloudkSettings.rewardToken.symbol,
    //     new Types.ObjectId(userId),
    //   );

    const userRewardWallet =
      await this.walletService.findUserWalletByTokenSymbol(
        supernodeSetting.rewardToken.symbol,
        new Types.ObjectId(userId),
      );

    // if (!userWithdrawWallet)
    //   throw new HttpException('User LYK-D wallet not found', 400);
    if (!userRewardWallet)
      throw new HttpException(
        `${supernodeSetting.rewardToken.symbol} wallet not found`,
        400,
      );

    const session = await this.connection.startSession();
    await session.startTransaction();
    const userData = await this.userModel.findOne({
      _id: new Types.ObjectId(userId),
    });
    try {
      const { walletBalance } = await this.walletService.getBalanceByWallet(
        new Types.ObjectId(userId),
        userRewardWallet._id,
      );
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
        trxType: TrxType.SUPERNODE_REWARD,
        dueType: DueType.SUPERNODE,
        beforeWalletBalance: walletBalance,
        session: session,
      });
      const totalAmount = amountToClaim;
      amountToClaim = remainingBalance;

      const { note, meta, userRemarks } = await generateNoteTransactionDetails({
        trxType: TrxType.SUPERNODE_REWARD,
        fromAmount: totalAmount,
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
        fromRequestedAmount: amountToClaim,
      });

      const claimedTrx = await this.walletService.createRawWalletTransaction(
        {
          user: new Types.ObjectId(userId),
          wallet: userRewardWallet._id,
          trxType: TrxType.SUPERNODE_REWARD,
          amount: amountToClaim,
          transactionFlow: TransactionFlow.IN,
          note: note,
          remark: userRemarks,
          meta: isDeducted
            ? {
                ...meta,
                dueWithdrawTransactionId: DueWithdrawID,
                dueType: DueType.SUPERNODE,
                DueRemarks: isAllowtoTransactions
                  ? DueRemarks.SuperNode_CLAIMED_PARTIAL_DEBIT_WITHDRAW
                  : DueRemarks.SuperNode_CLAIMED_FULL_DEBIT_WITHDRAW,
              }
            : meta,
        },
        session,
      );

      const { serialNumber: sN, requestId } =
        await this.walletService.generateUniqueRequestId(
          TrxType.SUPERNODE_REWARD,
        );

      const newDeposit = new this.walletService.depositTransactionModel({
        user: new Types.ObjectId(userId),
        toWallet: userRewardWallet._id,
        toWalletTrx: claimedTrx[0]._id,
        fromAmount: totalAmount,
        amount: amountToClaim,
        confirmation: 'supernode claim done',
        hash: TrxType.SUPERNODE_REWARD,
        onChainWallet: null,
        serialNumber: sN,
        requestId,
        transactionStatus: TransactionStatus.SUCCESS,
        newBalance: walletBalance + amountToClaim,
        previousBalance: walletBalance,
        note: note,
        token: userRewardWallet?.token || null,
        network: null,
        blockchainId: userData?.blockchainId || null,
        claimableList: claimableRewards_.map((item) => item._id),
        remarks: userRemarks,
        // remarks: isDeducted
        //   ? `Supernode reward of ${parseFloat(`${totalAmount}`).toFixed(5)} ${StaticToken.LYK_W}, $${parseFloat(`${deductedBalance}`).toFixed(5)} was deducted for the due balance ${amountToClaim > 0 ? `, and the remaining $${parseFloat(`${amountToClaim}`).toFixed(5)} has been claimed successfully` : ''}`
        //   : `${parseFloat(`${amountToClaim}`).toFixed(5)} ${StaticToken.LYK_W} claimed successfully`,
        meta: isDeducted
          ? {
              ...meta,
              isDeducted: true,
              dueWithdrawTransactionId: DueWithdrawID,
              dueType: DueType.SUPERNODE,
              DueRemarks: isAllowtoTransactions
                ? DueRemarks.SuperNode_CLAIMED_PARTIAL_DEBIT_WITHDRAW
                : DueRemarks.SuperNode_CLAIMED_FULL_DEBIT_WITHDRAW,
            }
          : meta,
      });

      // const newDeposit = new this.walletService.depositTransactionModel({
      //   user: new Types.ObjectId(userId),
      //   toWallet: userRewardWallet._id,
      //   toWalletTrx: claimedTrx[0]._id,
      //   amount: amountToClaim,
      //   confirmation: '0',
      //   hash: TrxType.SUPERNODE_REWARD,
      //   onChainWallet: null,
      //   serialNumber: sN,
      //   requestId,
      //   transactionStatus: TransactionStatus.SUCCESS,
      //   newBalance: walletBalance + amountToClaim,
      //   previousBalance: walletBalance,
      // });
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
          confirmation: 'supernode claim done',
          hash: TrxType.SUPERNODE_REWARD,
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
          // remarks: isDeducted
          //   ? `Supernode claimed rewards of ${parseFloat(`${totalAmount}`).toFixed(5)} ${StaticToken.LYK_W}, $${parseFloat(`${deductedBalance}`).toFixed(5)} was deducted for the due balance ${amountToClaim > 0 ? `, and the remaining $${parseFloat(`${amountToClaim}`).toFixed(5)} has been claimed successfully` : ''}`
          //   : `${parseFloat(`${amountToClaim}`).toFixed(5)} ${StaticToken.LYK_W} claimed successfully`,
          note: note,
          meta: isDeducted
            ? {
                ...meta,
                isDeducted: true,
                dueWithdrawTransactionId: DueWithdrawID,
                dueType: DueType.SUPERNODE,
                DueRemarks: isAllowtoTransactions
                  ? DueRemarks.SuperNode_CLAIMED_PARTIAL_DEBIT_WITHDRAW
                  : DueRemarks.SuperNode_CLAIMED_FULL_DEBIT_WITHDRAW,
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
      const snBonusTransactionId =
        await this.SNBonusTransactionModel.updateMany(
          {
            claimed: false,
            receivable: true,
            user: new Types.ObjectId(userId),
          },
          {
            claimed: true,
            claimableID: newDeposit._id,
            claimNote: 'supernode claim done',
            meta: isDeducted
              ? {
                  dueWithdrawTransactionId: DueWithdrawID,
                  type: DueType.SUPERNODE,
                  DueRemarks: isAllowtoTransactions
                    ? DueRemarks.SuperNode_CLAIMED_PARTIAL_DEBIT_WITHDRAW
                    : DueRemarks.SuperNode_CLAIMED_FULL_DEBIT_WITHDRAW,
                }
              : null,
          },
          {
            session,
          },
        );

      if (isDeducted) {
        DueMetaData = {
          ...DueMetaData,
          fromAmount: totalAmount,
          fromToken: userRewardWallet?.token || null,
          fromWallet: userRewardWallet._id,
          deductedAmount: deductedBalance,
          tokenPrice: price,
          amount: amountToClaim,
          type: DueType.SUPERNODE,
          DueRemark: isAllowtoTransactions
            ? DueRemarks.SuperNode_CLAIMED_PARTIAL_DEBIT_WITHDRAW
            : DueRemarks.SuperNode_CLAIMED_FULL_DEBIT_WITHDRAW,
          duewalletId: DueWalletId,
          fromWalletTrx: claimedTrx[0]._id,
          dueWalletTransactionId: DueWalletTransactionId,
          snBonusTransactionId: snBonusTransactionId[0]?._id as Types.ObjectId,
          note: 'taking one snBonus transaction id from the claimable list',
        };
        await this.walletDepositService.UpdateMetaInDueTransaction({
          DueMeta: DueMetaData,
          dueTransactionId: DueWithdrawID,
          note: note,
          session: session,
        });
      }

      await session.commitTransaction();

      const formattedTotalAmount = await formatToFixed5(totalAmount);
      const formattedDeductedBalance = await formatToFixed5(deductedBalance);

      if (formattedDeductedBalance > 0 || isDeducted) {
        return `You have successfully claimed ${formattedTotalAmount} LYK-W. $${formattedDeductedBalance} will be deducted from your ${StaticToken.DEBIT} wallet.`;
      } else {
        return `${formattedTotalAmount} LYK-W Claimed Successfully`;
      }
    } catch (error) {
      await session.abortTransaction();
      throw new HttpException('Failed to claim tokens', 400);
    } finally {
      session.endSession();
    }
  }

  async getFirstLineActiveUsers(userId: string) {
    const firstLineUsers = await this.getUserWithChildren(userId, userId, 1);
    const activeBuilderGenerationUsers = firstLineUsers.filter(
      (user) => user.builderGenerationStatus,
    );

    const activeBaseReferralUsers = firstLineUsers.filter(
      (user) => user.baseReferralStatus,
    );

    const builderGenerationResult = [];
    const baseReferralResult = [];

    for (const user of activeBuilderGenerationUsers) {
      const data = {
        totalRewards: user.reward,
        totalMachines: user.totalMachines,
        _id: user._id,
        user: user.user,
      };
      builderGenerationResult.push(data);
    }

    for (const user of activeBaseReferralUsers) {
      const data = {
        totalRewards: user.reward,
        totalMachines: user.totalMachines,
        _id: user._id,
        user: user.user,
      };
      baseReferralResult.push(data);
    }

    const returnData = {
      activeBuilderGenerationUsers: builderGenerationResult,
      activeBaseReferralUsers: baseReferralResult,
    };

    return returnData;
    // return data;
    // const activeUsersWithRewards = await this.activeUserTree.aggregate([
    //   {
    //     $match: {
    //       upline: new Types.ObjectId(userId),
    //     },
    //   },
    //   {
    //     $lookup: {
    //       from: 'cloudkmachines',
    //       localField: 'user',
    //       foreignField: 'user',
    //       as: 'allMachines',
    //     },
    //   },
    //   {
    //     $addFields: {
    //       totalMachines: { $size: '$allMachines' }, // Keep total machine count
    //       highestPricedMachine: {
    //         $arrayElemAt: [
    //           {
    //             $filter: {
    //               input: {
    //                 $slice: [
    //                   {
    //                     $sortArray: {
    //                       input: '$allMachines',
    //                       sortBy: { productPrice: -1 },
    //                     },
    //                   },
    //                   1,
    //                 ],
    //               },
    //               as: 'machine',
    //               cond: { $ne: ['$$machine', null] },
    //             },
    //           },
    //           0,
    //         ],
    //       },
    //     },
    //   },
    //   {
    //     $unwind: '$highestPricedMachine', // Unwind only the highest-priced machine
    //   },
    //   {
    //     $group: {
    //       _id: '$user',
    //       highestPricedMachine: {
    //         $first: '$allMachines',
    //       },
    //       totalMachines: { $first: '$totalMachines' }, // Pass total machine count
    //     },
    //   },
    //   {
    //     $lookup: {
    //       from: 'users', // Assuming 'users' is the name of your user collection
    //       localField: '_id',
    //       foreignField: '_id',
    //       as: 'user',
    //     },
    //   },
    //   {
    //     $unwind: '$user',
    //   },
    //   {
    //     $lookup: {
    //       from: 'snbonustransactions', // Assuming 'SNBonusTransaction' is the correct collection name for rewards
    //       let: { userId: '$_id' },
    //       pipeline: [
    //         {
    //           $match: {
    //             $expr: {
    //               $eq: ['$user', '$$userId'],
    //             },
    //           },
    //         },
    //         {
    //           $group: {
    //             _id: null,
    //             totalRewards: {
    //               $sum: {
    //                 $cond: [{ $eq: ['$receivable', true] }, '$tokenAmount', 0],
    //               },
    //             },
    //           },
    //         },
    //         { $project: { _id: 0, totalRewards: 1 } },
    //       ],
    //       as: 'supernodeRewards',
    //     },
    //   },
    //   {
    //     $addFields: {
    //       totalRewards: {
    //         $cond: {
    //           if: {
    //             $gt: [{ $size: '$supernodeRewards' }, 0],
    //           },
    //           then: {
    //             $arrayElemAt: ['$supernodeRewards.totalRewards', 0],
    //           },
    //           else: 0,
    //         },
    //       },
    //     },
    //   },
    //   {
    //     $addFields: {
    //       highestPricedMachine: {
    //         $arrayElemAt: ['$highestPricedMachine', 0],
    //       },
    //     },
    //   },

    //   {
    //     $match: {
    //       'highestPricedMachine.status': 'active',
    //       $expr: {
    //         $gte: [
    //           '$highestPricedMachine.collatoral',
    //           '$highestPricedMachine.productPrice',
    //         ],
    //       },
    //     },
    //   },
    // ]);
    // return activeUsersWithRewards;
  }

  async getPaginatedFirstLineUsers(userId: string, paginateDTO) {
    const { page, limit, type } = paginateDTO;

    const machineMatchConditions = {};

    if (type === SN_BONUS_TYPE.BASE_REFERRAL) {
      machineMatchConditions['user.isBaseReferralActive'] = true;
    } else if (type === SN_BONUS_TYPE.BUILDER_GENERATIONAl) {
      machineMatchConditions['user.isBuilderGenerationActive'] = true;
    }

    const pipeline = [
      {
        $match: {
          uplineId: new Types.ObjectId(userId),
        },
      },
      {
        $match: machineMatchConditions,
      },
    ];

    const data = await aggregatePaginate(
      this.userModel,
      pipeline,
      Number(page),
      Number(limit),
    );
    const promiseAllArrays = [];
    const dataList = data.list;
    for (let i = 0; i < data.list.length; i++) {
      promiseAllArrays.push(
        this.getReceivableRewardFromUser(
          dataList[i].upline,
          dataList[i].user._id,
        ),
      );
    }
    const promised = await Promise.all(promiseAllArrays);
    for (let i = 0; i < data.list.length; i++) {
      data.list[i].totalRewards = promised[i];
    }
    return data;
  }

  async getUserWithChildren(
    requestUser: string,
    userId: string,
    depth: number = 1,
    currentDepth = 1,
  ): Promise<any> {
    const cached: {
      isActive: boolean;
      lostReasons: LostReason[];
      availableGask: number;
      bonusAmount: number;
    } = await this.cacheService.getCacheUser({
      type: CACHE_TYPE.FIRSTLINE_USER_DATA,
      user: userId,
    });

    if (cached) {
      return cached;
    }

    const children: any = await this.userModel
      .find({ uplineId: new Types.ObjectId(userId), deletedAt: { $eq: null } })
      .populate('user')
      .lean()
      .exec();

    const masterPromiseAr = [];

    for (const child of children) {
      child.status = child.isSupernodeActive;
      child.builderGenerationStatus = child.isBuilderGenerationActive;
      child.baseReferralStatus = child.isBaseReferralActive;

      const promiseAllAr = [
        Promise.resolve(child._id),
        this.getReceivableRewardFromUser(requestUser, child._id),
        this.getUserTotalProduction(child._id),
        this.cloudKService.getAllUserMachinesCount(child._id),
      ];

      if (depth > currentDepth) {
        promiseAllAr.push(
          this.getUserWithChildren(
            requestUser,
            child._id,
            depth,
            currentDepth + 1,
          ),
        );
      }

      masterPromiseAr.push(Promise.all(promiseAllAr));
    }

    const promisedResult = await Promise.all(masterPromiseAr);
    for (let i = 0; i < children.length; i++) {
      children[i].reward = promisedResult[i][1];
      children[i].production = promisedResult[i][2];
      children[i].totalMachines = promisedResult[i][3];
      children[i].children = promisedResult[i][4] || [];
    }

    await this.cacheService.setCacheUser({
      type: CACHE_TYPE.ACTIVE_USER,
      user: userId,
      data: children,
    });

    return children;
  }

  // async getUserWithChildren(
  //   requestUser: string,
  //   userId: string,
  //   depth: number = 1,
  //   currentDepth = 1,
  // ): Promise<any> {
  //   const children: any = await this.activeUserTree
  //     .find({ upline: new Types.ObjectId(userId), deletedAt: { $eq: null } })
  //     .populate('user')
  //     .lean()
  //     .exec();

  //   for (const child of children) {
  //     child.children =
  //       depth <= currentDepth
  //         ? []
  //         : await this.getUserWithChildren(
  //             requestUser,
  //             child.user._id,
  //             depth,
  //             currentDepth + 1,
  //           );
  //     child.status = child.user.isSupernodeActive;
  //     const rewards = await this.getReceivableRewardFromUser(
  //       requestUser,
  //       child.user._id,
  //     );
  //     child.reward = rewards;
  //     child.production = await this.getUserTotalProduction(child.user._id);
  //     child.totalMachines = await this.cloudKService.getAllUserMachinesCount(
  //       child.user._id,
  //     );
  //   }

  //   return children;
  // }

  // async getUserWithChildren(
  //   userId: string,
  //   depth?: number,
  //   page?: number,
  //   limit?: number,
  // ): Promise<any> {
  //   if (depth === 0) return [];

  //   const offset = (page - 1) * limit;

  //   const children: any = await this.activeUserTree
  //     .find({ upline: new Types.ObjectId(userId) })
  //     .populate('user')
  //     .skip(offset)
  //     .limit(limit)
  //     .lean()
  //     .exec();

  //   for (const child of children) {
  //     // Recursively fetch children if depth allows
  //     child.children = await this.getUserWithChildren(
  //       child.user._id,
  //       depth - 1,
  //       1,
  //       limit,
  //     );

  //     child.status = await this.isUserActiveNode(child.user._id);

  //     const rewards = await this.getUserReceivableSupernodeReward(
  //       child.user._id,
  //     );
  //     child.reward = rewards.totalRewards;

  //     child.production = await this.getUserTotalProduction(child.user._id);
  //   }

  //   return children;
  // }

  async getSuperNodeRewards(userId, paginateDTO) {
    const {
      page,
      limit,
      query,
      status,
      fromDate,
      toDate,
      type,
      level,
      treeLevel,
      rewardLevel,
    } = paginateDTO;
    let searchCondition = {};
    const matchConditions: any[] = [
      {
        user: new Types.ObjectId(userId),
        receivable: true,
        deletedAt: { $eq: null },
      },
    ];
    if (query) {
      searchCondition = {
        $or: [
          { 'fromUser.firstName': { $regex: query, $options: 'i' } },
          { 'fromUser.lastName': { $regex: query, $options: 'i' } },
          { 'fromUser.email': { $regex: query, $options: 'i' } },
          { 'fromUser.blockchainId': { $regex: query, $options: 'i' } },
          { 'fromUser.username': { $regex: query, $options: 'i' } },
        ],
      };
    }

    if (type) {
      if (type === SN_BONUS_SUMMARY_TYPE.MATCHING_BONUS) {
        matchConditions.push({ isMachingBonus: true });
        //  whereConfig.isMachingBonus = true;
      } else if (type !== SN_BONUS_SUMMARY_TYPE.TOTAL_REWARDS) {
        matchConditions.push({
          type: type,
          $or: [
            { isMatchingBonus: { $exists: false } },
            { isMatchingBonus: false },
          ],
        });
      }
    }
    if (level) {
      matchConditions.push({ 'rewardData.currentLevel': parseInt(level) });
    }

    if (rewardLevel) {
      // level Filter with Reward Level
      matchConditions.push({
        'rewardData.currentLevel': parseInt(rewardLevel),
      });
    }
    if (treeLevel) {
      // level Filter with Tree Level
      matchConditions.push({ 'rewardData.actualLevel': parseInt(treeLevel) });
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

    const pipeline: PipelineStage[] = [
      { $match: { $and: matchConditions, deletedAt: null } },
      {
        $sort: { createdAt: -1 },
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
        $unwind: {
          path: '$fromUser',
          preserveNullAndEmptyArrays: true, // This keeps documents even if there's no match in users collection
        },
      },
      { $match: { ...searchCondition } },

      {
        $lookup: {
          from: 'cloudktransactions',
          localField: 'cloudkTrx',
          foreignField: '_id',
          as: 'cloudkTrx',
          pipeline: [
            {
              $lookup: {
                from: 'tokens',
                localField: 'token',
                foreignField: '_id',
                as: 'token',
                pipeline: [],
              },
            },
            {
              $unwind: {
                path: '$token',
                preserveNullAndEmptyArrays: true, // This keeps documents even if there's no match in users collection
              },
            },
          ],
        },
      },
      {
        $unwind: {
          path: '$cloudkTrx',
          preserveNullAndEmptyArrays: true, // This keeps documents even if there's no match in users collection
        },
      },
      {
        $project: {
          token: '$cloudkTrx.token',
          fromUser: '$fromUser',
          tokenAmount: '$tokenAmount',
          amount: '$amount',
          gaskRemaining: '$gaskRemaining',
          loss: '$loss',
          type: '$type',
          receivable: '$receivable',
          rewardData: '$rewardData',
          createdAt: '$createdAt',
          cloudkTrx: '$cloudkTrx._id',
        },
      },
    ];
    // console.log('-------: ', JSON.stringify(pipeline, null, -2));

    const data = await aggregatePaginate(
      this.SNBonusTransactionModel,
      pipeline,
      Number(page),
      Number(limit),
    );

    return data;
  }

  // async getUserWithChildrenCounts(userId: string) {
  //

  //   const result = await this.activeUserTree.aggregate([
  //     {
  //       $match: {
  //         deletedAt: { $eq: null },
  //       },
  //     },
  //     {
  //       $graphLookup: {
  //         from: 'activeusertrees', // Collection name
  //         startWith: new Types.ObjectId(userId),
  //         connectFromField: '_id',
  //         connectToField: 'upline',
  //         as: 'hierarchy',
  //         restrictSearchWithMatch: { deletedAt: { $eq: null } },
  //       },
  //     },
  //     {
  //       $project: {
  //         hierarchy: {
  //           _id: 1,
  //           user: 1,
  //         },
  //       },
  //     },
  //     {
  //       $unwind: '$hierarchy',
  //     },
  //     {
  //       $lookup: {
  //         from: 'users', // Replace with your actual 'user' collection name
  //         localField: 'hierarchy.user',
  //         foreignField: '_id',
  //         as: 'userDetails',
  //       },
  //     },
  //     {
  //       $unwind: {
  //         path: '$userDetails',
  //         preserveNullAndEmptyArrays: true,
  //       },
  //     },
  //     {
  //       $group: {
  //         _id: null,
  //         totalNodes: { $sum: 1 },
  //         activeBuilderGenerational: {
  //           $sum: {
  //             $cond: [
  //               { $eq: ['$userDetails.isBuilderGenerationActive', true] },
  //               1,
  //               0,
  //             ],
  //           },
  //         },
  //         activeBaseRefferal: {
  //           $sum: {
  //             $cond: [
  //               { $eq: ['$userDetails.isBaseReferralActive', true] },
  //               1,
  //               0,
  //             ],
  //           },
  //         },
  //       },
  //     },
  //     {
  //       $project: {
  //         _id: 0,
  //         totalNodes: 1,
  //         activeBuilderGenerational: 1,
  //         activeBaseRefferal: 1,
  //       },
  //     },
  //   ]);

  //   // Return result or defaults
  //   return (
  //     result[0] || {
  //       totalNodes: 0,
  //       activeBuilderGenerational: 0,
  //       activeBaseRefferal: 0,
  //     }
  //   );
  // }

  // async getUserWithChildrenCountsNormal(userId: string) {
  //   const children = await this.activeUserTree
  //     .find({ upline: new Types.ObjectId(userId), deletedAt: { $eq: null } })
  //     .select('user')
  //     .populate('user')
  //     .lean()
  //     .exec();

  //

  //   let totalNodes = children.length; // Initialize with first-line nodes
  //   let activeBuilderGenerational = 0;

  //   let childData;

  //   // Loop through all first-line children and recursively calculate counts
  //   for (const child of children) {
  //     childData = await this.getTotalSuperNode(child);
  //   }

  //   return childData;
  // }

  async getUserWithChildrenCounts(userId: string): Promise<any> {
    const user = await this.userModel.findById(userId);

    return {
      firstLineNode: user?.firstLineNode || 0,
      totalNodes: user?.totalNode || 0,
      activeFirstLineBuilderGenerationNode:
        user?.firstLineBuilderGenerational || 0,
      activeBuilderGenerationTotalNode: user?.totalBuilderGenarational || 0,
      activeFirstLineBaseReferralNode: user?.firstLineBaseReferral || 0,
      activeBaseReferralTotalNode: user?.totalBaseReferral || 0,
    };

    const userChildrenCountCache = await this.cacheService.getCacheUser({
      type: CACHE_TYPE.USER_CHILDREN_COUNT,
      user: String(userId),
    });

    if (userChildrenCountCache) {
      return userChildrenCountCache;
    }

    // Fetch the immediate children with only required fields
    const children = await this.activeUserTree
      .find({ upline: new Types.ObjectId(userId), deletedAt: { $eq: null } })
      .select('user')
      .populate('user')
      .lean()
      .exec();

    const firstLineNode = children.length;
    let totalNodes = 0;
    let activeFirstLineBuilderGenerationNode = 0;
    let activeBuilderGenerationTotalNode = 0;
    let activeFirstLineBaseReferralNode = 0;
    let activeBaseReferralTotalNode = 0;

    // Process children concurrently
    await Promise.all(
      children.map(async (child: any) => {
        const childData = await this.getUserWithChildrenCounts(child.user._id);

        totalNodes += childData.totalNodes + 1;

        const isBuilderGenerationActive = child.user.isBuilderGenerationActive
          ? true
          : false;

        const isBaseReferralActive = child.user.isBaseReferralActive
          ? true
          : false;

        if (isBuilderGenerationActive) {
          activeFirstLineBuilderGenerationNode++;
          activeBuilderGenerationTotalNode +=
            childData.activeBuilderGenerationTotalNode + 1;
        }

        if (isBaseReferralActive) {
          activeFirstLineBaseReferralNode++;
          activeBaseReferralTotalNode +=
            childData.activeBaseReferralTotalNode + 1;
        }
      }),
    );

    await this.cacheService.setCacheUser({
      type: CACHE_TYPE.USER_CHILDREN_COUNT,
      user: userId,
      data: children,
    });

    const dataToCache = {
      firstLineNode,
      totalNodes,
      activeFirstLineBuilderGenerationNode,
      activeBuilderGenerationTotalNode,
      activeFirstLineBaseReferralNode,
      activeBaseReferralTotalNode,
    };

    await this.cacheService.setCacheUser({
      type: CACHE_TYPE.USER_CHILDREN_COUNT,
      user: userId,
      data: dataToCache,
    });

    return dataToCache;
  }

  // async getUserWithChildrenCounts(userId: string): Promise<any> {
  //   const children: any = await this.activeUserTree
  //     .find({ upline: new Types.ObjectId(userId) })
  //     .populate('user')
  //     .lean()
  //     .exec();
  //   const firstLineNode = children.length;
  //   let totalNodes = 0;
  //   let activeFirstLineNode = 0;
  //   let activeTotalNode = 0;

  //   ;

  //   for (const child of children) {
  //     const childData = await this.getUserWithChildrenCounts(child.user._id);

  //     totalNodes += childData.totalNodes + 1;

  //     const isActive = await this.isUserActiveNode(child.user._id);
  //     if (isActive) {
  //       activeFirstLineNode++;
  //       activeTotalNode += childData.activeTotalNode + 1;
  //     }

  //     child.children = childData.children;
  //     child.status = isActive;
  //     const rewards = await this.getUserReceivableSupernodeReward(
  //       child.user._id,
  //     );
  //     child.reward = rewards.totalRewards;
  //     child.production = await this.getUserTotalProduction(child.user._id);
  //   }

  //   return {
  //     firstLineNode,
  //     totalNodes,
  //     activeFirstLineNode,
  //     activeTotalNode,
  //   };
  // }

  // Function using for get user daily reward and total reward
  // Input:specific user id
  async getUserRewards(userId: string, toUser: string): Promise<any> {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const pipeline = [
      {
        $facet: {
          dailyReward: [
            {
              $match: {
                user: new Types.ObjectId(toUser),
                fromUser: new Types.ObjectId(userId),
                receivable: true,
                deletedAt: null,
                createdAt: {
                  $gte: start, // Match documents created at or after the start of today
                  $lt: end, // Match documents created before the end of today
                },
              },
            },
            {
              $group: {
                _id: null,
                totalAmount: {
                  $sum: '$tokenAmount',
                },
              },
            },
          ],
          totalReward: [
            {
              $match: {
                user: new Types.ObjectId(toUser),
                fromUser: new Types.ObjectId(userId),
                receivable: true,
              },
            },
            {
              $group: {
                _id: null,
                totalAmount: {
                  $sum: '$tokenAmount',
                },
              },
            },
            {
              $project: {
                _id: 0, // Exclude the _id field from the result
                totalAmount: '$totalAmount',
              },
            },
          ],
        },
      },
    ];
    const productionPipline = [
      {
        $facet: {
          dailyProduction: [
            {
              $match: {
                user: new Types.ObjectId(userId),
                createdAt: {
                  $gte: start, // Match documents created at or after the start of today
                  $lt: end, // Match documents created before the end of today
                },
              },
            },
            {
              $group: {
                _id: 0,
                totalAmount: {
                  $sum: '$tokenAmount',
                },
              },
            },
          ],
          totalProduction: [
            {
              $match: {
                user: new Types.ObjectId(userId),
              },
            },
            {
              $group: {
                _id: 0,
                totalAmount: {
                  $sum: '$tokenAmount',
                },
              },
            },
          ],
        },
      },
    ];
    const rewardData =
      await this.SNBonusTransactionModel.aggregate(pipeline).exec();
    const dailyReward = rewardData[0].dailyReward;
    const totalReward = rewardData[0].totalReward;
    let productionData = await this.cloudKRewardModel
      .aggregate(productionPipline)
      .exec();
    const dailyProduction = productionData[0].dailyProduction;
    const totalProduction = productionData[0].totalProduction;
    productionData = productionData[0];
    const settings = await this.cloudKService.getCurrentCloudkSettings();
    const rewardResponse = {
      dailyRewards: dailyReward.length ? dailyReward[0].totalAmount : 0,
      totalReward: totalReward.length ? totalReward[0].totalAmount : 0,
      dailyProduction: dailyProduction.length
        ? dailyProduction[0].totalAmount
        : 0,
      totalProduction: totalProduction.length
        ? totalProduction[0].totalAmount
        : 0,
      token: settings.rewardToken,
    };

    return rewardResponse;
  }
  async getUserProductionGraph(
    userId: string,
    timeline: CHART_TIMELIME_TYPES,
  ): Promise<any> {
    if (timeline === CHART_TIMELIME_TYPES.MONTHLY)
      return await this.getMonthlyProductionChartData(
        new Types.ObjectId(userId),
      );
    if (timeline === CHART_TIMELIME_TYPES.YEARLY)
      return await this.getYearlyProductionChartData(
        new Types.ObjectId(userId),
      );
    if (timeline === CHART_TIMELIME_TYPES.WEEKLY)
      return await this.getWeeklyProductionChartData(
        new Types.ObjectId(userId),
      );
  }

  async getWeeklyProductionChartData(userId: Types.ObjectId) {
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
    const result = await this.cloudKRewardModel.aggregate(pipeline).exec();

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

    return dailyTokenAmounts;
  }

  async getYearlyProductionChartData(userId: Types.ObjectId) {
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
          totalAmount: { $sum: '$tokenAmount' },
        },
      },
      {
        $sort: { '_id.year': 1 },
      },
      {
        $project: {
          _id: 0,
          year: '$_id.year',
          totalAmount: 1,
        },
      },
    ];

    const result = await this.cloudKRewardModel.aggregate(pipeline).exec();

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
        y: found ? found.totalAmount : null,
      };
    });

    return yearlyTokenAmounts;
  }

  async getMonthlyProductionChartData(userId: Types.ObjectId) {
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
          totalAmount: { $sum: '$tokenAmount' },
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
          totalAmount: 1,
        },
      },
    ];

    const result = await this.cloudKRewardModel.aggregate(pipeline).exec();

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

    const monthlyAmounts = months.map((month, index) => {
      const found = result.find(
        (item) => item.month === month.month && item.year === 2024,
      );
      return {
        x: month.name,
        y: found ? found.totalAmount : currentMonth >= index ? 0 : null,
      };
    });

    return monthlyAmounts;
  }

  async getCommunityUserRewardHistory(fromUser, toUser, paginateDTO) {
    const { page, limit, fromDate, toDate, machine, type } = paginateDTO;

    const matchConditions: any[] = [
      {
        fromUser: new Types.ObjectId(fromUser),
        user: new Types.ObjectId(toUser),
        receivable: true,
        deletedAt: null,
      },
    ];
    let machineMatchConditions = {};

    if (machine) {
      machineMatchConditions = {
        'cloudkTrx.machine._id': new Types.ObjectId(machine),
      };
    }

    if (type) {
      matchConditions.push({ type: type });
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

    const pipeline: PipelineStage[] = [
      { $match: { $and: matchConditions, deletedAt: null } },
      {
        $sort: { createdAt: -1 },
      },
      {
        $lookup: {
          from: 'cloudktransactions',
          localField: 'cloudkTrx',
          foreignField: '_id',
          as: 'cloudkTrx',
          pipeline: [
            {
              $lookup: {
                from: 'cloudkmachines',
                localField: 'machine',
                foreignField: '_id',
                as: 'machine',
              },
            },
            {
              $unwind: '$machine',
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
          ],
        },
      },
      {
        $match: machineMatchConditions,
      },
      {
        $unwind: {
          path: '$cloudkTrx',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          machine: {
            _id: '$cloudkTrx.machine._id',
            name: '$cloudkTrx.machine.name',
            imageUrl: '$cloudkTrx.machine.imageUrl',
          },
          token: '$cloudkTrx.token.name',
          type: '$type',
          rewardData: '$rewardData',
          production: '$cloudkTrx.tokenAmount',
          myReward: '$tokenAmount',
          date: '$createdAt',
        },
      },
    ];

    const data = await aggregatePaginate(
      this.SNBonusTransactionModel,
      pipeline,
      Number(page),
      Number(limit),
    );

    return data;
  }

  // get SNGP
  async getSngps(filters: SngpQueryFilters) {
    // get only active sngp
    let pipeline = [
      {
        $match: { status: STATUS_TYPE.ACTIVE, startDate: { $gte: new Date() } },
      },
    ];

    // filter on status field
    if (filters.status) {
      pipeline = [
        {
          $match: { status: filters.status, startDate: { $gte: new Date() } },
        },
      ];
    }

    const data = await aggregatePaginate(
      this.sngpModel,
      pipeline,
      Number(filters.page ?? 1),
      Number(filters.limit ?? 10),
    );

    return data;
  }

  async createSngp(admin, reqSngp: SngpDto) {
    if (
      reqSngp.type != POOL_TYPE.SNGP &&
      new Date(reqSngp.startDate) <= new Date()
    )
      throw new HttpException(
        'Start date must be from future',
        HttpStatus.BAD_REQUEST,
      );

    const isNameExist = await this.sngpModel.findOne({
      name: reqSngp.name,
      status: STATUS_TYPE.ACTIVE,
      deletedAt: { $eq: null },
    });
    if (isNameExist) {
      if (reqSngp.type === POOL_TYPE.SNGP) {
        throw new HttpException(
          'SNGP configuration already exists.',
          HttpStatus.CONFLICT,
        );
      } else {
        throw new HttpException('Name must be unique', HttpStatus.CONFLICT);
      }
    }
    const sngp = await this.sngpModel.create({
      name: reqSngp.name,
      totalPoints: reqSngp.totalPoints,
      rewardAmount: reqSngp.rewardAmount,
      status: STATUS_TYPE.ACTIVE,
      admin: admin,
      remainingPoints: reqSngp.totalPoints,
      startDate: reqSngp.startDate,
      countryCode: reqSngp.countryCode,
      multiplier: reqSngp.multiplier,
      type: reqSngp.type,
    });

    const sngpWithoutAdmin = sngp.toObject();
    delete sngpWithoutAdmin.admin; // Remove the admin field
    return sngpWithoutAdmin;
  }

  async updateSngp(id: string, reqSngp: UpdateSngpDto, adminId: string) {
    const existingSngp = await this.sngpModel.findById(new Types.ObjectId(id));

    if (!existingSngp)
      throw new HttpException(
        'Configuration not exist',
        HttpStatus.BAD_REQUEST,
      );

    // date must be from future for updation
    if (reqSngp.startDate && new Date(reqSngp.startDate) <= new Date()) {
      throw new HttpException(
        'Unable to update the data. please update date',
        HttpStatus.BAD_REQUEST,
      );
    }

    const isNameExist = await this.sngpModel.findOne({
      name: reqSngp.name,
      _id: { $ne: existingSngp._id },
      deletedAt: { $eq: null },
    });
    if (isNameExist)
      throw new HttpException('Name must be unique', HttpStatus.CONFLICT);

    return await existingSngp.updateOne({
      name: reqSngp.name,
      totalPoints: reqSngp.totalPoints,
      rewardAmount: reqSngp.rewardAmount,
      remainingPoints: reqSngp.totalPoints,
      startDate: reqSngp.startDate,
      countryCode: reqSngp.countryCode,
      multiplier: reqSngp.multiplier,
    });
  }

  async deleteSngp(id: string) {
    const sngp = await this.sngpModel.findById(id);
    if (!sngp) {
      throw new HttpException('Pool not found', HttpStatus.NOT_FOUND);
    }
    if (sngp.type === POOL_TYPE.SNGP && sngp.status === STATUS_TYPE.ACTIVE) {
      throw new HttpException(
        `Active sngp can't be delete`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    sngp.deletedAt = new Date();
    await sngp.save();
    return sngp;
  }

  async getGaskSetting(id: Types.ObjectId): Promise<SuperNodeGaskSetting> {
    const setting = await this.snGaskSettingModel.findById(id);
    if (!setting) {
      throw new HttpException('Setting not found', HttpStatus.NOT_FOUND);
    }
    return setting;
  }
  async getAllSngpSettings(): Promise<SuperNodeGaskSetting> {
    const result = await this.snGaskSettingModel
      .findOne()
      .sort({ createdAt: -1 });
    return result;
  }

  //Service for creating sngp setting
  async createGaskSetting(
    multiplier: number,
    status: STATUS_TYPE,
  ): Promise<SuperNodeGaskSetting> {
    // updating the status of existing entries to inactive before adding a new entry
    await this.snGaskSettingModel.updateMany(
      { status: STATUS_TYPE.ACTIVE },
      { status: STATUS_TYPE.INACTIVE },
    );
    // adding a new entry in the db
    const newSetting = new this.snGaskSettingModel({ multiplier, status });
    try {
      // )
      return await newSetting.save();
    } catch (error) {
      throw new HttpException(
        'Error creating setting',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  async getsnGaskSettingMultiplier(): Promise<number> {
    const snGaskSetting = await this.snGaskSettingModel.findOne({
      $and: [
        {
          $or: [
            { status: 'active' }, // Matches if status is "active"
            { status: { $exists: false } }, // Matches if status does not exist
          ],
        },
        {
          $or: [
            { deletedAt: null }, // Matches if deletedAt is null
            { deletedAt: { $exists: false } }, // Matches if deletedAt does not exist
          ],
        },
      ],
    });

    return snGaskSetting?.multiplier || 3; // Default to 3 if multiplier is undefined
  }

  //Service for updatingcreating sngp setting
  async updateGaskSetting(
    id: Types.ObjectId,
    updateData: { multiplier: number; status: STATUS_TYPE },
  ): Promise<SuperNodeGaskSetting> {
    // if status is active , make all other entries inactive
    if (updateData.status === STATUS_TYPE.ACTIVE) {
      await this.snGaskSettingModel.updateMany(
        { _id: { $ne: id } },
        { status: STATUS_TYPE.INACTIVE },
      );
    }

    //  updating entries in the sngp setting
    const existingSetting = await this.snGaskSettingModel.findById(
      new Types.ObjectId(id),
    );

    if (!existingSetting)
      throw new HttpException(
        'Sngp setting doesnot exist',
        HttpStatus.BAD_REQUEST,
      );

    const updatedSetting = await existingSetting.updateOne(
      {
        multiplier: updateData.multiplier,
        status: updateData.status,
        updatedAt: new Date(),
      },
      { new: true },
    );

    return updatedSetting;
  }

  async deleteSngpSetting(id: Types.ObjectId): Promise<SuperNodeGaskSetting> {
    const deletedSetting = await this.snGaskSettingModel.findByIdAndDelete(id);
    if (!deletedSetting) {
      throw new HttpException('Setting not found', HttpStatus.NOT_FOUND);
    }
    return deletedSetting;
  }

  async getHighestValidMachine(userId: string | Types.ObjectId) {
    const userHighestMachine = (await this.fetchHighestValidMachine(
      userId,
    )) as any;

    const maxcapping = userHighestMachine?.product.superNodeCapping;
    return { superNodeMaxcapping: maxcapping };
  }

  async getSuperNodeTransactions(paginateDTO: SupernodeTransactionDTO) {
    const {
      page,
      limit,
      query,
      fromDate,
      toDate,
      isReceivable,
      isClaimed,
      sort,
      type,
      percentage,
      level,
    } = paginateDTO;

    let whereConfig = {};
    if (query) {
      const sanitizedQuery = query.replace(/\s+/g, '');
      const searchRegex = new RegExp(sanitizedQuery, 'i');
      const userSearchQuery = [
        { blockchainId: searchRegex },
        { email: searchRegex },
      ];

      const users = await this.userModel
        .find({
          $or: userSearchQuery,
        })
        .select('_id email');

      const userIds = users.map((u) => u._id);
      whereConfig = {
        ...whereConfig,
        $or: [
          { user: { $in: userIds } },
          { fromUser: { $in: userIds } },
          { 'user.email': searchRegex },
          { 'fromUser.email': searchRegex },
        ],
      };
    }

    if (isReceivable) {
      whereConfig = {
        ...whereConfig,
        receivable: isReceivable,
      };
    }

    if (isClaimed) {
      whereConfig = {
        ...whereConfig,
        claimed: isClaimed,
      };
    }

    if (type) {
      whereConfig = {
        ...whereConfig,
        type: type,
      };
    }

    if (percentage) {
      whereConfig = {
        ...whereConfig,
        'rewardData.percentage': Number(percentage),
      };
    }

    if (level) {
      whereConfig = {
        ...whereConfig,
        'rewardData.currentLevel': Number(level),
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
      model: this.SNBonusTransactionModel,
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

    const list = await this.SNBonusTransactionModel.find(whereConfig)
      .sort(sortQuery)
      .skip(paginate.offset)
      .limit(paginate.limit)
      .populate({ path: 'user' })
      .populate({ path: 'fromUser' })
      .lean();

    return {
      list,
      totalCount: paginate.total,
      totalPages: paginate.metadata.page.totalPage,
      currentPage: paginate.metadata.page.currentPage,
      paginate,
    };
  }

  async getSuperNodeBonusTransactions(paginateDTO: SupernodeTransactionDTO) {
    const { query, fromDate, toDate, level, type } = paginateDTO;
    const supernodeSetting = await this.supernodeSettingModel
      .findOne({ deletedAt: null })
      .populate('rewardToken');

    const matchConditions: any = {
      $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
    };

    if (type) {
      // Directly use the 'type' param to match the SN_BONUS_TYPE enum
      if (Object.values(SN_BONUS_TYPE).includes(type as SN_BONUS_TYPE)) {
        matchConditions.type = type;
        if (type === SN_BONUS_TYPE.MATCHING_BONUS) {
          matchConditions.isMachingBonus = true;
        }
      } else {
        throw new HttpException(
          'Invalid bonus type provided',
          HttpStatus.BAD_REQUEST,
        );
      }
    }
    if (!type) {
      throw new HttpException('Type is mandatory', HttpStatus.BAD_REQUEST);
    }

    // Add level filter if provided
    if (level) {
      // Convert level to a number
      const levelNumber = Number(level);

      // Check if level is a valid number and within the range 1 to 10
      if (isNaN(levelNumber) || levelNumber < 1 || levelNumber > 10) {
        throw new HttpException(
          'Invalid level. Please provide a level between 1 and 10.',
          HttpStatus.BAD_REQUEST,
        );
      }

      // If valid, set the match condition for the level
      matchConditions['rewardData.currentLevel'] = levelNumber;
    }

    // Add date range if provided
    if (fromDate) {
      const from = new Date(fromDate);
      const to = toDate ? new Date(toDate) : new Date();
      to.setUTCHours(23, 59, 59, 999);
      matchConditions.createdAt = { $gte: from, $lte: to };
    }

    // Add user query if provided
    if (query) {
      const searchRegex = new RegExp(query, 'i');
      const user = await this.userModel
        .findOne({
          $or: [
            { email: { $regex: searchRegex } },
            { blockchainId: { $regex: searchRegex } },
            { firstName: { $regex: searchRegex } },
            { lastName: { $regex: searchRegex } },
            { userName: { $regex: searchRegex } },
          ],
        })
        .exec();

      if (!user) {
        throw new HttpException(
          `User not found with provided query: ${query}`,
          HttpStatus.NOT_FOUND,
        );
      }
      matchConditions.user = new Types.ObjectId(user._id.toString());
    }
    console.log(JSON.stringify(matchConditions, null, 2));

    // Aggregation pipeline with level grouping
    const results = await this.SNBonusTransactionModel.aggregate([
      { $match: matchConditions },
      {
        $group: {
          _id: {
            level: '$rewardData.currentLevel',
            type: '$type',
            receivable: '$receivable',
          },
          totalTokenAmount: { $sum: '$tokenAmount' },
          totalAmount: { $sum: '$amount' },
        },
      },
      {
        $group: {
          _id: { level: '$_id.level', type: '$_id.type' },
          totalStats: {
            $push: {
              receivable: '$_id.receivable',
              tokenAmount: '$totalTokenAmount',
              amount: '$totalAmount',
            },
          },
          totalTokenAmount: { $sum: '$totalTokenAmount' },
          totalAmount: { $sum: '$totalAmount' },
        },
      },
      {
        $group: {
          _id: '$_id.level',
          types: {
            $push: {
              type: '$_id.type',
              totalStats: '$totalStats',
              totalTokenAmount: '$totalTokenAmount',
              totalAmount: '$totalAmount',
            },
          },
          totalTokenAmount: { $sum: '$totalTokenAmount' },
          totalAmount: { $sum: '$totalAmount' },
        },
      },
      { $sort: { _id: 1 } }, // Sort levels in ascending order
    ]);

    // Transform results into desired output format
    const levels = results.map((result) => {
      const distributedStats = result.types
        .flatMap((type) =>
          type.totalStats.filter((stat) => stat.receivable === true),
        )
        .reduce(
          (acc, curr) => ({
            tokenAmount: acc.tokenAmount + curr.tokenAmount,
            amount: acc.amount + curr.amount,
          }),
          { tokenAmount: 0, amount: 0 },
        );

      const nonDistributedStats = result.types
        .flatMap((type) =>
          type.totalStats.filter((stat) => stat.receivable === false),
        )
        .reduce(
          (acc, curr) => ({
            tokenAmount: acc.tokenAmount + curr.tokenAmount,
            amount: acc.amount + curr.amount,
          }),
          { tokenAmount: 0, amount: 0 },
        );

      return {
        level: result._id || 'N/A',
        totalDistributedTokenAmount: distributedStats.tokenAmount,
        totalDistributedAmount: distributedStats.amount,
        totalNonDistributedTokenAmount: nonDistributedStats.tokenAmount,
        totalNonDistributedAmount: nonDistributedStats.amount,
        TotalTokenAmount: result.totalTokenAmount,
        TotalAmount: result.totalAmount,
        token: supernodeSetting?.rewardToken?.name || '',
      };
    });

    // Calculate grand totals
    const grandTotalTokenAmount = await levels.reduce(
      (acc, level) => acc + level.TotalTokenAmount,
      0,
    );
    const grandTotalAmount = await levels.reduce(
      (acc, level) => acc + level.TotalAmount,
      0,
    );
    const grandtotalDistributedTokenAmount = await levels.reduce(
      (acc, level) => acc + level.totalDistributedTokenAmount,
      0,
    );
    const grandtotalDistributedAmount = await levels.reduce(
      (acc, level) => acc + level.totalDistributedAmount,
      0,
    );
    const grandtotalNonDistributedTokenAmount = await levels.reduce(
      (acc, level) => acc + level.totalNonDistributedTokenAmount,
      0,
    );
    const grandtotalNonDistributedAmount = await levels.reduce(
      (acc, level) => acc + level.totalNonDistributedAmount,
      0,
    );

    // Return the final response
    return {
      types: type,
      summary: [
        {
          tokenTitle: 'Total Amount',
          tokenAmount: grandTotalTokenAmount,
          dollarTitle: 'Total Dollar Amount',
          dollarAmount: grandTotalAmount,
          token: supernodeSetting?.rewardToken?.name || '',
        },
        {
          tokenTitle: 'Total Distributed Amount',
          tokenAmount: grandtotalDistributedTokenAmount,
          dollarTitle: 'Total Distributed Dollar Amount',
          dollarAmount: grandtotalDistributedAmount,
          token: supernodeSetting?.rewardToken?.name || '',
        },
        {
          tokenTitle: 'Total Non Distributed Amount',
          tokenAmount: grandtotalNonDistributedTokenAmount,
          dollarTitle: 'Total Non Distributed Dollar Amount',
          dollarAmount: grandtotalNonDistributedAmount,
          token: supernodeSetting?.rewardToken?.name || '',
        },
      ],

      levels,
    };
  }

  async getSupernodeTotaRewards(paginateDTO: SupernodeTransactionDTO) {
    const { fromDate, toDate, level } = paginateDTO;
    const supernodeSetting = await this.supernodeSettingModel
      .findOne({ deletedAt: null })
      .populate('rewardToken');

    const matchConditions: any = {
      $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
    };

    if (level) {
      const levelNumber = Number(level);
      if (isNaN(levelNumber) || levelNumber < 1 || levelNumber > 10) {
        throw new HttpException(
          'Invalid level. Please provide a level between 1 and 10.',
          HttpStatus.BAD_REQUEST,
        );
      }
      matchConditions['rewardData.currentLevel'] = levelNumber;
    }

    if (fromDate) {
      const to = toDate ? new Date(toDate) : new Date();
      const Dates = await getCustomRange(new Date(fromDate), to);
      matchConditions.createdAt = {
        $gte: Dates.startDate,
        $lte: Dates.endDate,
      };
    }

    // Simplified aggregation pipeline
    const results = await this.SNBonusTransactionModel.aggregate([
      { $match: matchConditions },
      {
        $facet: {
          typeResults: [
            {
              $group: {
                _id: '$type',
                totalTokenAmount: { $sum: '$tokenAmount' },
                totalAmount: { $sum: '$amount' },
              },
            },
            { $sort: { _id: 1 } },
          ],
          levelResults: [
            {
              $group: {
                _id: '$rewardData.currentLevel',
                totalTokenAmount: { $sum: '$tokenAmount' },
                totalAmount: { $sum: '$amount' },
              },
            },
            { $sort: { _id: 1 } },
          ],
          claimResults: [
            {
              $group: {
                _id: '$claimed',
                totalTokenAmount: { $sum: '$tokenAmount' },
                totalAmount: { $sum: '$amount' },
                count: { $sum: 1 },
              },
            },
            { $sort: { _id: 1 } },
          ],
          totalResults: [
            {
              $group: {
                _id: null,
                totalTokenAmount: { $sum: '$tokenAmount' },
                totalAmount: { $sum: '$amount' },
                totalCount: { $sum: 1 },
              },
            },
          ],
        },
      },
    ]);

    const grandTotalTokenAmount =
      results[0].totalResults[0]?.totalTokenAmount || 0;
    const grandTotalAmount = results[0].totalResults[0]?.totalAmount || 0;

    // Process claim status with both cases always present
    const claimMap: any = new Map(
      results[0].claimResults.map((result: any) => [result._id, result]),
    );

    const claimBreakdowns = [
      {
        tokenTitle: 'Total Claimed',
        tokenAmount: claimMap.get(true)?.totalTokenAmount || 0,
        dollarAmount: claimMap.get(true)?.totalAmount || 0,
        dollarTitle: 'Total Dollar Amount',
        token: supernodeSetting?.rewardToken?.name || '',
      },
      {
        tokenTitle: 'Total Claimable',
        tokenAmount: claimMap.get(false)?.totalTokenAmount || 0,
        dollarAmount: claimMap.get(false)?.totalAmount || 0,
        dollarTitle: 'Total Dollar Amount',
        token: supernodeSetting?.rewardToken?.name || '',
      },
    ];

    const allTypes = Object.values(SN_BONUS_SUMMARY_TYPE_REPORT);

    const typeBreakdowns = await Promise.all(
      allTypes.map(async (type) => {
        const typeResult = results[0].typeResults.find(
          (result) => result._id === type,
        );

        return {
          tokenTitle: await getTypeTitle(type),
          tokenAmount: typeResult?.totalTokenAmount || 0,
          dollarAmount: typeResult?.totalAmount || 0,
          dollarTitle: 'Total Dollar Amount',
          token: supernodeSetting?.rewardToken?.name || '',
        };
      }),
    );

    const summary = [
      {
        tokenTitle: 'Total Rewards',
        tokenAmount: grandTotalTokenAmount,
        dollarTitle: 'Total Dollar Amount',
        dollarAmount: grandTotalAmount,
        token: supernodeSetting?.rewardToken?.name || '',
      },
      ...claimBreakdowns,
      ...typeBreakdowns,
    ];

    const levels = results[0].levelResults.map((result) => ({
      level: result._id || 'N/A',
      tokenAmount: result.totalTokenAmount,
      amount: result.totalAmount,
      token: supernodeSetting?.rewardToken?.name || '',
    }));

    return {
      summary,
      levels,
    };
  }
  async createOrUpdateBRRewards({ user, rewardValue, level, date }) {
    const startOfDay = date ? new Date(date) : new Date();

    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const isUser = await this.userRewardsModel.findOne({
      user,
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    });

    if (isUser) {
      const updateFields =
        level === 1
          ? {
              $inc: {
                totalBaseReferralReward: rewardValue,
                firstLineBaseReferralRewards: rewardValue,
              },
              $set: {
                firstLineBaseReferralUsers:
                  (isUser.firstLineBaseReferralUsers || 0) + 1,
                totalBaseReferralUsers:
                  (isUser?.totalBaseReferralUsers || 0) + 1,
              },
            }
          : {
              $inc: { totalBaseReferralReward: rewardValue },
              $set: {
                totalBaseReferralUsers:
                  (isUser?.totalBaseReferralUsers || 0) + 1,
              },
            };
      await this.userRewardsModel.updateOne({ user }, updateFields, {
        upsert: true,
      });
    } else {
      const newUserReward =
        level === 1
          ? {
              user,
              totalBaseReferralReward: rewardValue,
              firstLineBaseReferralRewards: rewardValue,
              firstLineBaseReferralUsers: 1,
              totalBaseReferralUsers: 1,
              createdAt: date,
            }
          : {
              user,
              totalBaseReferralReward: rewardValue,
              totalBaseReferralUsers: 1,
              createdAt: date,
            };

      await this.userRewardsModel.create(newUserReward);
    }
  }

  async createOrUpdateBGRewards({ user, rewardValue, level }) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const isUser = await this.userRewardsModel.findOne({
      user,
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    });

    if (isUser) {
      const updateFields =
        level === 1
          ? {
              $inc: {
                totalBuilderGenReward: rewardValue,
                firstLineBuilderGenRewards: rewardValue,
              },
              $set: {
                firstLineBuilderGenUsers:
                  (isUser.firstLineBuilderGenUsers || 0) + 1,
                totalBuilderGenUsers: (isUser?.totalBuilderGenUsers || 0) + 1,
              },
            }
          : {
              $inc: {
                totalBuilderGenReward: rewardValue,
              },
              $set: {
                totalBuilderGenUsers: (isUser?.totalBuilderGenUsers || 0) + 1,
              },
            };
      await this.userRewardsModel.updateOne({ user }, updateFields, {
        upsert: true,
      });
    } else {
      const newUserReward =
        level === 1
          ? {
              user,
              totalBuilderGenReward: rewardValue,
              firstLineBuilderGenRewards: rewardValue,
              firstLineBuilderGenUsers: 1,
              totalBuilderGenUsers: 1,
            }
          : {
              user,
              totalBuilderGenReward: rewardValue,
              totalBuilderGenUsers: 1,
            };

      await this.userRewardsModel.create(newUserReward);
    }
  }

  async createOrUpdateTeamProducation({
    user,
    firstLineProduction,
    teamProduction,
  }) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    const isUser = await this.userRewardsModel.findOne({
      user,
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    });

    if (isUser) {
      // Check if teamProduction or firstLineProduction is 0 and update if necessary
      if (firstLineProduction !== 0 || teamProduction !== 0) {
        // Update the values only if they are zero
        isUser.firstLineProduction = firstLineProduction;
        isUser.teamProduction = teamProduction;

        // Save the updated document
        await isUser.save();
      }
    }
  }

  // async getUserSnRewardSummary(
  //   userId: string | Types.ObjectId,
  //   type: SN_BONUS_TYPE,
  //   period: TIME_PERIOD,
  // ) {
  //   let startOfPeriod: number, endOfPeriod: number;
  //   const currentDate = new Date();

  //   // switch (period) {
  //   //   case TIME_PERIOD.DAY:
  //   //     startOfPeriod = currentDate.setHours(0, 0, 0, 0);
  //   //     endOfPeriod = currentDate.setHours(23, 59, 59, 999);
  //   //     break;
  //   //   case TIME_PERIOD.WEEK:
  //   //     const firstDayOfWeek = currentDate.getDate() - currentDate.getDay();
  //   //     const lastDayOfWeek = firstDayOfWeek + 6;
  //   //     const startOfWeek = new Date(currentDate.setDate(firstDayOfWeek));
  //   //     const endOfWeek = new Date(currentDate.setDate(lastDayOfWeek));
  //   //     startOfPeriod = startOfWeek.setHours(0, 0, 0, 0);
  //   //     endOfPeriod = endOfWeek.setHours(23, 59, 59, 999);
  //   //     break;
  //   //   case TIME_PERIOD.MONTH:
  //   //     currentDate.setDate(1);
  //   //     startOfPeriod = currentDate.setHours(0, 0, 0, 0);
  //   //     currentDate.setMonth(currentDate.getMonth() + 1);
  //   //     currentDate.setDate(0);
  //   //     endOfPeriod = currentDate.setHours(23, 59, 59, 999);
  //   //     break;
  //   //   case TIME_PERIOD.YEAR:
  //   //     currentDate.setMonth(0, 1);
  //   //     startOfPeriod = currentDate.setHours(0, 0, 0, 0);
  //   //     currentDate.setFullYear(currentDate.getFullYear() + 1);
  //   //     currentDate.setMonth(0, 0);
  //   //     endOfPeriod = currentDate.setHours(23, 59, 59, 999);
  //   //     break;
  //   //   default:
  //   //     startOfPeriod = currentDate.setHours(0, 0, 0, 0);
  //   //     endOfPeriod = currentDate.setHours(23, 59, 59, 999);
  //   // }

  //   if (period === TIME_PERIOD.DAY) {
  //     startOfPeriod = currentDate.setHours(0, 0, 0, 0);
  //     endOfPeriod = currentDate.setHours(23, 59, 59, 999);
  //   } else if (period === TIME_PERIOD.WEEK) {
  //     // Last 7 days
  //     startOfPeriod = currentDate.setDate(currentDate.getDate() - 7);
  //     endOfPeriod = new Date().setHours(23, 59, 59, 999);
  //   } else if (period === TIME_PERIOD.MONTH) {
  //     // Last 30 days
  //     startOfPeriod = currentDate.setDate(currentDate.getDate() - 30);
  //     endOfPeriod = new Date().setHours(23, 59, 59, 999);
  //   } else if (period === TIME_PERIOD.YEAR) {
  //     // Last 365 days
  //     startOfPeriod = currentDate.setDate(currentDate.getDate() - 365);
  //     endOfPeriod = new Date().setHours(23, 59, 59, 999);
  //   } else {
  //     startOfPeriod = currentDate.setHours(0, 0, 0, 0);
  //     endOfPeriod = currentDate.setHours(23, 59, 59, 999);
  //   }

  //   const matchConditions: any = {
  //     user: new Types.ObjectId(userId),
  //     createdAt: {
  //       $gte: new Date(startOfPeriod),
  //       $lte: new Date(endOfPeriod),
  //     },
  //     deletedAt: null,
  //   };

  //   const user = await this.userModel.findOne({ _id: userId });

  //   const aggregationPipeline = [
  //     { $match: matchConditions },
  //     // {
  //     //   $group: {
  //     //     _id: null,
  //     //     totalBuilderGenReward: { $sum: '$totalBuilderGenReward' },
  //     //     firstLineBuilderGenRewards: { $sum: '$firstLineBuilderGenRewards' },
  //     //     firstLineBuilderGenUsers: user  ? user.firstLineBuilderGenerational :{  $sum: '$firstLineBuilderGenUsers' },
  //     //     totalBuilderGenUsers: user  ? user.totalBuilderGenarational  : { $sum: '$totalBuilderGenUsers' },
  //     //     totalBaseReferralReward: { $sum: '$totalBaseReferralReward' },
  //     //     firstLineBaseReferralRewards: {
  //     //       $sum: '$firstLineBaseReferralRewards',
  //     //     },
  //     //     firstLineBaseReferralUsers: user ?  user.firstLineBaseReferral : { $sum: '$firstLineBaseReferralUsers' },
  //     //     totalBaseReferralUsers:  user ?  user.totalBaseReferral : { $sum: '$totalBaseReferralUsers' },
  //     //   },
  //     // },

  //     {
  //       $group: {
  //         _id: null,
  //         totalBuilderGenReward: { $sum: '$totalBuilderGenReward' },
  //         firstLineBuilderGenRewards: { $sum: '$firstLineBuilderGenRewards' },
  //         firstLineBuilderGenUsers: { $sum: '$firstLineBuilderGenUsers' },
  //         totalBuilderGenUsers: { $sum: '$totalBuilderGenUsers' },
  //         totalBaseReferralReward: { $sum: '$totalBaseReferralReward' },
  //         firstLineBaseReferralRewards: {
  //           $sum: '$firstLineBaseReferralRewards',
  //         },
  //         firstLineBaseReferralUsers: { $sum: '$firstLineBaseReferralUsers' },
  //         totalBaseReferralUsers: { $sum: '$totalBaseReferralUsers' },
  //       },
  //     },
  //   ];

  //   const result = await this.userRewardsModel.aggregate(aggregationPipeline);

  //   if (result.length === 0) {
  //     return {
  //       totalRewards: 0,
  //       firstLineRewards: 0,
  //       firstLineUsers: 0,
  //       totalUsers: 0,
  //     };
  //   }

  //   const rewardSummary = result[0];

  //   if (type === SN_BONUS_TYPE.BUILDER_GENERATIONAl) {
  //     return {
  //       totalRewards: rewardSummary.totalBuilderGenReward || 0,
  //       firstLineRewards: rewardSummary.firstLineBuilderGenRewards || 0,
  //       firstLineUsers: user
  //         ? user.firstLineBuilderGenerational
  //         : rewardSummary.firstLineBuilderGenUsers || 0,
  //       totalUsers: user
  //         ? user.totalBuilderGenarational
  //         : rewardSummary.totalBuilderGenUsers || 0,
  //     };
  //   } else if (type === SN_BONUS_TYPE.BASE_REFERRAL) {
  //     return {
  //       totalRewards: rewardSummary.totalBaseReferralReward || 0,
  //       firstLineRewards: rewardSummary.firstLineBaseReferralRewards || 0,
  //       firstLineUsers: user
  //         ? user.firstLineBaseReferral
  //         : rewardSummary.firstLineBaseReferralUsers || 0,
  //       totalUsers: user
  //         ? user.totalBaseReferral
  //         : rewardSummary.totalBaseReferralUsers || 0,
  //     };
  //   } else {
  //     return {
  //       totalRewards: 0,
  //       firstLineRewards: 0,
  //       firstLineUsers: user.firstLineNode,
  //       totalUsers: user.totalNode,
  //     };
  //   }
  // }

  async getUserSnRewardSummary(
    userId: string | Types.ObjectId,
    type: SN_BONUS_TYPE | SN_BONUS_SUMMARY_TYPE,
    period: TIME_PERIOD,
  ) {
    let startOfPeriod: any, endOfPeriod: any;
    const currentDate = new Date();

    if (period === TIME_PERIOD.DAY) {
      startOfPeriod = currentDate.setHours(0, 0, 0, 0);
      endOfPeriod = currentDate.setHours(23, 59, 59, 999);
    } else if (period === TIME_PERIOD.WEEK) {
      // Last 7 days
      startOfPeriod = currentDate.setDate(currentDate.getDate() - 7);
      endOfPeriod = new Date().setHours(23, 59, 59, 999);
    } else if (period === TIME_PERIOD.MONTH) {
      // Last 30 days
      startOfPeriod = currentDate.setDate(currentDate.getDate() - 30);
      endOfPeriod = new Date().setHours(23, 59, 59, 999);
    } else if (period === TIME_PERIOD.YEAR) {
      // Last 365 days
      startOfPeriod = currentDate.setDate(currentDate.getDate() - 365);
      endOfPeriod = new Date().setHours(23, 59, 59, 999);
    } else {
      startOfPeriod = currentDate.setHours(0, 0, 0, 0);
      endOfPeriod = currentDate.setHours(23, 59, 59, 999);
    }

    const matchConditions: any = {
      deletedAt: null,

      user: new Types.ObjectId(userId),
      createdAt: {
        $gte: new Date(startOfPeriod),
        $lte: new Date(endOfPeriod),
      },
    };

    const user = await this.userModel.findOne({
      _id: userId,
      deletedAt: null,
    });

    const aggregationPipeline = [
      { $match: matchConditions },

      {
        $group: {
          _id: null,
          totalBuilderGenReward: { $sum: '$totalBuilderGenReward' },
          firstLineBuilderGenRewards: { $sum: '$firstLineBuilderGenRewards' },
          firstLineBuilderGenUsers: { $sum: '$firstLineBuilderGenUsers' },
          totalBuilderGenUsers: { $sum: '$totalBuilderGenUsers' },
          totalBaseReferralReward: { $sum: '$totalBaseReferralReward' },
          firstLineBaseReferralRewards: {
            $sum: '$firstLineBaseReferralRewards',
          },
          firstLineBaseReferralUsers: { $sum: '$firstLineBaseReferralUsers' },
          totalBaseReferralUsers: { $sum: '$totalBaseReferralUsers' },
        },
      },
    ];

    const levelOne = await this.superNodeSummary.getUserBonusTransactionService(
      new Types.ObjectId(userId),
      {
        type: 'total-reward',
        fromDate: startOfPeriod,
        toDate: endOfPeriod,
        level: '1',
      },
    );

    console.log(levelOne[0]);

    const result = await this.userRewardsModel.aggregate(aggregationPipeline);

    if (result.length === 0) {
      return {
        totalRewards: 0,
        firstLineRewards: 0,
        firstLineUsers: 0,
        totalUsers: 0,
      };
    }

    console.log('levelOne', levelOne[0]);
    const rewardSummary = result[0];

    if (type === SN_BONUS_TYPE.BUILDER_GENERATIONAl) {
      return {
        totalRewards: rewardSummary.totalBuilderGenReward || 0,
        firstLineRewards: levelOne[0]
          ? levelOne[0]?.values[2]?.amount
          : rewardSummary.firstLineBuilderGenRewards || 0,
        firstLineUsers: user
          ? user.firstLineBuilderGenerational
          : rewardSummary.firstLineBuilderGenUsers || 0,
        totalUsers: user
          ? user.totalBuilderGenarational
          : rewardSummary.totalBuilderGenUsers || 0,
      };
    } else if (type === SN_BONUS_TYPE.BASE_REFERRAL) {
      return {
        totalRewards: rewardSummary.totalBaseReferralReward || 0,
        firstLineRewards: levelOne[0]
          ? levelOne[0]?.values[1]?.amount
          : rewardSummary.firstLineBaseReferralRewards || 1,
        firstLineUsers: user
          ? user.firstLineBaseReferral
          : rewardSummary.firstLineBaseReferralUsers || 0,
        totalUsers: user
          ? user.totalBaseReferral
          : rewardSummary.totalBaseReferralUsers || 0,
      };
    } else {
      return {
        totalRewards: 0,
        firstLineRewards: 0,
        firstLineUsers: user.firstLineNode,
        totalUsers: user.totalNode,
      };
    }
  }

  async getUserTotalSnRewardSummary(
    userId: string | Types.ObjectId,
    period: TIME_PERIOD,
  ) {
    let startOfPeriod: number, endOfPeriod: number;
    const currentDate = new Date();
    if (period === TIME_PERIOD.DAY) {
      startOfPeriod = currentDate.setHours(0, 0, 0, 0);
      endOfPeriod = currentDate.setHours(23, 59, 59, 999);
    } else if (period === TIME_PERIOD.WEEK) {
      // Last 7 days
      startOfPeriod = currentDate.setDate(currentDate.getDate() - 7);
      endOfPeriod = new Date().setHours(23, 59, 59, 999);
    } else if (period === TIME_PERIOD.MONTH) {
      // Last 30 days
      startOfPeriod = currentDate.setDate(currentDate.getDate() - 30);
      endOfPeriod = new Date().setHours(23, 59, 59, 999);
    } else if (period === TIME_PERIOD.YEAR) {
      // Last 365 days
      startOfPeriod = currentDate.setDate(currentDate.getDate() - 365);
      endOfPeriod = new Date().setHours(23, 59, 59, 999);
    } else {
      startOfPeriod = currentDate.setHours(0, 0, 0, 0);
      endOfPeriod = currentDate.setHours(23, 59, 59, 999);
    }
    // if (period === TIME_PERIOD.DAY) {
    //   startOfPeriod = currentDate.setHours(0, 0, 0, 0);
    //   endOfPeriod = currentDate.setHours(23, 59, 59, 999);
    // } else if (period === TIME_PERIOD.WEEK) {
    //   const firstDayOfWeek = currentDate.getDate() - currentDate.getDay();
    //   const lastDayOfWeek = firstDayOfWeek + 6;
    //   const startOfWeek = new Date(currentDate.setDate(firstDayOfWeek));
    //   const endOfWeek = new Date(currentDate.setDate(lastDayOfWeek));
    //   startOfPeriod = startOfWeek.setHours(0, 0, 0, 0);
    //   endOfPeriod = endOfWeek.setHours(23, 59, 59, 999);
    // } else if (period === TIME_PERIOD.MONTH) {
    //   currentDate.setDate(1);
    //   startOfPeriod = currentDate.setHours(0, 0, 0, 0);
    //   currentDate.setMonth(currentDate.getMonth() + 1);
    //   currentDate.setDate(0);
    //   endOfPeriod = currentDate.setHours(23, 59, 59, 999);
    // } else if (period === TIME_PERIOD.YEAR) {
    //   currentDate.setMonth(0, 1);
    //   startOfPeriod = currentDate.setHours(0, 0, 0, 0);
    //   currentDate.setFullYear(currentDate.getFullYear() + 1);
    //   currentDate.setMonth(0, 0);
    //   endOfPeriod = currentDate.setHours(23, 59, 59, 999);
    // }

    const matchConditions: any = {
      user: new Types.ObjectId(userId),
      createdAt: {
        $gte: new Date(startOfPeriod),
        $lte: new Date(endOfPeriod),
      },
      deletedAt: null,
    };

    const aggregationPipeline = [
      { $match: matchConditions },
      {
        $group: {
          _id: null,
          totalBuilderGenReward: { $sum: '$totalBuilderGenReward' },
          totalBaseReferralReward: { $sum: '$totalBaseReferralReward' },
        },
      },
    ];

    const result = await this.userRewardsModel.aggregate(aggregationPipeline);

    const summary = result.length > 0 ? result[0] : {};

    return {
      totalBuilderGenReward: summary.totalBuilderGenReward || 0,
      totalBaseReferralReward: summary.totalBaseReferralReward || 0,
      totalReward:
        (summary.totalBuilderGenReward || 0) +
        (summary.totalBaseReferralReward || 0),
    };
  }

  async getUserTotalProducationSummary(
    userId: string | Types.ObjectId,
    period: TIME_PERIOD,
  ) {
    let startOfPeriod: number, endOfPeriod: number;
    const currentDate = new Date();

    // Debugging: Log the current date and period
    console.log(`Current Date: ${currentDate}`);
    console.log(`Period: ${period}`);

    if (period === TIME_PERIOD.DAY) {
      startOfPeriod = currentDate.setHours(0, 0, 0, 0);
      endOfPeriod = currentDate.setHours(23, 59, 59, 999);
    } else if (period === TIME_PERIOD.WEEK) {
      // Last 7 days
      startOfPeriod = currentDate.setDate(currentDate.getDate() - 7);
      endOfPeriod = new Date().setHours(23, 59, 59, 999);
    } else if (period === TIME_PERIOD.MONTH) {
      // Last 30 days
      startOfPeriod = currentDate.setDate(currentDate.getDate() - 30);
      endOfPeriod = new Date().setHours(23, 59, 59, 999);
    } else if (period === TIME_PERIOD.YEAR) {
      // Last 365 days
      startOfPeriod = currentDate.setDate(currentDate.getDate() - 365);
      endOfPeriod = new Date().setHours(23, 59, 59, 999);
    } else {
      startOfPeriod = currentDate.setHours(0, 0, 0, 0);
      endOfPeriod = currentDate.setHours(23, 59, 59, 999);
    }

    const getTeamTotalProductionCache =
      await this.cacheService.getCacheMulipleKeyUser({
        type: CACHE_TYPE.SUPERNODE_TEAM_TOTAL_PRODUCTION_DAYS,
        user: String(userId),
        other_Type: String(period),
      });

    if (getTeamTotalProductionCache) {
      //
      return getTeamTotalProductionCache;
    } else {
      // Debugging: Log the start and end of the period
      console.log(`Start of Period: ${new Date(startOfPeriod)}`);
      console.log(`End of Period: ${new Date(endOfPeriod)}`);

      const matchConditions: any = {
        user: new Types.ObjectId(userId),
        deletedAt: null,
        createdAt: {
          $gte: new Date(startOfPeriod),
          $lte: new Date(endOfPeriod),
        },
      };

      // const myProduction = await this.cloudKRewardModel.aggregate([
      //   {
      //     $match: { matchConditions },
      //   },
      //   {
      //     $group: {
      //       _id: null,
      //       totalPriceAmount: {
      //         $sum: '$tokenAmount',
      //       },
      //     },
      //   },
      // ]);

      // const teamMembers = await this.userService.getTeamMembersByUser(
      //   new Types.ObjectId(userId),
      // );

      // for (const uplineId of teamMembers) {
      //   const teamUserCloudk = await this.cloudKService.getUserDailyCloudK(
      //     uplineId,
      //     startOfPeriod,
      //     endOfPeriod,
      //   );
      //   totalTeamUserCloudk += teamUserCloudk;
      // }

      // const firstLineUsers = await this.activeUserTree.aggregate([
      //   {
      //     $match: { upline: new Types.ObjectId(userId), deletedAt: null },
      //   },
      // ]);

      // if (firstLineUsers && firstLineUsers.length > 0) {
      //   for (const record of firstLineUsers) {
      //     const firstLineUser = record?.user;
      //     if (firstLineUser) {
      //       const firstLineUserCloudk =
      //         await this.cloudKService.getUserDailyCloudK(
      //           firstLineUser,
      //           startOfPeriod,
      //           endOfPeriod,
      //         );
      //       totalFirstLineUserCloudk += firstLineUserCloudk;
      //     }
      //   }
      // }

      // Debugging: Log the match conditions
      console.log(`Match Conditions: `, matchConditions);

      const aggregationPipeline = [
        { $match: matchConditions },
        {
          $group: {
            _id: null,
            myProduction: { $sum: '$myProduction' },
            teamProduction: { $sum: '$teamProduction' },
            firstLineProduction: { $sum: '$firstLineProduction' },
          },
        },
      ];

      const result = await this.userRewardsModel.aggregate(aggregationPipeline);

      // Debugging: Log the result of the aggregation
      // console.log(`Aggregation Result: `, result);

      const summary = result.length > 0 ? result[0] : {};
      // const totalProduction = {
      //   myProduction: myProduction || 0,
      //   teamProduction: totalTeamUserCloudk || 0,
      //   firstLineProduction: totalFirstLineUserCloudk || 0,
      // };

      return summary;

      await this.cacheService.setCacheMulipleUser(
        {
          type: CACHE_TYPE.SUPERNODE_TEAM_TOTAL_PRODUCTION_DAYS,
          user: String(userId),
          other_Type: String(period),

          data: summary,
        },
        86400,
      );
      return summary;
    }
  }

  // Update Depth
  async updateUserDepth(): Promise<void> {
    // Start by setting the depth for root users (depth 1)
    const rootUsers = await this.userModel.find({ uplineId: null }).lean();
    // Initialize a queue for BFS traversal
    const queue = rootUsers.map((user) => ({ userId: user._id, depth: 1 }));
    const bulkOps = [];
    // Process users level by level
    while (queue.length > 0) {
      const { userId, depth } = queue.shift()!; // Get the first item in the queue
      console.log('updating user and depth', userId, depth);
      // Add update operation to bulkOps
      bulkOps.push({
        updateOne: {
          filter: { _id: userId },
          update: { $set: { depth } },
        },
      });

      // Find child users and add them to the queue with the updated depth
      const childUsers = await this.userModel.find({ uplineId: userId }).lean();
      for (const child of childUsers) {
        queue.push({ userId: child._id, depth: depth + 1 });
      }

      // Execute bulk operation after processing a batch of users
      if (bulkOps.length >= 25000) {
        await this.userModel.bulkWrite(bulkOps);
        bulkOps.length = 0; // Reset the batch
      }
    }

    // Execute any remaining bulk operations
    if (bulkOps.length > 0) {
      await this.userModel.bulkWrite(bulkOps);
    }
  }

  async updateUserPaths(): Promise<void> {
    // Fetch root users (users with no `uplineId`)
    const rootUsers = await this.userModel.find({ uplineId: null }).lean();

    // Initialize a queue for BFS traversal with root users
    const queue = rootUsers.map((user) => ({
      userId: user._id,
      path: user.blockchainId, // Start path with root user's blockchainId
    }));

    const bulkOps = [];
    console.log('Initializing queue with root users:', queue);

    while (queue.length > 0) {
      // Dequeue the first user
      const { userId, path } = queue.shift()!;

      console.log(`Updating path for userId: ${userId}, Path: ${path}`);

      // Prepare the bulk operation for updating the path
      bulkOps.push({
        updateOne: {
          filter: { _id: userId },
          update: { $set: { path } },
        },
      });

      // Fetch child users and enqueue them with the updated path
      const childUsers = await this.userModel.find({ uplineId: userId }).lean();
      childUsers.forEach((child) => {
        queue.push({
          userId: child._id,
          path: `${path}/${child.blockchainId}`, // Append the child's blockchainId to the parent's path
        });
      });

      // Execute bulk updates in batches of 25,000 for efficiency
      if (bulkOps.length >= 25000) {
        console.log('Executing bulk update for batch of 25,000 operations...');
        await this.userModel.bulkWrite(bulkOps);
        bulkOps.length = 0; // Clear the batch
      }
    }

    // Execute any remaining bulk operations
    if (bulkOps.length > 0) {
      console.log(
        `Executing final bulk update for remaining ${bulkOps.length} operations...`,
      );
      await this.userModel.bulkWrite(bulkOps);
    }

    console.log('User paths updated successfully!');
  }

  async getUserWithChildrenTree(
    userId: string,
    page: number,
    limit: number,
  ): Promise<any> {
    const cacheKey = `userWithChildren:${userId}:page:${page}:limit:${limit}`;
    // console.log(`Cache Key: ${cacheKey}`);
    const depth = 0;

    const now = new Date();

    const yesterdayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - 1,
      0,
      0,
      0,
    );
    const yesterdayEnd = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - 1,
      23,
      59,
      59,
    );

    const cachedResult = await this.cacheService.getCacheMulipleKeyUser({
      type: CACHE_TYPE.SUPERNODE_TEAM_TREE,
      user: String(userId),
      other_Type: `page:${page}_limit:${limit}_depth:${depth}`,
    });
    // Check Redis Cache
    // const cachedResult = await this.cacheManager.get(cacheKey);

    if (cachedResult) {
      // console.log('*** Results from Redis Cache ***');
      // return cachedResult;
    }

    console.log('Result From DB');

    const skip = (page - 1) * limit;

    // Recursive function to fetch children in chunks
    const fetchChildren = async (
      ids: string[],
      depth = 1,
      maxDepth = 1,
    ): Promise<any[]> => {
      if (depth > maxDepth || ids.length === 0) {
        return [];
      }

      // console.log(`Fetching children for ids:`);
      const children = await this.userModel
        .find({
          uplineId: { $in: ids.map((id) => new Types.ObjectId(id)) }, // Convert all IDs to ObjectId
        })
        .select(
          '_id profilePicture username depth uplineId username email blockchainId dateJoined isMembership firstLineNode isBaseReferralActive  isBuilderGenerationActive totalNode uplineBID totalUserwithMachine totalUserwithMembership totalUserwithoutMachine totalUserwithoutMembership ',
        )
        .populate({
          path: 'uplineId', // Field to populate
          select:
            ' _id profilePicture username firstName lastName depth uplineId uplineBID email datejoined isMembership isBaseReferralActive isBuilderGenerationActive firstLineNode totalNode builderRefferalBonusEligibility isSupernodeActive  totalUserwithMachine totalUserwithMembership totalUserwithoutMachine totalUserwithoutMembership', // Specify the fields to fetch from `uplineId`
        })
        .lean();

      const childIds = children.map((child) => child._id.toString());
      const userReward: any = await this.userRewardsModel
        .find({
          user: { $in: childIds.map((id) => new Types.ObjectId(id)) }, // Convert all IDs to ObjectId
          createdAt: {
            $gte: new Date(yesterdayStart),
            $lt: new Date(yesterdayEnd),
          },
        })
        .select('_id myProduction user ')
        .lean();
      // console.log('userReward, userReward', childIds, userReward);

      const rewardsMap = userReward.reduce((acc, reward) => {
        acc[reward.user.toString()] = reward;
        return acc;
      }, {});

      // console.log(rewardsMap, 'rewardsMap');
      // Merge user rewards with children
      const mergedChildren = children.map((child) => {
        const reward = rewardsMap[child._id.toString()];
        // console.log(reward);
        return {
          ...child,
          myProduction: reward ? reward.myProduction : 0, // Add rewards or default to 0 if no rewards found
        };
      });

      const deeperChildren = await fetchChildren(childIds, depth + 1, maxDepth);
      // console.log('deeperChildren', deeperChildren);
      // console.log('mergedChildren', mergedChildren);
      return [...mergedChildren, ...deeperChildren];
    };

    // Fetch all children for the given user
    const initialUser: any = await this.userModel
      .findById(userId)
      .select(
        '_id username depth uplineId username email profilePicture blockchainId dateJoined firstLineNode isMembership isBaseReferralActive  isBuilderGenerationActive totalNode uplineBID totalUserwithMachine totalUserwithMembership totalUserwithoutMachine totalUserwithoutMembership',
      )
      .populate('uplineId');

    if (!initialUser) {
      throw new Error('User not found');
    }
    const allChildren = await fetchChildren([userId]);

    // const allChildren =
    //   await this.twoAccesService.findByUplineIdTwoAccessUsers('1258032799');

    console.log(' *** allChildren *** ', allChildren);

    // Paginate children
    const totalChildren = allChildren.length;
    const paginatedChildren = allChildren.slice(skip, skip + limit);

    const userReward: any = await this.userRewardsModel
      .findOne({
        user: new Types.ObjectId(initialUser._id), // Convert all IDs to ObjectId
        createdAt: {
          $gte: new Date(yesterdayStart),
          $lt: new Date(yesterdayEnd),
        },
      })
      .select('_id myProduction ')
      .lean();

    // const myReward = this.getReceivableRewardFromUser(requestUser, child._id);
    // Prepare response

    // const pgUsers =
    //   await this.twoAccesService.findByIdTwoAccessUsers('8734074515');

    // console.log(' *** pgUsers *** ', pgUsers[0]);

    const response = {
      user: {
        _id: initialUser._id,
        username: initialUser.username,
        depth: initialUser.depth,
        email: initialUser.email,
        // pgUsers: pgUsers,
        // email_pg: pgUsers[0].email,
        // membership_expiry_pg: pgUsers[0].membership_expiry,
        // membership_expiry_pg: pgUsers[0].membership_expiry,
        profilePicture: initialUser.profilePicture,
        blockchainId: initialUser.blockchainId,
        firstLineNode: initialUser.firstLineNode,
        dateJoined: initialUser.dateJoined,
        // isMembership: initialUser.isMembership,
        // isMembership_pg: pgUsers[0].is_membership_expired,
        isBaseReferralActive: initialUser.isBaseReferralActive,
        isBuilderGenerationActive: initialUser.isBuilderGenerationActive,
        uplineId: initialUser.uplineId,
        // uplineId: pgUsers[0].upline_Id,
        myProduction: userReward ? userReward.myProduction : 0,
        totalNode: initialUser.totalNode,
        uplineBID: initialUser.uplineBID,
        totalUserwithMachine: initialUser.totalUserwithMachine,
        totalUserwithMembership: initialUser.totalUserwithMembership,
        totalUserwithoutMachine: initialUser.totalUserwithoutMachine,
        totalUserwithoutMembership: initialUser.totalUserwithoutMembership,
        children: paginatedChildren,
      },
      totalChildren,
      page,
      limit,
      totalPages: Math.ceil(totalChildren / limit),
    };

    await this.cacheService.setCacheMulipleUser(
      {
        type: CACHE_TYPE.SUPERNODE_TEAM_TREE,
        user: String(userId),
        other_Type: `page:${page}_limit:${limit}_depth:${depth}`,

        data: response,
      },
      86400,
    );

    return response;
  }

  async getUserWithChildrenTreeV1(
    userId: string,
    page: number,
    limit: number,
  ): Promise<any> {
    const cacheKey = `userWithChildren:${userId}:page:${page}:limit:${limit}`;
    // console.log(`Cache Key: ${cacheKey}`);
    const depth = 0;
    const now = new Date();
    const yesterdayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - 1,
      0,
      0,
      0,
    );
    const yesterdayEnd = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - 1,
      23,
      59,
      59,
    );

    const cachedResult = await this.cacheService.getCacheMulipleKeyUser({
      type: CACHE_TYPE.SUPERNODE_TEAM_TREE,
      user: String(userId),
      other_Type: `page:${page}_limit:${limit}_depth:${depth}`,
    });
    // Check Redis Cache
    // const cachedResult = await this.cacheManager.get(cacheKey);

    if (cachedResult) {
      // console.log('*** Results from Redis Cache ***');
      // return cachedResult;   // Enable after QA Testing
    }
    // console.log('Result From DB');
    const skip = (page - 1) * limit;

    // Recursive function to fetch children in chunks
    const fetchChildrenV1 = async (
      ids: string[],
      depth = 1,
      maxDepth = 1,
    ): Promise<any[]> => {
      if (depth > maxDepth || ids.length === 0) {
        return [];
      }

      console.log(`Fetching children for ids:`);
      // children mongoDB data
      const children = await this.userModel
        .find({
          uplineId: { $in: ids.map((id) => new Types.ObjectId(id)) }, // Convert all IDs to ObjectId
        })
        .select(
          '_id username depth uplineId username email profilePicture blockchainId dateJoined isMembership firstLineNode isBaseReferralActive  isBuilderGenerationActive totalNode uplineBID totalUserwithMachine totalUserwithMembership totalUserwithoutMachine totalUserwithoutMembership ',
        )
        .populate({
          path: 'uplineId', // Field to populate
          select:
            ' _id username firstName lastName depth uplineId uplineBID email datejoined isMembership isBaseReferralActive isBuilderGenerationActive firstLineNode totalNode profilePicture builderRefferalBonusEligibility isSupernodeActive  totalUserwithMachine totalUserwithMembership totalUserwithoutMachine totalUserwithoutMembership', // Specify the fields to fetch from `uplineId`
        })
        .lean();
      const childIds = children.map((child) => child._id.toString());

      const userReward: any = await this.userRewardsModel
        .find({
          user: { $in: childIds.map((id) => new Types.ObjectId(id)) }, // Convert all IDs to ObjectId
          createdAt: {
            $gte: new Date(yesterdayStart),
            $lt: new Date(yesterdayEnd),
          },
        })
        .select('_id myProduction user ')
        .lean();
      // console.log('## userReward ##', userReward);

      const rewardsMap = userReward.reduce((acc, reward) => {
        acc[reward.user.toString()] = reward;
        return acc;
      }, {});
      // console.log(rewardsMap, '$$ rewardsMap $$');

      // Merge user rewards with children
      const mergedChildren = children.map((child) => {
        const reward = rewardsMap[child._id.toString()];
        // console.log('** Total reward **', reward.length);
        return {
          ...child,
          myProduction: reward ? reward.myProduction : 0, // Add rewards or default to 0 if no rewards found
        };
      });

      const deeperChildren = await fetchChildrenV1(
        childIds,
        depth + 1,
        maxDepth,
      );
      console.log('deeperChildren', deeperChildren);

      return [...mergedChildren, ...deeperChildren];
    };

    // Fetch all children for the given user
    const initialUser: any = await this.userModel
      .findById(userId)
      .select(
        '_id username depth uplineId username email profilePicture blockchainId firstLineNode isBaseReferralActive  isBuilderGenerationActive totalNode uplineBID totalUserwithMachine totalUserwithMembership totalUserwithoutMachine totalUserwithoutMembership',
      )
      .populate('uplineId');

    if (!initialUser) {
      throw new Error('User not found');
    }
    // Get user data directly from Postgres
    const pgUsers = await this.twoAccesService.findByIdTwoAccessUsers(
      initialUser.blockchainId,
    );
    // await this.twoAccesService.findByIdTwoAccessUsers('2758904786');

    // const allChildren = await fetchChildrenV1([userId]);
    // console.log('allChildren', allChildren);

    const allChildren =
      await this.twoAccesService.findByUplineIdTwoAccessUsersV1(
        initialUser.blockchainId,
      );
    const pgTotalNodes = await this.twoAccesService.getUserTotalNodesById(
      initialUser.blockchainId,
    );
    // Paginate children
    const totalChildren = allChildren.length;
    // const paginatedChildren = allChildren.slice(skip, skip + limit);

    const userReward: any = await this.userRewardsModel
      .findOne({
        user: new Types.ObjectId(initialUser._id), // Convert all IDs to ObjectId
        createdAt: {
          $gte: new Date(yesterdayStart),
          $lt: new Date(yesterdayEnd),
        },
      })
      .select('_id myProduction ')
      .lean();

    // console.log(' userReward ', userReward);
    // const myReward = this.getReceivableRewardFromUser(requestUser, child._id);
    // Prepare response

    const response = {
      user: {
        // Postgres Data
        email: pgUsers[0]?.email || '',
        depth: pgUsers[0]?.depth || 0,
        membership_expiry: pgUsers[0]?.membership_expiry || '',
        isMembership: pgUsers[0]?.is_membership || false,
        dateJoined: pgUsers[0]?.date_joined || null,
        referralCode: pgUsers[0]?.referral_code || '',
        profilePicture: pgUsers[0]?.profile_picture || '',
        firstLineNode: pgUsers[0]?.firstlinenode || 0,
        uplineId: pgUsers[0]?.upline_id || 0,
        uplineBID: pgUsers[0]?.upline_id || 0,
        totalNode: pgTotalNodes?.totalNodes || 0, // Todo: Check from Postgres
        // MongoDB Data
        _id: initialUser._id,
        username: initialUser.username,
        blockchainId: initialUser.blockchainId,
        // firstLineNode: initialUser.firstLineNode,
        isBaseReferralActive: initialUser.isBaseReferralActive,
        isBuilderGenerationActive: initialUser.isBuilderGenerationActive,
        // uplineId: initialUser.uplineId,
        myProduction: userReward ? userReward.myProduction : 0,
        // uplineBID: initialUser.uplineBID,
        totalUserwithMachine: initialUser.totalUserwithMachine,
        totalUserwithMembership: initialUser.totalUserwithMembership,
        totalUserwithoutMachine: initialUser.totalUserwithoutMachine,
        totalUserwithoutMembership: initialUser.totalUserwithoutMembership,
        children: allChildren,
      },
      totalChildren,
      page,
      limit,
      totalPages: Math.ceil(totalChildren / limit),
    };

    // await this.cacheService.setCacheMulipleUser(
    //   {
    //     type: CACHE_TYPE.SUPERNODE_TEAM_TREE,
    //     user: String(userId),
    //     other_Type: `page:${page}_limit:${limit}_depth:${depth}`,

    //     data: response,
    //   },
    //   86400,
    // );

    return response;
  }

  async getUserSearch(
    userId: Types.ObjectId,
    searchQuery: string,
    page: number,
    limit: number,
  ): Promise<any> {
    const skip = (page - 1) * limit;
    // console.log('userId: ', userId);
    const getUserData = await this.userService.findUserById(userId);
    const loggedInUserBlockchainId: string = getUserData.blockchainId;
    const loggedInUserUsername: string = getUserData.username;
    if (
      (searchQuery && searchQuery === loggedInUserBlockchainId) ||
      loggedInUserUsername.includes(searchQuery)
    ) {
      return {
        message: 'You cannot search for your own blockchainId or username',
        user: {
          children: [],
        },
        total: 0,
        page,
        limit,
        totalPages: 0,
      };
    }
    // console.log('loggedInUserBlockchainId', loggedInUserBlockchainId);
    // Match condition for the search query
    const matchCondition = searchQuery
      ? {
          $or: [
            { username: { $regex: searchQuery, $options: 'i' } },
            { blockchainId: { $regex: searchQuery, $options: 'i' } },
          ],
        }
      : { _id: new mongoose.Types.ObjectId(userId) };

    // Define the start and end of yesterday using moment.js
    const startOfYesterday = moment()
      .subtract(1, 'days')
      .startOf('day')
      .toDate();
    const endOfYesterday = moment().subtract(1, 'days').endOf('day').toDate();

    // console.log('Start of Yesterday:', startOfYesterday);
    // console.log('End of Yesterday:', endOfYesterday);

    const aggregationPipeline: PipelineStage[] = [
      // { $match: matchCondition }, // Match users based on searchQuery or userId
      // Ensure path contains the logged-in user's blockchainId
      {
        $match: {
          path: { $regex: loggedInUserBlockchainId }, // Match blockchainId in the path
          ...matchCondition,
        },
      },
      {
        $lookup: {
          from: 'userrewards',
          localField: '_id',
          foreignField: 'user',
          as: 'rewards',
        },
      },
      { $unwind: { path: '$rewards', preserveNullAndEmptyArrays: true } },
      // Optional filter for rewards created yesterday
      // {
      //   $match: {
      //     'rewards.createdAt': {
      //       $gte: startOfYesterday, // Only include rewards from yesterday
      //       $lte: endOfYesterday,
      //     },
      //   },
      // },
      {
        $sort: {
          'rewards.createdAt': -1, // Sort rewards by most recent date
        },
      },
      {
        $group: {
          _id: '$_id',
          user: { $first: '$$ROOT' }, // First user document per group
          latestReward: { $first: '$rewards' }, // First reward document per group
        },
      },
      // Lookup to populate `uplineId` field
      {
        $lookup: {
          from: 'users', // Assuming the users collection is named 'users'
          localField: 'user.uplineId',
          foreignField: '_id',
          as: 'upline',
        },
      },
      {
        $unwind: { path: '$upline', preserveNullAndEmptyArrays: true }, // Unwind the upline data
      },
      {
        $project: {
          _id: '$user._id',
          username: '$user.username',
          depth: '$user.depth',
          email: '$user.email',
          profilePicture: '$user.profilePicture',
          blockchainId: '$user.blockchainId',
          dateJoined: '$user.dateJoined',
          firstLineNode: '$user.firstLineNode',
          isMembership: '$user.isMembership',
          isBaseReferralActive: '$user.isBaseReferralActive',
          isBuilderGenerationActive: '$user.isBuilderGenerationActive',
          uplineId: {
            _id: '$upline._id',
            blockchainId: '$upline.blockchainId',
            email: '$upline.email',
            username: '$upline.username',
            firstName: '$upline.firstName',
            lastName: '$upline.lastName',
            profilePicture: '$upline.profilePicture',
            builderRefferalBonusEligibility:
              '$upline.builderRefferalBonusEligibility',
            isSupernodeActive: '$upline.isSupernodeActive',
            isBaseReferralActive: '$upline.isBaseReferralActive',
            isBuilderGenerationActive: '$upline.isBuilderGenerationActive',
            firstLineNode: '$upline.firstLineNode',
            totalNode: '$upline.totalNode',
            uplineBID: '$upline.uplineBID',
            uplineId: '$upline.uplineId',
            isMembership: '$upline.isMembership',
            depth: '$upline.depth',
          }, // Include upline details
          myProduction: {
            $ifNull: ['$latestReward.myProduction', 0], // Default to 0 if no rewards exist
          },
        },
      },
      { $skip: skip },
      { $limit: limit },
    ];

    const users = await this.userModel.aggregate(aggregationPipeline);
    // const total = await this.userModel.countDocuments(matchCondition);
    const total = await this.userModel.countDocuments({
      path: { $regex: loggedInUserBlockchainId }, // Include the filter for total count
      ...matchCondition,
    });

    return {
      user: {
        children: users,
      },
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
  // ACTIVE-USER-PRODUCTION ---- CODE - START
  // private getRewardsForUserAndDate(
  //   rewardsList: any,
  //   userId: string,
  //   date: moment.Moment,
  // ) {
  //   const allRewards = rewardsList[userId] || [];
  //   return allRewards.filter(
  //     (reward) =>
  //       reward.createdAt >= date.clone().toDate() &&
  //       reward.createdAt <= date.clone().endOf('day').toDate(),
  //   );
  // }

  // private async calculateTeamRewards(
  //   userId: string,
  //   date: moment.Moment,
  //   groupedByUpline: any,
  //   rewardListByID: any,
  // ) {
  //   const directChildren = groupedByUpline[userId] || [];
  //   const teamRewardsPromises = directChildren.map(async (child) => {
  //     const childId = child.user.toString();
  //     const children = rewardListByID[String(childId)] || [];

  //     const filteredRewards = children.filter(
  //       (reward) =>
  //         reward.createdAt >= date.clone().toDate() &&
  //         reward.createdAt <= date.clone().endOf('day').toDate(),
  //     );

  //     const totalReward = filteredRewards.reduce(
  //       (sum, reward) => sum + reward.tokenAmount,
  //       0,
  //     );

  //     let totalTeamRewards = totalReward;
  //     const childTeamRewards = await this.calculateTeamRewards(
  //       childId,
  //       date,
  //       groupedByUpline,
  //       rewardListByID,
  //     );
  //     totalTeamRewards += childTeamRewards;

  //     return totalTeamRewards;
  //   });

  //   const teamRewardsArray = await Promise.all(teamRewardsPromises);
  //   return teamRewardsArray.reduce((acc, reward) => acc + reward, 0);
  // }

  // private async processUserRewards(
  //   userId: string,
  //   date: moment.Moment,
  //   groupedByUpline: any,
  //   rewardListByID: any,
  // ) {
  //   const rewards = this.getRewardsForUserAndDate(rewardListByID, userId, date);
  //   const totalPersonalRewards = rewards.reduce(
  //     (sum, reward) => sum + reward.tokenAmount,
  //     0,
  //   );

  //   const firstLineUsers = groupedByUpline[userId] || [];
  //   const totalFirstLineRewards = (
  //     await Promise.all(
  //       firstLineUsers.map(async (firstLineUser) => {
  //         const userRewards = this.getRewardsForUserAndDate(
  //           rewardListByID,
  //           firstLineUser.user,
  //           date,
  //         );
  //         return userRewards.reduce(
  //           (sum, reward) => sum + reward.tokenAmount,
  //           0,
  //         );
  //       }),
  //     )
  //   ).reduce((sum, reward) => sum + reward, 0);

  //   const totalTeamRewards = await this.calculateTeamRewards(
  //     userId,
  //     date,
  //     groupedByUpline,
  //     rewardListByID,
  //   );

  //   await this.userRewardsModel.create({
  //     myProduction: totalPersonalRewards,
  //     firstLineProduction: totalFirstLineRewards,
  //     teamProduction: totalTeamRewards,
  //     createdAt: new Date(
  //       date.startOf('day').toDate().getTime() + 4 * 60 * 60 * 1000,
  //     ),
  //     user: new Types.ObjectId(userId),
  //     remark: 'reward generated by aytomatics',
  //   });
  // }

  // private async processBatch(
  //   batch: string[],
  //   date: moment.Moment,
  //   groupedByUpline: any,
  //   rewardListByID: any,
  //   batchIndex: number,
  // ) {
  //   console.log(`Processing batch ${batchIndex + 1}...`);
  //   const batchPromises = batch.map((userId) =>
  //     this.processUserRewards(userId, date, groupedByUpline, rewardListByID),
  //   );
  //   await Promise.allSettled(batchPromises);
  // }

  // async updateActiveUserProduction() {
  //   try {
  //     // const startDate = moment().startOf('day'); // Today at 00:00:00
  //     // const endDate = moment().add(1, 'day').startOf('day'); // Next day at 00:00:00

  //     // Convert to ISO string format
  //     const startDateISO = await getCurrentDay();
  //     const date = moment(new Date()).startOf('day');

  //     console.log(
  //       startDateISO.startDate,
  //       startDateISO.endDate,
  //       'endDate',
  //       '---------------',
  //       'startDate',

  //       date.toDate(),
  //       date.clone().endOf('day').toDate(),
  //     );
  //     const BATCH_SIZE = 50000; // Number of users processed per batch
  //     const CONCURRENT_BATCHES = 10000; // Number of batches processed concurrently

  //     console.log('Fetching rewards...');
  //     const allRewards = await this.cloudKRewardModel.find({
  //       deletedAt: null,
  //       createdAt: {
  //         $gte: startDateISO.startDate,
  //         $lt: startDateISO.endDate,
  //       },
  //     });

  //     const rewardListByID = groupByUser(allRewards);
  //     console.log('Rewards fetched and grouped');

  //     console.log('Fetching active user list...');
  //     const activeUsersList = await this.activeUserTree.find();
  //     const groupedByUpline = groupByUpline(activeUsersList);
  //     console.log('Active users grouped by upline');

  //     console.log(date);

  //     const rewardedUsers = await this.cloudKRewardModel.distinct('user', {
  //       createdAt: {
  //         $gte: date.clone().toDate(),
  //         $lte: date.clone().endOf('day').toDate(),
  //       },
  //     });

  //     const totalRewardedUsers = rewardedUsers.length;
  //     console.log(`Total rewarded users: ${totalRewardedUsers}`);

  //     const userBatches = [];
  //     for (let i = 0; i < totalRewardedUsers; i += BATCH_SIZE) {
  //       userBatches.push(rewardedUsers.slice(i, i + BATCH_SIZE));
  //     }

  //     console.log(`Total batches: ${userBatches.length}`);

  //     // Process batches with limited concurrency
  //     for (let i = 0; i < userBatches.length; i += CONCURRENT_BATCHES) {
  //       const concurrentBatches = userBatches
  //         .slice(i, i + CONCURRENT_BATCHES)
  //         .map((batch, index) =>
  //           this.processBatch(
  //             batch,
  //             date,
  //             groupedByUpline,
  //             rewardListByID,
  //             i + index,
  //           ),
  //         );
  //       await Promise.all(concurrentBatches);
  //     }

  //     console.log('All rewards processed producation successfully');
  //   } catch (error) {
  //     console.error('An error occurred:', error);
  //     throw error;
  //   }
  // }
  // // ACTIVE-USER-PRODUCTION ---- CODE - END

  // // ACTIVE-USER-SUPERNODE ---- CODE - START

  // private async processUserRewards_SuperNode(
  //   userId: string,
  //   date: moment.Moment,
  //   superNodeRewardDataGroupByUser: any,
  //   groupedByUpline: any,
  // ) {
  //   const userRewardData = superNodeRewardDataGroupByUser[userId] || [];
  //   const startDate = date.clone().toDate();
  //   const endDate = date.clone().endOf('day').toDate();

  //   // Filter rewards
  //   const filteredRewards = userRewardData.filter(
  //     (reward) =>
  //       reward.createdAt >= startDate &&
  //       reward.createdAt <= endDate &&
  //       reward.deletedAt === null &&
  //       reward.receivable === true,
  //   );

  //   // Initialize arrays and totals
  //   const baseRefrewards = [];
  //   const builderGenrewards = [];
  //   let totaLRewards = 0;
  //   let totalBaseReferalRewards = 0;
  //   let totalBuilderGenrRewards = 0;

  //   // Process rewards
  //   filteredRewards.forEach((reward) => {
  //     totaLRewards += reward.tokenAmount;

  //     if (reward.type === SN_BONUS_TYPE.BASE_REFERRAL) {
  //       baseRefrewards.push(reward);
  //       totalBaseReferalRewards += reward.tokenAmount;
  //     }

  //     if (reward.type === SN_BONUS_TYPE.BUILDER_GENERATIONAl) {
  //       builderGenrewards.push(reward);
  //       totalBuilderGenrRewards += reward.tokenAmount;
  //     }
  //   });

  //   const firstLineUsers = groupedByUpline[userId] || [];

  //   // Calculate first-line rewards
  //   const firstLineRewardsPromises = firstLineUsers.map(
  //     async (firstLineUser) => {
  //       const firstLineUserReward =
  //         superNodeRewardDataGroupByUser[firstLineUser.user.toString()] || [];

  //       let firstLineBRRewards = 0;
  //       let firstLineBGRewards = 0;

  //       const filteredRewards = firstLineUserReward.filter(
  //         (reward) =>
  //           reward.createdAt >= startDate &&
  //           reward.createdAt <= endDate &&
  //           reward.deletedAt == null &&
  //           reward.receivable == true,
  //       );

  //       filteredRewards.forEach((reward) => {
  //         if (reward.type === SN_BONUS_TYPE.BASE_REFERRAL) {
  //           firstLineBRRewards += reward.tokenAmount;
  //         } else if (reward.type === SN_BONUS_TYPE.BUILDER_GENERATIONAl) {
  //           firstLineBGRewards += reward.tokenAmount;
  //         }
  //       });

  //       return { firstLineBRRewards, firstLineBGRewards };
  //     },
  //   );

  //   const firstLineRewards = await Promise.all(firstLineRewardsPromises);

  //   const totalFirstLibeBaseReferralRewards = firstLineRewards.reduce(
  //     (acc, { firstLineBRRewards }) => acc + firstLineBRRewards,
  //     0,
  //   );

  //   const totalFirstLineBuilderGenrRewards = firstLineRewards.reduce(
  //     (acc, { firstLineBGRewards }) => acc + firstLineBGRewards,
  //     0,
  //   );

  //   // Create or update user rewards
  //   const isUser = await this.userRewardsModel.findOne({
  //     user: userId,
  //     createdAt: {
  //       $gte: startDate,
  //       $lt: endDate,
  //     },
  //   });

  //   const rewardData = {
  //     totalRewards: totaLRewards,
  //     totalBaseReferralReward: totalBaseReferalRewards,
  //     totalBuilderGenReward: totalBuilderGenrRewards,
  //     firstLineBaseReferralRewards: totalFirstLibeBaseReferralRewards,
  //     firstLineBuilderGenRewards: totalFirstLineBuilderGenrRewards,
  //     createdAt: new Date(
  //       date.startOf('day').toDate().getTime() + 4 * 60 * 60 * 1000,
  //     ),
  //     user: new Types.ObjectId(userId),
  //   };

  //   if (!isUser) {
  //     await this.userRewardsModel.create({
  //       ...rewardData,
  //       note: 'Create through the script',
  //     });
  //   } else {
  //     await this.userRewardsModel.updateOne(
  //       {
  //         user: new Types.ObjectId(userId),
  //         createdAt: {
  //           $gte: startDate,
  //           $lt: endDate,
  //         },
  //       },
  //       {
  //         $set: {
  //           ...rewardData,
  //           note: 'update through the script',
  //         },
  //       },
  //       { upsert: true },
  //     );
  //   }
  // }

  // async updateActiveUserSuperNode() {
  //   try {
  //     const startDateISO = await getCurrentDay();
  //     const date = moment(new Date()).startOf('day');

  //     const BATCH_SIZE = 2000;
  //     // Fetch all supernode rewards
  //     const superNodeRewardData = await this.SNBonusTransactionModel.find({
  //       deletedAt: null,
  //       receivable: true,
  //       createdAt: {
  //         $gte: startDateISO.startDate,
  //         $lt: startDateISO.endDate,
  //       },
  //     });

  //     const superNodeRewardDataGroupByUser = groupByUser(superNodeRewardData);

  //     // Fetch and group active user tree
  //     const allUserTree = await this.activeUserTree.find();
  //     const groupedByUpline = groupByUpline(allUserTree);

  //     // Get rewarded users
  //     const rewardedUsers = await this.cloudKRewardModel.distinct('user', {
  //       createdAt: {
  //         $gte: date.toDate(),
  //         $lte: date.clone().endOf('day').toDate(),
  //       },
  //     });

  //     console.log(`Total rewarded users: ${rewardedUsers.length}`);

  //     // Process in batches
  //     const userBatches = [];
  //     for (let i = 0; i < rewardedUsers.length; i += BATCH_SIZE) {
  //       userBatches.push(rewardedUsers.slice(i, i + BATCH_SIZE));
  //     }

  //     console.log(`Total batches: ${userBatches.length}`);

  //     // Process batches
  //     for (let batchIndex = 0; batchIndex < userBatches.length; batchIndex++) {
  //       const batch = userBatches[batchIndex];
  //       console.log(
  //         `Processing batch ${batchIndex + 1} of ${userBatches.length}`,
  //       );

  //       const batchPromises = batch.map((userId) =>
  //         this.processUserRewards_SuperNode(
  //           userId,
  //           date,
  //           superNodeRewardDataGroupByUser,
  //           groupedByUpline,
  //         ),
  //       );
  //       await Promise.all(batchPromises);
  //     }
  //     console.log(' All rewards supernode successfully');

  //     return { success: true, message: 'All rewards processed successfully' };
  //   } catch (error) {
  //     console.error('Error processing rewards:', error);
  //     throw error;
  //   }
  // }

  private getRewardsForUserAndDate(
    rewardsList: any,
    userId: string,
    date: moment.Moment,
  ) {
    const allRewards = rewardsList[userId] || [];
    return allRewards.filter(
      (reward) =>
        reward.createdAt >= date.clone().toDate() &&
        reward.createdAt <= date.clone().endOf('day').toDate(),
    );
  }

  async processUserRewards(
    userId: string,
    date: moment.Moment,
    RewardModel: Model<CloudKReward>,
    activeUserTree: Model<ActiveUserTree>,
    UserRewardModel: Model<UserRewards>,
    dateParam: string,
    groupedByUpline: any,
    allRewards,
    rewardListByID,
  ) {
    const endOfDay = date.clone().endOf('day');

    const rewards = await this.getRewardsForUserAndDate(
      rewardListByID,
      userId,
      date,
    );

    let totalPersonalRewards = 0;
    let totalFirstLineRewards = 0;
    let totalTeamRewards = 0;

    rewards.forEach((reward) => {
      totalPersonalRewards += reward.tokenAmount;
    });

    const firstLineUsers = groupedByUpline[userId] || [];

    totalFirstLineRewards = (
      await Promise.all(
        firstLineUsers.map(async (firstLineUser) => {
          const userRewards = rewardListByID[firstLineUser.user] || [];
          // Example filter and sum calculation for a specific childId and date range
          const firstLineUserRewards =
            userRewards.filter(
              (reward) =>
                reward.createdAt >= date.clone().toDate() &&
                reward.createdAt <= date.clone().endOf('day').toDate(),
            ) || [];

          // Calculate total reward for this user
          const totalReward = firstLineUserRewards.reduce(
            (sum, reward) => sum + reward.tokenAmount,
            0,
          );
          return totalReward; // Return the total reward for this user
        }),
      )
    ).reduce((sum, reward) => sum + reward, 0); // Sum all rewards to get the total

    // console.log(totalFirstLineRewards);

    async function calculateTeamRewards(userId: string) {
      const directChildren = groupedByUpline[userId] || [];

      const teamRewardsPromises = directChildren.map(async (child) => {
        const childId = child.user.toString();

        const children = rewardListByID[String(childId)] || [];

        // Example filter and sum calculation for a specific childId and date range
        const filteredRewards = children.filter(
          (reward) =>
            reward.createdAt >= date.clone().toDate() &&
            reward.createdAt <= date.clone().endOf('day').toDate(),
        );

        // const filteredRewards = allRewards.filter(
        //   (reward) =>
        //     reward.user.equals(new Types.ObjectId(childId)) &&
        //     reward.createdAt >= date.clone().toDate() &&
        //     reward.createdAt <= date.clone().endOf('day').toDate()
        // );

        // Calculate the total reward for the filtered data
        const totalReward = filteredRewards.reduce(
          (sum, reward) => sum + reward.tokenAmount,
          0,
        );

        // Prepare the result to match the aggregation pipeline output format
        const childRewards = [
          {
            _id: childId,
            totalReward,
          },
        ];

        let totalTeamRewards = 0;
        if (childRewards[0]) {
          totalTeamRewards += childRewards[0].totalReward || 0;
        }

        const childTeamRewards = await calculateTeamRewards(childId);
        totalTeamRewards += childTeamRewards;

        return totalTeamRewards;
      });

      const teamRewardsArray = await Promise.all(teamRewardsPromises);
      return teamRewardsArray.reduce((acc, reward) => acc + reward, 0);
    }

    totalTeamRewards = await calculateTeamRewards(userId);

    // console.log(
    //   date.startOf('day').toDate().getTime() + 5 * 60 * 60 * 1000,
    //   date.startOf('day').toDate().getTime(),
    // );

    const userRewardModel = await UserRewardModel.create({
      myProduction: totalPersonalRewards,
      firstLineProduction: totalFirstLineRewards,
      teamProduction: totalTeamRewards,
      createdAt: new Date(
        date.startOf('day').toDate().getTime() + 5 * 60 * 60 * 1000,
      ),
      user: new Types.ObjectId(userId),
      remark: 'automated by script',
    });

    // console.log(`reward created ${userId}`);
  }

  async userActiveProducation() {
    // console.log('fetcing reward ');
    const startDateISO = await getCurrentDay();

    const BATCH_SIZE = 50000; // Number of users processed per batch
    const CONCURRENT_BATCHES = 10000; // Number of batches processed concurrently

    const allRewards = await this.cloudKRewardModel.find({
      deletedAt: null,
      createdAt: {
        $gte: startDateISO.startDate,
        $lt: startDateISO.endDate,
      },
    });

    // console.log(allRewards);

    const rewardListByID = await groupByUser(allRewards);
    // console.log('end reward ', rewardListByID);
    // console.log('fetcing active user list');

    const list_of_active_tree = await this.activeUserTree.find();

    // console.log('active user tree done', list_of_active_tree.length);

    const groupedByUpline = await groupByUpline(list_of_active_tree);
    // console.log('groupedByUpline done');

    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];

    const date = moment(formattedDate).startOf('day');

    const allDates = [
      {
        // count: 1139,
        rewardDate: '2025-01-23',
      },
    ];

    // console.log({
    //   formattedDate,
    //   $gte: date.toDate(),
    //   $lte: date.clone().endOf('day').toDate(),

    //   $gte2: startDateISO.startDate,
    //   $lt2: startDateISO.endDate,
    // });

    try {
      // console.log('distinct start');
      const rewardedUsers = await this.cloudKRewardModel.distinct('user', {
        createdAt: {
          $gte: date.toDate(),
          $lte: date.clone().endOf('day').toDate(),
        },
      });
      // console.log('distinct start');

      const totalRewardedUsers = rewardedUsers.length;
      // console.log(`Total rewarded users: ${totalRewardedUsers}`);

      const userBatches = [];
      for (let i = 0; i < totalRewardedUsers; i += BATCH_SIZE) {
        userBatches.push(rewardedUsers.slice(i, i + BATCH_SIZE));
      }

      // console.log(`Total batches: ${userBatches.length}`);
      const dateParam = '';
      const processBatch = async (batch, batchIndex) => {
        // console.log(`Processing batch ${batchIndex + 1}...`);
        const batchPromises = batch.map((userId) =>
          this.processUserRewards(
            userId,
            date,
            this.cloudKRewardModel,
            this.activeUserTree,
            this.userRewardsModel,
            dateParam,
            groupedByUpline,
            allRewards,
            rewardListByID,
          ),
        );
        await Promise.allSettled(batchPromises);
      };

      const batchExecutionPromises = userBatches.map((batch, index) =>
        processBatch(batch, index),
      );

      // Process batches in parallel with limited concurrency
      const runBatches = async () => {
        for (let i = 0; i < userBatches.length; i += CONCURRENT_BATCHES) {
          const concurrentBatches = batchExecutionPromises.slice(
            i,
            i + CONCURRENT_BATCHES,
          );
          await Promise.all(concurrentBatches);
        }
      };

      await runBatches();
      console.log(`${date} rewards processed successfully`);

      console.log('All rewards processed successfully');
    } catch (error) {
      console.error('An error occurred:', error);
    }
  }

  async processUserSuperNodeRewards(
    userId: string,
    date: moment.Moment,
    RewardModel: Model<CloudKReward>,
    activeUserTree: Model<ActiveUserTree>,
    UserRewardModel: Model<UserRewards>,
    SuperNodeBonusModel: Model<SNBonusTransaction>, // Add SuperNodeBonusModel
    dateParam: string,
    // superNodeRewardData,
    superNodeRewardDataGroupByUser,
    groupedByUpline,
  ) {
    const endOfDay = date.clone().endOf('day');

    const userRewardData = (await superNodeRewardDataGroupByUser[userId]) || [];

    // Pre-filter rewards by date and common conditions
    const startDate = date.clone().toDate();
    const endDate = date.clone().endOf('day').toDate();
    const filteredRewards = userRewardData.filter(
      (reward) =>
        reward.createdAt >= startDate &&
        reward.createdAt <= endDate &&
        reward.deletedAt === null &&
        reward.receivable === true,
    );

    const baseRefrewards = [];
    const builderGenrewards = [];
    let totaLRewards = 0;
    let totalBaseReferalRewards = 0;
    let totalBuilderGenrRewards = 0;

    // Categorize and calculate totals in a single loop
    filteredRewards.forEach((reward) => {
      totaLRewards += reward.tokenAmount;

      if (reward.type === SN_BONUS_TYPE.BASE_REFERRAL) {
        baseRefrewards.push(reward);
        totalBaseReferalRewards += reward.tokenAmount;
      }

      if (reward.type === SN_BONUS_TYPE.BUILDER_GENERATIONAl) {
        builderGenrewards.push(reward);
        totalBuilderGenrRewards += reward.tokenAmount;
      }
    });

    // Additional calculations (if needed)
    let totalFirstLineBuilderGenrRewards = 0; // Add logic if applicable
    let totalFirstLibeBaseReferralRewards = 0; // Add logic if applicable
    const totalFirstLibeBaseReferralUsers = 0; // Add logic if applicable
    const totalFirstLibeBuilderGenrUsers = 0;

    const firstLineUsers = (await groupedByUpline[userId]) || [];

    // const firstLineUsers =   await activeUserTree
    //   .find({ upline: new Types.ObjectId(userId) })
    //   .select('_id user')
    //   .lean();

    // Calculate first-line rewards in a single loop
    const firstLineRewardsPromises = firstLineUsers.map(
      async (firstLineUser) => {
        const firstLineUserReward =
          (await superNodeRewardDataGroupByUser[
            firstLineUser.user.toString()
          ]) || [];

        // Initialize reward variables
        let firstLineBRRewards = 0;
        let firstLineBGRewards = 0;

        // Filter rewards based on date, deletedAt, receivable, and type
        const filteredRewards = firstLineUserReward.filter(
          (reward) =>
            reward.createdAt >= date.clone().toDate() &&
            reward.createdAt <= date.clone().endOf('day').toDate() &&
            reward.deletedAt == null &&
            reward.receivable == true,
        );

        // Calculate total rewards for both BASE_REFERRAL and BUILDER_GENERATIONAl types
        filteredRewards.forEach((reward) => {
          if (reward.type === SN_BONUS_TYPE.BASE_REFERRAL) {
            firstLineBRRewards += reward.tokenAmount;
          } else if (reward.type === SN_BONUS_TYPE.BUILDER_GENERATIONAl) {
            firstLineBGRewards += reward.tokenAmount;
          }
        });

        return { firstLineBRRewards, firstLineBGRewards };
      },
    );

    // Execute all promises and aggregate results
    const firstLineRewards = await Promise.all(firstLineRewardsPromises);

    // Calculate total first-line rewards
    totalFirstLibeBaseReferralRewards = firstLineRewards.reduce(
      (acc, { firstLineBRRewards }) => acc + firstLineBRRewards,
      0,
    );
    totalFirstLineBuilderGenrRewards = firstLineRewards.reduce(
      (acc, { firstLineBGRewards }) => acc + firstLineBGRewards,
      0,
    );

    console.log({
      user: new Types.ObjectId(userId),
      totaLRewards: totaLRewards,
      totalBaseReferralReward: totalBaseReferalRewards,
      totalBuilderGenReward: totalBuilderGenrRewards,
      firstLineBaseReferralRewards: totalFirstLibeBaseReferralRewards,
      firstLineBuilderGenRewards: totalFirstLineBuilderGenrRewards,
    });

    const isUser = await UserRewardModel.findOne({
      user: userId,
      createdAt: {
        $gte: date.clone().toDate(),
        $lt: date.clone().endOf('day').toDate(),
      },
      deletedAt: null,
    });
    console.log(isUser?._id || null);

    if (!isUser) {
      await UserRewardModel.create({
        totalRewards: totaLRewards,
        user: new Types.ObjectId(userId),
        totalBaseReferralReward: totalBaseReferalRewards,
        totalBuilderGenReward: totalBuilderGenrRewards,
        firstLineBaseReferralRewards: totalFirstLibeBaseReferralRewards,
        firstLineBuilderGenRewards: totalFirstLineBuilderGenrRewards,
        createdAt: new Date(
          date.startOf('day').toDate().getTime() + 4 * 60 * 60 * 1000,
        ), // because our timezone is gulf timezone
        note: 'Create through the script',
      });
    } else {
      // Optionally save or update rewards to UserRewards model
      await UserRewardModel.updateOne(
        {
          user: new Types.ObjectId(userId),
          createdAt: {
            $gte: date.clone().toDate(),
            $lt: date.clone().endOf('day').toDate(),
          },
          deletedAt: null,
        },
        {
          $set: {
            totalBaseReferralReward: totalBaseReferalRewards,
            totalBuilderGenReward: totalBuilderGenrRewards,
            firstLineBaseReferralRewards: totalFirstLibeBaseReferralRewards,
            firstLineBuilderGenRewards: totalFirstLineBuilderGenrRewards,
            totalRewards: totaLRewards,
            note: 'update through the script -2',
          },
        },
        { upsert: true },
      );
    }
  }

  async userActiveSuperNode() {
    const BATCH_SIZE = 2000; // Set batch size to process 100 users at a time

    const startDateISO = await getCurrentDay();

    const allUserTree = await this.activeUserTree.find();
    const groupedByUpline = await groupByUpline(allUserTree);
    const superNodeRewardData = await this.SNBonusTransactionModel.find({
      deletedAt: null,
      receivable: true,
      createdAt: {
        $gte: startDateISO.startDate,
        $lt: startDateISO.endDate,
      },
    });

    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];

    const date = moment(formattedDate).startOf('day');

    const superNodeRewardDataGroupByUser =
      await groupByUser(superNodeRewardData);

    const allDates = [
      {
        // count: 1139,
        rewardDate: '2025-01-23',
      },
    ];

    try {
      const rewardedUsers = await this.cloudKRewardModel.distinct('user', {
        createdAt: {
          $gte: date.toDate(),
          $lte: date.clone().endOf('day').toDate(),
        },
      });

      const totalRewardedUsers = rewardedUsers.length;
      console.log(`Total rewarded users: ${totalRewardedUsers}`);

      // Process rewards in batches
      const userBatches = [];
      for (let i = 0; i < totalRewardedUsers; i += BATCH_SIZE) {
        userBatches.push(rewardedUsers.slice(i, i + BATCH_SIZE));
      }

      const totalBatches = userBatches.length;
      console.log(`Total batches: ${totalBatches}`);

      // Process each batch in parallel
      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const batch = userBatches[batchIndex];
        console.log(
          `Processing batch ${batchIndex + 1} of ${totalBatches} with ${batch.length} users...`,
        );

        const dateParam = '';
        const batchPromises = batch.map((userId) =>
          this.processUserSuperNodeRewards(
            userId,
            date,
            this.cloudKRewardModel,
            this.activeUserTree,
            this.userRewardsModel,
            this.SNBonusTransactionModel, // Pass SuperNodeBonusModel
            dateParam,
            // superNodeRewardData,
            superNodeRewardDataGroupByUser,
            groupedByUpline,
          ),
        );
        await Promise.all(batchPromises); // Process all users in the batch concurrently
      }

      console.log('All rewards processed successfully');
    } catch (error) {
      console.error('An error occurred:', error);
    } finally {
    }
  }
}
