import {
  BadRequestException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MemberShipSubscriptionType, User } from './schemas/user.schema';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model, ObjectId, PipelineStage, Types } from 'mongoose';
import {
  TrustpilotUserDTO,
  UpdateUserDto,
  UserStatusDTO,
} from './dto/update-user.dto';
import { UserMembership } from './schemas/membership.schema';
import { ActiveUserTree } from './schemas/active-user-tree.schema';
import { UserImportJob } from './schemas/user-import-job';
import { usersFilterDTO } from '../admin/global/dto/paginate.dto';
import { aggregatePaginate } from '../utils/pagination.service';
import { WebhookService } from './../webhook/webhook.service';
import {
  BlockSupernodeUserDto,
  SuperNodeBlockField,
} from '../admin/dto/block.user.dto';
import { UpdateEmailUserDto } from '@/src/users/dto/update-email-user.dto';
import process from 'node:process';
import { firstValueFrom, lastValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { pagination } from '../utils/helpers';
import { AxiosResponse } from 'axios';
import {
  SCENARIO_TO_UPDATE_MAP,
  ScenarioAnalyticsPointType,
  StatusAnalyticsPointType,
  UpdateAnalyticsPointType,
} from './dto/update.analytics.dto';
import { UserAnalyticsLog } from './schemas/user-analytics-log.schema';
import {
  getCurrentDay,
  getDateOrNull,
  isMembershipValid,
} from '../utils/common/common.functions';
import { TwoAccessService } from '../two-access/two-access.service';
import { CloudKMachine } from '../cloud-k/schemas/cloudk-machine.schema';
import { CloudKMachineStake } from '../cloud-k/schemas/cloudk-machine-stakes.schema';
import { SNBonusTransaction } from '../supernode/schemas/sn-bonus-transaction.schema';

// import { CheckMembershipDto } from '../webhook/dto/check-membership.dto';
// import { TwoAccessService } from '../two-access/two-access.service';
// import {
//   getDateOrNull,
//   isMembershipValid,
// } from '../utils/common/common.functions';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(UserMembership.name)
    readonly membershipModel: Model<UserMembership>,
    @InjectModel(ActiveUserTree.name)
    private activeUserTreeModel: Model<ActiveUserTree>,
    @InjectModel(UserImportJob.name)
    private userImportJob: Model<UserImportJob>,
    private readonly httpService: HttpService,
    private webhookService: WebhookService,
    @InjectModel(CloudKMachine.name)
    readonly machineModel: Model<CloudKMachine>,
    @InjectModel(CloudKMachineStake.name)
    readonly machineStakeModel: Model<CloudKMachineStake>,
    @InjectModel(SNBonusTransaction.name)
    readonly snBonusTransaction: Model<SNBonusTransaction>,
    @InjectModel(UserAnalyticsLog.name)
    readonly userAnalyticsLogModel: Model<UserAnalyticsLog>,

    private twoAccessService: TwoAccessService,
  ) {}

  // async getOrCreateUserByBID(
  //   bId: string,
  //   email: string,
  //   username?: string,
  //   firstName?: string,
  //   lastName?: string,
  //   profilePicture?: string,
  // ) {
  //   const user = await this.userModel.findOne({ blockchainId: bId });
  //   if (user) {
  //     user.lastLogin = new Date();
  //     if (username !== '' && !user.username && username) {
  //       user.username = username;
  //     }

  //     if (email !== '' && user.email !== email) {
  //       const currentTwoAccessUser =
  //         await this.twoAccessService.findByIdTwoAccessUsers(bId);
  //       if (currentTwoAccessUser && currentTwoAccessUser.length > 0) {
  //         user.email = currentTwoAccessUser[0]?.email || email;
  //       } else {
  //         user.email = email;
  //       }
  //     }

  //     if (firstName !== '' && user.firstName !== firstName) {
  //       user.firstName = firstName;
  //     }
  //     if (lastName !== '' && user.lastName !== lastName) {
  //       user.lastName = lastName;
  //     }
  //     await user.save();
  //     return user;
  //   }

  //   const newUser = await this.userModel.create({
  //     blockchainId: bId,
  //     email,
  //     username,
  //     firstName,
  //     lastName,
  //     profilePicture,
  //     lastLogin: new Date(),
  //   });
  //   return newUser;
  // }

  async getOrCreateUserByBID(
    bId: string,
    email: string = '',
    username: string = '',
    firstName: string = '',
    lastName: string = '',
    profilePicture: string = '',
  ) {
    const user = await this.userModel.findOne({ blockchainId: bId });
    if (user) {
      user.lastLogin = new Date();

      // Check if any field is different from current user data
      const isAnyFieldMismatched =
        (email !== '' && user.email !== email) ||
        (username !== '' && user.username !== username) ||
        (firstName !== '' && user.firstName !== firstName) ||
        (lastName !== '' && user.lastName !== lastName);

      if (isAnyFieldMismatched) {
        // If any field is mismatched, fetch from TwoAccess
        const twoAccessUsers =
          await this.twoAccessService.findByIdTwoAccessUsers(bId);

        if (twoAccessUsers && twoAccessUsers.length > 0) {
          const twoAccessUser = twoAccessUsers[0];
          // Update all fields from TwoAccess
          user.email = twoAccessUser.email || email;
          user.username = twoAccessUser.username || username;
          user.firstName = twoAccessUser.firstName || firstName;
          user.lastName = twoAccessUser.lastName || lastName;
          user.uplineBID = twoAccessUser.upline_id || null;
          user.referralCode = twoAccessUser.referral_code || null;
          user.document_country = twoAccessUser.document_country || null;
        } else {
          // If no TwoAccess user found, update with provided values
          user.email = email;
          user.username = username || user.username;
          user.firstName = firstName || user.firstName;
          user.lastName = lastName || user.lastName;
        }
      }

      if (profilePicture !== '' && user.profilePicture !== profilePicture) {
        user.profilePicture = profilePicture;
      }

      await user.save();
      return user;
    } else {
      const user = await this.createUserFromTwoAccess(
        bId,
        email,
        username,
        firstName,
        lastName,
        profilePicture,
      );
      return user;
    }
  }

  /**
   * Finds or creates a user by blockchain ID without updating existing user info.
   */
  async getOrCreateUserByBidWithoutUpdate(
    bId: string,
    email: string = '',
    username: string = '',
    firstName: string = '',
    lastName: string = '',
    profilePicture: string = '',
  ) {
    const user = await this.userModel.findOne({ blockchainId: bId });
    if (user) {
      return user;
    } else {
      const user = await this.createUserFromTwoAccess(
        bId,
        email,
        username,
        firstName,
        lastName,
        profilePicture,
      );
      return user;
    }
  }

  async getOrCreateUserByBIDForScript(
    bId: string,
    email: string = '',
    username: string = '',
    firstName: string = '',
    lastName: string = '',
    profilePicture: string = '',
  ) {
    const user = await this.userModel.findOne({ blockchainId: bId });
    if (user) {
      // Check if any field is different from current user data
      const isAnyFieldMismatched =
        (email !== '' && user.email !== email) ||
        (username !== '' && user.username !== username) ||
        (firstName !== '' && user.firstName !== firstName) ||
        (lastName !== '' && user.lastName !== lastName);

      const isProfileMismatch =
        profilePicture !== '' && user.profilePicture !== profilePicture;

      if (isAnyFieldMismatched) {
        // If any field is mismatched, fetch from TwoAccess
        const twoAccessUsers =
          await this.twoAccessService.findByIdTwoAccessUsers(bId);

        if (twoAccessUsers && twoAccessUsers.length > 0) {
          const twoAccessUser = twoAccessUsers[0];
          // Update all fields from TwoAccess
          user.email = twoAccessUser.email || email;
          user.username = twoAccessUser.username || username;
          user.firstName = twoAccessUser.firstName || firstName;
          user.lastName = twoAccessUser.lastName || lastName;
          user.uplineBID = twoAccessUser.upline_id || null;
          user.referralCode = twoAccessUser.referral_code || null;
        } else {
          // If no TwoAccess user found, update with provided values
          user.email = email;
          user.username = username || user.username;
          user.firstName = firstName || user.firstName;
          user.lastName = lastName || user.lastName;
        }
      }

      if (isProfileMismatch) {
        user.profilePicture = profilePicture;
      }

      if (isAnyFieldMismatched || isProfileMismatch) {
        await user.save();
      }

      return user;
    } else {
      const user = await this.createUserFromTwoAccess(
        bId,
        email,
        username,
        firstName,
        lastName,
        profilePicture,
      );
      return user;
    }
  }
  async findUserByBlockchainId(blockchainId: string) {
    return await this.userModel.findOne({ blockchainId });
  }

  async findUserByBlockchainIdWithProducts(blockchainId: string) {
    // return await this.userModel.findOne({ blockchainId }).populate('products');
    return await this.userModel.findOne({ blockchainId }).populate({
      path: 'products',
      populate: { path: 'product' },
    });
  }

  async findUserById(userId: Types.ObjectId) {
    // Convert string `userId` to `Types.ObjectId` if necessary
    const id = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
    return await this.userModel.findById(id);
  }

  async updateUser(userId: string, data: UpdateUserDto) {
    const updateUser = await this.userModel.findByIdAndUpdate(
      userId,
      {
        ...data,
        dateJoined: data.dateJoined ? new Date(data.dateJoined) : null,
      },
      {
        new: true,
      },
    );

    return updateUser;
  }

  async updateUserById(userId, updateData) {
    return await this.userModel.findByIdAndUpdate(userId, updateData, {
      new: true,
    });
  }

  async findUserMembershipByBid(bid) {
    const data = await this.membershipModel.findOne({ userBid: bid });

    const status = data
      ? data.expiredAt > new Date()
        ? 'ACTIVE'
        : 'EXPIRED'
      : 'NO_MEMBERSHIP';
    return {
      membership: data ? data.expiredAt > new Date() : false,
      expirationAt: data?.expiredAt || null,
      status,
    };
  }

  async createActiveTreeUser(data) {
    return await this.activeUserTreeModel.create(data);
  }
  async createBulkActiveTreeUser(data) {
    return await this.activeUserTreeModel.insertMany(data);
  }
  async bulkUpdateActiveTreeUser(updates) {
    return await this.activeUserTreeModel.bulkWrite(updates);
  }

  async findActiveUserTreeByUserId(userId: Types.ObjectId | string) {
    return await this.activeUserTreeModel.findOne({
      user: new Types.ObjectId(userId),
    });
  }

  async getUplineUsers(userId: Types.ObjectId, limit: number = 5) {
    const pipeline: PipelineStage[] = [
      {
        $match: { user: userId },
      },
      {
        $graphLookup: {
          from: 'activeusertrees', // The collection name where your ActiveUserTree schema is stored
          startWith: '$upline',
          connectFromField: 'upline',
          connectToField: 'user',
          as: 'uplines',
          depthField: 'level',
          maxDepth: limit - 1, // Since maxDepth is 0-indexed, limit - 1 gives you the correct depth
        },
      },
      {
        $unwind: '$uplines',
      },
      {
        $sort: { 'uplines.level': 1 },
      },
      {
        $limit: limit,
      },
      {
        $replaceRoot: { newRoot: '$uplines' },
      },
    ];
    const uplineUsers = await this.activeUserTreeModel
      .aggregate(pipeline)
      .exec();
    return uplineUsers.map((user) => user.uplineDetails);
  }

  async removeAllTreeUsers(): Promise<void> {
    await this.activeUserTreeModel.deleteMany({});
  }

  async bulkUpdateUsers(bulkUpdates): Promise<any> {
    try {
      return await this.userModel.bulkWrite(bulkUpdates);
    } catch (error) {
      console.error('Error performing bulk updates:', error.message);
      throw new Error('Failed to update users in bulk.');
    }
  }

  async findUpline(userId: Types.ObjectId | string): Promise<null | User> {
    const user = await this.activeUserTreeModel
      .findOne({
        user: new Types.ObjectId(userId),
      })
      .populate('upline');
    return user ? user.upline : null;
  }
  async findMembershipUpline(userId: Types.ObjectId | string) {
    const user = await this.activeUserTreeModel
      .findOne({
        user: new Types.ObjectId(userId),
      })
      .populate('membershipUpline');
    return user ?? null;
  }

  async getFirstLineUsers(userId): Promise<ActiveUserTree[]> {
    return await this.activeUserTreeModel
      .find({
        upline: new Types.ObjectId(userId),
        isMembership: true,
      })
      .populate('user');
  }

  async getOrCreateUserJob(totalUsers: number) {
    const todaysJob = await this.userImportJob.create({
      startTime: new Date(),
      totalUsers: totalUsers,
    });

    return todaysJob;
  }

  async getTeamMembersByUser(
    userId: Types.ObjectId,
  ): Promise<Types.ObjectId[]> {
    const uplines: Types.ObjectId[] = [];
    const findUpline = async (currentUserId: Types.ObjectId) => {
      const results = await this.activeUserTreeModel.aggregate([
        {
          $match: {
            upline: new Types.ObjectId(currentUserId),
            deletedAt: null,
          },
        },
      ]);

      if (results.length > 0) {
        for (const result of results) {
          const upline = result.user;
          if (upline.equals(currentUserId)) {
            continue;
          }
          uplines.push(upline);
          await findUpline(upline);
        }
      }
    };
    await findUpline(userId);
    return uplines;
  }

  async updateBuilderReferralBonusEligibility(
    userId: Types.ObjectId,
    rewardMultiplier: number,
  ): Promise<User | null> {
    const updatedUser = await this.userModel
      .findByIdAndUpdate(
        userId,
        { rewardMultiplier: rewardMultiplier },
        {
          new: true,
          useFindAndModify: false,
        },
      )
      .exec();
    return updatedUser;
  }

  async getAllUsers(paginateDTO: usersFilterDTO) {
    const {
      page,
      limit,
      query,
      fromDate,
      toDate,
      sort,
      userStatus,
      isBaseReferralEnabled,
      isBuilderGenerationEnabled,
      isBuilderReferralEnabled,
    } = paginateDTO;

    let whereConfig = {};
    if (query) {
      const newQuery = query.split(/[ ,]+/);
      const usernameSearchQuery = newQuery.map((str) => ({
        username: RegExp(str, 'i'),
      }));

      const emailSearchQuery = newQuery.map((str) => ({
        email: RegExp(str, 'i'),
      }));

      const blockchainIdSearchQuery = newQuery.map((str) => ({
        blockchainId: RegExp(str, 'i'),
      }));

      const firstNameSearchQuery = newQuery.map((str) => ({
        firstName: RegExp(str, 'i'),
      }));

      const lastNameSearchQuery = newQuery.map((str) => ({
        lastName: RegExp(str, 'i'),
      }));

      whereConfig = {
        ...whereConfig,
        $and: [
          {
            $or: [
              { $and: usernameSearchQuery },
              { $and: emailSearchQuery },
              { $and: blockchainIdSearchQuery },
              { $and: firstNameSearchQuery },
              { $and: lastNameSearchQuery },
              // { $and: isBlockedSearchQuery },
              // { $and: supernodeStatusSearchQuery },
            ],
          },
        ],
      };
    }

    if (userStatus) {
      whereConfig = {
        ...whereConfig,
        isBlocked: userStatus,
      };
    }

    if (isBaseReferralEnabled) {
      whereConfig = {
        ...whereConfig,
        isBaseReferralEnabled: isBaseReferralEnabled,
      };
    }

    if (isBuilderGenerationEnabled) {
      whereConfig = {
        ...whereConfig,
        isBuilderGenerationEnabled: isBuilderGenerationEnabled,
      };
    }

    if (isBuilderReferralEnabled) {
      whereConfig = {
        ...whereConfig,
        isBuilderReferralEnabled: isBuilderReferralEnabled,
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
      model: this.userModel,
      condition: whereConfig,
      pagingRange: 5,
    });

    // const data = await this.depositTransactionModel.countDocuments(whereConfig);

    const sortQuery: any = {};

    if (sort) {
      for (const key in sort) {
        sortQuery[key] = sort[key] === 'descending' ? -1 : 1;
      }
    } else {
      sortQuery.createdAt = -1;
    }

    const list = await this.userModel
      .find(whereConfig)
      .sort(sortQuery)
      .skip(paginate.offset)
      .limit(paginate.limit);
    // .select()

    return {
      list,
      totalCount: paginate.total,
      totalPages: paginate.metadata.page.totalPage,
      currentPage: paginate.metadata.page.currentPage,
      paginate,
    };

    // const searchQuery: any = query
    //   ? {
    //       $or: [
    //         { username: { $regex: query, $options: 'i' } },
    //         { email: { $regex: query, $options: 'i' } },
    //         { blockchainId: { $regex: query, $options: 'i' } },
    //         { firstName: { $regex: query, $options: 'i' } },
    //         { lastName: { $regex: query, $options: 'i' } },
    //       ],
    //     }
    //   : {};

    // searchQuery['$and'] = [];
    // if (fromDate || toDate) {
    //   searchQuery['$and'].push({
    //     createdAt: {
    //       $gte: fromDate ? new Date(fromDate) : new Date(),
    //       $lte: toDate ? new Date(toDate) : new Date(),
    //     },
    //   });
    // }

    // if (lastLoginFromDate || lastLoginToDate) {
    //   searchQuery['$and'].push({
    //     lastLogin: {
    //       $gte: lastLoginFromDate ? new Date(lastLoginFromDate) : new Date(),
    //       $lte: lastLoginToDate ? new Date(lastLoginToDate) : new Date(),
    //     },
    //   });
    // }

    // // If the $and attribute is empty, we won't pass to $match of Mongoss query.
    // if (!searchQuery['$and'].length) delete searchQuery['$and'];

    // const matchStage = {
    //   $match: searchQuery,
    // };

    // if (sort) {
    //   for (const key in sort) {
    //     sort[key] = sort[key].toLowerCase() === 'ascending' ? 1 : -1;
    //   }
    // }

    // const pipeline = [
    //   matchStage,
    //   { $sort: sort || { createdAt: -1 } },
    //   {
    //     $project: {
    //       _id: 1,
    //       username: 1,
    //       email: 1,
    //       blockchainId: 1,
    //       firstName: 1,
    //       lastName: 1,
    //       createdAt: 1,
    //       dateJoined: 1,
    //       profilePicture: 1,
    //       rewardMultiplier: 1,
    //       lastLogin: 1,
    //       isBaseReferralEnabled: { $ifNull: ['$isBaseReferralEnabled', true] },
    //       isBuilderGenerationEnabled: {
    //         $ifNull: ['$isBuilderGenerationEnabled', true],
    //       },
    //       isBuilderReferralEnabled: {
    //         $ifNull: ['$isBuilderReferralEnabled', true],
    //       },
    //     },
    //   },
    // ];

    // const users = await aggregatePaginate(
    //   this.userModel,
    //   pipeline,
    //   Number(page),
    //   Number(limit),
    // );
    // return users;
  }

  async getAllActiveUsers() {
    return await this.userModel.find().sort({ createdAt: -1 }).exec();
  }

  async findUserByUserId(userId: Types.ObjectId) {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    return user;
  }

  async getUserByBid(bId: string): Promise<User | null> {
    return await this.userModel.findOne({ blockchainId: bId });
  }

  async updateUserReviewByBid(userBid: string): Promise<User | null> {
    return await this.userModel.findOneAndUpdate(
      { blockchainId: userBid },
      { trustpilotReviewed: true },
    );
  }

  updateUserByBid(bId: string, update: UpdateUserDto): Promise<User | null> {
    if (typeof bId !== 'string') throw new Error('Invalid bid');
    return this.userModel.findOneAndUpdate({ blockchainId: bId }, update, {
      returnDocument: 'after',
    });
  }

  async blockSupernodeUser(blockSupernodeUserDto: BlockSupernodeUserDto) {
    const user = await this.getUserByBid(blockSupernodeUserDto.userId);
    if (!user) {
      throw new NotFoundException(
        `User with blockchainId ${blockSupernodeUserDto.userId} not found`,
      );
    }
    user.isBaseReferralEnabled = !blockSupernodeUserDto.blockedFor.includes(
      SuperNodeBlockField.BASE_REFERRAL,
    );
    user.isBuilderGenerationEnabled =
      !blockSupernodeUserDto.blockedFor.includes(
        SuperNodeBlockField.BUILDER_GENERAL,
      );
    user.isBuilderReferralEnabled = !blockSupernodeUserDto.blockedFor.includes(
      SuperNodeBlockField.BUILDER_REFERRAL,
    );
    await user.save();
    return user;
  }

  async updateUserEmail(userId: string, emailUserDto: UpdateEmailUserDto) {
    const apiKey = process.env.TWO_ACCESS_FRONT_END_KEY;
    const url = new URL(process.env.TWO_ACCESS_BASE_URL);
    url.pathname = '/api/v1/profile/email/change/';
    await firstValueFrom(
      this.httpService.post(
        url.toString(),
        { email: emailUserDto.email },
        {
          headers: {
            Authorization: `Token ${apiKey}`,
          },
        },
      ),
    ).catch((e) => {
      if (e.response.status !== 400) throw new Error(e.message);
      throw new HttpException(e.response.data.detail, 400);
    });

    const user = await this.userModel.findByIdAndUpdate(
      new Types.ObjectId(userId),
      { email: emailUserDto.email },
    );
    if (!user) throw new NotFoundException('User not found.');
    return user;
  }

  async redirectToTrustpilot(trustpilotUserDto: TrustpilotUserDTO) {
    const tokenData = await this.webhookService.getTrustpilotAccessToken();
    const apiUrl = `${process.env.TRUSTPILOT_INVITATION_BASE_URL}/private/business-units/${process.env.TRUSTPILOT_BUSIESS_UNIT_ID}/invitation-links`;

    const response: AxiosResponse<any> = await firstValueFrom(
      this.httpService.post(apiUrl, trustpilotUserDto, {
        headers: {
          Authorization: `Bearer ${tokenData?.access_token}`,
        },
      }),
    ).catch((e) => {
      throw new Error(e);
    });
    return response.data;
  }
  async getAllUserAnalyticsLog({
    isToday = false,
  }: {
    isToday: boolean;
  }): Promise<UserAnalyticsLog[]> {
    const match: any = {
      deletedAt: null,
    };
    if (isToday) {
      const TodayDates = await getCurrentDay();
      match.createdAt = {
        $gte: TodayDates.startDate,
        $lte: TodayDates.endDate,
      };
    }
    return await this.userAnalyticsLogModel.find(match).exec();
  }
  async createUserAnalyticLog(
    logData: Partial<UserAnalyticsLog>,
  ): Promise<UserAnalyticsLog> {
    try {
      return await this.userAnalyticsLogModel.create(logData);
    } catch (error) {
      throw new Error(`Failed to create analytic log: ${error.message}`);
    }
  }

  async updateUserAnalyticsLog(
    log_id: Types.ObjectId,
    updateData: Partial<UserAnalyticsLog>,
  ): Promise<UserAnalyticsLog> {
    if (!log_id) {
      throw new BadRequestException('Invalid log ID provided');
    }

    const log = await this.userAnalyticsLogModel
      .findByIdAndUpdate(log_id, updateData, { new: true })
      .exec();
    if (!log) {
      throw new NotFoundException(
        `User analytics log with ID ${log_id} not found`,
      );
    }
    return log;
  }

  async updateSingleUserUpline(
    targetUserId: Types.ObjectId,
    scenario: ScenarioAnalyticsPointType,
  ): Promise<{ userId: Types.ObjectId; Job: boolean; message: string }> {
    console.log('\n🚀 Starting upline update process for user:', targetUserId);
    console.log('scenario Type:', scenario);
    const startTime = Date.now();

    const scenarioUpdate = SCENARIO_TO_UPDATE_MAP[scenario];
    console.log(scenarioUpdate, 'scenarioUpdate');

    if (!scenarioUpdate) {
      return {
        userId: targetUserId,
        Job: false,
        message: `No update configuration found for scenario: ${scenario}`,
      };
    }
    const updateFields = scenarioUpdate.updateFields;

    const userModel = this.userModel;
    console.log('✅ Models initialized', targetUserId);

    try {
      let FirstLineNode = 0;
      // Step 1: Get upline chain
      console.log('\n📊 Getting upline chain...');
      const uplineChain = [];
      let message: string = '';
      const ExtraUpdateFields: any = [];
      let currentUser = await userModel
        .findById(targetUserId)
        .select('_id email uplineId uplineBID')
        .lean()
        .exec();

      if (!currentUser) {
        return { userId: targetUserId, Job: false, message: 'User not found' };
      }
      if (!currentUser.uplineId) {
        return {
          userId: targetUserId,
          Job: false,
          message: `User ${targetUserId} has no upline ID`,
        };
      }
      // First Line Node Update --  NEW USER SCENARIO
      if (
        currentUser &&
        currentUser.uplineId &&
        scenario === ScenarioAnalyticsPointType.NEW_USER
      ) {
        FirstLineNode = 1;
        ExtraUpdateFields.push({
          updateOne: {
            filter: { _id: currentUser.uplineId },
            update: {
              $inc: {
                [UpdateAnalyticsPointType.TOTAL_FIRSTLINE_NODE]: FirstLineNode,
              },
            },
          },
        });
      }

      while (currentUser && currentUser.uplineId) {
        uplineChain.push(currentUser.uplineId);
        currentUser = await userModel
          .findById(currentUser.uplineId)
          .select('_id email uplineId uplineBID')
          .lean()
          .exec();
      }
      message = `Found ${uplineChain.length} upline users,`;
      console.log(`✅ Found ${uplineChain.length} upline users`);

      // Step 2: Process update based on type
      // const field = UPDATE_FIELD_MAP[updateType];

      console.log(`\n📊 Processing ${scenario} update...`);

      const updates = uplineChain.flatMap((uplineId) =>
        Object.entries(updateFields).map(([field, value]) => ({
          updateOne: {
            filter: { _id: uplineId },
            update: { $inc: { [field]: value } },
          },
        })),
      );

      if (updates.length > 0) {
        const result = await userModel.bulkWrite(updates);
        message =
          message + ` Successfully updated ${result.modifiedCount} Keys`;
        console.log(
          `✅ Successfully updated ${result.modifiedCount} upline users for ${updateFields}`,
        );
      }

      if (ExtraUpdateFields.length > 0) {
        const result = await userModel.bulkWrite(ExtraUpdateFields);
        message =
          message +
          ` Successfully updated FirstLine ${result.modifiedCount} Keys`;
        console.log(
          `✅ Successfully updated Extra ${result.modifiedCount} upline users for ${updateFields}`,
        );
      }

      const executionTime = ((Date.now() - startTime) / 1000).toFixed(2);
      message = message + ` and ${executionTime} seconds to complete`;

      return {
        userId: targetUserId,
        Job: true,
        message: message,
      };
    } catch (error) {
      console.error('\n❌ Error occurred:', error);
      return { userId: targetUserId, Job: false, message: error.message };
    }
  }
  async updateMembership(
    userId: mongoose.Schema.Types.ObjectId | Types.ObjectId,
    membership_expiry: Date,
    isMembership: boolean,
    subscription_type: MemberShipSubscriptionType,
  ): Promise<any> {
    const updateUser = await this.userModel.updateOne(
      { _id: userId },
      {
        membership_expiry: membership_expiry,
        isMembership: isMembership,
        subscription_type: subscription_type,
      },
    );
    return updateUser;
  }

  async getSignInUser(
    bId: string,
    email: string,
    username?: string,
    firstName?: string,
    lastName?: string,
    profilePicture?: string,
  ) {
    try {
      const user = await this.userModel.findOne({ blockchainId: bId });
      if (user) {
        user.lastLogin = new Date();
        if (username !== '' && !user.username && username) {
          user.username = username;
        }

        if (email !== '' && user.email !== email) {
          user.email = email;
        }

        if (firstName !== '' && user.firstName !== firstName) {
          user.firstName = firstName;
        }
        if (lastName !== '' && user.lastName !== lastName) {
          user.lastName = lastName;
        }
        await user.save();
        return user;
      }

      const twoAccessDataSource =
        await this.twoAccessService.findByIdTwoAccessUsers(bId);

      if (twoAccessDataSource && twoAccessDataSource.length > 0) {
        const membershipExpiry = await getDateOrNull(
          twoAccessDataSource[0]?.membership_expiry,
        );
        const isMembership = await isMembershipValid(
          twoAccessDataSource[0]?.membership_expiry,
        );

        const createUser: any = {};
        createUser.email = twoAccessDataSource[0]?.email;
        createUser.uplineBID = twoAccessDataSource[0]?.upline_id || '';
        createUser.firstName = twoAccessDataSource[0]?.first_name || '';
        createUser.lastName = twoAccessDataSource[0]?.last_name || '';
        createUser.username = twoAccessDataSource[0]?.username || '';
        createUser.referralCode = twoAccessDataSource[0]?.referral_code || '';
        createUser.membership_expiry = membershipExpiry;
        createUser.isMembership = isMembership;
        createUser.blockchainId = bId;
        createUser.lastLogin = new Date();

        if (twoAccessDataSource[0]?.upline_id) {
          const uplineUser = await this.userModel.findOne({
            blockchainId: twoAccessDataSource[0].upline_id,
          });
          if (uplineUser) {
            createUser.uplineId = uplineUser._id;
            createUser.depth = 1 + uplineUser?.depth || 0;
          }
        }

        const newUser = await this.userModel.create(createUser);

        if (newUser) {
          // ANALYTICS NEW_USER
          const analytic = await this.createUserAnalyticLog({
            userId: newUser._id as Types.ObjectId,
            scenario: ScenarioAnalyticsPointType.NEW_USER,
            status: StatusAnalyticsPointType.PENDING,
          });
          console.log(analytic, '------analytic---4----', bId);
        }
        return newUser;
      } else {
        const newUser = await this.userModel.create({
          blockchainId: bId,
          email,
          username,
          firstName,
          lastName,
          profilePicture,
          lastLogin: new Date(),
        });
        return newUser;
      }
    } catch (error) {
      console.log(error);
    }
  }

  async createUserFromTwoAccess(
    bId: string,
    email: string = '',
    username: string = '',
    firstName: string = '',
    lastName: string = '',
    profilePicture: string = '',
  ): Promise<any> {
    try {
      const twoAccessDataSource =
        await this.twoAccessService.findByIdTwoAccessUsers(bId);

      if (!twoAccessDataSource || twoAccessDataSource.length === 0) {
        const newUser = await this.userModel.create({
          blockchainId: bId,
          email,
          username,
          firstName,
          lastName,
          profilePicture,
          lastLogin: new Date(),
        });
        return newUser;
      }

      const userData = twoAccessDataSource[0];
      const membershipExpiry = await getDateOrNull(userData?.membership_expiry);
      const isMembership = await isMembershipValid(userData?.membership_expiry);

      const createUser: any = {
        email: userData?.email,
        uplineBID: userData?.upline_id || '',
        firstName: userData?.first_name || '',
        lastName: userData?.last_name || '',
        username: userData?.username || '',
        referralCode: userData?.referral_code || '',
        membership_expiry: membershipExpiry,
        document_country: userData?.document_country || null,
        isMembership: isMembership,
        blockchainId: bId,
        lastLogin: new Date(),
      };

      // Handle upline user if exists
      if (userData?.upline_id) {
        const uplineUser = await this.userModel.findOne({
          blockchainId: userData.upline_id,
        });

        if (uplineUser) {
          createUser.uplineId = uplineUser._id;
          createUser.depth = 1 + (uplineUser?.depth || 0);
        }
      }

      const newUser = await this.userModel.create(createUser);

      if (newUser) {
        // ANALYTICS NEW_USER
        const analytic = await this.createUserAnalyticLog({
          userId: newUser._id as Types.ObjectId,
          scenario: ScenarioAnalyticsPointType.NEW_USER,
          status: StatusAnalyticsPointType.PENDING,
        });
      }

      return newUser;
    } catch (error) {
      console.error('Error creating user from TwoAccess:', error);
      throw error;
    }
  }

  async userVerificationSteps(userId) {
    const machines = await this.machineModel.find({
      user: new Types.ObjectId(userId),
    });

    // Step 1: Check if the user has any machine
    const step1 = {
      name: 'Purchase',
      status: machines.length > 0, // True if user has at least one machine
    };

    // Step 2: Check if the user has staked on any machine
    const validMachines = machines.filter((m: any) => m._id);

    const stakes = await this.machineStakeModel.find({
      user: new Types.ObjectId(userId),
      machine: {
        $in: machines.filter((m: any) => m._id),
      },
    });

    const validStakes = stakes.filter((s: any) => s.tokenAmount > 0);

    const step2 = {
      name: 'Stake',
      status: validStakes.length > 0, // True if user has staked on at least one machine
    };

    // Step 3: Check if every machine has `shipmentStatus` set to false
    const allMachinesShipmentFalse = machines.every(
      (m: any) => m?.shipmentStatus === 'delivered',
    );
    const step4 = {
      name: 'Shipment',
      status: allMachinesShipmentFalse, // True if all machines have shipmentStatus: false
    };

    // Step 4: Check if all machines have `autoCompound` true
    const allMachinesAutoCompoundTrue = machines.filter(
      (m) => m.autoCompound === true,
    );

    console.log({ allMachinesAutoCompoundTrue });
    const step3 = {
      name: 'Auto-Compound',
      status: allMachinesAutoCompoundTrue.length > 0, // True if all machines have autoCompound: true
    };

    const superNodeTrx = await this.snBonusTransaction.find({
      user: new Types.ObjectId(userId),
      receivable: true,
    });

    const step5 = {
      name: 'SuperNode',
      status: superNodeTrx.length > 0, // True if all machines have autoCompound: true
    };

    return [step1, step2, step3, step4, step5];
  }
}
