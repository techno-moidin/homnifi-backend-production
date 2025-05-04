import { Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import mongoose, {
  ClientSession,
  Connection,
  FilterQuery,
  Model,
  ObjectId,
  PipelineStage,
  Types,
} from 'mongoose';
import {
  CLOUDK_MACHINE_STATUS,
  CloudKMachine,
} from './schemas/cloudk-machine.schema';
import {
  CLOUDK_MACHINE_STAKE_TYPE,
  CloudKMachineStake,
  STAKE_FROM,
} from './schemas/cloudk-machine-stakes.schema';
import { CloudKAutoCompoundPenalty } from './schemas/ac-penalty.schema';
import { CloudKReward } from './schemas/cloudk-reward.schema';
import { CloudKService } from './cloud-k.service';
import { CloudKInflation } from './schemas/cloudk-inflation.schema';
import { CloudKInflationRules } from './schemas/cloudk-inflation-rules.schema';
import {
  CLOUDK_JOBS_STATUS,
  CloudKDailyJob,
} from './schemas/cloudk-reward-job.schema';
import { WalletService } from '../wallet/wallet.service';
import { CloudKSimulationDto } from '../admin/dto/cloudk-simulation.dto';
import {
  cloudKTransactionRemarks,
  CloudKTransactions,
  CloudKTransactionTypes,
} from './schemas/cloudk-transactions.schema';
import {
  calculateTimeDifference,
  getDateRange,
  truncateDecimal,
} from '../utils/helpers';
import { BaseReferralRewardService } from '../supernode/base-referral-generate.service';
import { BuilderGenerationalRewardService } from '../supernode/builder-generation.service';
import { User } from '../users/schemas/user.schema';
import { UserGask, UserGaskFrom } from '../supernode/schemas/user-gask.schema';
import { SuperNodeGaskSetting } from '../supernode/schemas/sn-gask-setting.schema';
import { TransactionFlow } from '../wallet/enums/transcation.flow.enum';
import { BuilderReferralService } from '../supernode/builder-referral.service';
import { SNBonusTransaction } from '../supernode/schemas/sn-bonus-transaction.schema';
import { UserRewards } from '../users/schemas/user-rewards';
import { SupernodeService } from '../supernode/supernode.service';
import {
  getCurrentDay,
  isPromotionExpired,
} from '../utils/common/common.functions';
import * as path from 'path';
import * as fs from 'fs';
import { DateFilter } from '../global/enums/date.filter.enum';
import {
  NodekRewardFilePath,
  NodekRewardFilePathDocument,
} from './schemas/nodek-reward-job.schema';

import {
  CloudKRewardExcessDistributionInterface,
  CloudKRewardGenerationInterface,
  CloudKRewardGenerationType,
  CountryItemAdditionalMinting,
} from './interfaces/cloudk-reward.interface';
import moment from 'moment';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { CloudKProduct } from './schemas/cloudk-products.schema';
import { AdditionalCountryLevelSetting } from '../admin/schemas/additional.product.minting.Schema';
import {
  AdditionalMintingPromotion,
  AdditionalMintingPromotionStatus,
} from '../admin/schemas/additional-minting-promotion.schema';
import { countriesAllOptions } from '../countries/schemas/country.schema';

@Injectable()
export class CloudKRewardService {
  constructor(
    @InjectModel(CloudKMachine.name)
    private machineModel: Model<CloudKMachine>,
    @InjectModel(CloudKMachineStake.name)
    private machineStakesModel: Model<CloudKMachineStake>,
    @InjectModel(CloudKAutoCompoundPenalty.name)
    private autoCompoundPenaltyModel: Model<CloudKAutoCompoundPenalty>,
    @InjectModel(CloudKReward.name) private rewardModel: Model<CloudKReward>,
    @InjectModel(CloudKInflation.name)
    private inflationModel: Model<CloudKInflation>,
    @InjectModel(CloudKInflationRules.name)
    private inflationRulesModel: Model<CloudKInflationRules>,
    @InjectModel(CloudKDailyJob.name)
    private dailyJobModel: Model<CloudKDailyJob>,

    @InjectModel(UserRewards.name)
    private userRewardsModel: Model<UserRewards>,
    @InjectModel(UserGask.name)
    private userGaskModel: Model<UserGask>,
    @InjectModel(SuperNodeGaskSetting.name)
    private snGaskSettingModel: Model<SuperNodeGaskSetting>,
    @InjectModel(CloudKReward.name)
    private cloudKRewardModel: Model<CloudKReward>,
    @InjectModel(CloudKTransactions.name)
    private cloudkTransactionModel: Model<CloudKTransactions>,
    private cloudKService: CloudKService,
    private walletService: WalletService,
    private baseReferralRewardService: BaseReferralRewardService,
    private builderGenerationRewardService: BuilderGenerationalRewardService,
    private superNoderService: SupernodeService,

    private builderReferralService: BuilderReferralService,
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(CloudKDailyJob.name)
    private readonly cloudKDailyJobModel: Model<CloudKDailyJob>,
    @InjectModel(SNBonusTransaction.name)
    private snBonusTransaction: Model<SNBonusTransaction>,

    @InjectModel(CloudKReward.name)
    private cloudkRewardModel: Model<CloudKReward>,
    @InjectModel(CloudKProduct.name)
    private cloudKProductModel: Model<CloudKProduct>,

    @InjectModel(CloudKMachine.name)
    private cloudkMachineModel: Model<CloudKMachine>,

    @InjectModel(CloudKMachineStake.name)
    private CloudKMachineStakeModel: Model<CloudKMachineStake>,

    @InjectModel(NodekRewardFilePath.name)
    private nodekRewardJobModel: Model<NodekRewardFilePath>,

    @InjectModel(AdditionalMintingPromotion.name)
    private additionalMintingPromotionModel: Model<AdditionalMintingPromotion>,

    @InjectModel(AdditionalCountryLevelSetting.name)
    private additionalCountryLevelSettingModel: Model<AdditionalCountryLevelSetting>,
  ) {}

  currentInflation = null;
  session = null;
  autoCompoundPenalty = null;

  async getCurrentInflation() {
    if (this.currentInflation) return this.currentInflation;

    this.currentInflation = await this.inflationModel
      .findOne({})
      .sort({ createdAt: -1 });
    return this.currentInflation;
  }

  async initMongoSession() {
    this.session = await this.connection.startSession();
    await this.session.startTransaction();
  }

  async getACPenaltyCut(machine: CloudKMachine, date: Date) {
    if (this.autoCompoundPenalty)
      return machine.autoCompound ? 1 : this.autoCompoundPenalty;

    const currentPenalty = await this.autoCompoundPenaltyModel
      .findOne({ createdAt: { $lte: date } })
      .sort({ createdAt: -1 })
      .exec();

    this.autoCompoundPenalty = 1 - currentPenalty.percentage / 100;
    return machine.autoCompound ? 1 : this.autoCompoundPenalty;
  }

  async calculateABP(stakeData) {
    let totalTokens = 0;
    let totalCollatoral = 0;

    stakeData.forEach((stake) => {
      totalTokens += stake.amount;
      totalCollatoral = stake.amount * stake.price;
    });

    return totalCollatoral / totalTokens;
  }

  async getMachineCollatoral(machineId): Promise<any> {
    const pipeline = [
      {
        $match: {
          machine: machineId,
          deletedAt: { $eq: null },
        },
      },
      {
        $project: {
          price: {
            $cond: {
              if: { $eq: ['$type', CLOUDK_MACHINE_STAKE_TYPE.STAKE] },
              then: '$totalPrice',
              else: { $multiply: ['$totalPrice', -1] },
            },
          },
        },
      },
      {
        $group: {
          _id: '$machine',
          totalPrice: { $sum: '$price' },
        },
      },
    ];

    const totalPriceResult = await this.machineStakesModel
      .aggregate(pipeline)
      .exec();

    return totalPriceResult[0] ? totalPriceResult[0] : { totalPrice: 0 };
  }

  // async getSetMachineDLP(
  //   machine: CloudKMachine,
  //   didPriceFallFromPrevDay: boolean,
  //   currentPrice: number,
  //   previousTokenPrice?: number,
  // ): Promise<{
  //   dlp: number;
  //   productionDecreasePercentage: number;
  //   ath: number;
  // }> {
  //   if (machine.dlp < currentPrice) {
  //     machine.dlp = currentPrice;
  //   }
  //   if (machine.allTimeHigh < currentPrice) {
  //     machine.allTimeHigh = currentPrice;
  //   }

  //   const percentageFallFromATH =
  //     (machine.allTimeHigh - currentPrice) / machine.allTimeHigh;
  //   const percentageFallFromDLP = (machine.dlp - currentPrice) / machine.dlp;

  //   let priceDropPercentage = 0;
  //   if (didPriceFallFromPrevDay) {
  //     priceDropPercentage = percentageFallFromATH;
  //   } else {
  //     priceDropPercentage = percentageFallFromDLP;
  //   }

  //   const currentRule = await this.inflationRulesModel
  //     .find({
  //       inflation: this.currentInflation._id,
  //     })
  //     .sort({ dropPercentage: -1 })
  //     .findOne({
  //       dropPercentage: { $lte: priceDropPercentage * 100 },
  //     });
  //   const increaseDLPPercentage = currentRule
  //     ? currentRule.increaseDLPPercentage
  //     : 0;

  //   if (didPriceFallFromPrevDay) {
  //     const dlp =
  //       increaseDLPPercentage > 0
  //         ? machine.dlp + (machine.dlp * increaseDLPPercentage) / 100
  //         : machine.dlp;
  //     machine.dlp = dlp;
  //   }
  //   await machine.save();

  //   return {
  //     dlp: machine.dlp,
  //     productionDecreasePercentage: currentRule
  //       ? currentRule.productionDecreasePercentage
  //       : 0,
  //     ath: machine.allTimeHigh,
  //   };
  // }

  async calculateCumulativePenalty(price: number, priceDropPercentage: number) {
    // console.log({ priceDropPercentage });

    // Step 1: Fetch all rules up to priceDropPercentage and include the next range (40-45 if priceDropPercentage is 42.89)
    const rules = await this.inflationRulesModel.find({
      inflation: this.currentInflation._id,
      $or: [
        { todropPercentage: { $lte: priceDropPercentage } }, // Get all valid rules
        {
          fromdropPercentage: { $lte: priceDropPercentage },
          todropPercentage: { $gt: priceDropPercentage },
        }, // Include next range
      ],
    });

    let finalPrice = price;
    let totalPenalty = 0;

    // Step 2: Apply each rule sequentially
    for (const rule of rules) {
      const penalty = (finalPrice * rule.productionDecreasePercentage) / 100;
      totalPenalty += penalty;
      finalPrice -= penalty;
    }

    return { finalPrice, totalPenalty };
  }

  async calculateCumulativeDLP(
    currentDLP: number,
    priceDropPercentage: number,
  ) {
    const rules = await this.inflationRulesModel
      .find({
        inflation: this.currentInflation._id,
        $or: [
          { todropPercentage: { $lte: priceDropPercentage } }, // Get all valid rules
          {
            fromdropPercentage: { $lte: priceDropPercentage },
            todropPercentage: { $gt: priceDropPercentage },
          }, // Include next range
        ],
      })
      .sort({ fromdropPercentage: 1 }); // Sort in ascending order

    // console.log('Rules:', rules);

    let finalDLP = currentDLP;
    let lastIncrease = 0;

    // Step 2: Apply each rule sequentially for increaseDLPPercentage
    for (const rule of rules) {
      const increaseAmount = (finalDLP * rule.increaseDLPPercentage) / 100;
      finalDLP += increaseAmount;
      lastIncrease = increaseAmount; // Store the last increase
    }

    return { finalDLP, lastIncrease }; // Return both final value and the last increase
  }

  async getSetMachineDLP(
    machine: CloudKMachine,
    didPriceFallFromPrevDay: boolean,
    currentPrice: number,
    previousTokenPrice?: number,
    oldReward?: any,
  ): Promise<{
    dlp: number;
    productionDecreasePercentage: number;
    ath: number;
    percentageFallFromToken: number;
    currentRule: any;
    priceDropPercentage: any;
  }> {
    // console.log({ oldReward });
    if (machine.dlp < currentPrice) {
      machine.dlp = currentPrice;
    }
    if (machine.allTimeHigh < currentPrice) {
      machine.allTimeHigh = currentPrice;
    }

    const percentageFallFromATH =
      (machine.allTimeHigh - currentPrice) / machine.allTimeHigh;
    const percentageFallFromDLP = (machine.dlp - currentPrice) / machine.dlp;

    const percentageFallFromToken =
      (machine.allTimeHigh - currentPrice) / machine.allTimeHigh;

    let priceDropPercentage = 0;
    if (didPriceFallFromPrevDay) {
      priceDropPercentage = percentageFallFromATH;
    } else {
      // priceDropPercentage = percentageFallFromDLP;
      if (previousTokenPrice < currentPrice) {
        if (currentPrice > machine.dlp) {
          priceDropPercentage = (machine.dlp - currentPrice) / machine.dlp;
        } else {
          priceDropPercentage = oldReward
            ? oldReward?.priceDropPercentage / 100
            : (machine.dlp - currentPrice) / machine.dlp;
        }
      } else {
        priceDropPercentage = percentageFallFromToken;
      }
    }
    const currentRule: any = await this.inflationRulesModel
      .findOne({
        inflation: this.currentInflation._id,
        fromdropPercentage: {
          $lte: truncateDecimal(priceDropPercentage * 100, 2),
        }, // priceDropPercentage should be greater than or equal to fromdropPercentage
        todropPercentage: {
          $gte: truncateDecimal(priceDropPercentage * 100, 2),
        }, // priceDropPercentage should be less than or equal to todropPercentage
      })
      .sort({ dropPercentage: -1 });

    // console.log({ currentRule, priceDropPercentage });
    const { finalDLP, lastIncrease } = await this.calculateCumulativeDLP(
      machine.dlp,
      priceDropPercentage * 100,
    );

    const increaseDLPPercentage = finalDLP;

    // const increaseDLPPercentage = currentRule
    //   ? currentRule.increaseDLPPercentage
    //   : 0;
    const dlp =
      increaseDLPPercentage > 0
        ? oldReward &&
          oldReward.currentRule._id?.toString() === currentRule._id?.toString()
          ? machine.dlp
          : machine.dlp + lastIncrease
        : machine.dlp;
    machine.dlp = dlp;
    machine.percentageFallFromToken = percentageFallFromToken;
    machine.rule = currentRule?._id || null;
    await machine.save();

    return {
      dlp: machine.dlp,
      productionDecreasePercentage: currentRule
        ? currentRule?.productionDecreasePercentage || 0
        : 0,
      ath: machine.allTimeHigh,
      percentageFallFromToken,
      currentRule,
      priceDropPercentage: truncateDecimal(priceDropPercentage * 100, 2),
    };
  }

  async getPreviousDayTknPrice(machine: CloudKMachine): Promise<number> {
    const lastReward = await this.rewardModel
      .findOne({ machine: machine._id })
      .sort({ createdAt: -1 });
    // .session(this.session);
    return lastReward ? lastReward.tokenPrice : 0;
  }
  async createOrUpdateRewards(user: any, rewardValue: number, date: any) {
    const specifiedDate = new Date(date);
    specifiedDate.setHours(0, 0, 0, 0);
    const startOfDay = new Date(specifiedDate);
    const endOfDay = new Date(specifiedDate);
    endOfDay.setHours(23, 59, 59, 999);

    console.log('object :>> ', { $gte: startOfDay, $lt: endOfDay });

    const isUser = await this.userRewardsModel.findOne({
      user: new Types.ObjectId(user),
      createdAt: { $gte: startOfDay, $lt: endOfDay },
    });

    if (isUser) {
      await this.userRewardsModel.updateOne(
        { user, createdAt: { $gte: startOfDay, $lt: endOfDay } },
        { $inc: { myProduction: rewardValue } },
        { upsert: true },
      );
    } else {
      await this.userRewardsModel.create({
        user,
        myProduction: rewardValue,
        createdAt: specifiedDate,
      });
    }
  }

  async calculateReward({
    collatoral,
    machine,
    autoCompoundpenaltyCut,
    priceDropPercentage,
    currentPrice,
    previousTokenPrice,
    generating_Type,
    additionalMintingPowerPercentage,
    additionalMintingPowerStatus,
  }: {
    collatoral: number;
    machine: CloudKMachine;
    autoCompoundpenaltyCut: any;
    priceDropPercentage: number;
    currentPrice: number;
    previousTokenPrice?: number;
    generating_Type: 'Reward' | 'Additional';
    additionalMintingPowerPercentage: number;
    additionalMintingPowerStatus?: AdditionalMintingPromotionStatus;
  }): Promise<{
    expectedRewardTokens: number;
    rewardPriceValue: number;
    rewardTokens: number;
    prevReward: number;
    totalPenalty: number;
    capPrice: number;
    updatedMachineMintingPower: number;
    isRewardGenerated: boolean;
  }> {
    console.log(generating_Type, ':generating_Type');

    console.log(
      'Calcualte',
      additionalMintingPowerStatus,
      additionalMintingPowerPercentage,
    );

    try {
      let updatedMachineMintingPower: number = machine.mintingPower;
      console.log('Normal Machine mintingPower:', machine.mintingPower);
      if (generating_Type === 'Additional') {
        if (
          additionalMintingPowerPercentage > 0 &&
          additionalMintingPowerStatus ===
            AdditionalMintingPromotionStatus.ACTIVE
        ) {
          const percentageAmount =
            machine.mintingPower * (additionalMintingPowerPercentage / 100);

          // Add the percentage to the original value
          const result = machine.mintingPower + percentageAmount;

          updatedMachineMintingPower = result;
        } else {
          return {
            expectedRewardTokens: 0,
            rewardPriceValue: 0,
            rewardTokens: 0,
            prevReward: 0,
            totalPenalty: 0,
            capPrice: 0,
            updatedMachineMintingPower: machine.mintingPower,
            isRewardGenerated: true,
          };
        }
      }
      console.log('Normal Machine mintingPower:', machine.mintingPower);

      console.log(
        'Calcualte',
        additionalMintingPowerStatus,
        additionalMintingPowerPercentage,
      );

      const capPrice =
        collatoral * (updatedMachineMintingPower + machine.boost);
      // Calculate cap price
      // const capPrice = collateral * (machine.mintingPower + machine.boost);

      // Calculate expected reward tokens before penalties
      let expectedRewardTokens =
        collatoral *
        (updatedMachineMintingPower + machine.boost) *
        autoCompoundpenaltyCut;

      // Apply cumulative penalty
      const { finalPrice, totalPenalty } =
        await this.calculateCumulativePenalty(
          expectedRewardTokens,
          priceDropPercentage,
        );
      expectedRewardTokens = finalPrice;

      // Get previous reward
      let prevReward = 0;
      const oldreward = await this.rewardModel.findOne({
        machine: machine._id,
        user: new Types.ObjectId(machine.user),
      });
      prevReward = oldreward?.totalPrice || 0;

      // Apply pricing conditions
      if (currentPrice >= machine.dlp) {
        // No change needed
      } else if (currentPrice > previousTokenPrice) {
        if (prevReward !== 0) {
          expectedRewardTokens =
            currentPrice > machine.dlp ? expectedRewardTokens : prevReward;
        }
      }

      // Calculate final reward price value with cap
      const rewardPriceValue =
        expectedRewardTokens <= capPrice ? expectedRewardTokens : capPrice;

      // Calculate reward tokens based on current price
      const rewardTokens =
        rewardPriceValue > 0 && currentPrice > 0
          ? rewardPriceValue / currentPrice
          : 0;

      return {
        expectedRewardTokens,
        rewardPriceValue,
        rewardTokens,
        prevReward,
        totalPenalty,
        capPrice,
        updatedMachineMintingPower: updatedMachineMintingPower,
        isRewardGenerated: true,
      };
    } catch (error) {
      return {
        expectedRewardTokens: 0,
        rewardPriceValue: 0,
        rewardTokens: 0,
        prevReward: 0,
        totalPenalty: 0,
        capPrice: 0,
        updatedMachineMintingPower: machine.mintingPower,
        isRewardGenerated: false,
      };
    }
  }
  async generateReward({
    machine,
    currentPrice,
    todaysJob,
    rewardDate,
    additionalMintingPower,
    genRewardData,
    multiplier,
  }: CloudKRewardGenerationInterface): Promise<CloudKRewardExcessDistributionInterface> {
    // this final reward value are calculated by adding additional minting reward and active Gen Reward
    let finalRewardToken: number = 0;
    let finalRewardTokenPrice: number = 0;

    const {
      additionalMintingPowerId,
      additionalMintingPowerPercentage,
      additionalMintingPowerStatus,
      countryCodeAlpha3,
      additionalMintingCountryLevelId,
    } = additionalMintingPower;

    const {
      actveGenRewardPercentageId,
      genRewardPercentage,
      isGenActiveReward,
    } = genRewardData;

    if (!multiplier) multiplier = 3;

    const forDate = rewardDate || new Date();
    const autoCompoundpenaltyCut = await this.getACPenaltyCut(machine, forDate);
    // const collatoralData = await this.getMachineCollatoral(machine._id);
    const collatoral = machine.collatoral;

    // const previousTokenPrice = await this.getPreviousDayTknPrice(machine);
    const previousTokenPrice = machine.prevDayPrice;
    machine.prevDayPrice = currentPrice;
    await this.getCurrentInflation();

    const didPriceFallFromPrevDay = currentPrice < previousTokenPrice;

    const oldreward = await this.rewardModel
      .findOne({
        machine: machine._id,
        user: new Types.ObjectId(machine.user),
        deletedAt: null,
      })
      .sort({ createdAt: -1 });

    const {
      dlp,
      productionDecreasePercentage,
      ath,
      percentageFallFromToken,
      currentRule,
      priceDropPercentage,
    } = await this.getSetMachineDLP(
      machine,
      didPriceFallFromPrevDay,
      currentPrice,
      previousTokenPrice,
      oldreward,
    );

    const capPrice = collatoral * (machine.mintingPower + machine.boost);

    // const productionPenalty =
    //   productionDecreasePercentage > 0
    //     ? 1 - productionDecreasePercentage / 100
    //     : 1;

    let expectedRewardTokens =
      collatoral *
      (machine.mintingPower + machine.boost) *
      autoCompoundpenaltyCut;

    const { finalPrice, totalPenalty } = await this.calculateCumulativePenalty(
      expectedRewardTokens,
      priceDropPercentage,
    );

    expectedRewardTokens = finalPrice;
    let prevReward = 0;

    prevReward = oldreward?.totalPrice;

    // console.log({ prevReward });

    expectedRewardTokens =
      currentPrice >= machine.dlp
        ? expectedRewardTokens
        : currentPrice > previousTokenPrice
          ? prevReward !== 0
            ? currentPrice > machine.dlp
              ? expectedRewardTokens
              : prevReward
            : prevReward
          : expectedRewardTokens;

    // const expectedRewardTokens =
    //   collatoral *
    //   (machine.mintingPower + machine.boost) *
    //   autoCompoundpenaltyCut

    const rewardPriceValue =
      expectedRewardTokens <= capPrice ? expectedRewardTokens : capPrice;

    const rewardTokens =
      rewardPriceValue > 0 && currentPrice > 0
        ? rewardPriceValue / currentPrice
        : 0;

    const additionalMintingPower_Id: Types.ObjectId | null =
      additionalMintingPowerId
        ? new Types.ObjectId(additionalMintingPowerId)
        : null;
    const isAdditionalMintingPower: boolean =
      additionalMintingPowerStatus ===
        AdditionalMintingPromotionStatus.ACTIVE &&
      additionalMintingPowerPercentage > 0
        ? true
        : false;
    // AdditionalMintingPower
    let UpdatedAdditionalrewardTokens: number = 0;
    let additionalRewardTokens: number = 0;
    let additionalUpdatedMachineMintingPower: number = 0;

    // Gen Active Reward
    let genActiveRewardTokens: number = 0;
    let genActiveRewardtokenPrice: number = 0;
    console.log(
      '============================================================================',
    );
    console.log('Machine Name:', machine.name);

    console.log('isAdditionalMintingPower:', isAdditionalMintingPower);
    console.log(
      'additionalMintingPowerPercentage:',
      additionalMintingPowerPercentage,
    );

    if (isAdditionalMintingPower) {
      console.log(
        'ENTER ADDiTIONAL CALC NORMAL MINTING POWER:',
        machine.mintingPower,
      );
      let updatedMachineMintingPower_Add: number = machine.mintingPower;

      const percentageAmount_Add =
        machine.mintingPower * (additionalMintingPowerPercentage / 100);
      console.log('percentageAmount_Add:', percentageAmount_Add);
      // Add the percentage to the original value
      // const result = machine.mintingPower + percentageAmount;
      // console.log(' machine.mintingPower + percentageAmount:', result);

      // updatedMachineMintingPower = result;

      const capPrice_Add = collatoral * updatedMachineMintingPower_Add;

      updatedMachineMintingPower_Add = percentageAmount_Add;

      let expectedRewardTokens_Add =
        collatoral * updatedMachineMintingPower_Add * autoCompoundpenaltyCut;

      const { finalPrice: finalPrice_Add, totalPenalty } =
        await this.calculateCumulativePenalty(
          expectedRewardTokens_Add,
          priceDropPercentage,
        );

      expectedRewardTokens_Add = finalPrice_Add;
      let prevReward_Add = 0;

      prevReward_Add = oldreward?.totalPrice;

      // console.log({ prevReward_Add });

      expectedRewardTokens_Add =
        currentPrice >= machine.dlp
          ? expectedRewardTokens_Add
          : currentPrice > previousTokenPrice
            ? prevReward_Add !== 0
              ? currentPrice > machine.dlp
                ? expectedRewardTokens_Add
                : prevReward_Add
              : prevReward_Add
            : expectedRewardTokens_Add;

      const rewardPriceValue_Add =
        expectedRewardTokens_Add <= capPrice_Add
          ? expectedRewardTokens_Add
          : capPrice_Add;

      additionalRewardTokens =
        rewardPriceValue_Add > 0 && currentPrice > 0
          ? rewardPriceValue_Add / currentPrice
          : 0;
      additionalUpdatedMachineMintingPower = updatedMachineMintingPower_Add;

      UpdatedAdditionalrewardTokens = additionalRewardTokens;
      // UpdatedAdditionalrewardTokens = additionalRewardTokens - rewardTokens;
    }

    if (isGenActiveReward) {
      genActiveRewardTokens = rewardTokens * (genRewardPercentage / 100);
      genActiveRewardtokenPrice = genActiveRewardTokens * currentPrice;
    }
    console.log('Normal Reward Token:', rewardTokens);

    console.log('additional Reward Token:', additionalRewardTokens);

    console.log('Extra Got:', additionalRewardTokens - rewardTokens);

    console.log(
      '============================================================================',
    );
    console.log('IsAdditional', isAdditionalMintingPower);
    // Adding Normal Reward Token
    if (rewardTokens > 0) {
      finalRewardToken = finalRewardToken + rewardTokens;
    }
    // Adding Additional Minting Reward Token
    if (isAdditionalMintingPower && UpdatedAdditionalrewardTokens > 0) {
      finalRewardToken = finalRewardToken + UpdatedAdditionalrewardTokens;
    }
    // Adding Active Gen Reward Token
    if (isGenActiveReward && genActiveRewardTokens > 0) {
      finalRewardToken = finalRewardToken + genActiveRewardTokens;
    }
    // converting Reward to USD
    if (finalRewardToken > 0) {
      finalRewardTokenPrice = finalRewardToken * currentPrice;
    }

    const currentReward = await this.rewardModel.create({
      machine: machine._id,
      user: machine.user,
      tokenAmount: rewardTokens,
      totalPrice: rewardTokens * currentPrice,
      expectedRewardTokens: collatoral * (machine.mintingPower + machine.boost),
      type: CloudKRewardGenerationType.REWARD,
      expectedRewardTokensActual:
        collatoral *
          (machine.mintingPower + machine.boost) *
          autoCompoundpenaltyCut -
        totalPenalty,
      oldLogicReward: collatoral * (machine.mintingPower + machine.boost),
      productionPenalty: totalPenalty === 1 ? 0 : totalPenalty,
      autoCompoundPenalty: machine.autoCompound
        ? 0
        : collatoral *
          (machine.mintingPower + machine.boost) *
          autoCompoundpenaltyCut,
      forDate,
      dlp,
      capPrice,
      allTimeHigh: ath,
      collatoral,
      tokenPrice: currentPrice,
      autoCompounded: machine.autoCompound,
      job: todaysJob._id,
      currentRule: currentRule,
      priceDropPercentage: priceDropPercentage,
      prevReward: prevReward,
      additionalMintingPowerId: additionalMintingPower_Id,
      additionalMintingPowerPercentage: additionalMintingPowerPercentage || 0,
      note: `Actual Reward Generated: ${rewardTokens} LYK-W`,
    });
    let additionalCurrentReward: any;

    if (isAdditionalMintingPower) {
      additionalCurrentReward = await this.rewardModel.create({
        machine: machine._id,
        user: machine.user,
        tokenAmount: UpdatedAdditionalrewardTokens,
        type: CloudKRewardGenerationType.ADDITIONAL_MINTING_REWARD,

        totalPrice: UpdatedAdditionalrewardTokens * currentPrice,
        expectedRewardTokens:
          collatoral * (additionalUpdatedMachineMintingPower + machine.boost),
        expectedRewardTokensActual:
          collatoral *
            (additionalUpdatedMachineMintingPower + machine.boost) *
            autoCompoundpenaltyCut -
          totalPenalty,
        oldLogicReward:
          collatoral * (additionalUpdatedMachineMintingPower + machine.boost),
        productionPenalty: totalPenalty === 1 ? 0 : totalPenalty,
        autoCompoundPenalty: machine.autoCompound
          ? 0
          : collatoral *
            (additionalUpdatedMachineMintingPower + machine.boost) *
            autoCompoundpenaltyCut,
        forDate,
        dlp,
        capPrice,
        allTimeHigh: ath,
        collatoral,
        tokenPrice: currentPrice,
        autoCompounded: machine.autoCompound,
        job: todaysJob._id,
        currentRule: currentRule ?? null,
        priceDropPercentage: priceDropPercentage,
        prevReward: prevReward,
        rewardId: currentReward._id,
        note: `Actual Reward Generated: ${rewardTokens} LYK-W ${isAdditionalMintingPower && ` | Additional Minting Reward Generated: ${additionalRewardTokens} | Actual Additional Minting Reward Generated: ${additionalRewardTokens - rewardTokens}`}`,
        // Additional Minting parameters
        additionalMintingCountryCode: countryCodeAlpha3,
        additionalMintingPowerId: additionalMintingPower_Id,
        additionalMintingPowerPercentage: additionalMintingPowerPercentage || 0,
        additionalMintingCountryLevelId: additionalMintingCountryLevelId,
      });
    }
    let genActiveCurrentReward: any = null;

    if (isGenActiveReward) {
      genActiveCurrentReward = await this.rewardModel.create({
        machine: machine._id,
        user: machine.user,
        tokenAmount: genActiveRewardTokens,
        totalPrice: genActiveRewardtokenPrice,
        type: CloudKRewardGenerationType.ACTIVE_GEN_REWARD,
        expectedRewardTokens:
          collatoral * (machine.mintingPower + machine.boost),
        expectedRewardTokensActual:
          collatoral *
            (machine.mintingPower + machine.boost) *
            autoCompoundpenaltyCut -
          totalPenalty,
        oldLogicReward: collatoral * (machine.mintingPower + machine.boost),
        productionPenalty: totalPenalty === 1 ? 0 : totalPenalty,
        autoCompoundPenalty: machine.autoCompound
          ? 0
          : collatoral *
            (machine.mintingPower + machine.boost) *
            autoCompoundpenaltyCut,
        forDate,
        dlp,
        capPrice,
        allTimeHigh: ath,
        collatoral,
        tokenPrice: currentPrice,
        autoCompounded: machine.autoCompound,
        job: todaysJob._id,
        currentRule: currentRule,
        priceDropPercentage: priceDropPercentage,
        prevReward: prevReward,
        rewardId: currentReward._id,
        genRewardPercentage: genRewardPercentage ?? null,
        actveGenRewardPercentageId: actveGenRewardPercentageId ?? null,
        note: `Actual Reward Generated: ${rewardTokens} LYK-W ${isGenActiveReward && ` | Gen Active Reward Generated: ${additionalRewardTokens} | ${genRewardPercentage} applied`}`,
      });
    }
    const wallet = await this.walletService.getWalletById(machine.rewardWallet);

    const rewardTokenPrice = currentPrice * rewardTokens;

    // console.log(rewardTokens > 0, machine.autoCompound);

    // reward distubuation
    // //
    if (rewardTokens > 0) {
      const rewardTrx: any = await this.cloudKService.createCloudKTransaction(
        {
          tokenAmount: rewardTokens, // total token generate
          type: CloudKTransactionTypes.DAILY_REWARD, // Credit
          user: machine.user,
          machine: machine._id as Types.ObjectId,
          token: wallet.token as any,
          note: `Rewards AutoLinked in ${machine.uniqueName} - ${machine._id}`,
          totalTokenPrice: rewardTokenPrice, // dollar value of token
          lykPrice: currentPrice,
          reward: currentReward._id as Types.ObjectId,
          additionalMintingRewardId: additionalCurrentReward?._id || null,
          additionalMintingPowerPercentage:
            additionalMintingPowerPercentage ?? null,
          actveGenRewardId: genActiveCurrentReward ?? null,
          genRewardPercentage: genRewardPercentage ?? null,
        },
        // this.session,
      );

      currentReward.cloudKTransaction = rewardTrx[0]?._id || null;
      await currentReward.save();
      // Additional Minting Power Reward

      if (isAdditionalMintingPower) {
        const rewardTrxADM: any =
          await this.cloudKService.createCloudKTransaction({
            tokenAmount: UpdatedAdditionalrewardTokens, // total token generate
            type: CloudKTransactionTypes.ADDITIONAL_MINTING_POWER_REWARD, // Credit
            user: machine.user,
            machine: machine._id as Types.ObjectId,
            token: wallet.token as any,
            note: `Daily reward regerated with additional minting power`,
            remark:
              countryCodeAlpha3 === countriesAllOptions.All
                ? `The reward has been generated with an additional minting power of ${additionalMintingPowerPercentage}% applied.`
                : `The reward has been generated, including ${additionalMintingPowerPercentage}% additional minting power exclusively for ${countryCodeAlpha3}.`,

            totalTokenPrice: UpdatedAdditionalrewardTokens * currentPrice, // dollar value of token
            lykPrice: currentPrice,
            reward: currentReward._id as Types.ObjectId,
            additionalMintingRewardId: additionalCurrentReward?._id || null,
            additionalMintingPowerPercentage:
              additionalMintingPowerPercentage ?? null,
            actveGenRewardId: genActiveCurrentReward ?? null,
            genRewardPercentage: genRewardPercentage ?? null,
          });

        additionalCurrentReward.cloudKTransaction =
          rewardTrxADM[0]?._id || null;
        await additionalCurrentReward.save();
      }

      if (isGenActiveReward) {
        const rewardTrxAGR: any =
          await this.cloudKService.createCloudKTransaction({
            tokenAmount: genActiveRewardTokens, // total token generate
            type: CloudKTransactionTypes.ACTIVE_GEN_REWARD, // Credit
            user: machine.user,
            machine: machine._id as Types.ObjectId,
            token: wallet.token as any,
            note: `Daily reward regerated with active Gen`,
            remark: `The reward has been generated with an active gen of ${genRewardPercentage}% applied.`,
            totalTokenPrice: genActiveRewardtokenPrice * currentPrice, // dollar value of token
            lykPrice: currentPrice,
            reward: currentReward._id as Types.ObjectId,
            additionalMintingRewardId: additionalCurrentReward?._id || null,
            additionalMintingPowerPercentage:
              additionalMintingPowerPercentage ?? null,
            actveGenRewardId: genActiveCurrentReward ?? null,
            genRewardPercentage: genRewardPercentage ?? null,
          });

        genActiveCurrentReward.cloudKTransaction = rewardTrxAGR[0]?._id || null;
        await genActiveCurrentReward.save();
      }

      // if (process.env.NODE_ENV == 'qa-server') {
      // const promises = await Promise.allSettled([
      // await this.baseReferralRewardService.generateCommission(
      //   machine.user,
      //   rewardPriceValue,
      //   rewardTrx[0]._id as Types.ObjectId,
      //   currentPrice,
      //   machine._id as Types.ObjectId,
      //   todaysJob._id as Types.ObjectId,
      // ),
      // await this.builderGenerationRewardService.generateBuilderGenerationReward(
      //   machine.user.toString(),
      //   rewardPriceValue,
      //   rewardTrx[0]._id as Types.ObjectId,
      //   currentPrice,
      //   machine._id as Types.ObjectId,
      // ),
      // ]);
      // }
    }
    // if (!machine.autoCompound) {
    //   machine.claimableRewards = machine.claimableRewards + rewardTokenPrice;
    // }

    // await this.createOrUpdateRewards(
    //   machine.user,
    //   rewardTokenPrice,
    //   new Date(),
    // );

    if (machine.autoCompound) {
      const CheckCollatoralReward = await this.CheckCollatoralReward(
        machine,
        finalRewardTokenPrice,
        finalRewardToken,
      );
      console.log(CheckCollatoralReward, 'CheckCollatoralReward');

      if (
        CheckCollatoralReward.type === 'Update' ||
        CheckCollatoralReward.type === 'limit-reached'
      ) {
        // update reward as climed
        // machine.lifetimeReward = machine.lifetimeReward + rewardTokenPrice;
        machine.lifetimeReward += finalRewardTokenPrice;
        machine.claimableRewards += finalRewardToken;

        currentReward.claimed = true;
        currentReward.autoCompounded = true;
        await currentReward.save();

        if (isAdditionalMintingPower && additionalCurrentReward?._id) {
          additionalCurrentReward.claimed = true;
          additionalCurrentReward.autoCompounded = true;
          await additionalCurrentReward.save();
        }
        if (isGenActiveReward && genActiveCurrentReward?._id) {
          genActiveCurrentReward.claimed = true;
          genActiveCurrentReward.autoCompounded = true;
          await genActiveCurrentReward.save();
        }
        machine.collatoral += finalRewardTokenPrice; // rewardTokenPrice dollar value
        machine.stakedTokenAmount += finalRewardToken;

        const stake = await this.machineStakesModel.create({
          tokenAmount: rewardTokens,
          totalPrice: rewardTokenPrice,
          machine: machine._id,
          type: CLOUDK_MACHINE_STAKE_TYPE.STAKE,
          perTokenPrice: currentPrice,
          user: machine.user,
          from: STAKE_FROM.AUTO_COMPOUND,
          note: 'Daily Reward Regerated and then re-stake for auto compound',
          rewardTransection: currentReward._id,
          actualValue: rewardTokens,
          actualTokenAmount: rewardTokens,
          actualTotalPrice: rewardTokenPrice,
        });
        let additionalStake: any;

        if (isAdditionalMintingPower) {
          additionalStake = await this.machineStakesModel.create({
            tokenAmount: UpdatedAdditionalrewardTokens,
            totalPrice: UpdatedAdditionalrewardTokens * currentPrice,
            machine: machine._id,
            type: CLOUDK_MACHINE_STAKE_TYPE.STAKE,
            perTokenPrice: currentPrice,
            user: machine.user,
            from: STAKE_FROM.ADDITIONAL_MINTING_CLOUDK_REWARD,
            note: 'Additional Minting Power | Daily Reward Regerated and then re-stake for auto compound',
            rewardTransection: additionalCurrentReward._id,
            actualValue: rewardTokens,
            actualTokenAmount: rewardTokens,
            actualTotalPrice: rewardTokenPrice,
          });
        }
        let activeGenStake: any;

        if (isGenActiveReward) {
          activeGenStake = await this.machineStakesModel.create({
            tokenAmount: genActiveRewardTokens,
            totalPrice: genActiveRewardtokenPrice,
            machine: machine._id,
            type: CLOUDK_MACHINE_STAKE_TYPE.STAKE,
            perTokenPrice: currentPrice,
            user: machine.user,
            from: STAKE_FROM.ACTIVE_GEN_REWARD,
            note: `Active Gen Reward | ${genRewardPercentage}% applied | Daily Reward Regerated and then re-stake for auto compound`,
            rewardTransection: genActiveCurrentReward._id,
            actualValue: rewardTokens,
            actualTokenAmount: rewardTokens,
            actualTotalPrice: rewardTokenPrice,
            // activeGenReward: isGenActiveReward?._id,
          });
        }
        this.userGaskModel.create({
          user: new Types.ObjectId(machine.user),
          amount: rewardTokenPrice * multiplier,
          flow: TransactionFlow.IN,
          machine: machine._id,
          from: UserGaskFrom.CLOUDK_REWARD,
          stake: stake._id,
          multiplier: multiplier,
          reward: currentReward._id,
          job: todaysJob._id,
          note: `Rewards AutoLinked in ${machine.uniqueName} - ${machine._id} | ${CheckCollatoralReward.note}`,
        });

        if (isAdditionalMintingPower) {
          this.userGaskModel.create({
            user: new Types.ObjectId(machine.user),
            amount: UpdatedAdditionalrewardTokens * multiplier,
            flow: TransactionFlow.IN,
            from: UserGaskFrom.ADDITIONAL_MINTING_POWER_REWARD,
            machine: machine._id,
            stake: additionalStake._id,
            multiplier: multiplier,
            reward: additionalCurrentReward._id,
            job: todaysJob._id,
            note: `Additional Minting Power | Rewards AutoLinked in ${machine.uniqueName} - ${machine._id} | ${CheckCollatoralReward.note}`,
          });
        }

        if (isGenActiveReward) {
          this.userGaskModel.create({
            user: new Types.ObjectId(machine.user),
            amount: genActiveRewardTokens * multiplier,
            flow: TransactionFlow.IN,
            from: UserGaskFrom.ACTIVE_GEN_REWARD,
            machine: machine._id,
            stake: activeGenStake._id,
            multiplier: multiplier,
            reward: genActiveCurrentReward._id,
            job: todaysJob._id,
            note: `Active Gen Reward | ${genRewardPercentage}% applied | Rewards AutoLinked in ${machine.uniqueName} - ${machine._id} | ${CheckCollatoralReward.note}`,
          });
        }

        if (rewardTokens > 0) {
          if (CheckCollatoralReward.type === 'limit-reached') {
            await this.cloudKService.createCloudKTransaction({
              tokenAmount: finalRewardToken,
              type: CloudKTransactionTypes.DAILY_REWARD_OVERREACHED, // debit for removing reward
              user: machine.user,
              machine: machine._id as Types.ObjectId,
              token: wallet.token as any,
              remark: `${CheckCollatoralReward.note}`,
              note: `Rewards AutoLinked in ${machine.uniqueName} - ${machine._id} | ${CheckCollatoralReward.note}`,
              reward: currentReward._id as Types.ObjectId,
              totalTokenPrice: finalRewardTokenPrice,

              lykPrice: currentPrice,
              additionalMintingRewardId: additionalCurrentReward?._id || null,
              additionalMintingPowerPercentage:
                additionalMintingPowerPercentage ?? null,
              actveGenRewardId: genActiveCurrentReward ?? null,
              genRewardPercentage: genRewardPercentage ?? null,
            });
          }
          await this.cloudKService.createCloudKTransaction({
            tokenAmount: finalRewardToken,
            type: CloudKTransactionTypes.AC_DEBIT, // debit for removing reward
            user: machine.user,
            machine: machine._id as Types.ObjectId,
            totalTokenPrice: finalRewardTokenPrice,

            token: wallet.token as any,
            note: 'DAILY-NODEK-REWARD | auto compound on | debit reward for re-stake',
            reward: currentReward._id as Types.ObjectId,
            lykPrice: currentPrice,
            additionalMintingRewardId: additionalCurrentReward?._id || null,
            additionalMintingPowerPercentage:
              additionalMintingPowerPercentage ?? null,
            actveGenRewardId: genActiveCurrentReward ?? null,
            genRewardPercentage: genRewardPercentage ?? null,
          });

          await this.cloudKService.createCloudKTransaction({
            tokenAmount: finalRewardToken,
            type: CloudKTransactionTypes.SWAPPED,
            user: machine.user,
            machine: machine._id as Types.ObjectId,
            token: machine.stakeToken as any,
            note: 'DAILY-NODEK-REWARD | auto compound on | swap into machine token for staking ',
            reward: currentReward._id as Types.ObjectId,
            totalTokenPrice: finalRewardTokenPrice,

            lykPrice: currentPrice,
            additionalMintingRewardId: additionalCurrentReward?._id || null,
            additionalMintingPowerPercentage:
              additionalMintingPowerPercentage ?? null,
            actveGenRewardId: genActiveCurrentReward ?? null,
            genRewardPercentage: genRewardPercentage ?? null,
          });

          await this.cloudKService.createCloudKTransaction({
            tokenAmount: finalRewardToken,
            type: CloudKTransactionTypes.ADD_STAKE,
            user: machine.user,
            machine: machine._id as Types.ObjectId,
            totalTokenPrice: finalRewardTokenPrice,
            token: machine.stakeToken as any,
            stake: stake._id as Types.ObjectId,
            note: 'for staking',
            reward: currentReward._id as Types.ObjectId,
            lykPrice: currentPrice,
            additionalMintingRewardId: additionalCurrentReward?._id || null,
            additionalMintingPowerPercentage:
              additionalMintingPowerPercentage ?? null,
            actveGenRewardId: genActiveCurrentReward ?? null,
            genRewardPercentage: genRewardPercentage ?? null,
          });
        }
        await machine.save();
        return null;
      } else if (CheckCollatoralReward.type === 'exceeded') {
        const [TransferredMachineData] = await Promise.all([
          this.getUserAllMachinesDataExceptOneMachineById(
            machine.user,
            machine as CloudKMachine,
          ),
        ]);

        if (TransferredMachineData && TransferredMachineData.length > 0) {
          await machine.save();
          await this.cloudKService.createCloudKTransaction({
            tokenAmount: finalRewardToken,
            type: CloudKTransactionTypes.DAILY_REWARDS_EXHAUSTED, // debit for removing reward
            user: machine.user,
            machine: machine._id as Types.ObjectId,
            totalTokenPrice: finalRewardTokenPrice,

            token: wallet.token as any,
            note: `Rewards AutoLinked in ${TransferredMachineData[0].uniqueName} - ${TransferredMachineData[0]._id} | ${CheckCollatoralReward.note}`,
            remark: `Rewards AutoLinked in ${TransferredMachineData[0].uniqueName} - ${TransferredMachineData[0].name}`,
            reward: currentReward._id as Types.ObjectId,
            lykPrice: currentPrice,
            additionalMintingRewardId: additionalCurrentReward?._id || null,
            additionalMintingPowerPercentage:
              additionalMintingPowerPercentage ?? null,
            actveGenRewardId: genActiveCurrentReward ?? null,
            genRewardPercentage: genRewardPercentage ?? null,
          });
          return {
            IsAnyUpdatedId: TransferredMachineData[0]._id as ObjectId,
            fromMachine: machine._id as Types.ObjectId,
            fromMachineUniqueName: machine.uniqueName as string,
            fromMachineName: machine.name as string,
            collatoral:
              finalRewardTokenPrice + TransferredMachineData[0].collatoral || 0,

            todaysJob: todaysJob,
            tokenAmount: finalRewardToken,
            rewardTokenPrice: finalRewardTokenPrice,

            token: wallet.token as any,
            stakeToken: machine.stakeToken as any,
            currentReward_id: currentReward._id as Types.ObjectId,
            user: machine.user,
            lifetimeReward: machine?.lifetimeReward || 0,
            claimableRewards: machine?.claimableRewards || 0,
            multiplier: multiplier,
            currentPrice: currentPrice,
            // Additional Minting Reward
            additionalMintingRewardId: additionalCurrentReward?._id || null,
            additionalMintingPowerPercentage: additionalMintingPowerPercentage,
            isAdditionalMintingPower: isAdditionalMintingPower || false,
            UpdatedAdditionalrewardTokens: isAdditionalMintingPower
              ? UpdatedAdditionalrewardTokens
              : 0,
            // Active Gen Reward
            isGenActiveReward: isGenActiveReward,
            genActiveRewardTokens: genActiveRewardTokens,
            actveGenRewardId: genActiveCurrentReward?._id || null,
            genRewardPercentage: genRewardPercentage,
          };
        } else {
          machine.lifetimeReward += finalRewardTokenPrice;
          machine.claimableRewards += finalRewardTokenPrice;

          // machine.lifetimeReward = machine.lifetimeReward + rewardTokenPrice;
          // machine.claimableRewards =
          //   machine.claimableRewards + rewardTokenPrice;
          currentReward.claimed = false;
          currentReward.autoCompounded = false;
          await currentReward.save();
          if (isAdditionalMintingPower && additionalCurrentReward?._id) {
            additionalCurrentReward.claimed = false;
            additionalCurrentReward.autoCompounded = false;
            await additionalCurrentReward.save();
          }
          if (isGenActiveReward && genActiveCurrentReward?._id) {
            genActiveCurrentReward.claimed = false;
            genActiveCurrentReward.autoCompounded = false;
            await genActiveCurrentReward.save();
          }
          machine.autoCompound = false;
          await machine.save();
          const autoComponantInactive =
            await this.cloudKService.setUserGlobalAutoCompound(
              machine.user,
              false,
            );
          await this.cloudKService.createCloudKTransaction({
            tokenAmount: finalRewardToken,
            type: CloudKTransactionTypes.DAILY_REWARDS_EXHAUSTED,
            user: machine.user,
            machine: machine._id as Types.ObjectId,
            token: wallet.token as any,
            remark: cloudKTransactionRemarks.DAILY_REWARDS_EXHAUSTED,
            note: `Rewards AutoLinked in ${machine.uniqueName} - ${machine._id} | ${cloudKTransactionRemarks.DAILY_REWARDS_EXHAUSTED}`,
            totalTokenPrice: finalRewardTokenPrice,

            lykPrice: currentPrice,
            reward: currentReward._id as Types.ObjectId,
            additionalMintingRewardId: additionalCurrentReward?._id || null,
            additionalMintingPowerPercentage:
              additionalMintingPowerPercentage ?? null,
            actveGenRewardId: genActiveCurrentReward ?? null,
            genRewardPercentage: genRewardPercentage ?? null,
          });

          return null;
        }
      } else {
        machine.lifetimeReward += finalRewardTokenPrice;

        machine.claimableRewards += finalRewardTokenPrice;

        // machine.lifetimeReward = machine.lifetimeReward + rewardTokenPrice;
        // machine.claimableRewards = machine.claimableRewards + rewardTokenPrice;
        await machine.save();
        return null;
      }
    } else {
      machine.lifetimeReward += finalRewardTokenPrice;

      machine.claimableRewards += finalRewardTokenPrice;
      // machine.lifetimeReward = machine.lifetimeReward + rewardTokenPrice;
      // machine.claimableRewards = machine.claimableRewards + rewardTokenPrice;
      await machine.save();
      return null;
    }

    // const aRewardValue = await this.cloudKService.getRewardTokenValues('');
    // if (aRewardValue && aRewardValue.length > 0) {
    //   for (const reward of aRewardValue) {
    //     await this.cloudKService.updateCloudkMachineRewardValue(reward);
    //   }
    // }
    // return currentReward;
  }

  // Check Daily Generated Reward Type
  async CheckCollatoralReward(
    machine: CloudKMachine,
    rewardTokenPrice: number,
    tokenStakedAmount: number,
  ): Promise<{
    type: 'Update' | 'exceeded' | 'limit-reached';
    note: string;
    updatedCollateral: number;
    updatedStakedTokenAmount: number;
  }> {
    const { collatoral, stakeLimit, stakeUnlimited, stakedTokenAmount } =
      machine;
    // Calculate the updated collateral with the reward added
    const updatedCollateral = collatoral + rewardTokenPrice;
    const updatedStakedTokenAmount = stakedTokenAmount + tokenStakedAmount;

    // If stake is unlimited, return 'Update' with updated collateral
    if (stakeUnlimited) {
      return {
        type: 'Update',
        updatedCollateral,
        updatedStakedTokenAmount,
        note: 'Your reward has been successfully added. Your collateral remains within the allowed limit.',
      };
    }

    // Check if updated collateral is within the stake limit
    if (stakeLimit !== null && updatedCollateral <= stakeLimit) {
      return {
        type: 'Update',
        updatedCollateral,
        updatedStakedTokenAmount,
        note: 'Your reward has been successfully added. Your collateral is still within the stake limit.',
      };
    }

    // Check if current collateral is within the stake limit but updated collateral exceeds it
    if (stakeLimit !== null && collatoral <= stakeLimit) {
      return {
        type: 'limit-reached',
        updatedCollateral,
        updatedStakedTokenAmount,
        note: 'Your reward has been partially added. The updated collateral now exceeds the stake limit.',
      };
    }

    // If collateral already exceeds stake limit
    return {
      type: 'exceeded',
      updatedCollateral,
      updatedStakedTokenAmount,
      note: 'Your reward could not be added as the collateral already exceeds the stake limit',
    };
  }

  async ExcessRewardDistribution({
    IsAnyUpdatedId,
    fromMachine,
    fromMachineUniqueName,
    fromMachineName,
    collatoral,
    todaysJob,
    tokenAmount,
    rewardTokenPrice, //Exceed Reward from Previous Machine
    token,
    stakeToken,
    currentReward_id,
    user,
    lifetimeReward,
    claimableRewards,
    multiplier,
    currentPrice,
    //Active Gen reward
    genActiveRewardTokens,
    isGenActiveReward,
    actveGenRewardId,
    genRewardPercentage,
    //Additional Minting reward
    UpdatedAdditionalrewardTokens,
    additionalMintingPowerPercentage,
    isAdditionalMintingPower,
    additionalMintingRewardId,
  }: CloudKRewardExcessDistributionInterface): Promise<boolean> {
    try {
      console.log('isAdditionalMintingPower:', isAdditionalMintingPower);
      let machines = await this.machineModel.findOne({
        status: CLOUDK_MACHINE_STATUS.ACTIVE,
        _id: IsAnyUpdatedId,
        $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
        stakeLimit: { $exists: true, $gt: 0 },
        $expr: { $lt: ['$collatoral', '$stakeLimit'] }, // Compare fields using $expr
      });

      if (!machines) {
        machines = await this.machineModel.findOne({
          status: CLOUDK_MACHINE_STATUS.ACTIVE,
          _id: IsAnyUpdatedId,
          $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
          stakeLimit: { $exists: true, $gte: 0 },
          stakeUnlimited: true,
        });
      }
      if (machines) {
        const CheckCollatoralReward = await this.CheckCollatoralReward(
          machines,
          // rewardTokenPrice,
          // tokenAmount,

          rewardTokenPrice,
          tokenAmount,
        );

        if (
          CheckCollatoralReward.type === 'Update' ||
          CheckCollatoralReward.type === 'limit-reached'
        ) {
          // machines.lifetimeReward = machines.lifetimeReward + rewardTokenPrice;
          machines.collatoral = CheckCollatoralReward.updatedCollateral;
          machines.stakedTokenAmount =
            CheckCollatoralReward.updatedStakedTokenAmount;

          machines.lifetimeReward += rewardTokenPrice;

          machines.claimableRewards += rewardTokenPrice;

          machines.save();
          await this.rewardModel.findOneAndUpdate(
            { _id: currentReward_id },
            { claimed: true },
            { new: true },
          );
          if (isAdditionalMintingPower) {
            await this.rewardModel.findOneAndUpdate(
              { _id: additionalMintingRewardId },
              { claimed: true },
              { new: true },
            );
          }
          if (isGenActiveReward) {
            await this.rewardModel.findOneAndUpdate(
              { _id: actveGenRewardId },
              { claimed: true },
              { new: true },
            );
          }
          await this.cloudKService.createCloudKTransaction({
            tokenAmount: tokenAmount,
            type: CloudKTransactionTypes.TRANSFER_REWARD,
            user: machines.user,
            machine: machines._id as Types.ObjectId,
            fromMachine: fromMachine as any,
            totalTokenPrice: rewardTokenPrice,
            token: token as Types.ObjectId,
            note: `AutoLink rewards from ${fromMachineUniqueName} - ${fromMachine} | ${CheckCollatoralReward.note}`,
            remark: `AutoLink rewards from ${fromMachineUniqueName} - ${fromMachineName}`,
            reward: currentReward_id,
            lykPrice: todaysJob.tokenPrice,

            additionalMintingRewardId: additionalMintingRewardId ?? null,
            additionalMintingPowerPercentage:
              additionalMintingPowerPercentage ?? null,
            actveGenRewardId: actveGenRewardId ?? null,
            genRewardPercentage: genRewardPercentage ?? null,
          });

          // Create Stacking for new reward to be added to Another Machine
          const stake = await this.machineStakesModel.create({
            tokenAmount: tokenAmount,
            totalPrice: rewardTokenPrice,
            machine: machines._id,
            fromMachine: fromMachine as any,
            type: CLOUDK_MACHINE_STAKE_TYPE.STAKE,
            perTokenPrice: todaysJob.tokenPrice,
            user: machines.user,
            from: STAKE_FROM.AUTO_COMPOUND,
            remark: `AutoLink rewards from ${fromMachineUniqueName} - ${fromMachineName}`,
            note: `AutoLink rewards from ${fromMachineUniqueName} - ${fromMachine} | Daily Reward Regerated and then re-stake for auto compound`,
            rewardTransection: currentReward_id,
          });

          let additionalStake: any;
          let activeGenStake: any;
          if (isAdditionalMintingPower) {
            additionalStake = await this.machineStakesModel.create({
              tokenAmount: UpdatedAdditionalrewardTokens,
              totalPrice: UpdatedAdditionalrewardTokens * currentPrice,
              machine: machines._id,
              type: CLOUDK_MACHINE_STAKE_TYPE.STAKE,
              perTokenPrice: currentPrice,
              user: machines.user,
              from: STAKE_FROM.ADDITIONAL_MINTING_CLOUDK_REWARD,
              note: 'Additional Minting Power | Daily Reward Regerated and then re-stake for auto compound',
              rewardTransection: additionalMintingRewardId,
              actualValue: tokenAmount,
              actualTokenAmount: tokenAmount,
              actualTotalPrice: rewardTokenPrice,
            });
          }
          if (isGenActiveReward) {
            activeGenStake = await this.machineStakesModel.create({
              tokenAmount: genActiveRewardTokens,
              totalPrice: genActiveRewardTokens * currentPrice,
              machine: machines._id,
              type: CLOUDK_MACHINE_STAKE_TYPE.STAKE,
              perTokenPrice: currentPrice,
              user: machines.user,
              from: STAKE_FROM.ACTIVE_GEN_REWARD,
              note: `Active Gen Reward | ${genRewardPercentage}% applied | Daily Reward Regerated and then re-stake for auto compound`,
              rewardTransection: actveGenRewardId,
              actualValue: tokenAmount,
              actualTokenAmount: tokenAmount,
              actualTotalPrice: rewardTokenPrice,
            });
          }

          await this.cloudKService.createCloudKTransaction({
            tokenAmount: tokenAmount,
            type: CloudKTransactionTypes.AC_DEBIT, // debit for removing reward
            user: machines.user,
            machine: machines._id as Types.ObjectId,
            fromMachine: fromMachine as any,
            totalTokenPrice: rewardTokenPrice,
            token: token as Types.ObjectId,
            remark: `AutoLink rewards from ${fromMachineUniqueName} - ${fromMachineName}`,
            note: `AutoLink rewards from ${fromMachineUniqueName} - ${fromMachine} | DAILY-NODEK-REWARD | auto compound on | debit reward for re-stake`,
            reward: currentReward_id,
            lykPrice: todaysJob.tokenPrice,
            additionalMintingRewardId: additionalMintingRewardId ?? null,
            additionalMintingPowerPercentage:
              additionalMintingPowerPercentage ?? null,
            actveGenRewardId: actveGenRewardId ?? null,
            genRewardPercentage: genRewardPercentage ?? null,
          });

          await this.cloudKService.createCloudKTransaction({
            // tokenAmount: tokenAmount,
            tokenAmount: tokenAmount,
            type: CloudKTransactionTypes.SWAPPED,
            user: machines.user,
            machine: machines._id as Types.ObjectId,
            fromMachine: fromMachine as any,
            token: stakeToken as Types.ObjectId,
            remark: `AutoLink rewards from ${fromMachineUniqueName} - ${fromMachineName}`,
            note: `AutoLink rewards from ${fromMachineUniqueName} - ${fromMachine} | DAILY-NODEK-REWARD | auto compound on | swap into machine token for staking`,
            reward: currentReward_id,
            totalTokenPrice: rewardTokenPrice,

            lykPrice: todaysJob.tokenPrice,
            additionalMintingRewardId: additionalMintingRewardId ?? null,
            additionalMintingPowerPercentage:
              additionalMintingPowerPercentage ?? null,
            actveGenRewardId: actveGenRewardId ?? null,
            genRewardPercentage: genRewardPercentage ?? null,
          });
          await this.cloudKService.createCloudKTransaction({
            tokenAmount: tokenAmount,
            type: CloudKTransactionTypes.ADD_STAKE,
            user: machines.user,
            machine: machines._id as Types.ObjectId,
            fromMachine: fromMachine as any,
            totalTokenPrice: rewardTokenPrice,

            token: stakeToken as Types.ObjectId,
            stake: stake._id as Types.ObjectId,
            remark: `AutoLink rewards from ${fromMachineUniqueName} - ${fromMachineName}`,
            note: `AutoLink rewards from ${fromMachineUniqueName} - ${fromMachine} | for staking`,
            reward: currentReward_id,
            lykPrice: todaysJob.tokenPrice,
            additionalMintingRewardId: additionalMintingRewardId ?? null,
            additionalMintingPowerPercentage:
              additionalMintingPowerPercentage ?? null,
            actveGenRewardId: actveGenRewardId ?? null,
            genRewardPercentage: genRewardPercentage ?? null,
          });
          this.userGaskModel.create({
            user: new Types.ObjectId(machines.user),
            amount: rewardTokenPrice * multiplier,
            flow: TransactionFlow.IN,
            from: UserGaskFrom.CLOUDK_REWARD,
            machine: machines._id,
            fromMachine: fromMachine as any,
            stake: stake._id,
            multiplier: multiplier,
            reward: currentReward_id,
            job: todaysJob._id,
            note: `AutoLink rewards from ${fromMachineUniqueName} - ${fromMachine} | ${CheckCollatoralReward.note}`,
          });
          if (isAdditionalMintingPower) {
            this.userGaskModel.create({
              user: new Types.ObjectId(machines.user),
              amount: UpdatedAdditionalrewardTokens * multiplier,
              flow: TransactionFlow.IN,
              from: UserGaskFrom.ADDITIONAL_MINTING_POWER_REWARD,
              machine: machines._id,
              stake: additionalStake._id,
              multiplier: multiplier,
              reward: additionalMintingRewardId,
              job: todaysJob._id,
              note: `Additional Minting Power | Rewards AutoLinked in ${fromMachineUniqueName} - ${fromMachine} | ${CheckCollatoralReward.note}`,
            });
          }
          if (isGenActiveReward) {
            this.userGaskModel.create({
              user: new Types.ObjectId(machines.user),
              amount: genActiveRewardTokens * multiplier,
              flow: TransactionFlow.IN,
              from: UserGaskFrom.ACTIVE_GEN_REWARD,
              machine: machines._id,
              stake: activeGenStake._id,
              multiplier: multiplier,
              reward: actveGenRewardId,
              job: todaysJob._id,
              note: `Active Gen Reward | ${genRewardPercentage}% applied | Rewards AutoLinked in ${fromMachineUniqueName} - ${fromMachine} | ${CheckCollatoralReward.note}`,
            });
          }
          return true;
        } else if (CheckCollatoralReward.type === 'exceeded') {
          const [TransferredMachineData] = await Promise.all([
            this.getUserAllMachinesDataExceptOneMachineById(
              user,
              machines as CloudKMachine,
            ),
          ]);

          if (TransferredMachineData.length > 0) {
            await this.ExcessRewardDistribution({
              IsAnyUpdatedId: TransferredMachineData[0]._id as Types.ObjectId,
              fromMachine: fromMachine,
              fromMachineUniqueName: fromMachineUniqueName,
              fromMachineName: fromMachineName,
              collatoral: collatoral,
              todaysJob: todaysJob,
              tokenAmount: tokenAmount,
              rewardTokenPrice: rewardTokenPrice,
              token: token,
              stakeToken: stakeToken,
              currentReward_id: currentReward_id,
              user: user,
              lifetimeReward: lifetimeReward,
              claimableRewards: claimableRewards,
              multiplier: multiplier,
              currentPrice: currentPrice,
              // Additional Minting Reward
              UpdatedAdditionalrewardTokens: UpdatedAdditionalrewardTokens,
              additionalMintingRewardId: additionalMintingRewardId,
              additionalMintingPowerPercentage:
                additionalMintingPowerPercentage,
              isAdditionalMintingPower: isAdditionalMintingPower,
              // Gen Active Reward
              genActiveRewardTokens: genActiveRewardTokens,
              actveGenRewardId: actveGenRewardId,
              genRewardPercentage: genRewardPercentage,
              isGenActiveReward: isGenActiveReward,
            });
          } else {
            const rewardTokenPriceSet = rewardTokenPrice;

            await this.machineModel.findOneAndUpdate(
              { _id: fromMachine },
              {
                autoCompound: false,
                lifetimeReward: lifetimeReward + rewardTokenPriceSet,
                claimableRewards: claimableRewards + rewardTokenPriceSet,
              },
              { new: true },
            );
            await machines.save();
            const autoComponantInactive =
              await this.cloudKService.setUserGlobalAutoCompound(
                machines.user,
                false,
              );
            await this.cloudKService.createCloudKTransaction({
              tokenAmount: tokenAmount,
              type: CloudKTransactionTypes.DAILY_REWARDS_EXHAUSTED,
              user: user,
              machine: IsAnyUpdatedId as Types.ObjectId,
              fromMachine: fromMachine as any,
              token: token as any,
              remark: cloudKTransactionRemarks.DAILY_REWARDS_EXHAUSTED,
              note: `Transfer Rewards Autolink from ${fromMachine} | All your machines have exhausted their linking limits. Purchase a new machine to continue earning 100% rewards.`,
              totalTokenPrice: rewardTokenPrice,
              lykPrice: todaysJob.tokenPrice,
              reward: currentReward_id as Types.ObjectId,
              additionalMintingRewardId: additionalMintingRewardId ?? null,
              additionalMintingPowerPercentage:
                additionalMintingPowerPercentage ?? null,
              actveGenRewardId: actveGenRewardId ?? null,
              genRewardPercentage: genRewardPercentage ?? null,
            });
          }
          return false;
        }
      }
    } catch (error) {
      return error;
    }
  }

  async getUserAllMachinesDataExceptOneMachineById(
    userId: Types.ObjectId,
    machine: CloudKMachine,
  ): Promise<CloudKMachine[]> {
    const date = await getCurrentDay();
    const findFilter: FilterQuery<CloudKMachine> = {
      user: userId,
      _id: { $ne: machine._id },
      $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
      stakeLimit: { $exists: true, $gt: 0 },
      stakeUnlimited: false,
      endDate: { $gt: date.startDate },
      $expr: { $lt: ['$collatoral', '$stakeLimit'] }, // Compare fields using $expr
      status: CLOUDK_MACHINE_STATUS.ACTIVE,
    };

    let machines = await this.machineModel
      .find(findFilter)
      .sort({ mintingPower: 1 })
      .populate('stakeToken');
    if (machines.length === 0) {
      findFilter.stakeUnlimited = true;
      delete findFilter.stakeLimit;
      delete findFilter.$expr;
      machines = await this.machineModel
        .find(findFilter)
        .sort({ mintingPower: 1 })
        .populate('stakeToken');
    }
    return machines;
  }

  async getMachineChunksQuery(limit: number = 100000) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Count the total number of active machines
    const totalMachines = await this.machineModel.countDocuments({
      status: CLOUDK_MACHINE_STATUS.ACTIVE,
      endDate: { $gte: new Date() },
      startDate: { $lt: today },
      $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
    });

    // Calculate the total number of pages
    const totalPages = Math.ceil(totalMachines / limit);

    // Generate the list of query objects
    const queries = Array.from({ length: totalPages }, (_, i) => ({
      page: i + 1,
      limit,
    }));

    return queries;
  }

  async getOrCreateCurrentJOb(totalMachines, tokenPrice) {
    const todaysJob = await this.dailyJobModel.create({
      startTime: new Date(),
      totalMachines: totalMachines,
      tokenPrice: tokenPrice,
    });

    return todaysJob;
  }

  //Check user get reward todays job

  async isMachineGetRewardToday(machine: Types.ObjectId): Promise<boolean> {
    const data = await this.cloudkTransactionModel.findOne({
      machine: machine,
      type: CloudKTransactionTypes.DAILY_REWARD,
      createdAt: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0)),
        $lt: new Date(new Date().setHours(23, 59, 59, 999)),
      },
    });
    return data ? true : false;
  }
  async getDailyReportOfTheTokenWhenStartRewardService() {
    const dailyReport = await this.dailyJobModel.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, // Group by date
          tokenPrice: { $push: '$tokenPrice' }, // Collect all prices of the date
        },
      },
      {
        $sort: { _id: 1 }, // Sort by date ascending
      },
      {
        $setWindowFields: {
          sortBy: { _id: 1 }, // Sort again by date
          output: {
            previousPrice: {
              $shift: { output: { $arrayElemAt: ['$tokenPrice', 0] }, by: -1 }, // Get the previous day's price as a scalar
            },
            previousDate: {
              $shift: { output: '$_id', by: -1 }, // Get the previous day's date
            },
          },
        },
      },
      {
        $project: {
          date: '$_id',
          price: { $arrayElemAt: ['$tokenPrice', 0] }, // Get today's price
          previousDate: 1, // Include previous date
          previousPrice: 1, // Include previous price
          change: {
            $cond: [
              { $gt: [{ $arrayElemAt: ['$tokenPrice', 0] }, '$previousPrice'] }, // Corrected comparison
              'Increased',
              {
                $cond: [
                  {
                    $lt: [
                      { $arrayElemAt: ['$tokenPrice', 0] },
                      '$previousPrice',
                    ],
                  },
                  'Decreased',
                  'No Change',
                ],
              },
            ],
          },
        },
      },
    ]);
    return dailyReport;
  }
  getTodayJobs = async () => {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));
    const todayEntries = await this.cloudKDailyJobModel.find({
      createdAt: { $gte: startOfDay, $lte: endOfDay },
      supernode: false,
      deletedAt: null,
    });
    return todayEntries;
  };

  getJobsByDateRange = async (startDate, endDate) => {
    const startOfDay = new Date(new Date(startDate).setHours(0, 0, 0, 0));
    const endOfDay = new Date(new Date(endDate).setHours(23, 59, 59, 999));
    const dateRangeEntries = await this.cloudKDailyJobModel.find({
      createdAt: { $gte: startOfDay, $lte: endOfDay },
      supernode: false,
      deletedAt: null,
    });
    return dateRangeEntries;
  };

  async logErrorsToJob(jobId: Types.ObjectId, errorMessage: string) {
    await this.cloudKDailyJobModel.findByIdAndUpdate(
      jobId,
      {
        error: JSON.stringify(errorMessage), // Update the error field with the new error message
      },
      { new: true, useFindAndModify: false },
    );
  }

  async generateSuperNodeReward(bid = null) {
    const getAllDailyJob = await this.getTodayJobs();
    let userID = null;
    if (bid) {
      const userData = await this.userModel.findOne({ blockchainId: bid });
      if (userData) userID = userData._id;
    }

    // const startDate = '2024-12-05';
    // const endDate = '2024-12-06';
    // const getAllDailyJob = await this.getJobsByDateRange(startDate, endDate);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isLastDayOfMonth =
      today.getDate() ===
      new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

    for (let index = 0; index < getAllDailyJob.length; index++) {
      const job = getAllDailyJob[index];
      job.baseReferralStartTime = new Date();
      const queryConditions: any = {
        job: job._id,
        deletedAt: null,
        type: {
          $nin: [
            CloudKRewardGenerationType.ADDITIONAL_MINTING_REWARD,
            CloudKRewardGenerationType.ACTIVE_GEN_REWARD,
          ],
        },
      };
      if (userID) {
        queryConditions.user = userID; // Add user filter only if userID exists
      }
      const allRewards = await this.cloudKRewardModel.find(queryConditions);

      const errorIds = [];
      const BATCH_SIZE = 2000; // Define the batch size
      const batches = Math.ceil(allRewards.length / BATCH_SIZE);

      // for base referal
      job.baseReferralStartTime = new Date();

      for (let batchIndex = 0; batchIndex < batches; batchIndex++) {
        const batch = allRewards.slice(
          batchIndex * BATCH_SIZE,
          (batchIndex + 1) * BATCH_SIZE,
        );
        const promises: any = [];
        for (let index = 0; index < batch.length; index++) {
          const rewardItem: any = batch[index];
          if (!rewardItem.cloudKTransaction) {
            errorIds.push(rewardItem._id);
            continue; // Skip the reward item if there's no transaction
          }

          // promises.push(
          //   this.baseReferralRewardService.generateCommission(rewardItem),
          // );
          // TODO: Temporarily disabled. Re-enable after optimizing Builder Referral logic.
          // if (process.env.NODE_ENV == 'qa-server') {
          //   if (isLastDayOfMonth) {
          //     promises.push(
          //       this.builderReferralService.setBuilderReferralEligibility(
          //         rewardItem.user,
          //       ),
          //     );
          //   }
          // }
        }

        // Wait for all promises to finish
        await Promise.all(promises);
      }

      job.baseReferralEndTime = new Date();
      job.baseReferralTimeTaken = await calculateTimeDifference(
        job.baseReferralStartTime,
        job.baseReferralEndTime,
      );

      job.builderGenerationStartTime = new Date();
      // For the builder generations

      for (let batchIndex = 0; batchIndex < batches; batchIndex++) {
        const batch = allRewards.slice(
          batchIndex * BATCH_SIZE,
          (batchIndex + 1) * BATCH_SIZE,
        );
        const promises: any = [];
        for (let index = 0; index < batch.length; index++) {
          const rewardItem: any = batch[index];
          if (!rewardItem.cloudKTransaction) {
            errorIds.push(rewardItem._id);
            continue; // Skip the reward item if there's no transaction
          }
          promises
            .push
            // this.builderGenerationRewardService.generateBuilderGenerationReward(
            //   rewardItem.user,
            //   rewardItem.totalPrice,
            //   rewardItem.cloudKTransaction as Types.ObjectId,
            //   rewardItem.tokenPrice,
            //   rewardItem.machine as Types.ObjectId,
            //   rewardItem.job as Types.ObjectId,
            //   rewardItem._id as Types.ObjectId,
            // ),
            ();
        }

        // Wait for all promises to finish
        await Promise.all(promises);
      }

      job.builderGenerationEndTime = new Date();
      job.builderGenerationTimeTaken = await calculateTimeDifference(
        job.builderGenerationStartTime,
        job.builderGenerationEndTime,
      );
      // // for the maching bonus transaction

      // //fetch the snBonus transaction using JobId

      job.matchingBonusStartTime = new Date();
      const allSnBonusTransaction = await this.snBonusTransaction.find({
        job: job._id,
        isMachingBonus: true,
        receivable: false,
        machingBonusStatus: 'pending',
        deletedAt: null,
      });

      // // team Production
      // // const TperrorIds = [];
      // // const TP_BATCH_SIZE = 2000; //
      // // const tPbatches = Math.ceil(allRewards.length / TP_BATCH_SIZE);
      // // for (let batchIndex = 0; batchIndex < tPbatches; batchIndex++) {
      // //   const batch = allRewards.slice(
      // //     batchIndex * TP_BATCH_SIZE,
      // //     (batchIndex + 1) * TP_BATCH_SIZE,
      // //   );
      // //   const promiseData: any = [];
      // //   for (let index = 0; index < batch.length; index++) {
      // //     const rewardItem: any = batch[index];
      // //     if (!rewardItem.cloudKTransaction) {
      // //       TperrorIds.push(rewardItem._id);
      // //       continue; // Skip the reward item if there's no transaction
      // //     }
      // //     const dailyTeamTotalProductionPromise: any =
      // //       await this.superNoderService.getDailyTeamTotalProduction(
      // //         rewardItem.user,
      // //       );

      // //     promiseData.push(
      // //       this.superNoderService.createOrUpdateTeamProducation({
      // //         user: rewardItem.user, // or use `currentUpline._id` if applicable
      // //         firstLineProduction:
      // //           dailyTeamTotalProductionPromise.firstLineProduction,
      // //         teamProduction: dailyTeamTotalProductionPromise.teamProduction,
      // //       }),
      // //     );
      // //   }

      // //   // Wait for all promises to finish
      // //   await Promise.all(promiseData);
      // // }

      const snerrorIds = [];
      const SN_BATCH_SIZE = 2000; // Define the batch size
      const sn_batches = Math.ceil(
        allSnBonusTransaction.length / SN_BATCH_SIZE,
      );

      for (let batchIndex = 0; batchIndex < sn_batches; batchIndex++) {
        const batch = allSnBonusTransaction.slice(
          batchIndex * SN_BATCH_SIZE,
          (batchIndex + 1) * SN_BATCH_SIZE,
        );
        const promises: any = [];
        for (let index = 0; index < batch.length; index++) {
          const snTransactionItem: any = batch[index];

          promises.push(
            this.builderGenerationRewardService.machingBonusGlobalEligibilityCheck(
              snTransactionItem,
            ),
          );
          // if (process.env.NODE_ENV == 'qa-server') {
          //   if (isLastDayOfMonth) {
          //     promises.push(
          //       this.builderReferralService.setBuilderReferralEligibility(
          //         rewardItem.user,
          //       ),
          //     );
          //   }
          // }
        }

        // Wait for all promises to finish
        await Promise.all(promises);
      }

      job.supernode = true;
      // job.matchingBonusEndTime = new Date();
      job.matchingBonusTimeTaken = await calculateTimeDifference(
        job.matchingBonusStartTime,
        job.matchingBonusEndTime,
      );
      await job.save();
    }
    return true;
  }

  async findRewardsByDateRange(from: Date, to: Date): Promise<CloudKReward[]> {
    try {
      console.log(
        `Fetching rewards from ${from.toISOString()} to ${to.toISOString()}`,
      );

      const rewards = await this.cloudKRewardModel
        .find({
          createdAt: {
            $gte: from,
            $lte: to,
          },
          deletedAt: null,
        })
        .exec();
      console.log('Fetched rewards:', rewards.length);
      return rewards;
    } catch (error) {
      console.error('Error fetching reward:', error);
      throw error;
    }
  }

  async getRewardStakedUserMachine() {
    console.log('Starting getRewardStakedUserMachine process...');
    const today = new Date();
    const currentdate = Math.floor(today.getTime() / 1000);

    const job = new this.nodekRewardJobModel({
      startTime: new Date(),
      path: path.join(process.cwd(), `rewards-${currentdate}.json`),
      success: false,
    });

    const { startDate, endDate } = getDateRange(DateFilter.TODAY);

    // Calculate total reward and daily reward for each machine using aggregation
    const machineRewards = await this.cloudkRewardModel.aggregate([
      {
        $match: {
          deletedAt: null,
        },
      },
      {
        $group: {
          _id: '$machine',
          totalReward: { $sum: '$tokenAmount' },
          dailyReward: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gte: ['$createdAt', startDate] },
                    { $lt: ['$createdAt', endDate] },
                  ],
                },
                '$tokenAmount',
                0,
              ],
            },
          },
          users: { $addToSet: '$user' },
        },
      },
    ]);

    console.log('Calculated total and daily rewards.');

    const machineStakes = await this.CloudKMachineStakeModel.aggregate([
      {
        $match: {
          deletedAt: null,
        },
      },
      {
        $group: {
          _id: '$machine',
          totalStake: { $sum: '$tokenAmount' },
          dailyStake: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gte: ['$createdAt', startDate] },
                    { $lt: ['$createdAt', endDate] },
                  ],
                },
                '$tokenAmount',
                0,
              ],
            },
          },
        },
      },
    ]);

    const machineIds = machineRewards.map((r) => r._id.toString());
    const machines = await this.cloudkMachineModel
      .find({ _id: { $in: machineIds } })
      .lean();

    const userIds = [
      ...new Set(
        machineRewards.flatMap((r) => r.users.map((user) => user.toString())),
      ),
    ];
    const users = await this.userModel.find({ _id: { $in: userIds } }).lean();

    const finalOutput = machineRewards.map((reward) => {
      const machine = machines.find(
        (m) => m._id.toString() === reward._id.toString(),
      );
      const user = users.find((u) =>
        reward.users.map((user) => user.toString()).includes(u._id.toString()),
      );
      const stake = machineStakes.find(
        (s) => s._id.toString() === reward._id.toString(),
      );

      return {
        username: user ? user.username : null,
        email: user ? user.email : null,
        userbid: user ? user.blockchainId : null,
        machineName: machine ? machine.name : null,
        uniqueName: machine ? machine.uniqueName : null,
        totalReward: reward.totalReward,
        dailyReward: reward.dailyReward,
        totalStaked: stake ? stake.totalStake : 0,
        dailyStaked: stake ? stake.dailyStake : 0,
      };
    });
    const filePath = path.join(process.cwd(), `rewards-${currentdate}.json`);
    fs.writeFileSync(filePath, JSON.stringify(finalOutput, null, 2), 'utf-8');
    console.log('Data written to file:', filePath);

    job.endTime = new Date();
    job.remainingTime =
      (job.endTime.getTime() - job.startTime.getTime()) / 1000;
    job.success = true;
    await job.save();
    return {
      path: path.join(process.cwd(), `rewards-${currentdate}.json`),
    };
  }

  // Define proper interfaces

  // async getAdditionalMintingPowerValidatorOLD(): Promise<any[]> {
  //   try {
  //     const { startDate: now } = await getCurrentDay();
  //     // Define the aggregation pipeline (without the date filtering $match stage)
  //     const cloudKProductPipeline: any[] = [
  //       {
  //         $match: {
  //           additionalMintingPowerStatus: AdditionalMintingPromotionStatus.ACTIVE,
  //           startDatePromotion: {
  //             $lt: new Date('2025-03-03T20:00:00.000Z'),
  //           },
  //           endDatePromotion: {
  //             $gt: new Date('2025-03-03T20:00:00.000Z'),
  //           },
  //         },
  //       },
  //       {
  //         $lookup: {
  //           from: 'additionalmintingpowers',
  //           localField: 'additionalMintingPowerId',
  //           foreignField: '_id',
  //           as: 'mintingPowerDetails',
  //         },
  //       },
  //       {
  //         $unwind: {
  //           path: '$mintingPowerDetails',
  //           preserveNullAndEmptyArrays: true,
  //         },
  //       },
  //       {
  //         $project: {
  //           _id: 1,
  //           additionalMintingPowerId: 1,
  //           additionalMintingPowerStatus: 1,
  //           additionalMintingPowerPercentage: 1,
  //           startDatePromotion: '$mintingPowerDetails.startDatePromotion',
  //           endDatePromotion: '$mintingPowerDetails.endDatePromotion',
  //         },
  //       },
  //     ];

  //     // Execute aggregation
  //     const allProducts: any[] = await this.cloudKService.productsModel
  //       .aggregate(cloudKProductPipeline)
  //       .exec();

  //     const activeProducts: any = [];
  //     if (allProducts.length > 0) {
  //       const now = new Date().toISOString().split('T')[0]; // Get current date (YYYY-MM-DD)

  //       // Process each product sequentially
  //       for (const product of allProducts) {
  //         const startDate =
  //           product.startDatePromotion instanceof Date
  //             ? product.startDatePromotion.toISOString().split('T')[0]
  //             : typeof product.startDatePromotion === 'string'
  //               ? (product.startDatePromotion as string).split('T')[0]
  //               : null;

  //         const endDate =
  //           product.endDatePromotion instanceof Date
  //             ? product.endDatePromotion.toISOString().split('T')[0]
  //             : typeof product.endDatePromotion === 'string'
  //               ? (product.endDatePromotion as string).split('T')[0]
  //               : null;

  //         if (now < startDate) {
  //           // return 'upcoming'  Future promotion
  //         } else if (now > endDate) {
  //           // return 'expired'  expired promotion
  //           await this.additionalMintingPowerModel.findByIdAndUpdate(
  //             {
  //               _id: product.additionalMintingPowerId,
  //             },
  //             {
  //               stoppedDate: new Date(),
  //               isExpired: true,
  //               status: AdditionalMintingPromotionStatus.INACTIVE,
  //               note: `Additional minting power setting is automatically Expired at ${new Date()}`,
  //             },
  //           );
  //           await this.cloudKService.productsModel.findByIdAndUpdate(
  //             {
  //               _id: product._id,
  //             },
  //             {
  //               additionalMintingPowerStatus:
  //                 AdditionalMintingPromotionStatus.INACTIVE,
  //             },
  //           );
  //         } else {
  //           // return 'ongoing'  ongoing promotion
  //           activeProducts.push(product);
  //         }
  //         // const isValid =
  //         //   startDate &&
  //         //   endDate &&
  //         //   startDate <= now && // Check if start date is <= now
  //         //   endDate >= now && // Check if end date is >= now
  //         //   product.additionalMintingPowerStatus ===
  //         //     AdditionalMintingPromotionStatus.ACTIVE;
  //         // const isExpired = await isPromotionExpired(product);

  //         // if (isValid) {
  //         //   activeProducts.push(product);
  //         // } else if (!isExpired) {
  //         //   // Nothing Return
  //         // } else {
  //         //   await this.additionalMintingPowerModel.findByIdAndUpdate(
  //         //     {
  //         //       _id: product.additionalMintingPowerId,
  //         //     },
  //         //     {
  //         //       stoppedDate: new Date(),
  //         //       isExpired: true,
  //         //       status: AdditionalMintingPromotionStatus.INACTIVE,
  //         //       note: `Additional minting power setting is automatically Expired at ${new Date()}`,
  //         //     },
  //         //   );
  //         //   await this.cloudKService.productsModel.findByIdAndUpdate(
  //         //     {
  //         //       _id: product._id,
  //         //     },
  //         //     {
  //         //       additionalMintingPowerStatus:
  //         //         AdditionalMintingPromotionStatus.INACTIVE,
  //         //     },
  //         //   );
  //         // }
  //       }
  //     }
  //     return activeProducts;
  //   } catch (error) {
  //     console.error(
  //       'Error fetching additional minting power validators:',
  //       error,
  //     );
  //     throw error;
  //   }
  // }

  async getAdditionalMintingPowerValidator(): Promise<any[]> {
    try {
      const activeArray = [];
      const expiredArray = [];
      const upcomingArray = [];

      const activeAdditonalMintingPower =
        await this.additionalMintingPromotionModel.find({
          status: AdditionalMintingPromotionStatus.ACTIVE,
          deletedAt: { $eq: null },
        });

      console.log(
        'Active Additional Minting Power:',
        activeAdditonalMintingPower,
      );

      if (activeAdditonalMintingPower.length > 0) {
        const currentDate = new Date();
        const currentDateStr = currentDate.toISOString().split('T')[0]; // YYYY-MM-DD

        for (const element of activeAdditonalMintingPower) {
          const startDateStr = new Date(element.startDate)
            .toISOString()
            .split('T')[0];
          const endDateStr = new Date(element.endDate)
            .toISOString()
            .split('T')[0];

          // Check if the promotion is active, expired, or upcoming based on both start and end dates
          if (currentDateStr > endDateStr) {
            // Current date is after end date -> Expired
            expiredArray.push(element);
          } else if (
            currentDateStr >= startDateStr &&
            currentDateStr <= endDateStr
          ) {
            // Current date is between start and end dates -> Active
            activeArray.push(element);
          } else if (currentDateStr < startDateStr) {
            // Current date is before start date -> Upcoming
            upcomingArray.push(element);
          }
        }
      }

      // Update expired promotions in the database
      if (expiredArray.length > 0) {
        for (const element of expiredArray) {
          await this.additionalMintingPromotionModel.findByIdAndUpdate(
            {
              _id: new Types.ObjectId(element._id),
              status: AdditionalMintingPromotionStatus.ACTIVE,
            },
            {
              expiredDate: new Date(),
              status: AdditionalMintingPromotionStatus.EXPIRED,
              note: `Additional minting power setting is automatically Expired at ${new Date()}`,
            },
          );
        }
      }

      console.log(activeArray, 'activeArray');
      console.log(upcomingArray, 'upcomingArray');
      console.log(expiredArray, 'expiredArray');

      return activeArray.length > 0 ? activeArray : [];
    } catch (error) {
      console.error(
        'Error fetching additional minting power validators:',
        error,
      );
      throw error;
    }
  }

  async getAllProducts(): Promise<CloudKProduct[]> {
    try {
      const productData = await this.cloudKProductModel.find().exec();
      console.log('Fetched productData:', productData.length);
      return productData;
    } catch (error) {
      console.error('Error fetching productData:', error);
      throw error;
    }
  }

  // Define the types

  async getCountryPercentageAdditionalMinting({
    productId = null,
    promotionId = null,
    countryCodeAlpha3 = countriesAllOptions.All,
  }: {
    promotionId: Types.ObjectId | null;
    productId: Types.ObjectId | null;
    countryCodeAlpha3: string;
  }): Promise<{
    promotionId: Types.ObjectId | null;
    country: Types.ObjectId | null;
    countryCodeAlpha3: string | null;
    type: 'All' | 'Exact' | 'Fallback';
    percentage: number | null;
    additionalMintingCountryLevelId: Types.ObjectId | null;
  }> {
    console.log(
      'productId: ',
      productId,
      'promotionId: ',
      promotionId,
      'countryCodeAlpha3: ',
      countryCodeAlpha3,
    );

    const CountryLevelSettings =
      await this.additionalCountryLevelSettingModel.find({
        promotionId: promotionId,
        productId: productId,
      });
    console.log(CountryLevelSettings, ':CountryLevelSettings');

    // Find the matching entry directly (since our StaticData already has promotionId and productId)
    const promotion = CountryLevelSettings.find(
      (item) =>
        item.promotionId.toString() === promotionId?.toString() &&
        item.productId.toString() === productId?.toString(),
    );

    if (!promotion) {
      console.log('No promotion found');
      return {
        country: null,
        countryCodeAlpha3: null,
        type: 'Fallback',
        percentage: null,
        promotionId: null,
        additionalMintingCountryLevelId: null,
      };
    }
    console.log(promotion.countryList, null, -2);

    // First check for exact country match (using countryCodeAlpha3)
    // First, try to find an exact match by countryCodeAlpha3
    let exactMatch: CountryItemAdditionalMinting | undefined =
      promotion.countryList.find(
        (country) => country.countryCodeAlpha3 === countryCodeAlpha3,
      );

    if (!exactMatch) {
      // If no exact match, try to find a match where country.name === 'All'
      exactMatch = promotion.countryList.find(
        (country) => country.name === countriesAllOptions.All,
      );
    }

    if (exactMatch) {
      // Handle the case where country might be a string ('All') or ObjectId
      const countryValue =
        typeof exactMatch.countryId === 'string'
          ? exactMatch.countryId === countriesAllOptions.All
            ? null
            : new Types.ObjectId(exactMatch.countryId)
          : exactMatch.countryId;

      return {
        country: countryValue,
        countryCodeAlpha3: exactMatch.countryCodeAlpha3 ?? null,
        type:
          exactMatch.countryCodeAlpha3 === countriesAllOptions.All
            ? 'All'
            : 'Exact',
        percentage: Number(exactMatch.percentage) ?? null,
        promotionId: promotion.promotionId,
        additionalMintingCountryLevelId: promotion._id,
      };
    }

    // If no exact match, look for "All" fallback
    const allCountriesMatch = promotion.countryList.find(
      (country: CountryItemAdditionalMinting) =>
        country.countryId === countriesAllOptions.All,
    );

    if (!allCountriesMatch) {
      console.log('No "All" fallback found');
      return {
        country: null,
        countryCodeAlpha3: null,
        type: 'Fallback',
        percentage: null,
        promotionId: promotion.promotionId,
        additionalMintingCountryLevelId: null,
      };
    }

    // Handle the 'All' case properly
    return {
      country: null, // Since 'All' isn't a valid ObjectId, return null
      countryCodeAlpha3: allCountriesMatch.countryCodeAlpha3 ?? null,
      percentage: Number(allCountriesMatch.percentage) ?? null,
      type: 'All',
      promotionId: promotion.promotionId,
      additionalMintingCountryLevelId: promotion._id,
    };
  }
}
