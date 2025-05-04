import {
  forwardRef,
  HttpException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import {
  CLOUDK_MACHINE_STATUS,
  CloudKMachine,
} from '../cloud-k/schemas/cloudk-machine.schema';
import { ClientSession, Connection, Model, Types } from 'mongoose';
import { Worker } from 'worker_threads';
import { UsdkStakeReward } from './schemas/usdkStakeReward.schema';
import { CloudKService } from '../cloud-k/cloud-k.service';
import {
  CloudKTransactions,
  CloudKTransactionTypes,
} from '../cloud-k/schemas/cloudk-transactions.schema';
import { UsdkStakeService } from './usdk-stake.service';
import { UsdkStakeTypeEnum } from './enums/db.enums';
import { UsdkStakeTransactions } from './schemas/usdkStakeTransaction.schema';
import {
  CloudKReward,
  FROM_REWARD_TYPE,
} from '../cloud-k/schemas/cloudk-reward.schema';
import {
  UsdkStakeTransactionHistory,
  UsdkTransactionTypes,
} from './schemas/usdkStakeTransactionHistory';
@Injectable()
export class UsdkStakeRewardService {
  private readonly logger = new Logger(UsdkStakeRewardService.name);

  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(CloudKMachine.name)
    private readonly cloudKMachine: Model<CloudKMachine>,
    @InjectModel(UsdkStakeReward.name)
    private readonly usdkStakeRewardModel: Model<UsdkStakeReward>,
    @InjectModel(UsdkStakeTransactionHistory.name)
    private readonly usdkStakeTransactionHistory: Model<UsdkStakeTransactionHistory>,
    @InjectModel(UsdkStakeTransactions.name)
    private readonly usdkStakeTransactions: Model<UsdkStakeTransactions>,
    @InjectModel(CloudKReward.name)
    private readonly cloudKReward: Model<CloudKReward>,

    @InjectModel(CloudKTransactions.name)
    private cloudkTransactionModel: Model<CloudKTransactions>,

    @Inject(forwardRef(() => UsdkStakeService))
    private usdkStakeService: UsdkStakeService,
  ) {}
  async usdkRewardGenerater() {
    // find the chunk data query
    const machineChunk = await this.getMachineChunksCountQuery();

    const workerPromise = machineChunk.map((query) =>
      this.runUsdkStakeWorker(query),
    );

    await Promise.all(workerPromise);

    return 'Reward genererated Successfully.';
  }

  async getMachineChunksCountQuery(limit: number = 100000) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Count the total number of active machines
    const totalMachines = await this.cloudKMachine.countDocuments({
      status: CLOUDK_MACHINE_STATUS.ACTIVE,
      usdkStakeperiodStartDate: { $gte: new Date() },
      usdkStakeperiodEndDate: { $lt: today },
      usdkColletral: { $gt: 0 },
      deletedAt: null,
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

  async runUsdkStakeWorker(query) {
    return new Promise<void>((resolve, reject) => {
      const worker = new Worker(
        './dist/src/usdk-stake/usdk-stake-reward.worker.js',
        {
          workerData: { query: query },
        },
      );

      worker.on('message', (message) => {
        this.logger.log(`Worker finished: ${message}`);
        resolve();
      });

      worker.on('error', (error) => {
        this.logger.error(`Worker error: ${error}`);
        reject(error);
      });

      worker.on('exit', (code) => {
        if (code !== 0) {
          this.logger.error(`Worker stopped with exit code ${code}`);
          reject(new Error(`Worker stopped with exit code ${code}`));
        }
        console.log('Completed');
        resolve();
      });
    });
  }

  async testReward(machineId) {
    const machine = await this.cloudKMachine.findOne({
      _id: machineId,
      deletedAt: null,
    });
    if (!machine) {
      return 'No machine found.';
    }
    return await this.generateUsdkReward(machine, 1);
  }

  async generateUsdkReward(machine, price) {
    const {
      usdkColletral,
      usdkStakeToken,
      usdkAutoCompound,
      usdkStakeRewardRate,
      collatoral,
      usdkMultipler,
    } = machine;
    // Usdk colletral is in doller we need to convert this into lyk
    const colletralInLyk = usdkColletral / price;

    // generate the reward
    const rewardAmount = (usdkStakeRewardRate / 100) * colletralInLyk;
    const session = await this.connection.startSession();
    await session.startTransaction();
    try {
      const wallet: any = await this.usdkStakeService.getWalletById(
        machine.user,
        machine.rewardWallet,
      );

      const generateReward = new this.usdkStakeRewardModel({
        usdkColletral,
        usdkAutoCompound,
        usdkStakeRewardRate,
        usdkStakeToken,
        isClaimed: false,
        rewardAmount, // in lyk
        currentLykPrice: price,
        user: machine.user,
        machine: machine._id,
        rewardGeneratedToken: wallet.token._id,
        meta: {
          colletralInLyk,
          rewardGeneratedSymbol: wallet.token.symbol,
        },
      });

      // const generateReward = new this.cloudKReward({
      //   machine: machine._id,
      //   user: machine.user,
      //   tokenAmount: rewardAmount,
      //   totalPrice: rewardAmount * price,
      //   expectedRewardTokens: rewardAmount,
      //   expectedRewardTokensActual: rewardAmount,
      //   oldLogicReward: 0,
      //   productionPenalty: 0,
      //   autoCompoundPenalty: 0,
      //   forDate: new Date(),
      //   dlp: 0,
      //   capPrice: 0,
      //   allTimeHigh: 0,
      //   collatoral,
      //   tokenPrice: price,
      //   autoCompounded: machine.autoCompound,
      //   job: null,
      //   currentRule: null,
      //   priceDropPercentage: null,
      //   prevReward: null,
      //   rewardFrom: FROM_REWARD_TYPE.USDK_STAKE,
      // });
      // await generateReward.save({ session });

      // add cloudk transaction
      const rewardTrx: any = await this.createUsdkStakeTransaction(
        {
          tokenAmount: rewardAmount, // total token generate
          type: UsdkTransactionTypes.DAILY_REWARD, // Credit
          user: machine.user,
          machine: machine._id as Types.ObjectId,
          token: wallet.token._id as any,
          note: `Usdk reward generated in ${machine.uniqueName} - ${machine._id}`,
          totalTokenPrice: rewardAmount * price, // dollar value of token
          lykPrice: price,
          reward: generateReward._id as Types.ObjectId,
        },
        session,
      );

      generateReward.cloudKTransaction = rewardTrx[0]?._id || null;
      // await generateReward.save();

      // if not auto compound is on
      if (!usdkAutoCompound) {
        await generateReward.save({ session });
        await session.commitTransaction();
        return 'Reward generated successfully';
      }

      //if auto compound is on then
      //create the swap tranaction to swap the lyk amount to usdk
      //create the stake transaction

      // check gasUsdk limit is exceed or not
      const usdkGasLimit = collatoral * usdkMultipler;
      const isLimitIsExceeded =
        usdkGasLimit < usdkColletral + rewardAmount * price;
      if (isLimitIsExceeded) {
        // if any penality then apply here
        await generateReward.save({ session });
        await session.commitTransaction();
        return 'Reward generated successfully';
      }
      // add stake
      const usdKstake = new this.usdkStakeTransactions({
        type: UsdkStakeTypeEnum.AUTO_COMPOUND,
        amount: rewardAmount * price,
        user: machine.user,
        machine: machine._id,
        currentgasUsdkLimit: collatoral * usdkMultipler,
        usedGasUsdkBefore: usdkColletral,
        mlykColletral: machine.collatoral || 0,
        previousUsdKColletral: machine.usdkColletral || 0,
        newUsdKColletral: (machine.usdkColletral || 0) + rewardAmount * price,
        // walletTransaction: walletTransactionData[0]._id,
        meta: {
          from: 'auto-compound',
          rewardCloudkTransaction: rewardTrx[0]?._id || null,
          rewardId: generateReward._id,
        },
      });
      await usdKstake.save({ session });
      machine.usdkColletral =
        (machine.usdkColletral || 0) + rewardAmount * price;
      await machine.save({ session });
      // make the reward claimed
      generateReward.isClaimed = true;

      // swap lyk-w to usdk transation
      await this.createCloudkTransaction(
        {
          tokenAmount: rewardAmount, // total token generate
          type: CloudKTransactionTypes.AC_DEBIT, // Credit
          user: machine.user,
          machine: machine._id as Types.ObjectId,
          token: wallet.token._id as any,
          note: 'DAILY-USDK-STAKE-REWARD | auto compound on | debit reward for re-stake',
          totalTokenPrice: rewardAmount * price, // dollar value of token
          lykPrice: price,
          reward: generateReward._id as Types.ObjectId,
        },
        session,
      );

      await this.createCloudkTransaction(
        {
          tokenAmount: rewardAmount, // total token generate
          type: CloudKTransactionTypes.SWAPPED, // Credit
          user: machine.user,
          machine: machine._id as Types.ObjectId,
          token: machine.usdkStakeToken as any,
          note: 'DAILY-USDK-STAKE-REWARD | auto compound on | debit reward for re-stake',
          totalTokenPrice: rewardAmount * price, // dollar value of token
          lykPrice: price,
          reward: generateReward._id as Types.ObjectId,
        },
        session,
      );

      await this.createUsdkStakeTransaction(
        {
          tokenAmount: rewardAmount * price,
          type: UsdkTransactionTypes.ADD_STAKE,
          user: machine.user,
          machine: machine._id as Types.ObjectId,
          totalTokenPrice: rewardAmount * price,
          token: machine.usdkStakeToken as any,
          usdkStake: usdKstake._id as Types.ObjectId,
          note: 'for Usdk staking By auto compound',
          reward: generateReward._id as Types.ObjectId,
          lykPrice: price,
        },
        session,
      );

      await generateReward.save({ session });
      await session.commitTransaction();
      return 'Reward generated successfully';
    } catch (error) {
      await session.abortTransaction();
      throw new HttpException(error.message, 400);
    } finally {
      await session.endSession();
    }
  }
  async createUsdkStakeTransaction(
    cloudkTransactionDto: {
      tokenAmount: number;
      type: UsdkTransactionTypes;
      user: Types.ObjectId | string;
      token: Types.ObjectId | string;
      machine?: Types.ObjectId | string;
      fromMachine?: Types.ObjectId | string;
      totalTokenPrice?: number;
      stake?: Types.ObjectId | string;
      lykPrice?: number;
      note?: string;
      remark?: string;
      reward?: Types.ObjectId;
      stakeType?: string;
      meta?: Record<string, any>;
      usdkReward?: Types.ObjectId | string;
      usdkStake?: Types.ObjectId | string;
    },
    session?: ClientSession,
  ) {
    return await this.usdkStakeTransactionHistory.create(
      [cloudkTransactionDto],
      {
        session,
      },
    );
  }

  async createCloudkTransaction(
    cloudkTransactionDto: {
      tokenAmount: number;
      type: CloudKTransactionTypes;
      user: Types.ObjectId | string;
      token: Types.ObjectId | string;
      machine?: Types.ObjectId | string;
      fromMachine?: Types.ObjectId | string;
      totalTokenPrice?: number;
      stake?: Types.ObjectId | string;
      lykPrice?: number;
      note?: string;
      remark?: string;
      reward?: Types.ObjectId;
      stakeType?: string;
      meta?: Record<string, any>;
      usdkReward?: Types.ObjectId | string;
      usdkStake?: Types.ObjectId | string;
    },
    session?: ClientSession,
  ) {
    return await this.cloudkTransactionModel.create([cloudkTransactionDto], {
      session,
    });
  }
}
