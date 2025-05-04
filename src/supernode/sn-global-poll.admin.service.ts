import { InjectConnection, InjectModel } from '@nestjs/mongoose';

import mongoose, {
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
import { POOL_TYPE, STATUS_TYPE } from './enums/sngp-type.enum';
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

@Injectable()
export class SNGlogbalPollAdminService {
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

  //Get Country Active Pools/ Static Data
  async getSngpList() {
    const sngpList = await this.sngpModel.findOne({
      type: POOL_TYPE.SNGP,
      status: STATUS_TYPE.ACTIVE,
      deletedAt: null,
    });
    return sngpList;
  }

  async getCountryPools(paginateDTO) {
    const { page, limit, query, fromDate, toDate, type } = paginateDTO;

    const matchConditions: any[] = [
      {
        deletedAt: { $eq: null },
        type: POOL_TYPE.COUNTRY_POOL,
      },
    ];

    if (query) {
      matchConditions.push({
        $or: [{ name: { $regex: query, $options: 'i' } }],
      });
    }
    if (type) {
      matchConditions.push({
        $or: [{ status: type }],
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
        $project: {
          name: '$name',
          startDate: '$startDate',
          totalPoints: '$totalPoints',
          rewardAmount: '$rewardAmount',
          remainingPoints: '$remainingPoints',
          createdAt: '$createdAt',
          status: '$status',
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

  //Get Country Upcoming Pools/ Static Data
  async getDistributedList(PaginateDTO: PaginateDTO) {
    const { fromDate, toDate, status, page, limit } = PaginateDTO;

    const matchConditions: any[] = [
      {
        status: { $eq: DISTRIBUTION_STATUS_TYPE.COMPLETED },
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

    const pipeline: PipelineStage[] = [
      { $match: matchConditions.length ? { $and: matchConditions } : {} },
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
          'sngp.type': POOL_TYPE.COUNTRY_POOL,
          'sngp.deletedAt': null,
        },
      },
      {
        $lookup: {
          from: 'admins',
          localField: 'admin',
          foreignField: '_id',
          as: 'admin',
        },
      },
      {
        $unwind: {
          path: '$admin',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $project: {
          sngp: '$sngp',
          drawDate: 1,
          noOfParticipants: 1,
          status: 1,
          adminFirstName: '$admin.firstName',
          adminLastName: '$admin.lastName',
          adminEmail: '$admin.email',
        },
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

  async findFirstSngp() {
    return await this.sngpModel
      .findOne({ name: 'sngp' })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findAllSngpDistributed() {
    const sngpDistributionData = await this.sngpDistributionModel
      .aggregate([
        {
          $match: {
            sngp: { $exists: true },
            status: 'completed',
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
          $match: {
            'sngpDetails.0': { $exists: true },
          },
        },
        {
          $project: {
            sngpDetails: 0,
          },
        },
      ])
      .exec();

    if (sngpDistributionData.length > 0) {
      for (const item of sngpDistributionData) {
        const count = await this.getParticipantSngpCount(item.sngp);
        item.noOfParticipants = count;
      }
    }
    return sngpDistributionData;
  }

  async getParticipantSngpCount(sngp) {
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

  async findAllSngpDistributions() {
    const sngp = await this.findFirstSngp();

    return await this.userSngpModel
      .find({ sngp: sngp?._id })
      .populate('user')
      .exec();
  }
}
