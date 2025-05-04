import {
  ChangeVisibilityUsdkStakeSettingsDto,
  CreateUsdkStakeSettingsDto,
} from './dto/create-usdk-stake-settings.dto';
import {
  BadRequestException,
  forwardRef,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Optional,
} from '@nestjs/common';
import mongoose, { ClientSession, Connection, Model, Types } from 'mongoose';
import { UsdkStakeDto } from './dtos/uskdStake.dto';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import {
  CloudKMachine,
  STAKING_PERIOD_ENUM,
} from '../cloud-k/schemas/cloudk-machine.schema';
import { Token } from '../token/schemas/token.schema';
import { Wallet } from '../wallet/schemas/wallet.schema';
import { TransactionFlow } from '../wallet/enums/transcation.flow.enum';
import { WalletTransaction } from '../wallet/schemas/wallet.transaction.schema.';
import {
  CLOUDK_MACHINE_STAKE_TYPE,
  CloudKMachineStake,
  STAKE_FROM,
} from '../cloud-k/schemas/cloudk-machine-stakes.schema';
import { UsdkStakeTransactions } from './schemas/usdkStakeTransaction.schema';
import { UsdkStakeTypeEnum } from './enums/db.enums';
import { UsdkStakeSettings } from './schemas/usdkStakeSettings.schema';
import { CreateWalletTransactionDto } from '../wallet/dto/create-transaction.dto';
import {
  Deposit_Transaction_Type,
  TrxType,
} from '../global/enums/trx.type.enum';
import { UsdkStakeReward } from './schemas/usdkStakeReward.schema';
import { CloudKTransactionTypes } from '../cloud-k/schemas/cloudk-transactions.schema';
import { UsdkStakeRewardService } from './usdk-stake-reward.service';
import {
  UsdkStakeTransactionHistory,
  UsdkTransactionTypes,
} from './schemas/usdkStakeTransactionHistory';
import { PaginateDTO } from '../admin/global/dto/paginate.dto';
import { pagination } from '../utils/helpers';
import {
  ClaimType,
  UsdkCliamRewardByMachineDto,
  UsdkCliamRewardDto,
} from './dto/claim-reward.dto';
import { CloudKService } from '../cloud-k/cloud-k.service';
import { WalletService } from '../wallet/wallet.service';
import { TransactionStatus } from '../global/enums/transaction.status.enum';
import { SwapTransaction } from '../wallet/schemas/swap.transaction.schema';
import { SwapTransactionHistory } from '../wallet/schemas/swap.transaction.history.schema';
import { TokenService } from '../token/token.service';
import { Swap_SpecialSwap_Type } from '../wallet/enums/swap-specialSwap.enum';
import { CloudKSetting } from '../cloud-k/schemas/cloudk-setting.schema';
import { types } from 'web3';
import { User } from '../users/schemas/user.schema';
import { generateNoteTransactionDetails } from '../utils/common/common.functions';
import { UsdkStakeGlobalAutoCompound } from './schemas/usdkstake-global-auto-compund.schema';
@Injectable()
export class UsdkStakeService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(UsdkStakeSettings.name)
    private readonly usdkStakeSettingsModel: Model<UsdkStakeSettings>,
    @InjectModel(CloudKMachine.name)
    private readonly cloudKMachine: Model<CloudKMachine>,
    @InjectModel(Token.name)
    private readonly token: Model<Token>,
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    @InjectModel(Wallet.name)
    private readonly walletModel: Model<Wallet>,
    @InjectModel(WalletTransaction.name)
    private readonly walletTransaction: Model<WalletTransaction>,
    @InjectModel(CloudKMachineStake.name)
    private readonly cloudKMachineStake: Model<CloudKMachineStake>,
    @InjectModel(UsdkStakeTransactions.name)
    private readonly usdkStakeTransactions: Model<UsdkStakeTransactions>,
    @InjectModel(UsdkStakeSettings.name)
    private readonly usdkStakeSettings: Model<UsdkStakeSettings>,
    @InjectModel(UsdkStakeReward.name)
    private readonly usdkStakeRewardModel: Model<UsdkStakeReward>,
    @InjectModel(UsdkStakeTransactionHistory.name)
    private readonly usdkStakeTransactionHistory: Model<UsdkStakeTransactionHistory>,
    @Optional()
    @InjectModel(SwapTransaction.name)
    private readonly swapTransactionModel: Model<SwapTransaction>,
    @Optional()
    @InjectModel(SwapTransactionHistory.name)
    private readonly swapTransactionHistoryModel: Model<SwapTransactionHistory>,

    @InjectModel(CloudKSetting.name)
    private readonly cloudKSettingsModel: Model<CloudKSetting>,
    @InjectModel(UsdkStakeGlobalAutoCompound.name)
    private readonly usdkStakeGlobalAutoCompoundModel: Model<UsdkStakeGlobalAutoCompound>,
    @Inject(forwardRef(() => UsdkStakeRewardService))
    private usdkStakeRewardService: UsdkStakeRewardService,
    @Inject(forwardRef(() => CloudKService))
    private cloudKService: CloudKService,
    @Inject(forwardRef(() => WalletService))
    private walletService: WalletService,
    @Inject(forwardRef(() => TokenService))
    private tokenService: TokenService,
  ) {}

  async getUsdkStakeSettings() {
    try {
      const newSettings = await this.usdkStakeSettingsModel
        .find({
          deletedAt: null,
          status: true,
          isVisible: true,
        })
        .populate('tokens');
      if (!newSettings) {
        throw new Error('Setting not created.');
      }
      console.log('Setting created.');

      return {
        settings: newSettings,
      };
    } catch (error) {
      throw new Error(error);
    }
  }
  async createUsdkStakeSettings(dto: CreateUsdkStakeSettingsDto) {
    try {
      const deleteResp = await this.usdkStakeSettingsModel.updateMany(
        {},
        {
          $set: {
            deletedAt: new Date(),
            status: false,
            isVisible: false,
          },
        },
      );

      const newSetting = await new this.usdkStakeSettingsModel({
        multipler: dto.multiplier,
        tokens: dto.tokens,
        rewardPercentage: dto.rewardPercentage,
        status: true,
        isVisible: true,
      }).save();
      if (!newSetting || !newSetting._id) {
        throw new Error('Setting not created.');
      }

      console.log('Setting created.', newSetting);

      return {
        setting: newSetting,
      };
    } catch (error) {
      console.log({ error });
      throw new Error(error);
    }
  }

  async updateUsdkStakeSettings(id: string, dto: CreateUsdkStakeSettingsDto) {
    const session = await this.usdkStakeSettingsModel.startSession();
    await session.startTransaction();
    try {
      const deleteResp = await this.usdkStakeSettingsModel
        .updateMany(
          {},
          {
            $set: {
              deletedAt: new Date(),
              status: false,
              isVisible: false,
            },
          },
        )
        .session(session);

      if (deleteResp && deleteResp.modifiedCount < 1) {
        throw new Error('Update failed');
      }
      const updatedSetting = await new this.usdkStakeSettingsModel({
        multipler: dto.multiplier,
        rewardPercentage: dto.rewardPercentage,
        tokens: dto.tokens,
        status: true,
        isVisible: true,
      }).save({ session });
      if (!updatedSetting || !updatedSetting._id) {
        throw new Error('Setting not updated.');
      }
      console.log('Setting updated.');
      await session.commitTransaction();
      return {
        setting: updatedSetting,
      };
    } catch (error) {
      await session.abortTransaction();
      throw new Error(error);
    } finally {
      await session.endSession();
    }
  }

  async enableOrDisableUsdkStakeSettings(
    id: string,
    dto: ChangeVisibilityUsdkStakeSettingsDto,
  ) {
    try {
      await this.usdkStakeSettingsModel.updateMany(
        {},
        {
          $set: {
            isVisible: false,
          },
        },
      );
      const deleteResp = await this.usdkStakeSettingsModel.updateOne(
        { _id: id },
        {
          $set: {
            isVisible: dto.isVisible,
          },
        },
      );

      if (deleteResp.modifiedCount < 1) {
        throw 'Update failed';
      }
      return 'Setting Visibility Changed';
    } catch (error) {
      throw new Error(error);
    } finally {
    }
  }

  async usdkStake(userId: Types.ObjectId, reqData: UsdkStakeDto) {
    try {
      // check machine is exist or not'
      const machine = await this.cloudKMachine
        .findOne({
          deletedAt: null,
          user: userId,
          _id: reqData.machine,
        })
        .populate('stakeToken');

      if (!machine) {
        throw new HttpException(`Machine not found.`, 400);
      }

      // check staking period is ended or not
      if (machine.usdkStakeperiodStartDate) {
        if (
          machine.usdkStakeperiodEndDate &&
          machine.usdkStakeperiodEndDate < new Date()
        ) {
          throw new HttpException(`Stake period ended.`, 400);
        } else {
          if (machine.endDate < new Date())
            throw new HttpException(`Stake period ended.`, 400);
        }
      }

      //check user have enough Gas-USDK
      const machineStakeMoreMlykBalance =
        await this.getMachineTotalStakeMoreCollatoral(
          machine._id as Types.ObjectId,
        );

      if (machineStakeMoreMlykBalance === 0) {
        throw new HttpException(`User is not eligilbe for usdk staking`, 400);
      }

      // get current usdkSettings
      const usdkStakeSetting = await this.usdkStakeSettings.findOne({
        deletedAt: null,
        status: true,
        isVisible: true,
      });

      if (!usdkStakeSetting) {
        throw new HttpException(
          `You cannot stake usdk because admin not added the settings.`,
          400,
        );
      }
      // check request token include in settings token list
      const tokenInclude = usdkStakeSetting.tokens.includes(
        new Types.ObjectId(reqData.token),
      );
      if (!tokenInclude) {
        throw new HttpException(`Invalid token to stake.`, 400);
      }

      //get how much user staked using usdk
      const usdkMachineStakeBalance = await this.getMachineUsdkCollatoral(
        machine._id as Types.ObjectId,
      );

      if (
        machineStakeMoreMlykBalance * usdkStakeSetting.multipler <=
        usdkMachineStakeBalance + reqData.amount
      ) {
        throw new HttpException(`User reach max limit of staking.`, 400);
      }

      // check token is exist or not'
      const tokenData = await this.token.findOne({
        deletedAt: null,
        _id: reqData.token,
      });

      if (!tokenData) {
        throw new HttpException(`Token not found.`, 400);
      }

      // check the token WalletBalance
      const { balance, walletId } = await this.getBalanceByTokenId(
        userId,
        tokenData._id as Types.ObjectId,
      );

      // check user have the balance in wallet
      if (reqData.amount >= balance) {
        throw new HttpException(`Insufficient balance.`, 400);
      }

      if (machine.usdkStakeperiod !== reqData.stakePeriod) {
        const availableStakePeriod = await this.checkLockUpPeriodOfMachine(
          machine.endDate,
        );
        if (
          !availableStakePeriod.includes(parseInt(reqData.stakePeriod, 10)) &&
          !availableStakePeriod.includes(reqData.stakePeriod)
        ) {
          throw new HttpException(`Staking period is not available.`, 400);
        }

        if (!machine.usdkStakeperiod) {
          //it is the first staking
          //staking period upgrade
          const stakeToken: any = await this.token.findOne({
            deletedAt: null,
            symbol: 'usdk',
          });
          machine.usdkStakeperiod = reqData.stakePeriod;
          machine.usdkStakeperiodStartDate = new Date();
          machine.usdkStakeToken = stakeToken?._id || null;

          // If old machine dont have these data the update with current setting
          if (!machine.usdkStakeRewardRate) {
            machine.usdkStakeRewardRate = usdkStakeSetting.rewardPercentage;
          }

          if (!machine.usdkAutoCompound) {
            machine.usdkAutoCompound = false;
          }

          if (!machine.usdkMultipler) {
            machine.usdkMultipler = usdkStakeSetting.multipler;
          }
          //------------

          if (reqData.stakePeriod === STAKING_PERIOD_ENUM.MAX) {
            machine.usdkStakeperiodEndDate = machine.endDate;
          } else {
            const locupPeriod = await this.calculateLockupPeriod(
              reqData.stakePeriod,
              new Date(),
            );
            machine.usdkStakeperiodEndDate = locupPeriod;
          }
        } else {
          // check the user is down grading or not
          const isDowngrading =
            await this.checkTheLockUpPeriodIsDownGradateOrNot(
              reqData.stakePeriod,
              machine.usdkStakeperiod,
            );
          if (isDowngrading) {
            throw new HttpException(
              `Unable to downgrade the stake period.`,
              400,
            );
          }
          machine.usdkStakeperiod = reqData.stakePeriod;
          if (!machine.usdkStakeRewardRate) {
            machine.usdkStakeRewardRate = usdkStakeSetting.rewardPercentage;
          }

          if (reqData.stakePeriod === STAKING_PERIOD_ENUM.MAX) {
            machine.usdkStakeperiodEndDate = machine.endDate;
          } else {
            const locupPeriod = await this.calculateLockupPeriod(
              reqData.stakePeriod,
              machine.usdkStakeperiodStartDate,
            );
            machine.usdkStakeperiodEndDate = locupPeriod;
          }
        }
      }

      const session = await this.connection.startSession();
      await session.startTransaction();
      try {
        // await machine.save({ session });
        //wallet transaction
        const walletTransactionData: any = await this.createWalletTransaction(
          {
            amount: reqData.amount,
            wallet: walletId,
            transactionFlow: TransactionFlow.OUT,
            trxType: TrxType.USDK_STAKE,
            user: machine.user,
            note: `usdk stake`,
          },
          session,
        );

        //Add data in usdkstake
        const usdKstake = new this.usdkStakeTransactions({
          type: UsdkStakeTypeEnum.STAKE_MORE,
          amount: reqData.amount,
          user: userId,
          machine: machine._id,
          fromToken: tokenData._id,
          fromWallet: walletId,
          previousWalletBalance: balance,
          newWalletBalance: balance - reqData.amount,
          currentgasUsdkLimit:
            machineStakeMoreMlykBalance * usdkStakeSetting.multipler,
          usedGasUsdkBefore: usdkMachineStakeBalance,
          mlykColletral: machine.collatoral || 0,
          previousUsdKColletral: machine.usdkColletral || 0,
          newUsdKColletral: (machine.usdkColletral || 0) + reqData.amount,
          walletTransaction: walletTransactionData[0]?._id,
          meta: {},
        });
        await usdKstake.save({ session });
        machine.usdkColletral = (machine.usdkColletral || 0) + reqData.amount;
        await machine.save({ session });

        // transaction
        await this.usdkStakeRewardService.createUsdkStakeTransaction(
          {
            tokenAmount: reqData.amount,
            type: UsdkTransactionTypes.ADD_STAKE,
            user: machine.user,
            machine: machine._id as Types.ObjectId,
            totalTokenPrice: reqData.amount,
            token: reqData.token as any,
            usdkStake: usdKstake._id as Types.ObjectId,
            note: 'for Usdk staking',
            // lykPrice: price,
          },
          session,
        );

        await session.commitTransaction();
        return 'Tokens staked successfully';
      } catch (error) {
        await session.abortTransaction();
        throw new HttpException(error.message, 400);
      } finally {
        await session.endSession();
      }
    } catch (error) {
      // console.log('ERROR Message:', { error: error });
      throw error;
    }
  }

  // Wallet balance by Token
  async getBalanceByTokenId(userId: Types.ObjectId, tokenId: Types.ObjectId) {
    const wallet = await this.walletModel.aggregate([
      {
        $match: {
          user: new Types.ObjectId(userId),
          token: new Types.ObjectId(tokenId),
          deletedAt: null,
        },
      },
      {
        $lookup: {
          from: 'tokens',
          localField: 'token',
          foreignField: '_id',
          as: 'token',
        },
      },
      {
        $unwind: '$token',
      },
    ]);

    if (!wallet.length) {
      const token = await this.token.findById(tokenId);
      return {
        _id: token._id,
        name: token.name,
        symbol: token.symbol,
        balance: 0,
        walletId: null,
      };
    }

    const { walletBalance } = await this.getBalanceByWallet(
      userId,
      wallet[0]?._id,
    );

    const token = wallet[0]?.token;
    const returnObj = {
      _id: token._id,
      name: token.name,
      symbol: token.symbol,
      balance: walletBalance,
      walletId: wallet[0]?._id as mongoose.Types.ObjectId,
    };
    return returnObj;
  }

  async getBalanceByWallet(userId: Types.ObjectId, walletId: Types.ObjectId) {
    try {
      console.log(userId, 'userId', walletId);

      const balanceAggregation = await this.walletTransaction.aggregate([
        {
          $match: {
            wallet: walletId,
            user: new Types.ObjectId(userId),
            deletedAt: { $eq: null },
          },
        },
        {
          $group: {
            _id: null,
            incomingBalance: {
              $sum: {
                $cond: [
                  { $eq: ['$transactionFlow', TransactionFlow.IN] },
                  '$amount',
                  0,
                ],
              },
            },
            outgoingBalance: {
              $sum: {
                $cond: [
                  { $eq: ['$transactionFlow', TransactionFlow.OUT] },
                  '$amount',
                  0,
                ],
              },
            },
            totalStaked: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ['$trxType', 'stake'] },
                      { $eq: ['$transactionFlow', TransactionFlow.OUT] },
                    ],
                  },
                  '$amount',
                  0,
                ],
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            balance: {
              $round: [
                { $subtract: ['$incomingBalance', '$outgoingBalance'] },
                10,
              ],
            },
            totalStaked: 1,
          },
        },
      ]);

      const walletBalance = balanceAggregation[0]?.balance || 0;
      const totalStaked = balanceAggregation[0]?.totalStaked || 0;

      // return walletBalance;
      return { walletBalance, totalStaked };
    } catch (error) {
      console.error('Failed to get wallet balance:', error);
      throw new Error('Error calculating wallet balance.');
    }
  }

  async getMachineTotalStakeMoreCollatoral(machineId: Types.ObjectId) {
    const pipeline = [
      {
        $match: {
          machine: machineId,
          from: STAKE_FROM.MORE_STAKE, // only we need stake more data
          deletedAt: { $eq: null },
        },
      },
      {
        $project: {
          amount: {
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
          totalPrice: { $sum: '$amount' },
        },
      },
    ];

    const totalPriceResult = await this.cloudKMachineStake
      .aggregate(pipeline)
      .exec();

    return totalPriceResult[0]?.totalPrice || 0;
  }

  async getMachineUsdkCollatoral(machineId: Types.ObjectId) {
    const pipeline = [
      {
        $match: {
          machine: machineId,
          type: UsdkStakeTypeEnum.STAKE_MORE,
          deletedAt: { $eq: null },
        },
      },
      {
        $group: {
          _id: '$machine',
          totalPrice: { $sum: '$amount' },
        },
      },
    ];

    const totalPriceResult = await this.usdkStakeTransactions
      .aggregate(pipeline)
      .exec();

    return totalPriceResult[0]?.totalPrice || 0;
  }

  async createWalletTransaction(
    createWalletTransactionDto: CreateWalletTransactionDto,
    session?: ClientSession,
  ) {
    const { wallet, amount, transactionFlow } = createWalletTransactionDto; // Assuming amount and walletId are in the DTO
    const walletData: any = await this.walletModel.findById(wallet).exec();

    if (!walletData) {
      throw new Error('Wallet not found');
    }

    const newTransaction = {
      ...createWalletTransactionDto,
    };

    const createdTransactions = await this.walletTransaction.create(
      [newTransaction],
      { session },
    );

    if (transactionFlow === TransactionFlow.IN) {
      walletData.totalBalanceinToken += amount;
    } else if (transactionFlow === TransactionFlow.OUT) {
      walletData.totalBalanceinToken -= amount;
    }

    await walletData.save();
    return createdTransactions;
  }

  async checkLockUpPeriodOfMachine(expiryDate) {
    const lockupPeriods = [2, 3, 4, 'max'];

    if (!expiryDate) {
      return lockupPeriods;
    }

    const currentDate = new Date();
    expiryDate = new Date(expiryDate);

    // Calculate the difference in years
    const diffYears = expiryDate.getFullYear() - currentDate.getFullYear();

    // Determine the available lockup periods
    let availableLockupPeriods = [];

    if (diffYears >= 2) {
      availableLockupPeriods = lockupPeriods
        .filter(
          (period) =>
            (typeof period === 'number' && period <= diffYears) ||
            period === 'max',
        )
        .sort(
          (a, b) =>
            (typeof b === 'number' ? b : Infinity) -
            (typeof a === 'number' ? a : Infinity),
        );
    } else {
      availableLockupPeriods = ['Invalid Expiry'];
    }

    return availableLockupPeriods;
  }

  async checkTheLockUpPeriodIsDownGradateOrNot(
    lockUpPeriod,
    currentLockUperiod,
  ) {
    const lockupPeriods = ['2', '3', '4', 'max'];

    // Get the index of the periods in the defined order
    const newPeriodIndex = lockupPeriods.indexOf(lockUpPeriod);
    const currentPeriodIndex = lockupPeriods.indexOf(currentLockUperiod);

    // If the new period has a lower index, it's a downgrade
    return newPeriodIndex < currentPeriodIndex;
  }

  async calculateLockupPeriod(year: string, startDate: Date): Promise<Date> {
    const currentDate = new Date(startDate);
    const yearsToAdd = parseInt(year, 10);

    if (isNaN(yearsToAdd) || yearsToAdd <= 0) {
      throw new Error(
        'Invalid year input. Please provide a valid positive number as a string.',
      );
    }
    currentDate.setFullYear(currentDate.getFullYear() + yearsToAdd);

    return currentDate;
  }

  async getMachineUsdkStakeDetails(
    userId: Types.ObjectId,
    machineId: Types.ObjectId,
  ) {
    // check machine is exist or not'
    const machine = await this.cloudKMachine
      .findOne({
        deletedAt: null,
        user: userId,
        _id: machineId,
      })
      .populate('stakeToken usdkStakeToken');

    if (!machine) {
      throw new HttpException(`Machine not found.`, 400);
    }

    let usdKStakeToken;
    if (!machine.usdkStakeToken) {
      usdKStakeToken = await this.token.findOne({
        deletedAt: null,
        symbol: 'usdk',
      });
    } else {
      usdKStakeToken = machine.usdkStakeToken;
    }

    // get current usdkSettings
    const usdkStakeSetting = await this.usdkStakeSettings.findOne({
      deletedAt: null,
      status: true,
      isVisible: true,
    });

    //check user have enough Gas-USDK
    const machineStakeMoreMlykBalance =
      await this.getMachineTotalStakeMoreCollatoral(
        machine._id as Types.ObjectId,
      );

    if (!usdkStakeSetting) {
      throw new HttpException(
        `You cannot stake usdk because admin not added the settings.`,
        400,
      );
    }

    const usdkMachineStakeBalance = await this.getMachineUsdkCollatoral(
      machine._id as Types.ObjectId,
    );
    const response = {
      _id: machine._id,
      usdkStaketoken: usdKStakeToken,
      gasUsdkLimit:
        machineStakeMoreMlykBalance * usdkStakeSetting.multipler || 0,
      currentUsedUsdk: usdkMachineStakeBalance || 0,
      linkedMlyk: machineStakeMoreMlykBalance || 0,
      usdkMultipler: usdkStakeSetting.multipler || 0,
      usdkStakeStartDate: machine.usdkStakeperiodStartDate,
      usdkStakeEndDate: machine.usdkStakeperiodEndDate,
    };
    return response;
  }

  async usdkStakeTokenList(userId: Types.ObjectId, machineId: Types.ObjectId) {
    // check machine is exist or not'
    const machine = await this.cloudKMachine
      .findOne({
        deletedAt: null,
        user: userId,
        _id: machineId,
      })
      .populate('stakeToken');

    if (!machine) {
      throw new HttpException(`Machine not found.`, 400);
    }

    // get current usdkSettings
    const usdkStakeSetting = await this.usdkStakeSettings
      .findOne({
        deletedAt: null,
        status: true,
        isVisible: true,
      })
      .populate('tokens');

    if (!usdkStakeSetting) {
      throw new HttpException(
        `You cannot stake usdk because admin not added the settings.`,
        400,
      );
    }

    // get tokens and wallet balance
    const allAvailableToken = [...usdkStakeSetting.tokens, machine.stakeToken];
    const allAvailableTokenWithBalance = [];

    for (let index = 0; index < allAvailableToken.length; index++) {
      const element: any = allAvailableToken[index];
      const { balance, walletId } = await this.getBalanceByTokenId(
        userId,
        element._id as Types.ObjectId,
      );
      element._doc.balance = balance || 0;
      allAvailableTokenWithBalance.push(element);
    }

    //check user have enough Gas-USDK
    const machineStakeMoreMlykBalance =
      await this.getMachineTotalStakeMoreCollatoral(
        machine._id as Types.ObjectId,
      );

    const usdkMachineStakeBalance = await this.getMachineUsdkCollatoral(
      machine._id as Types.ObjectId,
    );

    const availableStakePeriod = await this.checkLockUpPeriodOfMachine(
      machine.endDate,
    );

    const response = {
      _id: machine._id,
      tokenList: allAvailableTokenWithBalance,
      gasUsdkLimit:
        machineStakeMoreMlykBalance * usdkStakeSetting.multipler || 0,
      currentUsedUsdk: usdkMachineStakeBalance || 0,
      currentStakePeriod: machine.usdkStakeperiod,
      availableStakePeriod,
    };
    return response;
  }

  async getWalletById(userId: Types.ObjectId, walletId: Types.ObjectId) {
    const wallet = await this.walletModel
      .findOne({
        user: userId,
        _id: walletId,
        deletedAt: null,
      })
      .populate('token');
    return wallet;
  }

  async getRewardDetails(userId: Types.ObjectId, machineId: Types.ObjectId) {
    // check machine is exist or not'
    const machine: any = await this.cloudKMachine
      .findOne({
        deletedAt: null,
        user: userId,
        _id: machineId,
      })
      .populate('rewardWallet');

    if (!machine) {
      throw new HttpException(`Machine not found.`, 400);
    }

    const rewardWalletToken = await this.token.findOne({
      deletedAt: null,
      _id: machine.rewardWallet.token,
    });

    if (!rewardWalletToken) {
      throw new HttpException(`Reward wallet not found`, 400);
    }

    // find the total reward and remaing reward

    const totalRewardPipeLine = [
      {
        $match: {
          machine: machineId,
          user: new Types.ObjectId(userId),
          deletedAt: null,
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$rewardAmount' },
        },
      },
    ];
    const remainingRewardPipeLine = [
      {
        $match: {
          isClaimed: false,
          machine: machineId,
          user: new Types.ObjectId(userId),
          deletedAt: null,
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$rewardAmount' },
        },
      },
    ];
    const [totalReward, remainingReward] = await Promise.all([
      this.usdkStakeRewardModel.aggregate(totalRewardPipeLine),
      this.usdkStakeRewardModel.aggregate(remainingRewardPipeLine),
    ]);

    const response = {
      machine: machine._id,
      totalReward: totalReward[0]?.total || 0,
      remainingReward: remainingReward[0]?.total || 0,
      autoLink: machine.usdkAutoCompound,
      rewardWalletToken,
    };

    return response;
  }

  async machineAutoCompoundToggle(
    userId: Types.ObjectId,
    // machineId: Types.ObjectId,
  ) {
    // check machine is exist or not'
    const machine: any = await this.cloudKMachine
      .find({
        deletedAt: null,
        user: userId,
        // _id: machineId,
      })
      .populate('rewardWallet');

    if (!machine.length) {
      throw new HttpException(`Machine not found.`, 400);
    }
    const globalAutoCompound =
      await this.usdkStakeGlobalAutoCompoundModel.findOne({
        user: userId,
      });
    if (globalAutoCompound) {
      globalAutoCompound.enabled = !globalAutoCompound.enabled;
      await globalAutoCompound.save();
    } else {
      await new this.usdkStakeGlobalAutoCompoundModel({
        user: userId,
        enabled: true,
      }).save();
    }

    const machineUpdates = await this.cloudKMachine
      .updateMany(
        {
          deletedAt: null,
          user: userId,
          // _id: machineId,
        },
        {
          $set: {
            usdkAutoCompound: globalAutoCompound.enabled,
          },
        },
      )
      .populate('rewardWallet');

    return 'Updated successfully';
  }

  async getMachineUsdkTransaction(
    user: Types.ObjectId,
    paginateDTO: PaginateDTO,
    {
      machineId,
      token,
      type,
      from,
      to,
    }: {
      machineId?: string;
      token?: string;
      type?: UsdkTransactionTypes;
      from?: string;
      to?: string;
    },
  ) {
    const { page, limit } = paginateDTO;

    let whereConfig: any = {
      deletedAt: { $eq: null },
      user: user,
    };
    if (from) {
      const fromDate = new Date(from);
      const toDate = to ? new Date(to) : new Date();
      toDate.setUTCHours(23, 59, 59, 999);

      whereConfig = {
        ...whereConfig,
        createdAt: {
          $gte: fromDate,
          $lte: toDate,
        },
      };
    }

    if (token) {
      whereConfig = {
        ...whereConfig,
        token: new Types.ObjectId(token),
      };
    }

    if (machineId) {
      whereConfig = {
        ...whereConfig,
        machine: new Types.ObjectId(machineId),
      };
    }

    if (type) {
      whereConfig = {
        ...whereConfig,
        type: type,
      };
    }

    //
    const paginate = await pagination({
      page,
      pageSize: limit,
      model: this.usdkStakeTransactionHistory,
      condition: whereConfig,
      pagingRange: 5,
    });

    const list = await this.usdkStakeTransactionHistory
      .find(whereConfig)
      .sort({ createdAt: -1 })
      .skip(paginate.offset)
      .limit(paginate.limit)
      // .select('-shops -favoritesProducts -favoritesShops')
      .populate([
        {
          path: 'token',
        },
        {
          path: 'machine',
        },
      ]);

    return {
      list,
      totalCount: paginate.total,
      totalPages: paginate.metadata.page.totalPage,
      currentPage: paginate.metadata.page.currentPage,
      paginate,
    };
  }

  async claimReward(dto: UsdkCliamRewardDto, user: Types.ObjectId) {
    try {
      // find machine
      const currentPrice = await this.cloudKService.getCurrentPrice();
      const userData = await this.userModel.findOne({
        deletedAt: null,
        _id: user,
      });

      // create transactions IN to lyk
      // if usdk : IN to lyk OUT to lyk IN to usdk
      const claimableReward = await this.usdkStakeRewardModel.aggregate([
        {
          $match: {
            isClaimed: false,
            user: new Types.ObjectId(user),
            deletedAt: null,
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$rewardAmount' },
          },
        },
      ]);

      const amountToClaim =
        claimableReward.length > 0 ? claimableReward[0].total : 0;

      if (amountToClaim === 0) {
        throw new BadRequestException('No reward to claim');
      }

      const rewardSettings = await this.getCurrentCloudkSettings();
      console.log('settings', rewardSettings);
      // find wallets
      const wallet = await this.walletService.getWalletByTokenId(
        user,
        rewardSettings.rewardToken._id as Types.ObjectId,
      );

      if (!wallet) {
        throw new BadRequestException('Reward wallet not found');
      }

      const usdkWallet = await this.walletService.getWalletByTokenId(
        user,
        rewardSettings.usdkStakeToken._id as Types.ObjectId,
      );
      if (!usdkWallet) {
        throw new BadRequestException('USDK wallet not found ');
      }

      // -----
      const { walletBalance } = await this.walletService.getBalanceByWallet(
        new Types.ObjectId(user),
        wallet._id as any,
      );
      const { walletBalance: usdkWalletBalance } =
        await this.walletService.getBalanceByWallet(
          new Types.ObjectId(user),
          usdkWallet._id as any,
        );
      console.log({ wallet, usdkWallet });

      const allSwapSettings: any =
        await this.tokenService.getSwapSettingsByFromToken(wallet.token as any);

      const currentTokenSwapSettings = allSwapSettings.find(
        (setting) =>
          rewardSettings.usdkStakeToken.symbol.toLowerCase() ===
          setting.symbol.toLowerCase(),
      );
      // console.log(
      //   '🚀 ~ newSwap ~ currentTokenSwapSettings:',
      //   currentTokenSwapSettings,
      // );

      if (!currentTokenSwapSettings)
        throw new HttpException('Cannot swap these wallets', 400);

      if (amountToClaim < currentTokenSwapSettings.minAmount)
        throw new HttpException(
          `Minimum ${currentTokenSwapSettings.minAmount} is required to swap.`,
          400,
        );
      if (amountToClaim > currentTokenSwapSettings.maxAmount)
        throw new HttpException(
          `Can only swap upto ${currentTokenSwapSettings.maxAmount} tokens.`,
          400,
        );

      const session = await this.connection.startSession();
      await session.startTransaction();

      try {
        if (dto.claimToken === ClaimType.LYK) {
          const { note, meta, userRemarks } =
            await generateNoteTransactionDetails({
              trxType: TrxType.USDK_STAKE_REWARD,
              fromAmount: amountToClaim,
              amount: amountToClaim,
              fromBid: userData?.blockchainId,
              receiverAddress: userData?.blockchainId,
              fee: 0,
              commission: 0,
              beforeWalletBalance: walletBalance,
              isDeducted: false,
              dueWalletBalance: 0,
              deductedAmount: 0,
              balanceAmount: amountToClaim,
              tokenPrice: currentPrice.price,
              actualTokenData: rewardSettings?.rewardToken || null,
            });
          const walletTransactionData: any = await this.createWalletTransaction(
            {
              amount: amountToClaim,
              wallet: wallet._id as Types.ObjectId,
              transactionFlow: TransactionFlow.IN,
              trxType: TrxType.USDK_STAKE_REWARD,
              user: user,
              note: note,
              remark: userRemarks,
              meta: meta,
            },
            session,
          );

          const rewardTrx: any =
            await this.cloudKService.createCloudKTransaction(
              {
                tokenAmount: amountToClaim,
                type: CloudKTransactionTypes.USDK_CLAIMED_REWARD,
                user: user,
                totalTokenPrice: currentPrice.price * amountToClaim,
                token: wallet.token as any,
                note: note,
                remark: userRemarks,
                meta: {
                  ...meta,
                  walletTransactionId: walletTransactionData[0]._id,
                  trxType: TrxType.USDK_STAKE_REWARD,
                },
              },
              session,
            );
          const { serialNumber: sN, requestId } =
            await this.walletService.generateUniqueRequestId(
              TrxType.USDK_STAKE_REWARD,
            );
          const newDeposit =
            await new this.walletService.depositTransactionModel({
              user: new Types.ObjectId(user),
              toWallet: wallet._id,
              toWalletTrx: walletTransactionData[0]._id,
              fromAmount: amountToClaim,
              amount: amountToClaim,
              confirmation: 'usdk claim done',
              hash: TrxType.USDK_STAKE_REWARD,
              onChainWallet: null,
              serialNumber: sN,
              requestId,
              transactionStatus: TransactionStatus.SUCCESS,
              newBalance: walletBalance + amountToClaim,
              previousBalance: walletBalance,
              token: wallet?.token || null,
              network: null,
              blockchainId: userData?.blockchainId,
              note: note,
              remarks: userRemarks,
              meta: {
                ...meta,
                walletTransactionId: walletTransactionData[0]._id,
                cloudKTransaction: rewardTrx[0]?._id || null,
              },
            }).save({ session });

          const newDepositTransactionHistory =
            await new this.walletService.depositTransactionHistoryModel({
              deposit_id: newDeposit._id,
              from: Deposit_Transaction_Type.Deposit,
              type: walletTransactionData[0]?.trxType || 'deposit',
              user: new Types.ObjectId(user),
              toWallet: wallet._id,
              toWalletTrx: walletTransactionData[0]._id,
              fromAmount: amountToClaim,
              amount: amountToClaim,
              fromToken: wallet?.token || null,
              confirmation: 'nodek claim done',
              hash: TrxType.USDK_STAKE_REWARD,
              onChainWallet: null,
              serialNumber: sN,
              requestId,
              transactionStatus: TransactionStatus.SUCCESS,
              newBalance: walletBalance + amountToClaim,
              previousBalance: walletBalance,
              token: wallet?.token || null,
              network: null,
              blockchainId: userData?.blockchainId || null,
              note: note,
              remarks: userRemarks,
              meta: {
                ...meta,
                walletTransactionId: walletTransactionData[0]._id,
                cloudKTransaction: rewardTrx[0]?._id || null,
              },
            }).save({ session });
          // deposit transaction and history
        } else if (dto.claimToken === ClaimType.USDK) {
          // create wallet transaction for IN to lyk
          const walletTransactionInData: any =
            await this.createWalletTransaction(
              {
                amount: amountToClaim,
                wallet: wallet._id as Types.ObjectId,
                transactionFlow: TransactionFlow.IN,
                trxType: TrxType.USDK_STAKE_REWARD,
                user: user,
                note: `claimed reward `,
              },
              session,
            );

          //create wallet transaction for OUT from LYK
          const walletTransactionOutData: any =
            await this.createWalletTransaction(
              {
                amount: amountToClaim,
                wallet: wallet._id as Types.ObjectId,
                transactionFlow: TransactionFlow.OUT,
                trxType: TrxType.SWAP,
                user: user,
                note: `swap to usdk `,
                meta: {
                  walletTransactionId: walletTransactionInData[0]._id,
                  trxType: TrxType.USDK_STAKE_REWARD,
                },
              },
              session,
            );

          // create wallet trxn for IN from USDK
          const swappedAmount = amountToClaim * currentPrice.price;

          const {
            note: usdkClaimedNote,
            meta: usdkClaimedMeta,
            userRemarks: usdkClaimedUserRemarks,
          } = await generateNoteTransactionDetails({
            trxType: TrxType.USDK_STAKE_REWARD,
            fromAmount: amountToClaim,
            amount: swappedAmount,
            fromBid: userData?.blockchainId,
            receiverAddress: userData?.blockchainId,
            fee: 0,
            commission: 0,
            beforeWalletBalance: walletBalance,
            isDeducted: false,
            dueWalletBalance: 0,
            deductedAmount: 0,
            balanceAmount: swappedAmount,
            tokenPrice: currentPrice.price,
            actualTokenData: rewardSettings.usdkStakeToken || null,
            fromTokenId:
              (rewardSettings?.rewardToken._id as Types.ObjectId) || null,
            toTokenId:
              (rewardSettings?.usdkStakeToken._id as Types.ObjectId) || null,
          });

          const walletTransactionInUsdktData: any =
            await this.createWalletTransaction(
              {
                amount: swappedAmount,
                actualAmount: amountToClaim,
                wallet: usdkWallet._id as Types.ObjectId,
                transactionFlow: TransactionFlow.IN,
                trxType: TrxType.SWAP,
                user: user,
                note: usdkClaimedNote,
                meta: usdkClaimedMeta,
              },
              session,
            );

          // create cloudk stansaction
          const rewardTrx: any =
            await this.cloudKService.createCloudKTransaction(
              {
                tokenAmount: amountToClaim,
                type: CloudKTransactionTypes.USDK_CLAIMED_REWARD_SWAPPED,
                user: user,
                totalTokenPrice: currentPrice.price * amountToClaim,
                token: usdkWallet.token as any,
                note: usdkClaimedNote,
                meta: {
                  ...usdkClaimedMeta,
                  walletTransactionId: walletTransactionInUsdktData[0]._id,
                  trxType: TrxType.USDK_STAKE_REWARD,
                },
              },
              session,
            );

          // depost transacoitn , and history ,deposit cloudk transaction

          // swap and swap history
          // generate serialnumber and requestID
          const { serialNumber: sN, requestId } =
            await this.walletService.generateUniqueRequestId(TrxType.SWAP);
          const {
            serialNumber: serialNumberDeposit,
            requestId: requestIdDeposit,
          } = await this.walletService.generateUniqueRequestId(TrxType.DEPOSIT);
          const swapTrx = new this.swapTransactionModel({
            user: user,
            fromWallet: wallet._id,
            fromWalletTrx: walletTransactionOutData[0]._id,
            toWallet: usdkWallet._id,
            toWalletTrx: walletTransactionInUsdktData[0]._id,
            amount: swappedAmount,
            swapAmount: amountToClaim,
            // bonus: swapAmount * extraTokenPercentage,
            total: swappedAmount,
            actualAmount: swappedAmount,
            commission: 0,
            commissionType: currentTokenSwapSettings.commissionType,
            serialNumber: sN,
            requestId,
            tokenPrice: currentPrice.price,
            settingsUsed: currentTokenSwapSettings.settingId,
            newBalance: walletBalance - amountToClaim,
            previousBalance: walletBalance,
            newBalanceOfToToken: usdkWalletBalance + swappedAmount,
            previousBalanceOfToToken: usdkWalletBalance,
            platform: currentTokenSwapSettings.platform,
          });
          await swapTrx.save({ session });

          const swapTransactionHistory = new this.swapTransactionHistoryModel({
            swap_id: swapTrx._id,
            type: Swap_SpecialSwap_Type.SWAP,
            user: user,
            fromWallet: wallet._id,
            fromWalletTrx: walletTransactionOutData[0]._id,
            toWallet: usdkWallet._id,
            toWalletTrx: walletTransactionInUsdktData[0]._id,
            amount: swappedAmount,
            swapAmount: amountToClaim,
            // bonus: swapAmount * extraTokenPercentage,
            total: swappedAmount,
            actualAmount: swappedAmount,
            commission: 0,
            commissionType: currentTokenSwapSettings.commissionType,
            serialNumber: sN,
            requestId,
            tokenPrice: currentPrice.price,
            settingsUsed: currentTokenSwapSettings.settingId,
            newBalance: walletBalance - amountToClaim,
            previousBalance: walletBalance,
            newBalanceOfToToken: usdkWalletBalance + swappedAmount,
            previousBalanceOfToToken: usdkWalletBalance,
            platform: currentTokenSwapSettings.platform,
          });
          await swapTransactionHistory.save({ session });

          // create new deposit for claiming
          const newDeposit =
            await new this.walletService.depositTransactionModel({
              user: new Types.ObjectId(user),
              toWallet: usdkWallet._id,
              toWalletTrx: walletTransactionInUsdktData[0]._id,
              fromAmount: swappedAmount,
              amount: swappedAmount,
              confirmation: 'usdk claim done',
              hash: TrxType.SWAP,
              onChainWallet: null,
              serialNumber: serialNumberDeposit,
              requestId: requestIdDeposit,
              transactionStatus: TransactionStatus.SUCCESS,
              newBalance: usdkWalletBalance + swappedAmount,
              previousBalance: usdkWalletBalance,
              token: usdkWallet?.token || null,
              network: null,
              blockchainId: userData?.blockchainId,
              note: usdkClaimedNote,
              remarks: usdkClaimedUserRemarks,
              meta: {
                ...usdkClaimedMeta,
                walletTransactionId: walletTransactionInUsdktData[0]._id,
                cloudKTransaction: rewardTrx[0]?._id || null,
                swapTransactionId: swapTrx._id,
                swapTransactionHistoryId: swapTransactionHistory._id,
              },
            }).save({ session });

          // create new deposit hisotry for swapping
          const newDepositTransactionHistory =
            await new this.walletService.depositTransactionHistoryModel({
              deposit_id: newDeposit._id,
              from: Deposit_Transaction_Type.Deposit,
              type: walletTransactionInUsdktData[0]?.trxType || 'deposit',
              user: new Types.ObjectId(user),
              toWallet: usdkWallet._id,
              toWalletTrx: walletTransactionInUsdktData[0]._id,
              fromAmount: amountToClaim,
              amount: amountToClaim,
              fromToken: wallet?.token || null,
              confirmation: 'nodek claim done',
              hash: TrxType.SWAP,
              onChainWallet: null,
              serialNumber: serialNumberDeposit,
              requestId: requestIdDeposit,
              transactionStatus: TransactionStatus.SUCCESS,
              newBalance: usdkWalletBalance + amountToClaim,
              previousBalance: usdkWalletBalance,
              token: wallet?.token || null,
              network: null,
              blockchainId: userData?.blockchainId || null,
              note: usdkClaimedNote,
              remarks: usdkClaimedUserRemarks,
              meta: {
                ...usdkClaimedMeta,
                walletTransactionId: walletTransactionInUsdktData[0]._id,
                cloudKTransaction: rewardTrx[0]?._id || null,
                swapTransactionId: swapTrx._id,
                swapTransactionHistoryId: swapTransactionHistory._id,
              },
            }).save({ session });
        }
        await this.usdkStakeRewardModel
          .updateMany(
            {
              isClaimed: false,
              user: new Types.ObjectId(user),
              deletedAt: null,
            },
            {
              isClaimed: true,
            },
          )
          .session(session);
        await session.commitTransaction();

        return;
      } catch (error) {
        await session.abortTransaction;
        throw error;
      } finally {
        await session.endSession();
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async claimRewardByMachineId(
    dto: UsdkCliamRewardByMachineDto,
    user: Types.ObjectId,
  ) {
    try {
      // find machine
      const currentPrice = await this.cloudKService.getCurrentPrice();
      const machine: any = await this.cloudKMachine
        .findOne({
          _id: dto.machineId,
          deletedAt: null,
        })
        .populate('user')
        .lean();

      if (!machine) {
        throw new BadRequestException('Machine not found');
      }

      //  check wich taype claim usdk/ lyk
      // find reward
      //get wallet from machine
      // create transactions IN to lyk
      // if usdk : IN to lyk OUT to lyk IN to usdk
      const claimableReward = await this.usdkStakeRewardModel.aggregate([
        {
          $match: {
            isClaimed: false,
            user: new Types.ObjectId(user),
            deletedAt: null,
            machine: new Types.ObjectId(dto.machineId),
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$rewardAmount' },
          },
        },
      ]);
      const amountToClaim =
        claimableReward.length > 0 ? claimableReward[0].total : 0;

      if (amountToClaim === 0) {
        throw new BadRequestException('No reward to claim');
      }
      const rewardSettings = await this.getCurrentCloudkSettings();

      // find wallets
      const wallet = await this.walletService.getWalletByTokenId(
        user,
        rewardSettings.rewardToken._id as Types.ObjectId,
      );

      if (!wallet) {
        throw new BadRequestException('Reward wallet not found');
      }

      const usdkWallet = await this.walletService.getWalletByTokenId(
        user,
        rewardSettings.usdkStakeToken._id as Types.ObjectId,
      );
      if (!usdkWallet) {
        throw new BadRequestException('USDK wallet not found ');
      }

      const { walletBalance } = await this.walletService.getBalanceByWallet(
        new Types.ObjectId(user),
        wallet._id as any,
      );
      const { walletBalance: usdkWalletBalance } =
        await this.walletService.getBalanceByWallet(
          new Types.ObjectId(user),
          usdkWallet._id as any,
        );

      const allSwapSettings: any =
        await this.tokenService.getSwapSettingsByFromToken(wallet.token as any);
      // console.log({ allSwapSettings });
      const currentTokenSwapSettings = allSwapSettings.find(
        (setting) =>
          rewardSettings.usdkStakeToken.symbol.toLowerCase() ===
          setting.symbol.toLowerCase(),
      );
      // console.log(
      //   '🚀 ~ newSwap ~ currentTokenSwapSettings:',
      //   currentTokenSwapSettings,
      // );

      if (!currentTokenSwapSettings)
        throw new HttpException('Cannot swap these wallets', 400);

      if (amountToClaim < currentTokenSwapSettings.minAmount)
        throw new HttpException(
          `Minimum ${currentTokenSwapSettings.minAmount} is required to swap.`,
          400,
        );
      if (amountToClaim > currentTokenSwapSettings.maxAmount)
        throw new HttpException(
          `Can only swap upto ${currentTokenSwapSettings.maxAmount} tokens.`,
          400,
        );

      const session = await this.connection.startSession();
      await session.startTransaction();

      try {
        if (dto.claimToken === ClaimType.LYK) {
          const { note, meta, userRemarks } =
            await generateNoteTransactionDetails({
              trxType: TrxType.USDK_STAKE_REWARD,
              fromAmount: amountToClaim,
              amount: amountToClaim,
              fromBid: machine.user?.blockchainId,
              receiverAddress: machine.user?.blockchainId,
              fee: 0,
              commission: 0,
              beforeWalletBalance: walletBalance,
              isDeducted: false,
              dueWalletBalance: 0,
              deductedAmount: 0,
              balanceAmount: amountToClaim,
              tokenPrice: currentPrice.price,
              actualTokenData: rewardSettings?.rewardToken || null,
            });
          const walletTransactionData: any = await this.createWalletTransaction(
            {
              amount: amountToClaim,
              wallet: wallet._id as Types.ObjectId,
              transactionFlow: TransactionFlow.IN,
              machine: machine._id,
              trxType: TrxType.USDK_STAKE_REWARD,
              user: user,
              note: note,
              remark: userRemarks,
              meta: meta,
            },
            session,
          );

          const rewardTrx: any =
            await this.cloudKService.createCloudKTransaction(
              {
                tokenAmount: amountToClaim,
                type: CloudKTransactionTypes.USDK_CLAIMED_REWARD,
                user: machine.user,
                machine: machine._id as Types.ObjectId,
                totalTokenPrice: currentPrice.price * amountToClaim,
                token: wallet.token as any,
                note: note,
                remark: userRemarks,
                meta: {
                  ...meta,
                  walletTransactionId: walletTransactionData[0]._id,
                  trxType: TrxType.USDK_STAKE_REWARD,
                },
              },
              session,
            );
          const { serialNumber: sN, requestId } =
            await this.walletService.generateUniqueRequestId(
              TrxType.USDK_STAKE_REWARD,
            );
          const newDeposit =
            await new this.walletService.depositTransactionModel({
              user: new Types.ObjectId(user),
              toWallet: wallet._id,
              toWalletTrx: walletTransactionData[0]._id,
              fromAmount: amountToClaim,
              amount: amountToClaim,
              confirmation: 'usdk claim done',
              hash: TrxType.USDK_STAKE_REWARD,
              onChainWallet: null,
              serialNumber: sN,
              requestId,
              transactionStatus: TransactionStatus.SUCCESS,
              newBalance: walletBalance + amountToClaim,
              previousBalance: walletBalance,
              token: wallet?.token || null,
              network: null,
              blockchainId: machine.user?.blockchainId,
              note: note,
              remarks: userRemarks,
              meta: {
                ...meta,
                walletTransactionId: walletTransactionData[0]._id,
                cloudKTransaction: rewardTrx[0]?._id || null,
              },
            }).save({ session });

          const newDepositTransactionHistory =
            await new this.walletService.depositTransactionHistoryModel({
              deposit_id: newDeposit._id,
              from: Deposit_Transaction_Type.Deposit,
              type: walletTransactionData[0]?.trxType || 'deposit',
              user: new Types.ObjectId(user),
              toWallet: wallet._id,
              toWalletTrx: walletTransactionData[0]._id,
              fromAmount: amountToClaim,
              amount: amountToClaim,
              fromToken: wallet?.token || null,
              confirmation: 'nodek claim done',
              hash: TrxType.USDK_STAKE_REWARD,
              onChainWallet: null,
              serialNumber: sN,
              requestId,
              transactionStatus: TransactionStatus.SUCCESS,
              newBalance: walletBalance + amountToClaim,
              previousBalance: walletBalance,
              token: wallet?.token || null,
              network: null,
              blockchainId: machine.user?.blockchainId || null,
              note: note,
              remarks: userRemarks,
              meta: {
                ...meta,
                walletTransactionId: walletTransactionData[0]._id,
                cloudKTransaction: rewardTrx[0]?._id || null,
              },
            }).save({ session });
          // deposit transaction and history
        } else if (dto.claimToken === ClaimType.USDK) {
          // create wallet transaction for IN to lyk
          const walletTransactionInData: any =
            await this.createWalletTransaction(
              {
                amount: amountToClaim,
                wallet: wallet._id as Types.ObjectId,
                transactionFlow: TransactionFlow.IN,
                machine: machine._id,
                trxType: TrxType.USDK_STAKE_REWARD,
                user: user,
                note: `claimed reward `,
              },
              session,
            );

          //create wallet transaction for OUT from LYK
          const walletTransactionOutData: any =
            await this.createWalletTransaction(
              {
                amount: amountToClaim,
                wallet: wallet._id as Types.ObjectId,
                transactionFlow: TransactionFlow.OUT,
                machine: machine._id,
                trxType: TrxType.SWAP,
                user: user,
                note: `swap to usdk `,
                meta: {
                  walletTransactionId: walletTransactionInData[0]._id,
                  trxType: TrxType.USDK_STAKE_REWARD,
                },
              },
              session,
            );

          const swappedAmount = amountToClaim * currentPrice.price;

          const {
            note: usdkClaimedNote,
            meta: usdkClaimedMeta,
            userRemarks: usdkClaimedUserRemarks,
          } = await generateNoteTransactionDetails({
            trxType: TrxType.USDK_STAKE_REWARD,
            fromAmount: amountToClaim,
            amount: swappedAmount,
            fromBid: machine.user?.blockchainId,
            receiverAddress: machine.user?.blockchainId,
            fee: 0,
            commission: 0,
            beforeWalletBalance: walletBalance,
            isDeducted: false,
            dueWalletBalance: 0,
            deductedAmount: 0,
            balanceAmount: swappedAmount,
            tokenPrice: currentPrice.price,
            actualTokenData: rewardSettings.usdkStakeToken || null,
            fromTokenId:
              (rewardSettings?.rewardToken._id as Types.ObjectId) || null,
            toTokenId:
              (rewardSettings?.usdkStakeToken._id as Types.ObjectId) || null,
          });

          // create wallet trxn for IN from USDK
          const walletTransactionInUsdktData: any =
            await this.createWalletTransaction(
              {
                amount: swappedAmount,
                actualAmount: amountToClaim,
                wallet: usdkWallet._id as Types.ObjectId,
                transactionFlow: TransactionFlow.IN,
                trxType: TrxType.SWAP,
                machine: machine._id,
                user: user,
                note: usdkClaimedNote,
                meta: usdkClaimedMeta,
              },
              session,
            );

          // create cloudk stansaction
          const rewardTrx: any =
            await this.cloudKService.createCloudKTransaction(
              {
                tokenAmount: amountToClaim,
                type: CloudKTransactionTypes.USDK_CLAIMED_REWARD_SWAPPED,
                user: machine.user,
                machine: machine._id as Types.ObjectId,
                totalTokenPrice: currentPrice.price * amountToClaim,
                token: usdkWallet.token as any,
                meta: {
                  ...usdkClaimedMeta,
                  walletTransactionId: walletTransactionInUsdktData[0]._id,
                  trxType: TrxType.USDK_STAKE_REWARD,
                },
              },
              session,
            );

          // depost transacoitn , and history ,deposit cloudk transaction

          // generate serialnumber and requestID
          const { serialNumber: sN, requestId } =
            await this.walletService.generateUniqueRequestId(TrxType.SWAP);
          const {
            serialNumber: serialNumberDeposit,
            requestId: requestIdDeposit,
          } = await this.walletService.generateUniqueRequestId(TrxType.DEPOSIT);

          // swap and swap history

          const swapTrx = new this.swapTransactionModel({
            user: user,
            fromWallet: wallet._id,
            fromWalletTrx: walletTransactionOutData[0]._id,
            toWallet: usdkWallet._id,
            toWalletTrx: walletTransactionInUsdktData[0]._id,
            amount: swappedAmount,
            swapAmount: amountToClaim,
            // bonus: swapAmount * extraTokenPercentage,
            total: swappedAmount,
            actualAmount: swappedAmount,
            commission: 0,
            commissionType: currentTokenSwapSettings.commissionType,
            serialNumber: sN,
            requestId,
            tokenPrice: currentPrice.price,
            settingsUsed: currentTokenSwapSettings.settingId,
            newBalance: walletBalance - amountToClaim,
            previousBalance: walletBalance,
            newBalanceOfToToken: usdkWalletBalance + swappedAmount,
            previousBalanceOfToToken: usdkWalletBalance,
            platform: currentTokenSwapSettings.platform,
          });
          await swapTrx.save({ session });

          const swapTransactionHistory = new this.swapTransactionHistoryModel({
            swap_id: swapTrx._id,
            type: Swap_SpecialSwap_Type.SWAP,
            user: user,
            fromWallet: wallet._id,
            fromWalletTrx: walletTransactionOutData[0]._id,
            toWallet: usdkWallet._id,
            toWalletTrx: walletTransactionInUsdktData[0]._id,
            amount: swappedAmount,
            swapAmount: amountToClaim,
            // bonus: swapAmount * extraTokenPercentage,
            total: swappedAmount,
            actualAmount: swappedAmount,
            commission: 0,
            commissionType: currentTokenSwapSettings.commissionType,
            serialNumber: sN,
            requestId,
            tokenPrice: currentPrice.price,
            settingsUsed: currentTokenSwapSettings.settingId,
            newBalance: walletBalance - amountToClaim,
            previousBalance: walletBalance,
            newBalanceOfToToken: usdkWalletBalance + swappedAmount,
            previousBalanceOfToToken: usdkWalletBalance,
            platform: currentTokenSwapSettings.platform,
          });
          await swapTransactionHistory.save({ session });
          // create new deposit for claiming
          const newDeposit =
            await new this.walletService.depositTransactionModel({
              user: new Types.ObjectId(user),
              toWallet: usdkWallet._id,
              toWalletTrx: walletTransactionInUsdktData[0]._id,
              fromAmount: swappedAmount,
              amount: swappedAmount,
              confirmation: 'usdk claim done',
              hash: TrxType.SWAP,
              onChainWallet: null,
              serialNumber: serialNumberDeposit,
              requestId: requestIdDeposit,
              transactionStatus: TransactionStatus.SUCCESS,
              newBalance: usdkWalletBalance + swappedAmount,
              previousBalance: usdkWalletBalance,
              token: usdkWallet?.token || null,
              network: null,
              blockchainId: machine.user?.blockchainId,
              note: usdkClaimedNote,
              remarks: usdkClaimedUserRemarks,
              meta: {
                ...usdkClaimedMeta,
                walletTransactionId: walletTransactionInUsdktData[0]._id,
                cloudKTransaction: rewardTrx[0]?._id || null,
                swapTransactionId: swapTrx._id,
                swapTransactionHistoryId: swapTransactionHistory._id,
              },
            }).save({ session });

          // create new deposit hisotry for swapping
          const newDepositTransactionHistory =
            await new this.walletService.depositTransactionHistoryModel({
              deposit_id: newDeposit._id,
              from: Deposit_Transaction_Type.Deposit,
              type: walletTransactionInUsdktData[0]?.trxType || 'deposit',
              user: new Types.ObjectId(user),
              toWallet: usdkWallet._id,
              toWalletTrx: walletTransactionInUsdktData[0]._id,
              fromAmount: amountToClaim,
              amount: amountToClaim,
              fromToken: wallet?.token || null,
              confirmation: 'nodek claim done',
              hash: TrxType.SWAP,
              serialNumber: serialNumberDeposit,
              requestId: requestIdDeposit,
              transactionStatus: TransactionStatus.SUCCESS,
              newBalance: usdkWalletBalance + amountToClaim,
              previousBalance: usdkWalletBalance,
              token: wallet?.token || null,
              network: null,
              blockchainId: machine.user?.blockchainId || null,
              note: usdkClaimedNote,
              remarks: usdkClaimedUserRemarks,
              meta: {
                ...usdkClaimedMeta,
                walletTransactionId: walletTransactionInUsdktData[0]._id,
                cloudKTransaction: rewardTrx[0]?._id || null,
                swapTransactionId: swapTrx._id,
                swapTransactionHistoryId: swapTransactionHistory._id,
              },
            }).save({ session });
        }
        await this.usdkStakeRewardModel
          .updateMany(
            {
              isClaimed: false,
              user: new Types.ObjectId(user),
              deletedAt: null,
              machine: new Types.ObjectId(dto.machineId),
            },
            {
              isClaimed: true,
            },
          )
          .session(session);
        await session.commitTransaction();
      } catch (error) {
        await session.abortTransaction;
        throw error;
      } finally {
        await session.endSession();
      }

      console.log({ wallet });
      console.log({ claimableReward });

      return claimableReward;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async rewardDetails(user: Types.ObjectId) {
    try {
      // fetch the settings
      const rewardSettings: any = await this.getCurrentCloudkSettings();
      // check machine is exist or not'
      const machine: any = await this.cloudKMachine.find({
        deletedAt: null,
        user: user,
        collatoral: { $gt: 0 },
      });
      const { balance, walletId } = await this.getBalanceByTokenId(
        user,
        rewardSettings.usdkStakeToken._id as Types.ObjectId,
      );
      if (!machine.length) {
        return {
          claimableReward: 0,
          totalReward: 0,
          linkedToken: 0,
          stakeTokenBalance: balance || 0,
          stakeToken: rewardSettings?.usdkStakeToken,
          rewardToken: rewardSettings?.rewardToken,
        };
      }
      const totalUsdkCollateral = machine.reduce(
        (sum, item) => sum + (item.usdkColletral || 0),
        0,
      );

      // find the total reward and remaing reward
      const totalRewardPipeLine = [
        {
          $match: {
            user: new Types.ObjectId(user),
            deletedAt: null,
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$rewardAmount' },
          },
        },
      ];
      const remainingRewardPipeLine = [
        {
          $match: {
            isClaimed: false,
            user: new Types.ObjectId(user),
            deletedAt: null,
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$rewardAmount' },
          },
        },
      ];
      const [totalReward, remainingReward] = await Promise.all([
        this.usdkStakeRewardModel.aggregate(totalRewardPipeLine),
        this.usdkStakeRewardModel.aggregate(remainingRewardPipeLine),
      ]);

      return {
        claimableReward: remainingReward[0]?.total || 0,
        totalReward: totalReward[0]?.total || 0,
        linkedToken: totalUsdkCollateral || 0,
        stakeTokenBalance: balance || 0,
        stakeToken: rewardSettings?.usdkStakeToken,
        rewardToken: rewardSettings?.rewardToken,
      };
    } catch (error) {
      throw error;
    }
  }

  async getCurrentCloudkSettings() {
    const settings = await this.cloudKSettingsModel
      .findOne({ deletedAt: null })
      .sort({
        createdAt: -1,
      })
      .populate('rewardToken usdkStakeToken');

    return settings;
  }

  async autoCompoundToggleForMachine(
    userId: Types.ObjectId,
    machineId: Types.ObjectId,
  ) {
    // check machine is exist or not'
    const machine: any = await this.cloudKMachine
      .findOne({
        deletedAt: null,
        user: userId,
        _id: machineId,
      })
      .populate('rewardWallet');

    if (!machine) {
      throw new HttpException(`Machine not found.`, 400);
    }
    if (machine.usdkAutoCompound) {
      const changedValue = !machine.usdkAutoCompound;
      machine.usdkAutoCompound = changedValue;

      const globalAutoCompound =
        await this.usdkStakeGlobalAutoCompoundModel.findOneAndUpdate(
          {
            user: userId,
          },
          {
            enabled: changedValue,
          },
          {
            new: true,
          },
        );
      if (!globalAutoCompound) {
        await new this.usdkStakeGlobalAutoCompoundModel({
          user: userId,
          enabled: changedValue,
        }).save();
      }
    } else {
      machine.usdkAutoCompound = true;
    }
    await machine.save();

    return 'Updated successfully';
  }
}
