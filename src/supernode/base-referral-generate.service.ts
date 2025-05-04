import { Inject, Injectable } from '@nestjs/common';
import { Model, Types, ObjectId } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { TransactionFlow } from '../wallet/enums/transcation.flow.enum';
import { SupernodeService } from './supernode.service';
import { UsersService } from '../users/users.service';
import { SNBonusTransaction } from './schemas/sn-bonus-transaction.schema';
import { SN_BONUS_TYPE } from './enums/sn-bonus-type.enum';
import { LostReason } from './enums/sn-lost-reason.enum';
import { CacheService } from '../cache/cache.service';
import { CACHE_TYPE } from '../cache/Enums/cache.enum';
import { CloudKMachine } from '../cloud-k/schemas/cloudk-machine.schema';
import { BuilderReferralService } from './builder-referral.service';
import { BuilderGenerationalRewardService } from './builder-generation.service';
import { CloudKRewardService } from '../cloud-k/cloudk-reward.service';
import { AdminSupernodeService } from './admin.supernode.service';
import { MembershipStatus } from '../global/enums/Membership.status.enum';
import { TwoAccessService } from '../two-access/two-access.service';

@Injectable()
export class BaseReferralRewardService {
  constructor(
    @InjectModel(SNBonusTransaction.name)
    private readonly bonusTrxModel: Model<SNBonusTransaction>,
    private supernodeService: SupernodeService,
    private userService: UsersService,
    private cacheService: CacheService,
    private builderReferralService: BuilderReferralService,
    private builderGenerationRewardService: BuilderGenerationalRewardService,
    private adminSupernodeService: AdminSupernodeService,
    private readonly twoAccessService: TwoAccessService,
  ) {}

  async getCachedUserActiveStatus(
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
    const cached: {
      isActive: boolean;
      lostReasons: LostReason[];
      availableGask: number;
      bonusAmount: number;
    } = await this.cacheService.getCacheUser({
      type: CACHE_TYPE.ACTIVE_BR_USER_ELIGIBLE,
      user: userId,
    });

    if (!cached) {
      const userQualificationData =
        await this.supernodeService.checkUserActiveStatus(
          userId,
          isActiveNode,
          bonusAmount,
          bonusType,
          firstLevelNodes,
          user,
        );
      await this.cacheService.setCacheUser({
        type: CACHE_TYPE.ACTIVE_BR_USER_ELIGIBLE,
        user: userId,
        data: userQualificationData,
      });
      return userQualificationData;
    }
    return cached;
  }

  async updateCachedUserActiveStatus(
    userId: Types.ObjectId,
    isActiveNode: boolean,
    bonusAmount: number,
    bonusType: SN_BONUS_TYPE,
    firstLevelNodes: number, // only for base referral
  ): Promise<{
    isActive: boolean;
    lostReasons: LostReason[];
    availableGask: number;
    bonusAmount: number;
  }> {
    // const cached = await this.cacheService.getCacheUser({
    //   type: CACHE_TYPE.ACTIVE_USER_ELIGIBLE,
    //   user: userId,
    // });
    // if (cached) {
    //   await this.cacheService.deleteUserCache({
    //     type: CACHE_TYPE.ACTIVE_USER_ELIGIBLE,
    //     user: userId,
    //   });
    // }

    const userQualificationData =
      await this.supernodeService.checkUserActiveStatus(
        userId,
        isActiveNode,
        bonusAmount,
        bonusType,
        firstLevelNodes,
      );

    // await this.cacheService.setCacheUser({
    //   type: CACHE_TYPE.ACTIVE_USER_ELIGIBLE,
    //   user: userId,
    //   data: userQualificationData,
    // });

    return userQualificationData;
  }

  async generateBaseReferralReward(
    rewardItem: any,
    baseReferralSettings: any,
    userHierarchyData: any,
  ) {
    const {
      user,
      totalPrice,
      cloudKTransaction,
      tokenPrice,
      machine,
      job,
      _id,
    } = rewardItem;

    const userId = new Types.ObjectId(user._id);
    const amount: number = totalPrice;
    const cloudkTrx: Types.ObjectId = new Types.ObjectId(cloudKTransaction);
    const currentPrice: number = tokenPrice;
    const machineId: Types.ObjectId = new Types.ObjectId(machine);
    const jobId: Types.ObjectId = job ? new Types.ObjectId(job) : undefined;
    const reward: Types.ObjectId = new Types.ObjectId(_id);

    // Check if userHierarchyData and userHierarchyData.members are defined
    if (!userHierarchyData || !userHierarchyData.members) {
      console.log(
        `User hierarchy data or members not provided for user ${userId}`,
      );
      return;
    }

    const totalLevels = Number(baseReferralSettings.setting.totalLevels);
    let currentLevel = 1;
    // let currentUpline = null;
    // let currentUserId = userId;
    let actualLevel = 1;

    const members = userHierarchyData.members.sort(
      (a, b) => b.depth_level - a.depth_level,
    );

    for (const member of members) {
      if (currentLevel > totalLevels) break;
      console.log('user', userId);
      console.log('actualLevel', actualLevel);
      console.log('currentLevel', currentLevel);

      let currentUpline = await this.cacheService.getCacheUser({
        type: CACHE_TYPE.ALL_USER_SUPERNODE,
        user: member?.id,
      });

      if (!currentUpline) {
        console.log('No cache data found for user ID: ', member?.id);
        currentUpline =
          await this.userService.findUserByBlockchainIdWithProducts(member?.id);

        await this.cacheService.setCacheUser({
          type: CACHE_TYPE.ALL_USER_SUPERNODE,
          user: member.id,
          data: currentUpline,
        });
      }

      if (currentUpline && typeof currentUpline._id === 'string') {
        currentUpline._id = new Types.ObjectId(currentUpline._id);
      }
      // return;
      const find = baseReferralSettings.levels.find(
        (lv) => lv.level === currentLevel,
      );
      if (!find) {
        currentLevel++;
        actualLevel++;
        continue;
      }
      const { percentage, firstLevelNodes: minfirstLevelNodes } = find;
      baseReferralSettings.levels.find((lv) => lv.level === currentLevel);

      let rewardAmount = amount * (percentage / 100);

      if (!currentUpline.isBaseReferralActive) {
        await this.bonusTrxModel.create({
          user: currentUpline._id,
          fromUser: userId,
          type: SN_BONUS_TYPE.BASE_REFERRAL,
          amount: rewardAmount,
          tokenAmount: rewardAmount / currentPrice,
          tokenPrice: currentPrice,
          rewardData: { amount, percentage, currentLevel, actualLevel },
          receivable: false,
          lostReason: LostReason.INACTIVE_USER,
          gaskRemaining: 0,
          loss: rewardAmount,
          lossInToken: rewardAmount / currentPrice,
          cloudkTrx,
          job: jobId,
          reward,
          meta: {
            reason: LostReason.INACTIVE_USER,
          },
          note: 'New Cap Logic Implementation with cache',
        });
        // currentUserId = currentUpline._id;
        actualLevel++;
        continue;
      }

      const userQualificationData = await this.getCachedUserActiveStatus(
        currentUpline._id,
        currentUpline.isBaseReferralActive,
        rewardAmount,
        SN_BONUS_TYPE.BASE_REFERRAL,
        minfirstLevelNodes,
        currentUpline,
      );

      // Check if the membership status is expired
      if (member.is_membership === MembershipStatus.EXPIRED) {
        await this.bonusTrxModel.create({
          user: currentUpline._id,
          fromUser: userId,
          type: SN_BONUS_TYPE.BASE_REFERRAL,
          amount: rewardAmount,
          tokenAmount: rewardAmount / currentPrice,
          tokenPrice: currentPrice,
          rewardData: { amount, percentage, currentLevel, actualLevel },
          receivable: false,
          lostReason: LostReason.MEMBERSHIP_EXPIRED,
          gaskRemaining: userQualificationData?.availableGask,
          loss: rewardAmount,
          lossInToken: rewardAmount / currentPrice,
          // rewardLevel: currentLevel,
          cloudkTrx,
          job: jobId,
          reward,
          meta: {
            reason: LostReason.MEMBERSHIP_EXPIRED,
          },
          note: 'New Cap Logic Implementation with cache',
        });
        // currentUserId = currentUpline._id;
        actualLevel++;
        continue;
      }

      if (userQualificationData?.isActive) {
        rewardAmount = userQualificationData?.bonusAmount;
        const createdBonusTrx = await this.bonusTrxModel.create({
          user: currentUpline._id,
          fromUser: userId,
          type: SN_BONUS_TYPE.BASE_REFERRAL,
          amount: rewardAmount,
          tokenAmount: rewardAmount > 0 ? rewardAmount / currentPrice : 0,
          tokenPrice: currentPrice,
          receivable: true,
          gaskRemaining: userQualificationData.availableGask - rewardAmount,
          loss: 0,
          rewardData: { amount, percentage, currentLevel, actualLevel },
          cloudkTrx,
          job: jobId,
          reward,
          note: 'New Cap Logic Implementation with cache',
        });
        await this.supernodeService.createGasKService({
          amount: rewardAmount,
          flow: TransactionFlow.OUT,
          user: currentUpline._id,
          machine: machineId,
          from: 'base-referral',
          reward: reward,
        });

        // await this.supernodeService.createOrUpdateBRRewards({
        //   user: currentUpline._id,
        //   rewardValue: rewardAmount > 0 ? rewardAmount / currentPrice : 0,
        //   level: currentLevel,
        //   date: new Date(),
        // });

        // update the catche

        // await this.updateCachedUserActiveStatus(
        //   currentUpline._id,
        //   currentUpline.isSupernodeActive,
        //   rewardAmount,
        //   SN_BONUS_TYPE.BASE_REFERRAL,
        //   minfirstLevelNodes,
        // );

        // Generate Builder Referral rewards
        const createdBonusTrxId = createdBonusTrx._id as Types.ObjectId;
        // if (process.env.NODE_ENV == 'qa-server') {
        //   await this.builderReferralService.generateBuilderReferralReward(
        //     currentUpline._id,
        //     userId,
        //     SN_BONUS_TYPE.BASE_REFERRAL,
        //     rewardAmount,
        //     cloudkTrx,
        //     currentPrice,
        //     machineId,
        //     createdBonusTrxId,
        //     reward,
        //   );
        // }
        currentLevel++;
        actualLevel++;
      } else {
        if (
          userQualificationData &&
          userQualificationData?.lostReasons?.length === 0
        ) {
          await this.bonusTrxModel.create({
            user: currentUpline._id,
            fromUser: userId,
            type: SN_BONUS_TYPE.BASE_REFERRAL,
            amount: rewardAmount,
            tokenAmount: rewardAmount / currentPrice,
            tokenPrice: currentPrice,
            rewardData: { amount, percentage, currentLevel, actualLevel },
            receivable: false,
            lostReason: LostReason.INACTIVE_USER,
            gaskRemaining: userQualificationData?.availableGask,
            loss: rewardAmount,
            lossInToken: rewardAmount / currentPrice,
            // rewardLevel: currentLevel,
            cloudkTrx,
            job: jobId,
            reward,
            meta: {
              reason: LostReason.INACTIVE_USER,
            },
            note: 'New Cap Logic Implementation with cache',
          });
          // currentUserId = currentUpline._id;
          actualLevel++;
          continue;
        }
        for (const lostReasons of userQualificationData.lostReasons) {
          await this.bonusTrxModel.create({
            fromUser: userId,
            user: currentUpline._id,
            type: SN_BONUS_TYPE.BASE_REFERRAL,
            amount: rewardAmount,
            tokenAmount: rewardAmount / currentPrice,
            tokenPrice: currentPrice,
            receivable: false,
            lostReason: lostReasons.reason,
            gaskRemaining: userQualificationData.availableGask,
            loss: rewardAmount,
            lossInTokens: rewardAmount / currentPrice,
            // rewardLevel: currentLevel,
            rewardData: { amount, percentage, currentLevel, actualLevel },

            cloudkTrx,
            job: jobId,
            reward,
            meta: lostReasons.meta,
            note: 'New Cap Logic Implementation with cache',
          });
        }
      }
      // currentUserId = currentUpline._id;
      actualLevel++;
    }
    return true;
  }
}
