import { HttpException, Injectable } from '@nestjs/common';
import { CloudKService } from '../cloud-k/cloud-k.service';
import { UsersService } from '../users/users.service';
import { Model, Types } from 'mongoose';
import {
  CLOUDK_MACHINE_STATUS,
  CloudKMachine,
} from '../cloud-k/schemas/cloudk-machine.schema';
import { InjectModel } from '@nestjs/mongoose';
import { BuilderReferralData } from './schemas/builder-referral-data.schema';
import { BuilderReferralSetting } from './schemas/builder-referral-settings.schema';
import { MONTH_SHORT_NAMES } from '../utils/constants';
import { SN_BONUS_TYPE } from './enums/sn-bonus-type.enum';
import { SNBonusTransaction } from './schemas/sn-bonus-transaction.schema';
import { SupernodeService } from './supernode.service';
import { TransactionFlow } from '../wallet/enums/transcation.flow.enum';
import { User } from '../users/schemas/user.schema';
import { LostReason } from './enums/sn-lost-reason.enum';

@Injectable()
export class BuilderReferralService {
  constructor(
    @InjectModel(CloudKMachine.name)
    public machineModel: Model<CloudKMachine>,
    @InjectModel(BuilderReferralData.name)
    private builderReferralDataModel: Model<BuilderReferralData>,
    @InjectModel(BuilderReferralSetting.name)
    private builderReferralSettingModel: Model<BuilderReferralSetting>,
    private readonly cloudKService: CloudKService,
    private userService: UsersService,
    private supernodeService: SupernodeService,
    @InjectModel(SNBonusTransaction.name)
    private readonly bonusTrxModel: Model<SNBonusTransaction>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  async setBuilderReferralEligibility(userId: Types.ObjectId) {
    const setting = await this.builderReferralSettingModel
      .findOne({ isActive: true })
      .exec();

    const bonusThreshold = setting?.bonusThresholdPercentage ?? 30;
    const fiftyRuleMultiplier = setting?.fiftyPercentRuleMultiplier ?? 2;
    const teamCollateral = await this.calculateTeamCollatoral(
      userId,
      fiftyRuleMultiplier,
    );
    let totalCollatoral = teamCollateral;

    const year = new Date().getFullYear();
    const monthName = new Date().toLocaleString('default', { month: 'short' });
    const yearMonth = `${year}-${monthName}`;

    const previousHighestCollatoralData =
      await this.getPreviousHighestCollatoral(userId);
    const previousHighestCollatoral =
      previousHighestCollatoralData.totalCollatoral;
    const highestCollatoralYearMonth = previousHighestCollatoralData.yearMonth;

    // * Check if totalCollatoral is at least collateralThreshold% greater than previousHighestCollatoral
    let bonusEligibility = false;
    let bonusMultiplier = 1;
    if (
      previousHighestCollatoral > 0 &&
      totalCollatoral > previousHighestCollatoral * (1 + bonusThreshold / 100)
    ) {
      bonusEligibility = true;
      bonusMultiplier = setting?.bonusMultiplier ?? 2;
    }
    await this.userService.updateBuilderReferralBonusEligibility(
      userId,
      bonusMultiplier,
    );

    const filter = {
      user: userId,
      yearMonth: yearMonth,
    };

    const update = {
      totalCollatoral: totalCollatoral,
      bonusEligibility: bonusEligibility,
      bonusMultiplier: bonusMultiplier,
      prevHighestCollateral: previousHighestCollatoral,
      prevHighestCollYearMonth: highestCollatoralYearMonth,
    };

    const options = {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    };

    return await this.builderReferralDataModel.findOneAndUpdate(
      filter,
      update,
      options,
    );
  }

  async calculateTeamCollatoral(
    userId: Types.ObjectId,
    fiftyRuleMultiplier: number,
  ) {
    const userCollatoralArray = [];
    const userFirstLineUsers = await this.userService.getFirstLineUsers(userId);

    for (const firstLineUser of userFirstLineUsers) {
      let totalCollatoral = 0;
      if (!firstLineUser.user) {
        continue;
      }
      const userObjectId = (firstLineUser.user as any)._id as Types.ObjectId;
      const firstLineUserCollateral =
        await this.getUserTotalCollateral(userObjectId);
      totalCollatoral += firstLineUserCollateral;
      const teamMembers =
        await this.userService.getTeamMembersByUser(userObjectId);
      for (const teamMember of teamMembers) {
        const teamMemberCollateral = await this.getUserTotalCollateral(
          teamMember._id,
        );
        totalCollatoral += teamMemberCollateral;
      }
      userCollatoralArray.push({
        user: userObjectId,
        totalCollatoral: totalCollatoral,
      });
    }
    let highestCollatoralValue = 0;
    let highestIndex = -1;

    for (let i = 0; i < userCollatoralArray.length; i++) {
      if (userCollatoralArray[i].totalCollatoral > highestCollatoralValue) {
        highestCollatoralValue = userCollatoralArray[i].totalCollatoral;
        highestIndex = i;
      }
    }

    const userCollatoralArrayWithoutHighest = userCollatoralArray.filter(
      (_, index) => index !== highestIndex,
    );

    const totalCollateralWithoutHighest =
      userCollatoralArrayWithoutHighest.reduce(
        (total, user) => total + user.totalCollatoral,
        0,
      );

    let teamCollateral = 0;
    if (
      totalCollateralWithoutHighest > 0 &&
      highestCollatoralValue > totalCollateralWithoutHighest
    ) {
      teamCollateral = fiftyRuleMultiplier * totalCollateralWithoutHighest;
    } else {
      teamCollateral = highestCollatoralValue + totalCollateralWithoutHighest;
    }
    return teamCollateral;
  }

  async getUserTotalCollateral(userId: Types.ObjectId): Promise<number> {
    let totalCollateral = 0;
    const machinesData = await this.getUserMachinesData(userId);
    for (const machine of machinesData) {
      const machineCollateral = machine?.collatoral || 0;
      totalCollateral += machineCollateral;
    }
    return totalCollateral;
  }

  async getUserMachinesData(userId: Types.ObjectId) {
    const machines = await this.machineModel
      .find({
        user: userId,
        $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
      })
      .sort({ createdAt: -1 })
      .populate('stakeToken');
    return machines;
  }

  async getPreviousHighestCollatoral(userId: Types.ObjectId) {
    const now = new Date();
    const year = now.getFullYear();
    const monthName = now.toLocaleString('default', { month: 'short' });
    const currentYearMonth = `${year}-${monthName}`;
    const result = await this.builderReferralDataModel
      .aggregate([
        {
          $match: {
            user: userId,
            yearMonth: { $ne: currentYearMonth },
          },
        },
        { $sort: { totalCollatoral: -1 } },
        { $limit: 1 },
        { $project: { _id: 0, totalCollatoral: 1, yearMonth: 1 } },
      ])
      .exec();
    return result.length > 0
      ? {
          totalCollatoral: result[0].totalCollatoral,
          yearMonth: result[0].yearMonth,
        }
      : { totalCollatoral: null, yearMonth: null };
  }

  async getBuilderReferralGrowth(userId: Types.ObjectId) {
    const year = new Date().getFullYear();

    const result = await this.builderReferralDataModel.aggregate([
      {
        $match: {
          user: userId,
          yearMonth: { $regex: `^${year}-` },
        },
      },
      {
        $group: {
          _id: {
            month: { $substr: ['$yearMonth', 5, 3] },
          },
          totalAmount: { $sum: '$totalCollatoral' },
          bonusEligibility: { $max: '$bonusEligibility' },
        },
      },
      {
        $sort: { '_id.month': 1 },
      },
      {
        $project: {
          _id: 0,
          month: '$_id.month',
          amount: '$totalAmount',
          eligibility: {
            $ifNull: ['$bonusEligibility', false],
          },
        },
      },
    ]);

    const resultMap = new Map(
      result.map((item) => [
        item.month,
        { amount: item.amount, eligibility: item.eligibility },
      ]),
    );

    const finalResult = MONTH_SHORT_NAMES.map((month) => {
      const data = resultMap.get(month) || { amount: 0, eligibility: false };
      return {
        x: month.toUpperCase(),
        y: data.amount,
        eligibility: data.eligibility,
      };
    });

    return finalResult;
  }

  async genarateBuilderRefferalEligibility() {
    const today = new Date();
    try {
      const machines = await this.machineModel.find({
        status: CLOUDK_MACHINE_STATUS.ACTIVE,
        endDate: { $gte: new Date() },
        startDate: { $lt: today },
        $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
      });

      for (const machine of machines) {
        await this.setBuilderReferralEligibility(machine.user);
      }
      return 'All users builder referral data processed successfully';
    } catch (error) {
      console.error('An error occurred while processing users:', error);
      return 'Failed to process users';
    }
  }

  async generateBuilderReferralReward(
    user: Types.ObjectId,
    fromUser: Types.ObjectId,
    baseSnRrewardType: string,
    rewardAmount: number,
    cloudkTrx: Types.ObjectId,
    currentPrice: number,
    machineId: Types.ObjectId,
    createdBonusTrxId: Types.ObjectId,
    reward?: Types.ObjectId,
  ) {
    const userData = await this.userModel.findById(user).exec();
    let rewardMultiplier = 1;
    let builderReferRewardAmount = 0;
    if (user) {
      rewardMultiplier = userData.rewardMultiplier ?? 1;
      if (rewardMultiplier > 1) {
        builderReferRewardAmount = rewardAmount * (rewardMultiplier - 1);
      } else {
        return;
      }
    }
    let currentGasKValue =
      (await this.supernodeService.fetchGasKService(user)) ?? 0;

    if (
      userData?.isBuilderReferralEnabled === false ||
      userData?.isBlocked === true
    ) {
      await this.bonusTrxModel.create({
        user: user,
        fromUser: fromUser,
        type: SN_BONUS_TYPE.BUILDER_REFERRAL,
        amount: builderReferRewardAmount,
        tokenAmount:
          builderReferRewardAmount > 0
            ? builderReferRewardAmount / currentPrice
            : 0,
        tokenPrice: currentPrice,
        receivable: false,
        gaskRemaining: currentGasKValue - builderReferRewardAmount,
        lostReason:
          userData?.isBlocked === true
            ? LostReason.USER_BLOCKED
            : LostReason.BLOCKED_FOR_BUILDER_REFERRAL,
        loss: builderReferRewardAmount,
        lossInToken:
          builderReferRewardAmount > 0
            ? builderReferRewardAmount / currentPrice
            : 0,
        rewardData: {},
        cloudkTrx,
        builderReferralData: {
          rewardMultiplier: rewardMultiplier,
          baseSnRrewardType: baseSnRrewardType,
          baseSnRrewardTrxId: createdBonusTrxId,
        },
      });
    }

    await this.bonusTrxModel.create({
      user: user,
      fromUser: fromUser,
      type: SN_BONUS_TYPE.BUILDER_REFERRAL,
      amount: builderReferRewardAmount,
      tokenAmount:
        builderReferRewardAmount > 0
          ? builderReferRewardAmount / currentPrice
          : 0,
      tokenPrice: currentPrice,
      receivable: true,
      gaskRemaining: currentGasKValue - builderReferRewardAmount,
      loss: builderReferRewardAmount,
      lossInToken:
        builderReferRewardAmount > 0
          ? builderReferRewardAmount / currentPrice
          : 0,
      rewardData: {},
      cloudkTrx,
      builderReferralData: {
        rewardMultiplier: rewardMultiplier,
        baseSnRrewardType: baseSnRrewardType,
        baseSnRrewardTrxId: createdBonusTrxId,
      },
    });
    await this.supernodeService.createGasKService({
      amount: builderReferRewardAmount,
      flow: TransactionFlow.OUT,
      user: user,
      machine: machineId,
      from: SN_BONUS_TYPE.BUILDER_REFERRAL,
      reward: reward,
    });
  }
}
