import { InjectConnection, InjectModel } from '@nestjs/mongoose';

import {
  Connection,
  Model,
  PipelineStage,
  Types,
  Schema,
  ClientSession,
} from 'mongoose';

import { forwardRef, HttpException, Inject, Injectable } from '@nestjs/common';
import { aggregatePaginate } from '../utils/pagination.service';
import { GlobalPoolResponseDto } from './dto/global-pool.dto';
import { POOL_TYPE, SCRIPT_TYPE, STATUS_TYPE } from './enums/sngp-type.enum';
import { SNBonusTransaction } from './schemas/sn-bonus-transaction.schema';
import { GlobalPool } from './schemas/sn-global-pool.schema';
import { Sngp } from './schemas/sngp.schema';
import { UserSngp } from './schemas/user-sngp.schema';
import { SngpDistribution } from './schemas/sngp-distribution.schema';
import { DistributionDto } from './dto/create-base-ref-setting.dto';
import { REWARD_STATUS_TYPE } from './enums/sngp-rewards.enum';
import { SngpRewards } from './schemas/sngp-rewards.schema';
import { WalletService } from '../wallet/wallet.service';

import { DISTRIBUTION_STATUS_TYPE } from './enums/sngp-distribution.enum';
import { UsersService } from '../users/users.service';
import { CHART_TIMELIME_TYPES } from '../myfriends/enums/chart-timelines.enum';
import {
  eachDayOfInterval,
  endOfWeek,
  format,
  getDay,
  startOfWeek,
} from 'date-fns';
import { Token } from '../token/schemas/token.schema';
import { CloudKMachine } from '../cloud-k/schemas/cloudk-machine.schema';
import { PaginateDTO } from '../admin/global/dto/paginate.dto';
import { CloudKProduct } from '../cloud-k/schemas/cloudk-products.schema';
import { CloudKService } from '../cloud-k/cloud-k.service';
import { SupernodeService } from './supernode.service';
import { LostReason } from './enums/sngp-lost-reason.enum';

@Injectable()
export class SNGlogbalPollService {
  constructor(
    @InjectModel(SNBonusTransaction.name)
    private readonly bonusTrxModel: Model<SNBonusTransaction>,
    @InjectModel(Sngp.name)
    private readonly sngpModel: Model<Sngp>,
    @InjectModel(UserSngp.name)
    private readonly userSngpModel: Model<UserSngp>,
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(GlobalPool.name)
    private readonly globalPoolModel: Model<GlobalPool>,
    @InjectModel(SngpDistribution.name)
    private readonly sngpDistributionModel: Model<SngpDistribution>,
    @InjectModel(SngpRewards.name)
    private readonly sngpRewardsModel: Model<SngpRewards>,
    @Inject(forwardRef(() => WalletService))
    private walletService: WalletService,
    private userService: UsersService,
    private supernodeService: SupernodeService,

    @InjectModel(CloudKMachine.name)
    public machineModel: Model<CloudKMachine>,
    @InjectModel(CloudKProduct.name)
    public productModel: Model<CloudKProduct>,
    @InjectModel(Token.name)
    private readonly token: Model<Token>,
    @Inject(forwardRef(() => CloudKService))
    private cloudKService: CloudKService,
  ) {}
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
  async getSngpActivityPool(userId: string) {
    const setting = await this.cloudKService.getCurrentCloudkSettings();

    const sngpData = await this.sngpModel.findOne({
      type: POOL_TYPE.SNGP,
      status: STATUS_TYPE.ACTIVE,
      deletedAt: null,
    });
    if (!sngpData) {
      return null;
    }

    const teamMembers = await this.userService.getTeamMembersByUser(
      new Types.ObjectId(userId),
    );
    const [userSngpSumData, teamTotal, sngpRewardData] = await Promise.all([
      this.userSngpModel.aggregate([
        {
          $match: {
            sngp: sngpData._id, // Filter by distributionId
            user: new Types.ObjectId(userId),
          },
        },
        {
          $group: {
            _id: '$user',
            totalSngp: { $sum: '$points' },
          },
        },
      ]),
      this.userSngpModel.aggregate([
        {
          $match: {
            sngp: sngpData._id,
            user: { $in: teamMembers },
          },
        },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$points' },
          },
        },
      ]),
      this.sngpRewardsModel.aggregate([
        {
          $match: {
            sngp: sngpData._id,
            user: new Types.ObjectId(userId),
          },
        },
        {
          $group: {
            _id: null,
            claimedTotal: {
              $sum: {
                $cond: [
                  { $eq: ['$status', REWARD_STATUS_TYPE.CLAIMED] },
                  '$reward',
                  0,
                ],
              },
            },
            unclaimedTotal: {
              $sum: {
                $cond: [
                  { $eq: ['$status', REWARD_STATUS_TYPE.UNCLAIMED] },
                  '$reward',
                  0,
                ],
              },
            },
            lastClaimedTime: {
              $max: {
                $cond: [
                  { $eq: ['$status', REWARD_STATUS_TYPE.CLAIMED] },
                  '$claimedAt',
                  null,
                ],
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            claimedTotal: 1,
            unclaimedTotal: 1,
            lastClaimedTime: 1,
          },
        },
      ]),
    ]);

    const resultData = {
      totalSngp: sngpData.totalPoints,
      globalSngpUsed: sngpData.totalPoints - sngpData.remainingPoints,
      userSngp: userSngpSumData.length ? userSngpSumData[0].totalSngp : 0,
      teamTotalSngp: teamTotal.length ? teamTotal[0].totalAmount : 0,
      percentageOfUsed:
        ((sngpData.totalPoints - sngpData.remainingPoints) /
          sngpData.totalPoints) *
        100,
      claimedTotal: sngpRewardData[0]?.claimedTotal || 0,
      unclaimedTotal: sngpRewardData[0]?.unclaimedTotal || 0,
      lastClaimedTime: sngpRewardData[0]?.lastClaimedTime || null,
      rewardToken: setting?.rewardToken?.name,
    };
    return resultData;
  }

  //Get Country Active Pools/ Static Data
  async getCountryActivePools(paginateDTO) {
    const { page, limit, query, fromDate, toDate, status } = paginateDTO;

    const matchConditions: any[] = [
      {
        type: POOL_TYPE.COUNTRY_POOL,
        deletedAt: null,
        startDate: {
          $lte: new Date(),
        },
      },
    ];
    if (status) {
      matchConditions[0].status = status;
    }
    if (query) {
      matchConditions.push({
        $or: [{ name: { $regex: query, $options: 'i' } }],
      });
    }

    if (fromDate) {
      const from = new Date(fromDate);
      const to = toDate ? new Date(toDate) : new Date();
      to.setUTCHours(23, 59, 59, 999);
      matchConditions.push({
        startDate: {
          $gte: from,
          $lte: to,
        },
      });
    }

    const pipeline: PipelineStage[] = [
      { $match: { $and: matchConditions } },
      {
        $sort: { createdAt: -1 },
      },
      {
        $addFields: {
          generatedPoints: { $subtract: ['$totalPoints', '$remainingPoints'] },
        },
      },
      {
        $project: {
          name: '$name',
          startDate: '$startDate',
          totalPoints: '$totalPoints',
          rewardAmount: '$rewardAmount',
          remainingPoints: '$remainingPoints',
          generatedPoints: '$generatedPoints',
          createdAt: '$createdAt',
          status: {
            $concat: [
              { $toUpper: { $substr: ['$status', 0, 1] } },
              { $substr: ['$status', 1, { $strLenCP: '$status' }] },
            ],
          },
          countryCode: '$countryCode',
          multiplier: '$multiplier',
          admin: '$admin',
        },
      },
    ];

    const data = await aggregatePaginate(
      this.sngpModel,
      pipeline,
      Number(page),
      Number(limit),
    );

    return data;
  }

  async getSngps(paginateDTO) {
    const { page, limit, query, type } = paginateDTO;

    const matchConditions: any[] = [
      {
        type: type,
        deletedAt: { $eq: null },
      },
    ];

    if (query) {
      matchConditions.push({
        $or: [{ name: { $regex: query, $options: 'i' } }],
      });
    }

    const pipeline: PipelineStage[] = [
      { $match: { $and: matchConditions } },
      {
        $sort: { createdAt: -1 },
      },
      {
        $lookup: {
          from: 'tokens',
          localField: 'token',
          foreignField: '_id',
          as: 'tokenData',
        },
      },
      {
        $unwind: {
          path: '$tokenData',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'sngprewards',
          localField: '_id',
          foreignField: 'sngp',
          as: 'rewardsData',
        },
      },
      {
        $addFields: {
          totalAmountGenerated: {
            $sum: {
              $map: {
                input: '$rewardsData',
                as: 'reward',
                in: '$$reward.reward',
              },
            },
          },
          totalClaimed: {
            $sum: {
              $map: {
                input: {
                  $filter: {
                    input: '$rewardsData',
                    as: 'reward',
                    cond: {
                      $eq: ['$$reward.status', REWARD_STATUS_TYPE.CLAIMED],
                    },
                  },
                },
                as: 'claimed',
                in: '$$claimed.reward',
              },
            },
          },
          totalUnclaimed: {
            $sum: {
              $map: {
                input: {
                  $filter: {
                    input: '$rewardsData',
                    as: 'reward',
                    cond: {
                      $eq: ['$$reward.status', REWARD_STATUS_TYPE.UNCLAIMED],
                    },
                  },
                },
                as: 'unclaimed',
                in: '$$unclaimed.reward',
              },
            },
          },
          poolAmount: {
            $subtract: ['$totalPoints', '$remainingPoints'],
          },
        },
      },
      {
        $project: {
          name: 1,
          startDate: 1,
          totalPoints: 1,
          rewardAmount: 1,
          remainingPoints: 1,
          poolAmount: 1,
          createdAt: 1,
          status: 1,
          token: '$tokenData',
          tokenIcon: '$tokenData.iconUrl',
          countryCode: 1,
          multiplier: 1,
          admin: 1,
          totalClaimed: 1,
          totalUnclaimed: 1,
          totalAmountGenerated: 1,
        },
      },
    ];

    const data = await aggregatePaginate(
      this.sngpModel,
      pipeline,
      Number(page),
      Number(limit),
    );

    return data;
  }

  async getDistributedRewards(paginateDTO, sngpId: string) {
    const { page, limit, query } = paginateDTO;

    const matchConditions: any[] = [
      { sngp: new Types.ObjectId(sngpId), deletedAt: { $eq: null } },
    ];

    if (query) {
      matchConditions.push({
        $or: [{ 'user.username': { $regex: query, $options: 'i' } }],
      });
    }

    const pipeline: PipelineStage[] = [
      { $match: { $and: matchConditions } },

      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'user',
        },
      },

      {
        $unwind: {
          path: '$user',
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $lookup: {
          from: 'sngps',
          localField: 'sngp',
          foreignField: '_id',
          as: 'sngp',
        },
      },

      {
        $unwind: {
          path: '$sngp',
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $project: {
          _id: 1,
          reward: 1,
          totalSngpPoints: 1,
          status: 1,
          createdAt: 1,
          updatedAt: 1,
          toWallet: 1,
          walletTrx: 1,
          meta: 1,
          deletedAt: 1,
          username: '$user.username',
          poolName: '$sngp.name',
          totalPoints: '$sngp.totalPoints',
          rewardAmount: '$sngp.rewardAmount',
          multiplier: '$sngp.multiplier',
          sngpStatus: '$sngp.status',
          admin: '$sngp.admin',
          token: '$sngp.token',
          remainingPoints: '$sngp.remainingPoints',
        },
      },
    ];

    const data = await aggregatePaginate(
      this.sngpRewardsModel,
      pipeline,
      Number(page),
      Number(limit),
    );

    return data;
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
  async getCountryUpcomingPools(filters) {
    // get only active sngp
    const matchConditions: any[] = [
      { startDate: { $gte: new Date() }, deletedAt: { $eq: null } },
    ];

    // filter on status field
    if (filters.status) {
      matchConditions.push({ status: filters.status });
    }
    const pipeline: PipelineStage[] = [
      { $match: { $and: matchConditions } },
      {
        $sort: { startDate: -1 },
      },
    ];

    const data = await aggregatePaginate(
      this.sngpModel,
      pipeline,
      Number(filters.page ?? 1),
      Number(filters.limit ?? 10),
    );

    return data;
  }
  //Get Country Upcoming Pools/ Static Data
  async getDistributionList(PaginateDTO: PaginateDTO) {
    const { fromDate, toDate, status, page, limit } = PaginateDTO;

    const matchConditions: any[] = [
      {
        status: { $ne: DISTRIBUTION_STATUS_TYPE.COMPLETED },
        deletedAt: { $eq: null },
      },
    ];

    if (toDate) {
      const date = new Date(toDate);
      date.setHours(24, 0, 0, 0);
      matchConditions.push({ createdAt: { $lte: new Date(date) } });
    }
    if (fromDate) {
      const date = new Date(fromDate);
      date.setHours(0, 0, 0, 0);
      matchConditions.push({ createdAt: { $gte: date } });
    }
    status && matchConditions.push({ status });

    const pipeline: PipelineStage[] = [
      { $match: { $and: matchConditions } },
      {
        $lookup: {
          from: 'sngps',
          localField: 'sngp',
          foreignField: '_id',
          as: 'sngp',
        },
      },
      {
        $unwind: {
          path: '$sngp',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: {
          'sngp.type': POOL_TYPE.COUNTRY_POOL, // Additional condition to filter by sngp.type
          'sngp.deletedAt': null,
        },
      },
      {
        $sort: { createdAt: -1 },
      },
    ];

    const data = await aggregatePaginate(
      this.sngpDistributionModel,
      pipeline,
      Number(page ?? 1),
      Number(limit ?? 10),
    );

    return data;
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
    const { page, limit, query, fromDate, toDate, type, status } = paginateDTO;
    const regexPattern = new RegExp(query, 'i');
    let poolNameFilter = {
      $match: {},
    };

    let tokenTypeFilter = {
      $match: {},
    };

    const matchConditions: any[] = [
      { user: new Types.ObjectId(userid) },
      { deletedAt: { $eq: null } },
      { receivable: true },
    ];

    if (status) {
      matchConditions.push({
        status: status,
      });
    }

    if (query) {
      // sngp pool name filter
      poolNameFilter = {
        $match: {
          'sngpData.name': { $regex: regexPattern },
        },
      };
    }

    if (type) {
      tokenTypeFilter = {
        $match: {
          'sngpData.token.symbol': type.toString().toLowerCase(),
        },
      };
    }

    if (fromDate) {
      const from = new Date(fromDate);
      const to = toDate ? new Date(toDate) : new Date();
      to.setUTCHours(23, 59, 59, 999); // Set end of the day for toDate
      matchConditions.push({
        createdAt: {
          $gte: from,
          $lte: to,
        },
      });
    }

    const pipeline = [
      {
        $match: { $and: matchConditions },
      },
      {
        $lookup: {
          from: 'sngps',
          localField: 'sngp',
          foreignField: '_id',
          as: 'sngpData',
        },
      },
      {
        $unwind: {
          path: '$sngpData',
          preserveNullAndEmptyArrays: true,
        },
      },
      tokenTypeFilter,
      poolNameFilter,
      {
        $match: {
          'sngpData.type': POOL_TYPE.COUNTRY_POOL,
        },
      },
      {
        $sort: { 'sngpData.createdAt': -1 },
      },
      {
        $group: {
          _id: '$sngpData._id',
          poolName: { $first: '$sngpData.name' },
          totalPoints: { $first: '$sngpData.totalPoints' },
          totalRewardAmount: { $first: '$sngpData.rewardAmount' },
          userReward: { $sum: '$reward' },
          userRewardAmountUSD: { $sum: '$rewardAmountUSD' },
          claimStatus: { $first: '$status' },
          createdAt: { $first: '$createdAt' },
        },
      },
      {
        $project: {
          _id: 1,
          poolName: 1,
          totalPrice: 1,
          totalPoints: 1,
          totalRewardAmount: 1,
          userReward: 1,
          userRewardAmountUSD: 1,
          claimStatus: 1,
          createdAt: 1,
        },
      },
    ];

    const PoolRewardHistoryData = await aggregatePaginate(
      this.sngpRewardsModel,
      pipeline,
      Number(page ?? 1),
      Number(limit ?? 10),
    );
    const clouldkSetting = await this.cloudKService.getCurrentCloudkSettings();
    for (const doc of PoolRewardHistoryData.list) {
      const userSngpData = await this.userSngpModel.find({
        sngp: doc._id,
        user: new Types.ObjectId(userid),
        status: STATUS_TYPE.ACTIVE,
        deletedAt: null,
      });

      const totalUserPoints = userSngpData.reduce(
        (sum, item) => sum + item.points,
        0,
      );
      doc.totalUserPoints = totalUserPoints;
      doc.rewardTokenSymbol = clouldkSetting.rewardToken.symbol;
      doc.rewardToken = clouldkSetting.rewardToken.name;
    }

    return PoolRewardHistoryData;
  }

  async getActivePoolService(session?: ClientSession) {
    const data = await this.sngpModel.find({
      status: STATUS_TYPE.ACTIVE,
      startDate: {
        $lte: new Date(),
      },
      deletedAt: null,
    });
    return data;
  }

  async createUserSngp(data, session?: ClientSession) {
    return await this.userSngpModel.create([
      {
        points: data.points,
        sngp: data.sngp,
        user: data.user,
        machine: data.machine,
        status: data.status,
        meta: data.meta,
        remark: data?.remark,
      },
    ]);
  }
  async getUserSngpCount(sngp) {
    const result = await this.userSngpModel.aggregate([
      {
        $match: {
          sngp,
        },
      },
      {
        $group: {
          _id: '$user',
        },
      },
      {
        $count: 'uniqueParticipants',
      },
    ]);
    return result.length > 0 ? result[0].uniqueParticipants : 0;
  }

  async isUserSngpAvailable(sngp, userId) {
    const count = await this.userSngpModel.countDocuments({
      sngp,
      user: Types.ObjectId.isValid(userId)
        ? new Types.ObjectId(userId)
        : userId,
    });
    return count > 0;
  }
  async sngpDistributionBulkInsert(data, session?: ClientSession) {
    return await this.sngpDistributionModel.insertMany(data);
  }

  //Service: for distribute sngp rewards to the user when it completed successfully.
  async distributeSngpReward(admin, distributionData: DistributionDto) {
    //Fetch the sngpPool from sngpDistributionTable
    const distributeData = await this.sngpDistributionModel
      .findById(distributionData.sngpDistribution)
      .populate({
        path: 'sngp',
      });

    if (!distributeData || !distributeData.sngp) {
      // not exist then
      throw new HttpException(
        'Invalid sngp distribution data. Add valid data.',
        400,
      );
    }

    if (distributeData.status === DISTRIBUTION_STATUS_TYPE.COMPLETED) {
      throw new HttpException('Already distributed the rewards', 400);
    }
    //Group accordning to the userid for sum of sngp  from UserSngp
    const userSngpSumData = await this.userSngpModel.aggregate([
      {
        $match: {
          sngp: distributeData.sngp._id, // Filter by distributionId
          status: STATUS_TYPE.ACTIVE,
          deletedAt: null,
        },
      },
      {
        $set: {
          _id: '$user',
          totalSngp: '$points',
          remark: '$remark',
        },
      },
    ]);

    if (userSngpSumData.length <= 0) {
      // user sngp data is not exist
      throw new HttpException(
        'There are no users participating in the SNGP pool.',
        400,
      );
    }
    // Get reward Token from cloud k settings
    const setting = await this.cloudKService.getCurrentCloudkSettings();
    if (!setting)
      throw new HttpException(
        'There is no nodek settings to distribute the reward.',
        400,
      );

    // Add mongo transaction
    const session = await this.connection.startSession();
    session.startTransaction();
    try {
      // loop all the users from the userSngpSumData and distribute rewards to users
      const sngpRewardDta = [];

      const symbol = setting.rewardToken.symbol;
      for (const userSngp of userSngpSumData) {
        const [sngpData, cloudkRewardAmount, cloudRewardingUSD] =
          await Promise.all([
            this.sngpModel.findOne(
              {
                _id: distributeData.sngp._id,
                deletedAt: { $eq: null },
              },
              { multiplier: 1 },
            ),
            this.cloudKService.getUserDailyRewards(userSngp._id),
            this.cloudKService.getUserDailyRewardsUSD(userSngp._id),
          ]);

        const currentPrice = await this.cloudKService.getCurrentPrice();

        //Calculate the Reward
        let rewardAmount =
          (userSngp.totalSngp / distributeData.sngp.totalPoints) *
          distributeData.sngp.rewardAmount;
        let rewardAmountUSD = rewardAmount * currentPrice.price;

        const isUserActiveNode = await this.supernodeService.isUserActiveNode(
          userSngp._id,
          session,
        );

        let lostReason: string | null = null;
        let receivable: boolean = true;
        let remark: string = '';
        if (userSngp.remark !== SCRIPT_TYPE.XERA) {
          if (!isUserActiveNode) {
            lostReason = LostReason.INACTIVE_USER;
            receivable = false;
          }

          if (sngpData?.multiplier && cloudkRewardAmount > 0) {
            const maxAllowedReward = sngpData.multiplier * cloudkRewardAmount;
            const maxAllowedRewardUSD = sngpData.multiplier * cloudRewardingUSD;

            if (rewardAmount > maxAllowedReward) {
              rewardAmount = maxAllowedReward;
              rewardAmountUSD = maxAllowedRewardUSD;
              remark = `Reward capped at the maximum allowed (${maxAllowedReward}) based on: Daily Nodek Reward (${cloudkRewardAmount}) × Multiplier (${sngpData.multiplier}).`;
            }
          } else {
            lostReason = LostReason.NO_DAILY_NODEK_REWARDS;
            receivable = false;
          }
        }

        const data = {
          user: userSngp._id,
          sngp: distributeData.sngp._id,
          totalSngpPoints: distributeData.sngp.totalPoints,
          reward: rewardAmount,
          status: REWARD_STATUS_TYPE.UNCLAIMED,
          tokenPrice: currentPrice?.price,
          rewardAmountUSD: rewardAmountUSD, // Reward amount in USD
          meta: {
            note: distributionData.note,
            totalSngpRecevied: userSngp.totalSngp,
            totalPoints: distributeData.sngp.totalPoints,
            rewardAmount: distributeData.sngp.rewardAmount,
          },
          lostReason,
          receivable,
          remark,
        };
        sngpRewardDta.push(data);
      }
      // Bulk insert the data into the reward table
      await this.sngpRewardsModel.insertMany(sngpRewardDta, { session });

      // update the sngpDistributionModel
      distributeData.drawDate = new Date() as unknown as Schema.Types.Date;
      distributeData.status = DISTRIBUTION_STATUS_TYPE.COMPLETED;
      distributeData.admin = new Types.ObjectId(admin) as any;
      await distributeData.save({ session });
      // Commit the transaction
      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw new Error(error);
    } finally {
      session.endSession();
    }
  }
  async getUserProductionGraph(
    userId: string,
    timeLine: CHART_TIMELIME_TYPES,
  ): Promise<any> {
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    const today = new Date();
    let groupFormat: '%Y' | '%Y %b' | '%Y-%m-%d' = '%Y';
    switch (timeLine) {
      case 'monthly': {
        groupFormat = '%Y-%m-%d';
        startDate.setDate(1);
        break;
      }
      case 'yearly': {
        groupFormat = '%Y %b';
        startDate.setMonth(startDate.getMonth() - 6);

        break;
      }
      case 'weekly': {
        groupFormat = '%Y-%m-%d';
        startDate.setDate(startDate.getDate() - 7);
        break;
      }
    }

    const sngpData = await this.sngpModel.findOne({
      type: POOL_TYPE.SNGP,
      status: STATUS_TYPE.ACTIVE,
      deletedAt: null,
    });
    if (!sngpData) {
      return null;
    }

    const teamMembers = await this.userService.getTeamMembersByUser(
      new Types.ObjectId(userId),
    );

    const prevBalance: { totalTokenAmount: number }[] | [] =
      await this.userSngpModel.aggregate([
        {
          $match: {
            createdAt: { $lte: startDate },
            user: { $in: teamMembers },
          },
        },
        {
          $group: {
            _id: '$items',
            totalTokenAmount: { $sum: '$points' },
          },
        },
        {
          $project: {
            _id: 0,
            totalTokenAmount: 1,
          },
        },
      ]);

    const pipeline: PipelineStage[] = [
      {
        $match: {
          createdAt: {
            $gte: startDate,
            $lte: today,
          },
          user: { $in: teamMembers },
        },
      },
      {
        $group: {
          _id: {
            day: { $dateToString: { format: groupFormat, date: '$createdAt' } },
          },
          totalTokenAmount: { $sum: '$points' },
        },
      },
      {
        $sort: {
          '_id.day': 1,
        },
      },
      {
        $project: {
          _id: 0,
          x: '$_id.day',
          y: '$totalTokenAmount',
        },
      },
    ];
    const result = await this.userSngpModel.aggregate(pipeline).exec();

    const totalTokenAmount = prevBalance[0]?.totalTokenAmount || 0;

    return this.walletService.formatData(timeLine, result, totalTokenAmount);
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
          // user: { $in: teamMembers },
        },
      },
      {
        $group: {
          _id: {
            day: { $dayOfMonth: '$createdAt' },
            month: { $month: '$createdAt' },
            year: { $year: '$createdAt' },
          },
          totalTokenAmount: { $sum: '$points' },
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
    const result = await this.userSngpModel.aggregate(pipeline).exec();

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

  async getScoreHistory(userid: Types.ObjectId, paginateDTO: PaginateDTO) {
    const { page, limit, query, fromDate, toDate, type } = paginateDTO;
    try {
      let searchConsition = {};

      const matchConditions: any[] = [
        {
          deletedAt: { $eq: null },
          user: new Types.ObjectId(userid),
        },
      ];
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

      if (query) {
        searchConsition = {
          $or: [
            { 'productDetails.name': { $regex: query, $options: 'i' } },
            { 'sngpDetails.name': { $regex: query, $options: 'i' } },
          ],
        };
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
            from: 'cloudkmachines',
            localField: 'machine',
            foreignField: '_id',
            as: 'machineDetails',
          },
        },
        {
          $unwind: {
            path: '$machineDetails',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: 'cloudkproducts',
            localField: 'machineDetails.product',
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
            from: 'sngps',
            localField: 'sngp',
            foreignField: '_id',
            as: 'sngpDetails',
          },
        },
        {
          $unwind: {
            path: '$sngpDetails',
            preserveNullAndEmptyArrays: true,
          },
        },
        ...(type ? [{ $match: { 'sngpDetails.type': type } }] : []),
        { $match: { ...searchConsition } },

        {
          $project: {
            machineName: {
              $cond: {
                if: { $eq: ['$machine', null] },
                then: '$remark',
                else: '$machineDetails.name',
              },
            },
            purchaseValue: '$productDetails.price',
            sngp: '$points',
            name: '$sngpDetails.name',
            date: '$createdAt',
          },
        },
      ];

      return await aggregatePaginate(this.userSngpModel, pipeline, page, limit);
    } catch (error) {
      throw new Error(`Error retrieving score history: ${error.message}`);
    }
  }

  async getAllToken() {
    const allToken = await this.token.find({}).select('symbol _id iconUrl');
    return allToken;
  }
  async getSngpBanner(userId: Types.ObjectId) {
    const sngpData = await this.sngpModel.findOne({
      type: POOL_TYPE.SNGP,
      status: STATUS_TYPE.ACTIVE,
      deletedAt: null,
    });
    if (!sngpData) {
      return {};
    }

    const matchConditions: any[] = [
      {
        $match: {
          sngp: sngpData._id,
          deletedAt: {
            $eq: null,
          },
          user: new Types.ObjectId(userId),
          status: 'un-claimed',
          receivable: true,
        },
      },
      {
        $group: {
          _id: {
            totalSngpPoints: '$totalSngpPoints', // Group by user
            sngp: '$sngp', // Group by sngp
          },
          totalPoints: {
            $sum: '$reward',
          },
          totalRewardUSD: {
            $sum: '$rewardAmountUSD',
          },
        },
      },
      {
        $project: {
          totalPoints: '$totalPoints',
          totalRewardUSD: '$totalRewardUSD',
          totalSngpPoints: '$_id.totalSngpPoints',
        },
      },
    ];

    const [data, setting, loseReson] = await Promise.all([
      this.sngpRewardsModel.aggregate(matchConditions),
      this.cloudKService.getCurrentCloudkSettings(),
      this.sngpRewardsModel
        .findOne({
          sngp: sngpData._id,
          deletedAt: {
            $eq: null,
          },
          user: new Types.ObjectId(userId),
          status: 'un-claimed',
          receivable: false,
        })
        .sort({ createdAt: -1 })
        .select('lostReason'),
    ]);

    let lossReasonMessage = null;
    switch (loseReson?.lostReason) {
      case LostReason.INACTIVE_USER: {
        lossReasonMessage = `You're inactive user.`;
        break;
      }

      case LostReason.NO_DAILY_NODEK_REWARDS: {
        lossReasonMessage = `Your daily reward can not get today.`;
        break;
      }

      default: {
        lossReasonMessage = null;
        break;
      }
    }

    return {
      totalPoint: data.length ? data[0].totalPoints : 0,
      totalSngpPoints: data.length ? data[0].totalSngpPoints : 0,
      totalRewardUSD: data.length ? data[0].totalRewardUSD : 0,
      rewardTokenSymbol: setting.rewardToken.symbol,
      rewardToken: setting.rewardToken.name,
      loseReson: lossReasonMessage,
    };
  }

  async getCountryPoolBanner(userId: Types.ObjectId) {
    const matchQuery: any[] = [
      {
        deletedAt: {
          $eq: null,
        },
        user: new Types.ObjectId(userId),
        status: 'un-claimed',
        receivable: true,
      },
    ];
    const sngpData = await this.sngpModel
      .findOne({
        type: POOL_TYPE.COUNTRY_POOL,
        status: STATUS_TYPE.ACTIVE,
        deletedAt: null,
      })
      .select('_id');
    if (sngpData) {
      matchQuery.push({ sngp: { $nin: [sngpData._id] } });
    }

    const matchConditions: any[] = [
      {
        $match: { $and: matchQuery },
      },
      {
        $group: {
          _id: {
            totalSngpPoints: '$totalSngpPoints', // Group by user
            sngp: '$sngp', // Group by sngp
          },
          totalPoints: {
            $sum: '$reward',
          },
          totalPointsUSD: {
            $sum: '$rewardAmountUSD',
          },
        },
      },
      {
        $lookup: {
          from: 'sngps', // Replace with the actual name of the SNGP collection
          localField: '_id.sngp', // Field in the current collection (reference to SNGP)
          foreignField: '_id', // Field in the SNGP collection (its ID field)
          as: 'sngpData', // Name for the joined data
        },
      },
      {
        $unwind: '$sngpData', // Unwind to deconstruct the array and treat it as individual documents
      },
      {
        $project: {
          totalPoints: 1, // Include totalPoints
          totalSngpPoints: '$_id.totalSngpPoints', // Include totalSngpPoints from the _id field
          poolName: '$sngpData.name', // Include pool name from sngpData
          totalPointsUSD: 1, // Include totalPointsUSD
        },
      },
    ];
    const [data, setting] = await Promise.all([
      this.sngpRewardsModel.aggregate(matchConditions),
      this.cloudKService.getCurrentCloudkSettings(),
    ]);

    return {
      data,
      rewardTokenSymbol: setting.rewardToken.symbol,
      rewardToken: setting.rewardToken.name,
    };
  }

  async getSNGPDistributionStatus() {
    const pipeline: PipelineStage[] = [
      {
        $match: {
          // status: { $ne: DISTRIBUTION_STATUS_TYPE.COMPLETED },
          deletedAt: { $eq: null },
        },
      },
      {
        $lookup: {
          from: 'sngps',
          localField: 'sngp',
          foreignField: '_id',
          as: 'sngp',
        },
      },
      {
        $unwind: {
          path: '$sngp',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: {
          'sngp.type': POOL_TYPE.SNGP,
          'sngp.deletedAt': null,
          'sngp.status': STATUS_TYPE.ACTIVE,
        },
      },
      {
        $sort: { createdAt: -1 },
      },
    ];

    const data = this.sngpDistributionModel.aggregate(pipeline);

    return data;
  }

  async getActiveSngp() {
    const data = await this.sngpModel.find({
      status: STATUS_TYPE.ACTIVE,
      startDate: {
        $lte: new Date(),
      },
      deletedAt: null,
      type: POOL_TYPE.SNGP,
    });
    return data;
  }

  //* This function was added temporarily for Excel upload migration.
  async sngpPointDistribution(points, userId) {
    const sngpPoints = Number(points) * 120;
    try {
      const completedSngps = [];
      const rewardAmounts = {};

      const globalPool = await this.getActiveSngp();
      if (!globalPool || globalPool.length === 0) {
        return;
      }

      // add productSngp to active SNGP Pools
      const poolData = globalPool[0];
      let pointForDistribution = sngpPoints;
      let isSngpCompleted = false;

      if (!rewardAmounts.hasOwnProperty(poolData._id.toString())) {
        rewardAmounts[poolData._id.toString()] = poolData.remainingPoints;
      }

      // checking pool contain remaining points to distribute
      if (
        poolData.remainingPoints === 0 ||
        rewardAmounts[poolData._id.toString()] == 0
      ) {
        return;
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
        user: new Types.ObjectId(userId),
        status: STATUS_TYPE.ACTIVE,
        machine: null,
        remark: SCRIPT_TYPE.XERA,
        meta: {
          previousRemainingPoints: rewardAmounts[poolData._id.toString()],
          currentRemainingPoints:
            rewardAmounts[poolData._id.toString()] - pointForDistribution,
          totalPoint: poolData.totalPoints,
          pointForDistribution,
        },
      };
      await this.createUserSngp(userSngpData);
      // Saving the remaining points
      const PoolRemainingPoint =
        rewardAmounts[poolData._id.toString()] - pointForDistribution;

      poolData.remainingPoints = PoolRemainingPoint;
      rewardAmounts[poolData._id.toString()] = PoolRemainingPoint;

      if (PoolRemainingPoint === 0) {
        let count = await this.getUserSngpCount(poolData._id);
        const isUserSngpAvailable = await this.isUserSngpAvailable(
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
      await poolData.save();

      if (completedSngps.length > 0) {
        // if any sngp completed the we are add it to the distribution pool table
        await this.sngpDistributionBulkInsert(completedSngps);
      }
      return;
    } catch (error) {
      throw error;
    }
  }
}
