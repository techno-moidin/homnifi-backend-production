import { Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { SupernodeService } from './supernode.service';
import { UsersService } from '../users/users.service';
import { TokenService } from '../token/token.service';
import { LostReason } from './enums/sn-lost-reason.enum';
import { SNBonusTransaction } from './schemas/sn-bonus-transaction.schema';
import { SN_BONUS_TYPE } from './enums/sn-bonus-type.enum';
import { TransactionFlow } from '../wallet/enums/transcation.flow.enum';
import {
  CheckEligibilityStatusDto,
  CreateTransactionDto,
  MatchingBonusTransactionDto,
} from './dto/builder-generation.dto';
import { CacheService } from '../cache/cache.service';
import { CACHE_TYPE } from '../cache/Enums/cache.enum';
import { BuilderReferralService } from './builder-referral.service';
import { AdminSupernodeService } from './admin.supernode.service';
import { MembershipStatus } from '../global/enums/Membership.status.enum';
import { TwoAccessService } from '../two-access/two-access.service';

@Injectable()
export class BuilderGenerationalRewardService {
  constructor(
    @InjectModel(SNBonusTransaction.name)
    private readonly bonusTrxModel: Model<SNBonusTransaction>,
    @InjectConnection() private readonly connection: Connection,
    private supernodeService: SupernodeService,
    private userService: UsersService,
    private cacheService: CacheService,
    private builderReferralService: BuilderReferralService,
    private adminSupernodeService: AdminSupernodeService,
    private readonly twoAccessService: TwoAccessService,
  ) {}

  async generateBuilderGenerationReward(
    rewardItem: any,
    builderGenerationSettings: any,
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

    const userId: string = user?._id.toString();
    const amount: number = totalPrice;
    const cloudkTrx: Types.ObjectId = new Types.ObjectId(cloudKTransaction);
    const currentPrice: number = tokenPrice;
    const machineId: Types.ObjectId = new Types.ObjectId(machine);
    const jobId: Types.ObjectId = job ? new Types.ObjectId(job) : undefined;

    if (!builderGenerationSettings) {
      return;
    }

    //Global values
    const settings = builderGenerationSettings.levels;
    const matchingBonus = builderGenerationSettings.setting.matchingBonus;
    const highestPercentage = builderGenerationSettings.levels[0].percentage;
    const baseUser = userId;
    let basePercentage = 0;
    let currentPercentage = 0;
    let currentUserId = userId;
    let isFirstLevel = true;
    let isMachingBonusEnabled = true; // changable according to the functionality
    let previousLevelRewardAmount = 0;
    let currentLevel = 0;
    let currentUpline = null;
    let currentUplineData = null;
    let currentGasKValue = 0;

    // Check if userHierarchyData and userHierarchyData.members are defined
    if (!userHierarchyData || !userHierarchyData.members) {
      console.log(
        `User hierarchy data or members not provided for user ${userId}`,
      );
      return;
    }

    const members = userHierarchyData.members.sort(
      (a, b) => b.depth_level - a.depth_level,
    );

    for (const member of members) {
      if (basePercentage > highestPercentage) break;
      currentLevel = currentLevel + 1;
      // caching the upline user data

      let currentUpline = await this.cacheService.getCacheUser({
        type: CACHE_TYPE.ALL_USER_SUPERNODE,
        user: member.id,
      });

      if (!currentUpline) {
        currentUpline =
          await this.userService.findUserByBlockchainIdWithProducts(member.id);
        if (!currentUpline) {
          currentUpline = null;
          break;
        }
        await this.cacheService.setCacheUser(
          {
            type: CACHE_TYPE.ALL_USER_SUPERNODE,
            user: member.id,
            data: currentUpline,
          },
          500,
        );
      }

      if (currentUpline && typeof currentUpline._id === 'string') {
        currentUpline._id = new Types.ObjectId(currentUpline._id);
      }
      // fetch gasK value
      const gasKVal = await this.supernodeService.fetchGasKService(
        currentUpline._id,
      );

      if (currentUpline.is_membership === MembershipStatus.EXPIRED) {
        const txnData: CreateTransactionDto = {
          user: currentUpline._id,
          fromUser: new Types.ObjectId(baseUser),
          type: SN_BONUS_TYPE.BUILDER_GENERATIONAl,
          amount: 0,
          tokenAmount: 0,
          tokenPrice: currentPrice,
          rewardData: {
            currentLevel,
            actualLevel: currentLevel,
          },
          receivable: false,
          lostReason: LostReason.MEMBERSHIP_EXPIRED,
          gaskRemaining: 0,
          loss: 0,
          cloudkTrx,
          note: 'New Logic and UI implemented',
        };

        await this.createBonusTransaction(txnData);
        currentUserId = currentUpline._id;
        continue;
      }

      if (!gasKVal) {
        const txnData: CreateTransactionDto = {
          user: currentUpline._id,
          fromUser: new Types.ObjectId(baseUser),
          type: SN_BONUS_TYPE.BUILDER_GENERATIONAl,
          amount: 0,
          tokenAmount: 0,
          tokenPrice: currentPrice,
          rewardData: {
            currentLevel,
            actualLevel: currentLevel,
          },
          receivable: false,
          lostReason: !currentUpline.isBuilderGenerationActive
            ? LostReason.INACTIVE_USER
            : LostReason.INSUFFICIENT_GASK,
          gaskRemaining: 0,
          loss: 0,
          cloudkTrx,
          note: 'New Logic and UI implemented',
        };
        await this.createBonusTransaction(txnData);
        currentUserId = currentUpline._id;
        continue;
      }

      currentGasKValue = gasKVal;
      if (!currentUpline.isBuilderGenerationActive) {
        // NodeK is not active
        const txnData: CreateTransactionDto = {
          user: currentUpline._id,
          fromUser: new Types.ObjectId(baseUser),
          type: SN_BONUS_TYPE.BUILDER_GENERATIONAl,
          amount: 0,
          tokenAmount: 0,
          tokenPrice: currentPrice,
          rewardData: {
            currentLevel,
            actualLevel: currentLevel,
          },
          receivable: false,
          lostReason: LostReason.INACTIVE_USER,
          gaskRemaining: currentGasKValue,
          loss: 0,
          cloudkTrx,
          note: 'New Logic and UI implemented',
        };
        await this.createBonusTransaction(txnData);
        currentUserId = currentUpline._id;
        continue;
      }

      if (
        currentUpline?.isBuilderGenerationEnabled === false ||
        currentUpline?.isBlocked === true
      ) {
        const txnData: CreateTransactionDto = {
          user: currentUpline._id,
          fromUser: new Types.ObjectId(baseUser),
          type: SN_BONUS_TYPE.BUILDER_GENERATIONAl,
          amount: 0,
          tokenAmount: 0,
          tokenPrice: currentPrice,
          rewardData: {
            currentLevel,
            actualLevel: currentLevel,
          },
          receivable: false,
          lostReason:
            currentUpline?.isBlocked === true
              ? LostReason.USER_BLOCKED
              : LostReason.BLOCKED_FOR_BUILDER_GENERATION,
          gaskRemaining: currentGasKValue,
          loss: 0,
          cloudkTrx,
          note: 'New Logic and UI implemented',
        };

        await this.createBonusTransaction(txnData);
        currentUserId = currentUpline._id;
        continue;
      }

      //Find the highest machine of the upline
      let higestMachine = await this.cacheService.getCacheUser({
        type: CACHE_TYPE.BG_USER_HIGEST_MACHINE,
        user: member.id,
      });

      if (!higestMachine) {
        higestMachine = await this.supernodeService.fetchHighestValidMachine(
          currentUpline._id,
          currentUpline,
        );
        if (higestMachine) {
          await this.cacheService.setCacheUser(
            {
              type: CACHE_TYPE.BG_USER_HIGEST_MACHINE,
              user: member.id,
              data: higestMachine,
            },
            500,
          );
        }
      }

      if (!higestMachine || !higestMachine.product) {
        console.log(`No valid machine found for user ${currentUpline._id}`);
        const txnData: CreateTransactionDto = {
          user: currentUpline._id,
          fromUser: new Types.ObjectId(baseUser),
          type: SN_BONUS_TYPE.BUILDER_GENERATIONAl,
          amount: 0,
          tokenAmount: 0,
          tokenPrice: currentPrice,
          rewardData: {
            currentLevel,
            actualLevel: currentLevel,
          },
          receivable: false,
          lostReason: LostReason.INACTIVE_USER,
          gaskRemaining: currentGasKValue,
          loss: 0,
          cloudkTrx,
          machine: machineId,
          note: 'New Logic and UI implemented',
        };
        await this.createBonusTransaction(txnData);
        currentUserId = currentUpline._id;
        continue;
      }

      if (
        higestMachine.product &&
        typeof higestMachine.product._id === 'string'
      ) {
        higestMachine.product._id = new Types.ObjectId(
          higestMachine.product._id,
        );
      }

      const isUserMachineEnableForBonus = settings.find((per) => {
        const productId = new Types.ObjectId(per.product);
        if (productId.equals(higestMachine.product._id)) {
          return per.percentage;
        }
      });

      if (!isUserMachineEnableForBonus) {
        const txnData: CreateTransactionDto = {
          user: currentUpline._id,
          fromUser: new Types.ObjectId(baseUser),
          type: SN_BONUS_TYPE.BUILDER_GENERATIONAl,
          amount: 0,
          tokenAmount: 0,
          tokenPrice: currentPrice,
          rewardData: {
            currentLevel,
            actualLevel: currentLevel,
          },
          receivable: false,
          lostReason: LostReason.USER_MACHINE_NOT_ELIGIBLE,
          gaskRemaining: currentGasKValue,
          loss: 0,
          cloudkTrx,
          machine: machineId,
          note: 'New Logic and UI implemented',
        };

        await this.createBonusTransaction(txnData);
        currentUserId = currentUpline._id;
        continue;
      }
      const percentageOfBonus = isUserMachineEnableForBonus.percentage;

      currentPercentage = isUserMachineEnableForBonus.percentage;

      //Logic of builder generation reward calculation
      if (isFirstLevel) {
        basePercentage = percentageOfBonus;

        const rewardAmount = (amount * percentageOfBonus) / 100;

        const eligibilityDto: CheckEligibilityStatusDto = {
          uplineUser: currentUpline._id,
          rewardAmount: rewardAmount,
          currentUserId: new Types.ObjectId(baseUser),
          percentageOfBonus: matchingBonus,
          amount: amount,
          cloudkTrx,
          currentLevel,
          currentGasKValue,
          currentPrice: currentPrice,
        };
        const checkEligibility =
          await this.checkUserEligibilityService(eligibilityDto);
        if (!checkEligibility) {
          currentUserId = currentUpline._id;
          continue;
        }

        const txnData: CreateTransactionDto = {
          user: currentUpline._id,
          fromUser: new Types.ObjectId(baseUser),
          type: SN_BONUS_TYPE.BUILDER_GENERATIONAl,
          amount: rewardAmount,
          tokenAmount: rewardAmount > 0 ? rewardAmount / currentPrice : 0,
          tokenPrice: currentPrice,
          rewardData: {
            amount,
            percentage: percentageOfBonus,
            basePercentage: basePercentage,
            previousLevelRewardAmount: previousLevelRewardAmount,
            currentLevel,
            actualLevel: currentLevel,
          },
          receivable: true,
          lostReason: null,
          gaskRemaining: currentGasKValue - rewardAmount,
          loss: 0,
          cloudkTrx,
          machine: machineId,
          note: 'New Logic and UI implemented',
        };
        const createdBonusTrx = await this.createSuccessTrancaction(txnData);

        //TODO: Generate Builder Referral rewards is temporary disabled
        // Generate Builder Referral rewards
        // if (process.env.NODE_ENV == 'qa-server') {
        //   const createdBonusTrxId = createdBonusTrx._id as Types.ObjectId;
        //   await this.builderReferralService.generateBuilderReferralReward(
        //     currentUpline._id,
        //     new Types.ObjectId(baseUser),
        //     SN_BONUS_TYPE.BUILDER_GENERATIONAl,
        //     rewardAmount,
        //     cloudkTrx,
        //     currentPrice,
        //     machineId,
        //     createdBonusTrxId,
        //   );
        // }
        // update reward to the User Rewards
        currentUserId = currentUpline._id;
        isFirstLevel = false;
        previousLevelRewardAmount = rewardAmount;
        continue;
      } else {
        const rewardPercentage = currentPercentage - basePercentage;
        if (rewardPercentage <= 0) {
          if (isMachingBonusEnabled) {
            const data: MatchingBonusTransactionDto = {
              uplineUser: currentUpline._id,
              currentUserId: baseUser,
              rewardAmount: previousLevelRewardAmount,
              percentageOfBonus: matchingBonus,
              amount: amount,
              cloudkTrx,
              previousLevelRewardAmount,
              matchingBonus,
              currentPrice,
              basePercentage,
              currentLevel,
              currentGasKValue,
              job: jobId,
              baseUser: new Types.ObjectId(baseUser),
            };
            const matchingBonusDistribution =
              await this.matchingBonusTransaction(data);
            if (!matchingBonusDistribution) {
              currentUserId = currentUpline._id;
              continue;
            } else {
              currentUserId = currentUpline._id;
              isMachingBonusEnabled = false;
              continue;
            }
          } else {
            const rewardAmount =
              (previousLevelRewardAmount * matchingBonus) / 100;
            const txnData: CreateTransactionDto = {
              user: currentUpline._id,
              fromUser: new Types.ObjectId(baseUser),
              type: SN_BONUS_TYPE.BUILDER_GENERATIONAl,
              amount: rewardAmount,
              tokenAmount: rewardAmount > 0 ? rewardAmount / currentPrice : 0,
              tokenPrice: currentPrice,
              rewardData: {
                amount: rewardAmount,
                percentage: matchingBonus,
                basePercentage: basePercentage,
                previousLevelRewardAmount: previousLevelRewardAmount,
                currentLevel,
                actualLevel: currentLevel,
              },
              receivable: false,
              lostReason: LostReason.NOT_ELIGIBLE_MATCHING_BONUS,
              gaskRemaining: rewardAmount,
              loss: 0,
              cloudkTrx,
              note: 'New Logic and UI implemented',
              isMachingBonus: true,
              machingBonusStatus: 'rejected',
            };

            await this.createBonusTransaction(txnData);
            currentUserId = currentUpline._id;
            continue;
          }
        } else {
          const rewardAmount = (amount * rewardPercentage) / 100;

          const eligibilityDto: CheckEligibilityStatusDto = {
            uplineUser: currentUpline._id,
            rewardAmount: rewardAmount,
            currentUserId: new Types.ObjectId(baseUser),
            percentageOfBonus: percentageOfBonus,
            amount: amount,
            cloudkTrx,
            currentLevel,
            currentGasKValue,
            currentPrice: currentPrice,
          };
          const checkEligibility =
            await this.checkUserEligibilityService(eligibilityDto);
          if (!checkEligibility) {
            currentUserId = currentUpline._id;
            continue;
          }

          // update reward to the User Rewards
          const txnData: CreateTransactionDto = {
            user: currentUpline._id,
            fromUser: new Types.ObjectId(baseUser),
            type: SN_BONUS_TYPE.BUILDER_GENERATIONAl,
            amount: rewardAmount,
            tokenAmount: rewardAmount > 0 ? rewardAmount / currentPrice : 0,
            tokenPrice: currentPrice,
            rewardData: {
              amount,
              percentage: percentageOfBonus,
              basePercentage: basePercentage,
              previousLevelRewardAmount: previousLevelRewardAmount,
              currentLevel,
              actualLevel: currentLevel,
            },
            receivable: true,
            lostReason: null,
            gaskRemaining: currentGasKValue - rewardAmount,
            loss: 0,
            cloudkTrx,
            machine: machineId,
            note: 'New Logic and UI implemented',
          };

          const createdBonusTrx = await this.createSuccessTrancaction(txnData);

          //TODO: Generate Builder Referral rewards is temporary disabled
          // Generate Builder refereal rewards
          // if (process.env.NODE_ENV == 'qa-server') {
          //   const createdBonusTrxId = createdBonusTrx._id as Types.ObjectId;
          //   await this.builderReferralService.generateBuilderReferralReward(
          //     currentUpline._id,
          //     new Types.ObjectId(baseUser),
          //     SN_BONUS_TYPE.BUILDER_GENERATIONAl,
          //     rewardAmount,
          //     cloudkTrx,
          //     currentPrice,
          //     machineId,
          //     createdBonusTrxId,
          //   );
          // }
          currentUserId = currentUpline._id;
          previousLevelRewardAmount = rewardAmount;
          basePercentage = currentPercentage;
          isMachingBonusEnabled = true;
        }
      }
    }
    if (isMachingBonusEnabled && currentUpline) {
      const data: MatchingBonusTransactionDto = {
        uplineUser: currentUpline._id,
        currentUserId: currentUserId,
        rewardAmount: previousLevelRewardAmount,
        percentageOfBonus: matchingBonus,
        amount: amount,
        cloudkTrx,
        previousLevelRewardAmount,
        matchingBonus,
        currentPrice,
        basePercentage,
        currentLevel,
        currentGasKValue,
        machine: machineId,
        job: jobId,
        baseUser: new Types.ObjectId(baseUser),
      };
      const matchingBonusDistribution =
        await this.matchingBonusTransaction(data);
      if (!matchingBonusDistribution) {
        currentUserId = currentUpline._id;
        return;
      } else {
        currentUserId = currentUpline._id;
        isMachingBonusEnabled = false;
        return;
      }
    }
    return;
  }

  // Function for upline user NodeK is active or not
  async checkUserNodeKActiveOrNot(userId: Types.ObjectId): Promise<{
    isActive: boolean;
    lostReasons: LostReason;
  }> {
    // check the nodeK is active Or not
    // caching the upline user data
    let isNodeKActive;
    const cached = await this.cacheService.getCacheUser({
      type: CACHE_TYPE.NODEK_USER,
      user: userId,
    });
    if (!cached) {
      isNodeKActive =
        await this.supernodeService.isBuilderGenerationUserActiveNode(userId);
      if (!isNodeKActive) {
        return { isActive: false, lostReasons: LostReason.INACTIVE_USER };
      }
      await this.cacheService.setCacheUser({
        type: CACHE_TYPE.NODEK_USER,
        user: userId,
        data: isNodeKActive,
      });
      return { isActive: true, lostReasons: null };
    }
    return { isActive: true, lostReasons: null };
  }

  // Function for upline user gask eligibilty
  async checkUserGaskEligibily(
    userId: Types.ObjectId,
    rewardAmount: number,
  ): Promise<{
    isActive: boolean;
    lostReasons: LostReason;
  }> {
    // check the gask
    const userGask = await this.supernodeService.fetchGasKService(userId);
    if (rewardAmount > userGask) {
      return { isActive: false, lostReasons: LostReason.INSUFFICIENT_GASK };
    }
    return { isActive: true, lostReasons: null };
  }

  // Function for get user cap eligibilty
  async checkUserDailyCapEligibily(
    userId: Types.ObjectId,
    rewardAmout: number,
  ): Promise<{
    isActive: boolean;
    lostReasons: LostReason;
  }> {
    const userHighestMachine =
      await this.supernodeService.fetchHighestValidMachine(userId);
    if (!userHighestMachine)
      return { isActive: false, lostReasons: LostReason.DAILY_CAPPING };

    const dailyCap: number = (userHighestMachine.product as any)
      .superNodeCapping;

    if (!dailyCap) return { isActive: true, lostReasons: null }; // means Unlimited daily cap
    const userDailyReward = await this.supernodeService.getDailyRewards(userId);
    if (userDailyReward.totalAmount + rewardAmout > dailyCap) {
      return { isActive: false, lostReasons: LostReason.DAILY_CAPPING };
    }
    return { isActive: true, lostReasons: null };
  }

  // Function for creating bonus transaction

  async createBonusTransaction(input: CreateTransactionDto) {
    const data = await this.bonusTrxModel.create({ ...input });
    return data;
  }

  async bulkCreateBonusTransaction(input: CreateTransactionDto[]) {
    const data = await this.bonusTrxModel.insertMany(input);
    return data;
  }

  // Function for creating success transaction
  async createSuccessTrancaction(input: CreateTransactionDto) {
    const result = await this.createBonusTransaction(input);

    if (input.isMachingBonus) {
      return result;
    }

    await this.supernodeService.createGasKService({
      amount: input.amount,
      flow: TransactionFlow.OUT,
      user: input.user,
      from: 'builder-generational',
      machine: input.machine,
    });

    // if (input.receivable == true) {
    //   await this.supernodeService.createOrUpdateBGRewards({
    //     user: input.user,
    //     rewardValue: input.tokenAmount,
    //     level: input.amount,
    //   });
    // }

    return result;
  }

  // Check user valid for  user eligibility
  async checkUserEligibilityService(input: CheckEligibilityStatusDto) {
    const {
      uplineUser,
      currentUserId,
      rewardAmount,
      percentageOfBonus,
      amount,
      cloudkTrx,
      currentLevel,
      currentGasKValue,
      currentPrice = 0,
    } = input;

    const transactionFailData: CreateTransactionDto[] = [];

    const gasKEliglible = await this.checkUserGaskEligibily(
      uplineUser,
      rewardAmount,
    );
    if (!gasKEliglible.isActive) {
      const txnData: CreateTransactionDto = {
        user: uplineUser,
        fromUser: currentUserId,
        type: SN_BONUS_TYPE.BUILDER_GENERATIONAl,
        amount: rewardAmount,
        tokenAmount: 0,
        tokenPrice: currentPrice,
        rewardData: {
          amount,
          percentage: percentageOfBonus,
          currentLevel,
          actualLevel: currentLevel,
        },
        receivable: false,
        lostReason: gasKEliglible.lostReasons,
        gaskRemaining: currentGasKValue,
        loss: rewardAmount,
        lossInToken: rewardAmount > 0 ? rewardAmount / currentPrice : 0,
        cloudkTrx,
      };

      // transactionFailData.push(txnData);
      await this.createBonusTransaction(txnData);
    }

    //Check the daily cap
    const dailyCapEligibility = await this.checkUserDailyCapEligibily(
      uplineUser,
      rewardAmount,
    );
    if (!dailyCapEligibility.isActive) {
      const txnData: CreateTransactionDto = {
        user: uplineUser,
        fromUser: currentUserId,
        type: SN_BONUS_TYPE.BUILDER_GENERATIONAl,
        amount: rewardAmount,
        tokenAmount: rewardAmount > 0 ? rewardAmount / currentPrice : 0,
        tokenPrice: currentPrice,
        rewardData: {
          amount,
          percentage: percentageOfBonus,
          currentLevel,
          actualLevel: currentLevel,
        },
        receivable: false,
        lostReason: dailyCapEligibility.lostReasons,
        gaskRemaining: 0,
        loss: rewardAmount,
        lossInToken: rewardAmount > 0 ? rewardAmount / currentPrice : 0,
        cloudkTrx,
      };
      // transactionFailData.push(txnData);
      await this.createBonusTransaction(txnData);
    }
    if (transactionFailData.length > 0) {
      await this.bulkCreateBonusTransaction(transactionFailData);
      return false;
    }
    return true;
  }

  async matchingBonusTransaction(input: MatchingBonusTransactionDto) {
    const {
      uplineUser,
      currentUserId,
      previousLevelRewardAmount,
      amount,
      cloudkTrx,
      matchingBonus,
      currentPrice,
      basePercentage,
      currentLevel,
      currentGasKValue,
      machine,
      job,
      baseUser,
    } = input;
    const rewardAmount = (previousLevelRewardAmount * matchingBonus) / 100;

    const eligibilityDto: CheckEligibilityStatusDto = {
      uplineUser,
      rewardAmount: rewardAmount,
      currentUserId: new Types.ObjectId(baseUser),
      percentageOfBonus: matchingBonus,
      amount: amount,
      cloudkTrx,
      currentLevel,
      currentGasKValue,
      currentPrice: currentPrice,
    };
    const checkEligibility =
      await this.checkUserEligibilityService(eligibilityDto);
    if (!checkEligibility) {
      return false;
    }

    const txnData: CreateTransactionDto = {
      user: uplineUser,
      fromUser: new Types.ObjectId(baseUser),
      type: SN_BONUS_TYPE.BUILDER_GENERATIONAl,
      amount: rewardAmount,
      tokenAmount: rewardAmount > 0 ? rewardAmount / currentPrice : 0,
      tokenPrice: currentPrice,
      rewardData: {
        amount,
        percentage: matchingBonus,
        basePercentage: basePercentage,
        previousLevelRewardAmount: previousLevelRewardAmount,
        currentLevel,
        actualLevel: currentLevel,
      },
      receivable: false,
      lostReason: null,
      gaskRemaining: currentGasKValue - rewardAmount,
      loss: 0,
      cloudkTrx,
      machine,
      note: 'New Logic and UI implemented',
      isMachingBonus: true,
      machingBonusStatus: 'pending',
      job,
    };
    const createdBonusTrx = await this.createSuccessTrancaction(txnData);

    // Generate Builder Referral rewards
    if (process.env.NODE_ENV == 'qa-server') {
      const createdBonusTrxId = createdBonusTrx._id as Types.ObjectId;
      await this.builderReferralService.generateBuilderReferralReward(
        uplineUser,
        new Types.ObjectId(baseUser),
        SN_BONUS_TYPE.BUILDER_GENERATIONAl,
        rewardAmount,
        cloudkTrx,
        currentPrice,
        machine,
        createdBonusTrxId,
      );
    }
    return true;
  }

  // Check the Maching bonus is Available

  async machingBonusGlobalEligibilityCheck(transaction) {
    const { isActive, lostReasons } = await this.checkUserDailyCapEligibily(
      transaction.user,
      transaction.amount,
    );
    if (!isActive) {
      transaction.machingBonusStatus = 'rejected';
      transaction.lostReason = lostReasons;
      await transaction.save();
      return false;
    }

    const gasKEliglible = await this.checkUserGaskEligibily(
      transaction.user,
      transaction.amount,
    );

    if (!gasKEliglible.isActive) {
      transaction.machingBonusStatus = 'rejected';
      transaction.lostReason = lostReasons;
      await transaction.save();
      return false;
    }

    transaction.machingBonusStatus = 'completed';
    transaction.receivable = true;
    await transaction.save();

    //reduce the gasK
    await this.supernodeService.createGasKService({
      amount: transaction.amount,
      flow: TransactionFlow.OUT,
      user: transaction.user,
      from: 'builder-generational',
      machine: transaction.machine,
    });
    return true;
  }
}
