import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  GetBonusSummaryDto,
  GetBonusSummaryTransactionDto,
  GetUserDetailsDto,
  ReturnBonusSummaryDto,
} from './dto/bonus-summary.dto';
import { Model, PipelineStage, Types } from 'mongoose';
import { SNBonusTransaction } from './schemas/sn-bonus-transaction.schema';
import {
  SN_BONUS_SUMMARY_TYPE,
  SN_BONUS_TYPE,
} from './enums/sn-bonus-type.enum';
import { User } from '../users/schemas/user.schema';
import { BaseReferralSetting } from './schemas/base-referral-setting.schema';
import { BuilderGenerationSetting } from './schemas/builder-generation-settings';
import { BuilderGenerationLevelSetting } from './schemas/builder-generation-level-settings.schema';
import { Wallet } from '../wallet/schemas/wallet.schema';
import { CloudKMachine } from '../cloud-k/schemas/cloudk-machine.schema';
import { CloudKProduct } from '../cloud-k/schemas/cloudk-products.schema';
import { CloudKReward } from '../cloud-k/schemas/cloudk-reward.schema';
import { CloudKMachineStake } from '../cloud-k/schemas/cloudk-machine-stakes.schema';
import { TwoAccessService } from '../two-access/two-access.service';
import { UserTeamMachineStakes } from './schemas/user-team-machine-stacks.schema';

@Injectable()
export class SupernodeSummaryService {
  constructor(
    @InjectModel(SNBonusTransaction.name)
    private readonly SNBonusTransactionModel: Model<SNBonusTransaction>,
    @InjectModel(User.name)
    private readonly user: Model<User>,
    @InjectModel(BaseReferralSetting.name)
    private readonly baseReferralSetting: Model<BaseReferralSetting>,
    @InjectModel(BuilderGenerationSetting.name)
    private readonly builderGenerationSetting: Model<BuilderGenerationSetting>,
    @InjectModel(BuilderGenerationLevelSetting.name)
    private readonly builderGenerationLevelSetting: Model<BuilderGenerationLevelSetting>,
    @InjectModel(CloudKMachine.name)
    private readonly CloudKMachine: Model<CloudKMachine>,
    @InjectModel(CloudKReward.name)
    private rewardModel: Model<CloudKReward>,
    @InjectModel(Wallet.name)
    private readonly wallet: Model<Wallet>,

    @InjectModel(CloudKMachineStake.name)
    private machineStakesModel: Model<CloudKMachineStake>,
    private twoAccessService: TwoAccessService,
    @InjectModel(UserTeamMachineStakes.name)
    private readonly userTeamMachineStakesModel: Model<UserTeamMachineStakes>,
  ) {}

  async getBonusReportService(
    userId: Types.ObjectId,
    query: GetBonusSummaryDto,
  ): Promise<ReturnBonusSummaryDto> {
    const { fromUser, type, date, page, limit, level, cloudKtrx } = query;

    const startIndex = (page - 1) * limit;

    const from = new Date(date); // Start of the day
    const to = new Date(date); // Start of the next day
    to.setUTCDate(to.getUTCDate() + 1); // Move to the next day (00:00:00)
    to.setUTCHours(0, 0, 0, 0); // Midnight of the next day (start of the next day)
    let baseReward = {};
    const whereConfig: any = {
      fromUser: new Types.ObjectId(fromUser),
      cloudkTrx: new Types.ObjectId(cloudKtrx),

      deletedAt: null,
      createdAt: {
        $gte: from, // Greater than or equal to the start of the current day
        $lt: to, // Less than the start of the next day
      },
    };

    // Handle the 'type' filtering for matching bonus
    if (type === SN_BONUS_SUMMARY_TYPE.MATCHING_BONUS) {
      whereConfig.isMachingBonus = true;
    } else if (type !== SN_BONUS_SUMMARY_TYPE.TOTAL_REWARDS) {
      whereConfig.type = type;
      whereConfig.$or = [
        { isMatchingBonus: { $exists: false } }, // Field does not exist
        { isMatchingBonus: false }, // Field exists but is false
      ];
    }
    if (level) {
      whereConfig['rewardData.currentLevel'] = parseInt(level);
    }
    const total =
      await this.SNBonusTransactionModel.countDocuments(whereConfig);
    if (!total) {
      return { result: [], baseReward, total: 0 };
    }

    const resultData1 = await this.SNBonusTransactionModel.find(whereConfig)
      .sort({ 'rewardData.currentLevel': 1, createdAt: 1 })
      // .skip(startIndex)
      // .limit(limit)
      .populate([
        {
          path: 'user',
          select:
            '_id blockchainId firstName lastName username profilePicture email',
          strictPopulate: false,
        },
        {
          path: 'fromUser',
          select:
            '_id blockchainId firstName lastName username profilePicture email',
          strictPopulate: false,
        },
        {
          path: 'cloudkTrx',
          populate: {
            path: 'user', // Path inside cloudkTrx that references user details
            select:
              '_id blockchainId firstName lastName username profilePicture email',
          },
          strictPopulate: false,
        },
      ])
      .select('-updatedAt -note -deletedAt')
      .lean()
      .exec();

    if (resultData1?.length > 0) {
      baseReward = resultData1[0].cloudkTrx;
    }
    let processedData: any = [];
    let matchedData = null;
    let lastUserId = null;
    let tempStore;
    const lossResons = [];
    if (type !== SN_BONUS_SUMMARY_TYPE.TOTAL_REWARDS) {
      for (const item of resultData1) {
        if (lastUserId) {
          if (!item.receivable) {
            if (
              item.user &&
              item.user._id.toString() === lastUserId.toString()
            ) {
              if (tempStore.user._id.toString() !== item.user._id.toString()) {
                processedData.push(tempStore);
                tempStore = { ...item, lossData: [] };
              } else if (tempStore.receivable !== item.receivable) {
                processedData.push(tempStore);
                tempStore = { ...item, lossData: [] };
              }

              tempStore['lossData'].push(item.lostReason);

              if (item.user && item.user._id.toString() === userId.toString()) {
                processedData.push(tempStore);
                tempStore = { ...item, lossData: [] };
                processedData.push(item);
                matchedData = item;
                break; // Stop processing further once the target data is found
              }
            } else {
              processedData.push(tempStore);
              lastUserId = item.user._id.toString();
              tempStore = { ...item, lossData: [] };
              if (item.user && item.user._id.toString() === userId.toString()) {
                processedData.push(item);
                matchedData = item;
                break; // Stop processing further once the target data is found
              }
            }
          } else {
            processedData.push(tempStore);
            lastUserId = item.user._id.toString();
            tempStore = { ...item, lossData: [] };
            if (item.user && item.user._id.toString() === userId.toString()) {
              processedData.push(item);
              matchedData = item;
              break; // Stop processing further once the target data is found
            }
          }
        } else {
          lastUserId = item.user._id.toString();
          tempStore = { ...item, lossData: [] };
          if (item.user && item.user._id.toString() === userId.toString()) {
            processedData.push(item);
            matchedData = item;
            break; // Stop processing further once the target data is found
          }
        }
        // // Add the current item to processed data
        // processedData.push(item);

        // // Check if the `user` field contains the target user ID
        // if (item.user && item.user._id.toString() === userId.toString()) {
        //   matchedData = item;
        //   break; // Stop processing further once the target data is found
        // }
      }
    } else {
      processedData = [];
    }
    // } else {
    //   const baseRefferlData = [];
    //   const builderGenerationData = [];
    //   const machingBonusData = [];
    //   const builderRefferalData = [];
    //   const isBaseRefferelCompleted = false;
    //   const isBuilderGenerationCompleted = false;
    //   const isBuilderRefferlCompleted = false;

    //   for (const item of resultData1) {
    //     switch (item.type) {
    //       case SN_BONUS_TYPE.BUILDER_GENERATIONAl: {
    //         if (!isBuilderGenerationCompleted) {
    //           builderGenerationData.push(item);
    //         }
    //       }
    //       case SN_BONUS_TYPE.BASE_REFERRAL: {
    //         if (!isBaseRefferelCompleted) {
    //           baseRefferlData.push(item);
    //         }
    //       }
    //       case SN_BONUS_TYPE.BUILDER_REFERRAL: {
    //         if (!isBuilderRefferlCompleted) {
    //           builderRefferalData.push(item);
    //         }
    //       }
    //       default:
    //         break;
    //     }
    //   }
    // }
    let resultData = [];
    if (processedData.length > 0) {
      const lastElement = { ...processedData[processedData.length - 1] };

      processedData.unshift(lastElement);

      processedData[processedData.length - 1] = {
        ...processedData[processedData.length - 1],
        user: processedData[processedData.length - 1].fromUser,
      };

      const firstElement = processedData[0];
      const lastElementdata = processedData[processedData.length - 1];
      const middleArray = processedData.slice(1, -1);

      const reversedMiddleArray = [...middleArray].reverse();
      resultData = [firstElement, ...reversedMiddleArray, lastElementdata];
    }

    return { result: resultData, baseReward, total: processedData.length };
  }

  // staked through machine and machine id
  async getSpecificUserMachineStaked(
    userId: Types.ObjectId,
    machineId: Types.ObjectId,
  ) {
    const pipeline: PipelineStage[] = [
      {
        $match: {
          user: userId,
          machine: machineId,
          deletedAt: { $eq: null },
        },
      },
      {
        $group: {
          _id: null,
          totalStaked: { $sum: '$totalPrice' },
        },
      },
    ];

    const result = await this.machineStakesModel.aggregate(pipeline).exec();
    return result[0] ? result[0].totalStaked : 0;
  }

  async getUserDetailsService(query: GetUserDetailsDto) {
    const { user } = query;
    const userId = new Types.ObjectId(user);
    const userDetails = await this.user.findById(userId); //User degtails from mongoDB
    const userDetailsFromBlockchain =
      await this.twoAccessService.getUserBasedOnId(userDetails.blockchainId); // User details from Postgres DB

    const userTotalNodesFromBlockchain =
      await this.twoAccessService.getUserTotalNodesById(
        userDetails.blockchainId,
      ); // User totalNodes From Postgres DB

    if (!userDetails) {
      return { message: 'user not found', result: {} };
    }

    // Fetch machines from cloudkProducts table based on user ID
    const machines = await this.CloudKMachine.find({
      user: userDetails._id,
    });
    const machineIds = machines.map((machine) => machine._id);

    // Calculate total staked amount
    let totalStaked = 0;
    for (const machineId of machineIds) {
      totalStaked += await this.getSpecificUserMachineStaked(
        userId,
        machineId as Types.ObjectId,
      );
    }

    const pipeline: PipelineStage[] = [
      {
        $match: {
          user: userId,
          machine: { $in: machineIds },
          deletedAt: { $eq: null },
        },
      },
      {
        $group: {
          _id: null,
          lifetimeReward: { $sum: '$tokenAmount' },
        },
      },
    ];
    const rewardData = await this.rewardModel.aggregate(pipeline);
    const { lifetimeReward = 0 } = rewardData[0] || {};

    const [baseRefferalSetting, builderRefferalSetting, firstLineUser]: [
      any,
      any,
      any,
    ] = await Promise.all([
      this.baseReferralSetting.findOne({
        isActive: true,
        deletedAt: null,
      }),
      this.builderGenerationSetting.findOne({
        isActive: true,
        deletedAt: null,
      }),
      this.user
        .find({ uplineId: userId, deletedAt: null })
        .populate('products')
        .select('products'),
    ]);

    let builderLevelCount = 0;
    if (builderRefferalSetting) {
      builderLevelCount =
        await this.builderGenerationLevelSetting.countDocuments({
          setting: builderRefferalSetting._id,
          deletedAt: null,
        });
    }

    let firstLineUserStaking = 0;
    if (firstLineUser) {
      for (const user of firstLineUser) {
        if (user.product) {
          for (const product of user.product) {
            firstLineUserStaking += product.collatoral;
          }
        }
      }
    }
    const personalReWard = {
      totalPersonalStaking: totalStaked,
      rewardsFromStaking: lifetimeReward,
    };

    const community = {
      blockChainId: userDetailsFromBlockchain.list[0].id,
      totalNode: userTotalNodesFromBlockchain.totalNodes, // Fetch TotalNodes from Postgres
      firstLineNode: userDetailsFromBlockchain.list[0].total_first_line_node,
      totalStaking: totalStaked,
      totalFirstLineStaking: firstLineUserStaking,
      baseRefferalLevel: baseRefferalSetting.totalLevels,
      builderRefferalLevel: builderLevelCount,
    };

    return {
      message: 'Successfully fetched',
      result: {
        personalReWard,
        community,
      },
    };
  }

  async getPersonalStakeAndMachineList(query: GetUserDetailsDto) {
    const { user } = query;
    const userId = new Types.ObjectId(user);
    const userDetails = await this.user.findById(userId);
    if (!userDetails) {
      return { message: 'user not found', result: {} };
    }
    // Fetch machines from cloudkProducts table based on user ID
    const machines = await this.CloudKMachine.find({
      user: userDetails._id,
    });
    const machineIds = machines.map((machine) => machine._id);
    // Calculate total staked amount
    let totalStaked = 0;
    for (const machineId of machineIds) {
      totalStaked += await this.getSpecificUserMachineStaked(
        userId,
        machineId as Types.ObjectId,
      );
    }
    const pipeline: PipelineStage[] = [
      {
        $match: {
          user: userId,
          machine: { $in: machineIds },
          deletedAt: { $eq: null },
        },
      },
      {
        $group: {
          _id: null,
          lifetimeReward: { $sum: '$totalPrice' },
        },
      },
    ];
    const rewardData = await this.rewardModel.aggregate(pipeline);
    const { lifetimeReward = 0 } = rewardData[0] || {};
    const personalReWard = {
      totalPersonalStaking: totalStaked,
      rewardsFromStaking: lifetimeReward,
    };
    const machineList = machines;
    return {
      message: 'Successfully fetched',
      result: {
        personalReWard,
        machineList,
      },
    };
  }

  async getUserBonusTransactionService(
    userId: Types.ObjectId,
    query: GetBonusSummaryTransactionDto | any,
  ) {
    const { type, fromDate, toDate, page, limit, level } = query;

    const whereConfig: any = {
      deletedAt: null,
      receivable: true,
      user: new Types.ObjectId(userId),
      // skip: (page - 1) * limit,
      // limit,
    };

    const now = new Date();

    const yesterdayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0,
    );
    const yesterdayEnd = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
    );

    if (fromDate && toDate) {
      const fromDateFormated = new Date(fromDate);
      const toDateFormated = new Date(toDate);

      const todayFrom = new Date(
        fromDateFormated.getFullYear(),
        fromDateFormated.getMonth(),
        fromDateFormated.getDate(),
        0,
        0,
        0,
      );
      const todayTo = new Date(
        toDateFormated.getFullYear(),
        toDateFormated.getMonth(),
        toDateFormated.getDate(),
        23,
        59,
        59,
      );
      whereConfig.createdAt = {
        $gte: new Date(todayFrom),
        $lte: new Date(todayTo),
      };
    } else {
      whereConfig.createdAt = {
        $gte: new Date(yesterdayStart),
        $lte: new Date(yesterdayEnd),
      };
    }
    if (level) {
      whereConfig['rewardData.currentLevel'] = parseInt(level);
    }

    switch (type) {
      case SN_BONUS_SUMMARY_TYPE.TOTAL_REWARDS: {
        const result = this.getTotalBonusTransactions(whereConfig);
        return result;
      }
      case SN_BONUS_SUMMARY_TYPE.MATCHING_BONUS: {
        const result = this.getMatchinBonusTransactions(whereConfig);
        return result;
      }
      default: {
        const result = this.getTypeTransactions(whereConfig, type);
        return result;
      }
    }
  }

  async getTotalBonusTransactions(whereConfig) {
    const rewardTypes = [
      {
        type: SN_BONUS_SUMMARY_TYPE.TOTAL_REWARDS,
        filterKey: '',
        filterValue: true,
        isFilter: false,
      },
      {
        type: SN_BONUS_SUMMARY_TYPE.BASE_REFERRAL,
        filterKey: 'type',
        filterValue: SN_BONUS_SUMMARY_TYPE.BASE_REFERRAL,
        isFilter: true,
      },
      {
        type: SN_BONUS_SUMMARY_TYPE.BUILDER_GENERATIONAl,
        filterKey: 'type',
        filterValue: SN_BONUS_SUMMARY_TYPE.BUILDER_GENERATIONAl,
        isFilter: true,
      },
      {
        type: SN_BONUS_SUMMARY_TYPE.BUILDER_REFERRAL,
        filterKey: 'type',
        filterValue: SN_BONUS_SUMMARY_TYPE.BUILDER_REFERRAL,
        isFilter: true,
      },
      {
        type: SN_BONUS_SUMMARY_TYPE.MATCHING_BONUS,
        filterKey: 'isMachingBonus',
        filterValue: true,
        isFilter: true,
      },
    ];

    const aggregationPromises = rewardTypes.map(
      ({ filterKey, filterValue, isFilter }) => {
        // Check if the filter is applied
        if (isFilter) {
          // Apply the filter
          return this.SNBonusTransactionModel.aggregate([
            {
              $match: {
                ...whereConfig,
                [filterKey]: filterValue, // Apply dynamic filter
              },
            },
            {
              $group: {
                _id: '$rewardData.currentLevel',
                totalAmount: { $sum: '$amount' },
                firstTransactionDate: { $min: '$createdAt' },
                lastTransactionDate: { $max: '$createdAt' },
              },
            },
            {
              $sort: {
                _id: 1, // Sort by currentLevel (ascending)
              },
            },
          ]);
        } else {
          // If no filter, just apply the default aggregation
          return this.SNBonusTransactionModel.aggregate([
            {
              $match: {
                ...whereConfig, // Apply default where config
              },
            },
            {
              $group: {
                _id: { $ifNull: ['$rewardData.currentLevel', 0] },
                totalAmount: { $sum: '$amount' },
                firstTransactionDate: { $min: '$createdAt' },
                lastTransactionDate: { $max: '$createdAt' },
              },
            },
            {
              $sort: {
                _id: 1, // Sort by currentLevel (ascending)
              },
            },
          ]);
        }
      },
    );

    const aggregatedResults = await Promise.all(aggregationPromises);

    const levelData = {};
    const resultData = [];

    rewardTypes.forEach(({ type }, index) => {
      const rewards = aggregatedResults[index];
      if (rewards.length > 0) {
        rewards.forEach((reward) => {
          const levelKey = `level${reward._id}`;
          if (!levelData[levelKey]) {
            levelData[levelKey] = {
              level: reward._id,
              fromDate: reward.firstTransactionDate,
              toDate: reward.lastTransactionDate,
              values: [],
            };
          }
          levelData[levelKey].values.push({
            type,
            amount: reward.totalAmount,
            token: 'LYK-W', // Adjust this if token varies.
          });
        });
      }
    });

    for (const level in levelData) {
      resultData.push(levelData[level]);
    }

    return resultData;
  }

  async getTypeTransactions(whereConfig, type) {
    const totalBaseReffereLRewards =
      await this.SNBonusTransactionModel.aggregate([
        {
          $match: {
            ...whereConfig,
            type: type,
          },
        },
        {
          $group: {
            _id: '$rewardData.currentLevel', // Group by reward level
            totalAmount: { $sum: '$amount' }, // Sum of amounts per level
            transactionCount: { $sum: 1 }, // Count of transactions for each level
            firstTransactionDate: { $min: '$createdAt' }, // First transaction date (min createdAt)
            lastTransactionDate: { $max: '$createdAt' }, // Last transaction date (max createdAt)
          },
        },
        {
          $sort: {
            _id: 1, // Sort by the '_id' field (which represents currentLevel) in ascending order
          },
        },
      ]);

    const levelData = {};
    const resultData = [];

    if (totalBaseReffereLRewards.length > 0) {
      totalBaseReffereLRewards.forEach((reward) => {
        const levelKey = `level${reward._id}`;
        if (!levelData[levelKey]) {
          levelData[levelKey] = {
            level: reward._id,
            fromDate: reward.firstTransactionDate,
            toDate: reward.lastTransactionDate,
            values: [],
          };
        }
        levelData[levelKey].values.push({
          type,
          amount: reward.totalAmount,
          token: 'LYK-W', // Adjust this if the token varies.
        });
      });

      for (const level in levelData) {
        resultData.push(levelData[level]);
      }
    }
    const sortedData = resultData.sort((a, b) => a.level - b.level);
    return sortedData;
    return resultData;
  }

  async getMatchinBonusTransactions(whereConfig) {
    const [totalBaseReffereLRewards] = await Promise.all([
      this.SNBonusTransactionModel.aggregate([
        {
          $match: {
            ...whereConfig,
            isMachingBonus: true,
          },
        },
        {
          $group: {
            _id: '$rewardData.currentLevel', // Group by reward level
            totalAmount: { $sum: '$amount' }, // Sum of amounts per level
            transactionCount: { $sum: 1 }, // Count of transactions for each level
            firstTransactionDate: { $min: '$createdAt' }, // First transaction date (min createdAt)
            lastTransactionDate: { $max: '$createdAt' }, // Last transaction date (max createdAt)
          },
        },
        {
          $sort: {
            _id: 1, // Sort by the '_id' field (which represents currentLevel) in ascending order
          },
        },
      ]),
    ]);
    const levelData = {};
    const resultData = [];
    if (totalBaseReffereLRewards.length > 0) {
      totalBaseReffereLRewards.forEach((reward) => {
        const levelKey = `level${reward._id}`;
        if (!levelData[levelKey]) {
          levelData[levelKey] = {
            level: reward._id,
            fromDate: reward.firstTransactionDate,
            toDate: reward.lastTransactionDate,
            values: [],
          };
        }
        levelData[levelKey].values.push({
          type: SN_BONUS_SUMMARY_TYPE.MATCHING_BONUS,
          amount: reward.totalAmount,
          token: 'LYK-W', // Adjust if token varies.
        });
      });

      for (const level in levelData) {
        resultData.push(levelData[level]);
      }
    }

    return resultData;
  }

  async getUserBonusTotalService(
    userId: Types.ObjectId,
    query: GetBonusSummaryTransactionDto,
  ) {
    const {
      type,
      fromDate,
      toDate,
      page,
      limit,
      level,
      treeLevel,
      rewardLevel,
    } = query;

    const whereConfig: any = {
      deletedAt: null,
      receivable: true,
      user: new Types.ObjectId(userId),
    };

    const now = new Date();
    const yesterdayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0,
    );
    const yesterdayEnd = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
    );

    if (fromDate && toDate) {
      const fromDateFormated = new Date(fromDate);
      const toDateFormated = new Date(toDate);

      const todayFrom = new Date(
        fromDateFormated.getFullYear(),
        fromDateFormated.getMonth(),
        fromDateFormated.getDate(),
        0,
        0,
        0,
      );
      const todayTo = new Date(
        toDateFormated.getFullYear(),
        toDateFormated.getMonth(),
        toDateFormated.getDate(),
        23,
        59,
        59,
      );
      whereConfig.createdAt = {
        $gte: new Date(todayFrom),
        $lte: new Date(todayTo),
      };
    } else {
      whereConfig.createdAt = {
        $gte: new Date(yesterdayStart),
        $lte: new Date(yesterdayEnd),
      };
    }
    if (level) {
      whereConfig['rewardData.currentLevel'] = parseInt(level);
    }

    if (rewardLevel) {
      // level Filter with Reward Level
      whereConfig['rewardData.currentLevel'] = parseInt(rewardLevel);
    }
    if (treeLevel) {
      // level Filter with Tree Level
      whereConfig['rewardData.actualLevel'] = parseInt(treeLevel);
    }

    switch (type) {
      case SN_BONUS_SUMMARY_TYPE.TOTAL_REWARDS: {
        const result = await this.getTotalBonusDataService(whereConfig);
        const returnData = {
          fromDate: fromDate ? fromDate : yesterdayStart,
          toDate: toDate ? toDate : yesterdayEnd,
          total: result.result,
        };
        return { result: returnData };
      }
      case SN_BONUS_SUMMARY_TYPE.MATCHING_BONUS: {
        const result = await this.getMatchinBonusDataService(whereConfig);
        const returnData = {
          fromDate: fromDate ? fromDate : yesterdayStart,
          toDate: toDate ? toDate : yesterdayEnd,
          total: result.total,
        };
        return { result: returnData };
      }
      default: {
        const result = await this.getTypeTDataService(whereConfig, type);
        const returnData = {
          fromDate: fromDate ? fromDate : yesterdayStart,
          toDate: toDate ? toDate : yesterdayEnd,
          total: result.total,
        };
        return { result: returnData };
      }
    }
  }

  async getTotalBonusDataService(whereConfig) {
    const rewardTypes = [
      {
        type: SN_BONUS_SUMMARY_TYPE.TOTAL_REWARDS,
        filterKey: '',
        filterValue: true,
        isFilter: false,
      },
      {
        type: SN_BONUS_SUMMARY_TYPE.BASE_REFERRAL,
        filterKey: 'type',
        filterValue: SN_BONUS_SUMMARY_TYPE.BASE_REFERRAL,
        isFilter: true,
      },
      {
        type: SN_BONUS_SUMMARY_TYPE.BUILDER_GENERATIONAl,
        filterKey: 'type',
        filterValue: SN_BONUS_SUMMARY_TYPE.BUILDER_GENERATIONAl,
        isFilter: true,
      },
      {
        type: SN_BONUS_SUMMARY_TYPE.BUILDER_REFERRAL,
        filterKey: 'type',
        filterValue: SN_BONUS_SUMMARY_TYPE.BUILDER_REFERRAL,
        isFilter: true,
      },
      {
        type: SN_BONUS_SUMMARY_TYPE.MATCHING_BONUS,
        filterKey: 'isMachingBonus',
        filterValue: true,
        isFilter: true,
      },
    ];

    const aggregationPromises = rewardTypes.map(
      ({ filterKey, filterValue, isFilter }) => {
        // Check if the filter is applied
        if (isFilter) {
          // Apply the filter
          return this.SNBonusTransactionModel.aggregate([
            {
              $match: {
                ...whereConfig,
                [filterKey]: filterValue, // Apply dynamic filter
              },
            },
            {
              $group: {
                _id: '$rewardData.currentLevel',
                totalAmount: { $sum: '$amount' },
                firstTransactionDate: { $min: '$createdAt' },
                lastTransactionDate: { $max: '$createdAt' },
              },
            },
            {
              $project: {
                _id: 1,
                totalAmount: 1,
                firstTransactionDate: 1,
                lastTransactionDate: 1,
                type: filterKey === 'type' ? filterValue : null,
              },
            },
            {
              $sort: {
                _id: 1, // Sort by currentLevel (ascending)
              },
            },
          ]);
        } else {
          // If no filter, just apply the default aggregation
          return this.SNBonusTransactionModel.aggregate([
            {
              $match: {
                ...whereConfig, // Apply default where config
              },
            },
            {
              $group: {
                _id: '$rewardData.currentLevel',
                totalAmount: { $sum: '$amount' },
                firstTransactionDate: { $min: '$createdAt' },
                lastTransactionDate: { $max: '$createdAt' },
              },
            },
            {
              $project: {
                _id: 1,
                totalAmount: 1,
                firstTransactionDate: 1,
                lastTransactionDate: 1,
                type: !isFilter ? SN_BONUS_SUMMARY_TYPE.TOTAL_REWARDS : null,
              },
            },
            {
              $sort: {
                _id: 1, // Sort by currentLevel (ascending)
              },
            },
          ]);
        }
      },
    );

    const aggregatedResults = await Promise.all(aggregationPromises);

    const resultData = {
      baseRefferal: 0,
      builderGenerational: 0,
      builderReferral: 0,
      matchingBonus: 0,
      totalReward: 0,
    };

    await aggregatedResults.forEach((innerArray) => {
      innerArray.forEach((item) => {
        switch (item.type) {
          case SN_BONUS_SUMMARY_TYPE.TOTAL_REWARDS:
            resultData.totalReward += item.totalAmount;
            break;
          case SN_BONUS_SUMMARY_TYPE.BASE_REFERRAL:
            resultData.baseRefferal += item.totalAmount;
            break;
          case SN_BONUS_SUMMARY_TYPE.BUILDER_GENERATIONAl:
            resultData.builderGenerational += item.totalAmount;
            break;
          case SN_BONUS_SUMMARY_TYPE.MATCHING_BONUS:
            resultData.matchingBonus += item.totalAmount;
            break;
          case SN_BONUS_SUMMARY_TYPE.BUILDER_REFERRAL:
            resultData.builderReferral += item.totalAmount;
            break;
          default:
            break;
        }
      });
    });

    // const mapData = (data) => {
    //   let result = { fromDate: null, toDate: null };
    //   data.flat().forEach((item) => {
    //     const { type, totalAmount, firstTransactionDate, lastTransactionDate } =
    //       item;

    //     // Map totals by type
    //     if (!result[type]) {
    //       result[type] = { total: 0 };
    //     }
    //     result[type].total += totalAmount;

    //     // Calculate the earliest and latest transaction dates
    //     result.fromDate = result.fromDate
    //       ? new Date(firstTransactionDate) < new Date(result.fromDate)
    //         ? firstTransactionDate
    //         : result.fromDate
    //       : firstTransactionDate;

    //     result.toDate = result.toDate
    //       ? new Date(lastTransactionDate) > new Date(result.toDate)
    //         ? lastTransactionDate
    //         : result.toDate
    //       : lastTransactionDate;
    //   });
    //   return result;
    // };

    // const mappedData = mapData(aggregatedResults);

    return { result: resultData };
  }

  async getTypeTDataService(whereConfig, type) {
    const totalBaseReffereLRewards =
      await this.SNBonusTransactionModel.aggregate([
        {
          $match: {
            ...whereConfig,
            type: type,
          },
        },
        {
          $group: {
            _id: '$rewardData.currentLevel', // Group by reward level
            totalAmount: { $sum: '$amount' }, // Sum of amounts per level
          },
        },
        {
          $sort: {
            _id: 1, // Sort by the '_id' field (which represents currentLevel) in ascending order
          },
        },
      ]);

    // Initialize totalSum as 0
    let totalSum = 0;

    // Check if data exists and calculate the sum
    if (totalBaseReffereLRewards.length > 0) {
      totalSum = totalBaseReffereLRewards.reduce(
        (sum, item) => sum + item.totalAmount,
        0,
      );
    }
    return { total: totalSum };
  }

  async getMatchinBonusDataService(whereConfig) {
    const [totalBaseReffereLRewards] = await Promise.all([
      this.SNBonusTransactionModel.aggregate([
        {
          $match: {
            ...whereConfig,
            isMachingBonus: true,
          },
        },
        {
          $group: {
            _id: '$rewardData.currentLevel', // Group by reward level
            totalAmount: { $sum: '$amount' }, // Sum of amounts per level
            transactionCount: { $sum: 1 }, // Count of transactions for each level
            firstTransactionDate: { $min: '$createdAt' }, // First transaction date (min createdAt)
            lastTransactionDate: { $max: '$createdAt' }, // Last transaction date (max createdAt)
          },
        },
        {
          $sort: {
            _id: 1, // Sort by the '_id' field (which represents currentLevel) in ascending order
          },
        },
      ]),
    ]);
    // Initialize totalSum as 0
    let totalSum = 0;

    // Check if data exists and calculate the sum
    if (totalBaseReffereLRewards.length > 0) {
      totalSum = totalBaseReffereLRewards.reduce(
        (sum, item) => sum + item.totalAmount,
        0,
      );
    }
    return { total: totalSum };
  }

  async getMyCommunitySuperNode(userId: Types.ObjectId) {
    const objectId = new Types.ObjectId(userId);
    const user = await this.user
      .findById(objectId)
      .select('blockchainId isBaseReferralActive isBuilderGenerationActive')
      .lean();

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const userDetailsFromBlockchain =
      await this.twoAccessService.getUserBasedOnId(user.blockchainId);

    const userTotalNodesFromBlockchain =
      await this.twoAccessService.getUserTotalNodesById(user.blockchainId);

    const builderGenerationSetting = await this.builderGenerationSetting
      .findOne({
        isActive: true,
        deletedAt: null,
      })
      .lean();

    const totalMatchingBonus = builderGenerationSetting?.matchingBonus
      ? builderGenerationSetting.matchingBonus
      : 'unlimited';

    const baseReferralLevel = await this.baseReferralSetting
      .findOne({ isActive: true, deletedAt: null })
      .lean();

    const machineStackingData = await this.userTeamMachineStakesModel.aggregate(
      [
        {
          $match: {
            user: objectId,
            deletedAt: { $eq: null },
          },
        },
        {
          $sort: { createdAt: -1 },
        },
        {
          $limit: 1,
        },
      ],
    );

    const latestPersonalMachineStack =
      machineStackingData[0]?.totalPersonalMachineStack || 0;
    const latestFirstLineMachineStack =
      machineStackingData[0]?.totalFirstLineMachineStack || 0;

    const totalBaseReferralLevel = baseReferralLevel?.totalLevels;

    const mycommunity = {
      totalNode: userTotalNodesFromBlockchain.totalNodes,
      firstLineNode: userDetailsFromBlockchain.list[0].total_first_line_node,
      baseReferralLevels: totalBaseReferralLevel,
      builderGenerationalLevels: totalMatchingBonus,
      totalStaking: latestPersonalMachineStack,
      totalFirstLineStaking: latestFirstLineMachineStack,
    };
    return mycommunity;
  }
}
