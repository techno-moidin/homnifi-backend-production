import { Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { ClientSession, Connection, Model, Types } from 'mongoose';

import {
  CLOUDK_MACHINE_STATUS,
  CloudKMachine,
} from './schemas/cloudk-machine.schema';
import {
  CLOUDK_MACHINE_STAKE_TYPE,
  CloudKMachineStake,
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
import { CloudKTransactionTypes } from './schemas/cloudk-transactions.schema';
import { CloudKSimulationMachine } from './schemas/cloudk-simulation-machine.schema';
import { setDecimalPlaces, truncateDecimal } from '../utils/helpers';
import { AmountType } from '../global/enums/amount.type.enum';

@Injectable()
export class CloudKSimulationService {
  constructor(
    @InjectModel(CloudKSimulationMachine.name)
    private simulationMachineModel: Model<CloudKSimulationMachine>,
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
    private cloudKService: CloudKService,
    private walletService: WalletService,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  currentInflation = null;
  session = null;

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

  async getACPenaltyCut(autoCompound: boolean, date: Date) {
    const currentPenalty = await this.autoCompoundPenaltyModel
      .findOne({ createdAt: { $lte: date } })
      .sort({ createdAt: -1 })
      .exec();
    return autoCompound ? 1 : 1 - currentPenalty.percentage / 100;
  }

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

    // console.log('Rules:', rules);

    let finalPrice = price;
    let totalPenalty = 0;

    // Step 2: Apply each rule sequentially
    for (const rule of rules) {
      const penalty = (finalPrice * rule.productionDecreasePercentage) / 100;
      totalPenalty += penalty;
      finalPrice -= penalty;
    }

    // console.log({ finalPrice, totalPenalty });

    return { finalPrice, totalPenalty };
  }

  // async calculateCumulativeDLP(
  //   currentDLP: number,
  //   priceDropPercentage: number,
  // ) {
  //   console.log({ dlppppppp: currentDLP, priceDropPercentage });

  //   // Fetch all rules up to priceDropPercentage and include the next range
  //   const rules = await this.inflationRulesModel
  //     .find({
  //       inflation: this.currentInflation._id,
  //       $or: [
  //         { todropPercentage: { $lte: priceDropPercentage } }, // Get all valid rules
  //         {
  //           fromdropPercentage: { $lte: priceDropPercentage },
  //           todropPercentage: { $gt: priceDropPercentage },
  //         }, // Include next range
  //       ],
  //     })
  //     .sort({ fromdropPercentage: 1 }); // Sort in ascending order

  //   console.log('Rules:', rules);

  //   let finalDLP = currentDLP;

  //   // Step 2: Apply each rule sequentially for increaseDLPPercentage
  //   for (const rule of rules) {
  //     const increaseAmount = (finalDLP * rule.increaseDLPPercentage) / 100;
  //     finalDLP += increaseAmount;
  //   }

  //   return { finalDLP };
  // }

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
    machine: CloudKSimulationMachine,
    didPriceFallFromPrevDay: boolean,
    currentPrice: number,
    previousTokenPrice,
  ): Promise<{
    dlp: number;
    productionDecreasePercentage: number;
    ath: number;
    percentageFallFromToken: number;
    currentRule: any;
    priceDropPercentage: any;
  }> {
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
    // const percentageFallFromDLP = (machine.dlp - currentPrice) / machine.dlp;

    await this.getCurrentInflation();

    let priceDropPercentage = 0;
    if (didPriceFallFromPrevDay) {
      priceDropPercentage = percentageFallFromATH;
    } else {
      // priceDropPercentage = percentageFallFromDLP;
      if (previousTokenPrice < currentPrice) {
        priceDropPercentage = (machine.dlp - currentPrice) / machine.dlp;
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

    const { finalDLP, lastIncrease } = await this.calculateCumulativeDLP(
      machine.dlp,
      priceDropPercentage * 100,
    );

    // console.log({ finalDLP });
    const increaseDLPPercentage = machine.dlp + lastIncrease;

    // const increaseDLPPercentage = currentRule
    //   ? currentRule.increaseDLPPercentage
    //   : 0;
    if (didPriceFallFromPrevDay) {
      // console.log(
      //   machine.rule?.toString() === currentRule._id?.toString(),
      //   'machine.rule === currentRule._id',
      //   machine.rule?.toString(),
      //   currentRule._id?.toString(),
      // );
      const dlp =
        increaseDLPPercentage > 0
          ? machine.rule?.toString() === currentRule._id?.toString()
            ? machine.dlp
            : machine.dlp + lastIncrease
          : machine.dlp;
      machine.dlp = dlp;
      machine.percentageFallFromToken = percentageFallFromToken;
      machine.rule = currentRule._id;
    }
    await machine.save({ session: this.session });

    return {
      dlp: machine.dlp,
      productionDecreasePercentage: currentRule
        ? currentRule.productionDecreasePercentage
        : 0,
      ath: machine.allTimeHigh,
      percentageFallFromToken,
      currentRule,
      priceDropPercentage: truncateDecimal(priceDropPercentage * 100, 2),
    };
  }

  async generateSimulationReward(
    machine: CloudKSimulationMachine,
    currentPrice: number,
    collatoral: number,
    autoCompound: boolean,
    prevPrice: number,
    prevReward: number,
  ) {
    const forDate = new Date();
    const autoCompoundpenaltyCut = await this.getACPenaltyCut(
      autoCompound,
      forDate,
    );
    const previousTokenPrice = prevPrice;
    const didPriceFallFromPrevDay = currentPrice < previousTokenPrice;

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
    // console.log('111111111111111', finalPrice, totalPenalty, dlp);

    expectedRewardTokens =
      currentPrice >= machine.dlp
        ? expectedRewardTokens
        : currentPrice > prevPrice
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

    const currentReward = {
      currentRule,
      autoCompoundpenaltyCut,
      expectedRewardTokensActual:
        collatoral *
          (machine.mintingPower + machine.boost) *
          autoCompoundpenaltyCut -
        totalPenalty,
      boost: machine.boost,
      machine: machine._id,
      tokenAmount: setDecimalPlaces(rewardTokens, AmountType.TOKEN),
      totalPrice: setDecimalPlaces(
        rewardTokens * currentPrice,
        AmountType.DOLLAR,
      ),
      expectedRewardTokens: setDecimalPlaces(
        collatoral * (machine.mintingPower + machine.boost),
        AmountType.DOLLAR,
      ),

      productionPenalty: totalPenalty === 1 ? 0 : totalPenalty,
      autoCompoundPenalty: setDecimalPlaces(
        collatoral *
          (machine.mintingPower + machine.boost) *
          autoCompoundpenaltyCut,
        AmountType.TOKEN,
      ),
      forDate,
      dlp,
      capPrice: setDecimalPlaces(capPrice, AmountType.DOLLAR),
      allTimeHigh: ath,
      collatoral,
      percentageFallFromToken,
      tokenPrice: currentPrice,
    };

    return currentReward;
  }

  async runSimulation(testSimulationDto: CloudKSimulationDto) {
    const {
      machine: machineId,
      prices,
      collatoral,
      autoCompound,
    } = testSimulationDto;
    const machine = await this.simulationMachineModel.findById(machineId);
    await this.initMongoSession();
    const data = [];
    let autoComoundedStakes = 0;
    let prevPrice = 0;
    let prevReward = 0;

    try {
      for (const price of prices) {
        const amount = collatoral + autoComoundedStakes;
        const reward = await this.generateSimulationReward(
          machine,
          price,
          amount,
          autoCompound,
          prevPrice,
          prevReward,
        );
        if (autoCompound) {
          autoComoundedStakes += reward.totalPrice;
        }
        prevPrice = price;
        prevReward = reward.totalPrice;

        data.push(reward);
      }
      await this.session.abortTransaction();
      return data;
    } catch (err) {
      await this.session.abortTransaction();
      throw new Error(err);
    } finally {
      this.session.endSession();
    }
  }
}
