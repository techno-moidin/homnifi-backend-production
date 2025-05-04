import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { getDateRange, getDateRangeFilter, pagination } from '../utils/helpers';
import { User } from '../users/schemas/user.schema';
import { DateFilter } from '../global/enums/date.filter.enum';
import { UserRewards } from './schemas/user-rewards.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SN_BONUS_TYPE } from './enums/sn-bonus-type.enum';
import { TokenService } from '../token/token.service';
import { DAY_OF_WEEK_SHORT_NAMES, MONTH_SHORT_NAMES } from '../utils/constants';
import { CHART_TIMELIME_TYPES } from '../myfriends/enums/chart-timelines.enum';
import { CacheService } from '../cache/cache.service';
import { CACHE_TYPE } from '../cache/Enums/cache.enum';
import { PipelineStage } from 'mongoose';
import { CloudKSetting } from '../cloud-k/schemas/cloudk-setting.schema';
import { Token } from '../token/schemas/token.schema';
import { TwoAccessService } from '../two-access/two-access.service';

@Injectable()
export class SupernodeLeaderService {
  constructor(
    @InjectModel(UserRewards.name)
    private readonly userRewardsModel: Model<UserRewards>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(CloudKSetting.name)
    private readonly cloudkSettingModal: Model<CloudKSetting>,

    @InjectModel(Token.name)
    private readonly tokenModal: Model<Token>,

    @Inject(forwardRef(() => TokenService))
    private readonly tokenService: TokenService,
    private readonly cacheService: CacheService,
    private twoAccesService: TwoAccessService,
  ) {}

  async getAllTopLeadersForGraph(
    types: SN_BONUS_TYPE,
    timeline: CHART_TIMELIME_TYPES,
  ): Promise<any> {
    const today = new Date();
    const startDate = new Date();
    let groupFormat = '';

    const type = types || '';

    const cachedData = await this.cacheService.getCacheMulipleKeyUser({
      type: CACHE_TYPE.LEADERS_DATA_BY_TYPE,
      user: !type ? CACHE_TYPE.LEADERS_DATA_BY_TYPE : type,
      other_Type: String(timeline),
    });

    if (cachedData) {
      return cachedData;
    }

    switch (timeline) {
      case 'monthly':
        groupFormat = '%Y-%m-%d';
        startDate.setDate(startDate.getDate() - 28);
        break;
      case 'yearly':
        groupFormat = '%Y %b';
        startDate.setMonth(startDate.getMonth() - 12);
        break;
      case 'weekly':
        groupFormat = '%Y-%m-%d';
        startDate.setDate(startDate.getDate() - 6);
        break;
    }

    const aggregationPipeline: PipelineStage[] = [
      {
        $match: {
          createdAt: { $gte: startDate, $lte: today },
          deletedAt: null,
        },
      },
      {
        $project: {
          createdAt: 1,
          totalReward: {
            $add: [
              {
                $cond: {
                  if: { $eq: [type, SN_BONUS_TYPE.BASE_REFERRAL] },
                  then: { $ifNull: ['$totalBaseReferralReward', 0] },
                  else: 0,
                },
              },
              {
                $cond: {
                  if: { $eq: [type, SN_BONUS_TYPE.BUILDER_GENERATIONAl] },
                  then: { $ifNull: ['$totalBuilderGenReward', 0] },
                  else: 0,
                },
              },
              {
                $cond: {
                  if: { $eq: [type, ''] },
                  then: {
                    $ifNull: [
                      {
                        $add: [
                          '$totalBaseReferralReward',
                          '$totalBuilderGenReward',
                        ],
                      },
                      0,
                    ],
                  },
                  else: 0,
                },
              },
            ],
          },
          formattedDate: {
            $dateToString: { format: groupFormat, date: '$createdAt' },
          },
        },
      },
      {
        $group: {
          _id: '$formattedDate',
          totalReward: { $sum: '$totalReward' },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, x: '$_id', y: '$totalReward' } },
    ];

    const groupedData = await this.userRewardsModel
      .aggregate(aggregationPipeline)
      .exec();

    return this.formatSupernodeData(timeline, groupedData, type);
  }

  async formatSupernodeData(
    timeline: CHART_TIMELIME_TYPES,
    data: any[],
    type: any,
  ) {
    let newData = [];
    const d = new Date();
    let inheritedAmount = 0;

    if (timeline === 'weekly') {
      d.setDate(d.getDate() - 6);
      for (let i = 0; i < 7; i++) {
        const formattedDate = d.toISOString().split('T')[0];
        const dayName = DAY_OF_WEEK_SHORT_NAMES[d.getDay()];
        const fd = data.find((v) => v.x === formattedDate);
        inheritedAmount += fd ? fd.y : 0;
        if (inheritedAmount !== 0) {
          // Skip values where y is 0
          newData.push({ x: dayName, y: inheritedAmount });
        }
        d.setDate(d.getDate() + 1);
      }
    } else if (timeline === 'monthly') {
      d.setDate(d.getDate());
      for (let i = 0; i < 28; i++) {
        const formattedDate = d.toISOString().split('T')[0]; // 'YYYY-MM-DD' format
        const padDate = d.getDate().toString().padStart(2, '0'); // Get the day as a 2-digit string
        const fd = data.find((v) => v.x === formattedDate); // Find matching data for the date

        inheritedAmount += fd ? fd.y : 0; // Accumulate reward (or 0 if no data found)
        if (i % 2 === 0) {
          // Show current date and then skip the previous date
          newData.push({ x: padDate, y: inheritedAmount });
        }
        d.setDate(d.getDate() - 1); // Move backwards by 1 day
      }
      const reversedX = newData.map((item) => item.x).reverse();
      const formattedData = newData.map((item, index) => ({
        x: reversedX[index], // Only reversing x values
        y: item.y, // Keeping y values unchanged
      }));

      newData = formattedData; // Save formattedData into newData
    } else if (timeline === 'yearly') {
      d.setMonth(d.getMonth() - 12);
      for (let i = 0; i < 12; i++) {
        d.setMonth(d.getMonth() + 1);
        const month = MONTH_SHORT_NAMES[d.getMonth()];
        const fd = data.find((v) => v.x.includes(month));
        inheritedAmount += fd ? fd.y : 0;
        newData.push({ x: month, y: inheritedAmount });
      }
    }

    await this.cacheService.setCacheMulipleUser(
      {
        type: CACHE_TYPE.LEADERS_DATA_BY_TYPE,
        user: !type ? CACHE_TYPE.LEADERS_DATA_BY_TYPE : type,
        other_Type: String(timeline),
        data: newData,
      },
      86400,
    );

    return newData;
  }

  async getAllTopLeaders(type, filter, query, limit, page) {
    const cacheKeyParts = [];
    if (type) cacheKeyParts.push(type);
    if (filter) cacheKeyParts.push(filter);
    if (limit) cacheKeyParts.push(limit);
    if (page) cacheKeyParts.push(page);
    const cacheKey = cacheKeyParts.join('_');
    let cachedData = null;

    if (!query) {
      cachedData = await this.cacheService.getCacheMulipleKeyUser({
        type: CACHE_TYPE.LEADERBOARD_DATA,
        user: type || CACHE_TYPE.LEADERBOARD_DATA,
        other_Type: cacheKey,
      });

      if (cachedData) {
        return cachedData;
      }
    }

    const { startOfPeriod, endOfPeriod } = getDateRangeFilter(filter);
    const startDate = new Date(startOfPeriod);
    const endDate = new Date(endOfPeriod);

    let sortField = '';
    if (type === SN_BONUS_TYPE.BASE_REFERRAL) {
      sortField = 'totalBaseReferralReward';
    } else if (type === SN_BONUS_TYPE.BUILDER_GENERATIONAl) {
      sortField = 'totalBuilderGenReward';
    } else {
      sortField = 'totalReward';
    }

    const pipeline: any[] = [
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          deletedAt: null,
        },
      },
      {
        $group: {
          _id: '$user',
          totalBaseReferralReward: { $sum: '$totalBaseReferralReward' },
          totalBuilderGenReward: { $sum: '$totalBuilderGenReward' },
          totalReward: {
            $sum: {
              $add: ['$totalBaseReferralReward', '$totalBuilderGenReward'],
            },
          },
        },
      },
      {
        $sort: { [sortField]: -1 },
      },
      {
        $limit: 50,
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userDetails',
          pipeline: [
            {
              $project: {
                _id: 1,
                username: 1,
                blockchainId: 1,
                email: 1,
                firstName: 1,
                lastName: 1,
                totalNode: 1,
              },
            },
          ],
        },
      },
      { $unwind: '$userDetails' },
      {
        $project: {
          user: '$userDetails',
          totalBaseReferralReward: 1,
          totalBuilderGenReward: 1,
          totalReward: 1,
        },
      },
    ];

    const rewards = await this.userRewardsModel.aggregate(pipeline).exec();

    const tokenSetting = await this.cloudkSettingModal
      .findOne({ deletedAt: null })
      .populate(['rewardToken', 'stakeToken'])
      .lean()
      .exec();

    let userDetails = rewards.map((reward) => {
      let tokenAmount = 0;
      if (type === SN_BONUS_TYPE.BASE_REFERRAL) {
        tokenAmount = reward.totalBaseReferralReward;
      } else if (type === SN_BONUS_TYPE.BUILDER_GENERATIONAl) {
        tokenAmount = reward.totalBuilderGenReward;
      } else {
        tokenAmount = reward.totalReward;
      }

      return {
        user: reward.user,
        tokenAmount: tokenAmount,
        tokenName: tokenSetting.rewardToken.name,
        tokenSymbol: tokenSetting.rewardToken.symbol,
      };
    });

    userDetails = userDetails.filter((detail) => detail.tokenAmount > 0);

    userDetails = await Promise.all(
      userDetails.map(async (detail, index) => {
        const rank = index + 1;

        const profilePictureData =
          await this.twoAccesService.findProfilePictureFromTwoAccessUsers(
            detail.user.blockchainId,
          );

        return {
          ...detail,
          rank,
          profilePicture: profilePictureData.profilePicture,
        };
      }),
    );

    if (query) {
      const searchRegex = new RegExp(query, 'i');
      userDetails = userDetails.filter(
        (detail) =>
          searchRegex.test(detail.user.username) ||
          searchRegex.test(detail.user.blockchainId),
      );
    }

    userDetails.sort((a, b) => b.tokenAmount - a.tokenAmount);

    const paginate = await pagination({
      page,
      pageSize: Number(limit),
      model: this.userRewardsModel,
      condition: {},
      pagingRange: 5,
    });

    const paginatedUserDetails = userDetails.slice(
      paginate.offset,
      paginate.offset + paginate.limit,
    );

    const result = {
      list: paginatedUserDetails,
      totalCount: userDetails.length,
      totalPages: Math.ceil(userDetails.length / limit),
      currentPage: page,
    };

    if (!query) {
      await this.cacheService.setCacheMulipleUser(
        {
          type: CACHE_TYPE.LEADERBOARD_DATA,
          user: type || CACHE_TYPE.LEADERBOARD_DATA,
          other_Type: cacheKey,
          data: result,
        },
        86400,
      );
    }

    return result;
  }

  async getAllTopLeadersv1(type, filter, query, limit, page) {
    const cacheKeyParts = [];
    if (type) cacheKeyParts.push(type);
    if (filter) cacheKeyParts.push(filter);
    if (limit) cacheKeyParts.push(limit);
    if (page) cacheKeyParts.push(page);
    const cacheKey = cacheKeyParts.join('_');
    let cachedData = null;

    if (!query) {
      cachedData = await this.cacheService.getCacheMulipleKeyUser({
        type: CACHE_TYPE.LEADERBOARD_DATA,
        user: type || CACHE_TYPE.LEADERBOARD_DATA,
        other_Type: cacheKey,
      });

      if (cachedData) {
        return cachedData;
      }
    }

    const { startOfPeriod, endOfPeriod } = getDateRangeFilter(filter);
    const startDate = new Date(startOfPeriod);
    const endDate = new Date(endOfPeriod);

    let sortField = '';
    if (type === SN_BONUS_TYPE.BASE_REFERRAL) {
      sortField = 'totalBaseReferralReward';
    } else if (type === SN_BONUS_TYPE.BUILDER_GENERATIONAl) {
      sortField = 'totalBuilderGenReward';
    } else {
      sortField = 'totalReward';
    }

    const pipeline: any[] = [
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          deletedAt: null,
        },
      },
      {
        $group: {
          _id: '$user',
          totalBaseReferralReward: { $sum: '$totalBaseReferralReward' },
          totalBuilderGenReward: { $sum: '$totalBuilderGenReward' },
          totalReward: {
            $sum: {
              $add: ['$totalBaseReferralReward', '$totalBuilderGenReward'],
            },
          },
        },
      },
      {
        $sort: { [sortField]: -1 },
      },
      {
        $limit: 50,
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userDetails',
          pipeline: [
            {
              $project: {
                _id: 1,
                username: 1,
                blockchainId: 1,
                email: 1,
                firstName: 1,
                lastName: 1,
                totalNode: 1,
              },
            },
          ],
        },
      },
      { $unwind: '$userDetails' },
      {
        $project: {
          user: '$userDetails',
          totalBaseReferralReward: 1,
          totalBuilderGenReward: 1,
          totalReward: 1,
        },
      },
    ];

    const rewards = await this.userRewardsModel.aggregate(pipeline).exec();

    const tokenSetting = await this.cloudkSettingModal
      .findOne({ deletedAt: null })
      .populate(['rewardToken', 'stakeToken'])
      .lean()
      .exec();

    let userDetails = rewards.map((reward) => {
      let tokenAmount = 0;
      if (type === SN_BONUS_TYPE.BASE_REFERRAL) {
        tokenAmount = reward.totalBaseReferralReward;
      } else if (type === SN_BONUS_TYPE.BUILDER_GENERATIONAl) {
        tokenAmount = reward.totalBuilderGenReward;
      } else {
        tokenAmount = reward.totalReward;
      }

      return {
        user: reward.user,
        tokenAmount: tokenAmount,
        tokenName: tokenSetting.rewardToken.name,
        tokenSymbol: tokenSetting.rewardToken.symbol,
      };
    });

    userDetails = userDetails.filter((detail) => detail.tokenAmount > 0);

    userDetails = await Promise.all(
      userDetails.map(async (detail, index) => {
        const rank = index + 1;

        const profilePictureData =
          await this.twoAccesService.findProfilePictureFromTwoAccessUsers(
            detail.user.blockchainId,
          );

        return {
          ...detail,
          rank,
          profilePicture: profilePictureData.profilePicture,
        };
      }),
    );

    if (query) {
      const searchRegex = new RegExp(query, 'i');
      userDetails = userDetails.filter(
        (detail) =>
          searchRegex.test(detail.user.username) ||
          searchRegex.test(detail.user.blockchainId),
      );
    }

    userDetails.sort((a, b) => b.tokenAmount - a.tokenAmount);

    const paginate = await pagination({
      page,
      pageSize: Number(limit),
      model: this.userRewardsModel,
      condition: {},
      pagingRange: 5,
    });

    const paginatedUserDetails = userDetails.slice(
      paginate.offset,
      paginate.offset + paginate.limit,
    );

    const result = {
      list: paginatedUserDetails,
      totalCount: userDetails.length,
      totalPages: Math.ceil(userDetails.length / limit),
      currentPage: page,
    };

    if (!query) {
      await this.cacheService.setCacheMulipleUser(
        {
          type: CACHE_TYPE.LEADERBOARD_DATA,
          user: type || CACHE_TYPE.LEADERBOARD_DATA,
          other_Type: cacheKey,
          data: result,
        },
        86400,
      );
    }

    return result;
  }
}
