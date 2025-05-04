import { forwardRef, HttpException, Inject, Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import mongoose, { Connection, Model, Types } from 'mongoose';
import {
  CLOUDK_MACHINE_STATUS,
  CloudKMachine,
  MACHINE_TRACK_HOMNIFI_LABELS,
} from './schemas/cloudk-machine.schema';
import {
  CLOUDK_MACHINE_STAKE_TYPE,
  STAKE_FROM,
} from './schemas/cloudk-machine-stakes.schema';

import { TransactionFlow } from '../wallet/enums/transcation.flow.enum';
import { TrxType } from '../global/enums/trx.type.enum';

import {
  CloudKTransactions,
  CloudKTransactionTypes,
} from './schemas/cloudk-transactions.schema';

import { UserGask } from '../supernode/schemas/user-gask.schema';
import { SuperNodeGaskSetting } from '../supernode/schemas/sn-gask-setting.schema';
import { SupernodeService } from '../supernode/supernode.service';

import { CacheService } from '../cache/cache.service';
import { CACHE_TYPE } from '../cache/Enums/cache.enum';
import { User } from '../users/schemas/user.schema';

import { CloudKService } from './cloud-k.service';
import { BurnService } from '../burn/burn.service';
import { Token } from '../token/schemas/token.schema';
import { CloudKMachineStakeTransaction } from './schemas/stake-history.schema';
import { WalletService } from '../wallet/wallet.service';
import { Burn } from '../burn/schema/burn.schema';
import { BurnParticipants } from '../burn/schema/burn.participant.schema';
import { ChargesType } from '../global/enums/charges.type.enum';
import { PHASE_TOKEN_USD } from '../utils/constants';
import { clog } from '../utils/helpers';
import { Wallet } from '../wallet/schemas/wallet.schema';
import { MachineConnectDto } from './dto/machine-connect.dto';
import { MachineSerialNumberDetails } from '../machine-tracking/schema/machine-serialNumber-details.schema';
import { MAHCINE_TRACK_API_STATUS } from '../machine-tracking/schema/machine-tracking.schema';
import { RABBITMQ_EXCHANGES } from '../utils/rabbitmq.constants';
import { RabbitmqService } from '../rabbitmq/rabbitmq.service';

@Injectable()
export class CloudKDepositService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(UserGask.name)
    private userGaskModel: Model<UserGask>,
    @InjectModel(SuperNodeGaskSetting.name)
    private snGaskSettingModel: Model<SuperNodeGaskSetting>,
    @InjectModel(MachineSerialNumberDetails.name)
    private machineSerialNumberDetailsModel: Model<MachineSerialNumberDetails>,

    @InjectModel(Wallet.name)
    private wallet: Model<Wallet>,

    @InjectModel(Token.name)
    private tokenModel: Model<Token>,
    @InjectModel(User.name)
    private usermModel: Model<User>,
    @InjectModel(CloudKMachineStakeTransaction.name)
    private cloudKMachineStakeTransactionModel: Model<CloudKMachineStakeTransaction>,
    @InjectModel(CloudKMachine.name)
    private machineModel: Model<CloudKMachine>,
    @InjectModel(BurnParticipants.name)
    private readonly burnParticipantsModel: Model<BurnParticipants>,
    @Inject(forwardRef(() => SupernodeService))
    private supernodeService: SupernodeService,
    private cacheService: CacheService,
    private cloudKService: CloudKService,
    @Inject(forwardRef(() => BurnService))
    private BurnService: BurnService,
    private walletService: WalletService,
    private readonly rabbitMqProducerService: RabbitmqService,
    @InjectModel(CloudKTransactions.name)
    private cloudkTransactionModel: Model<CloudKTransactions>,
  ) {}
  async stakeIntoMachineV2(
    machineId: string,
    userId: string,
    amount: number,
    phaseEnabled: boolean,
  ) {
    const user = new Types.ObjectId(userId);
    //check the current settings of the stake in o a machine
    //Fetch the current machine
    //Fetch the current token value
    const [settings, machine, currentPrice, cloudKsettings] = await Promise.all(
      [
        this.cloudKService.getCurrentKillSettings(),
        this.machineModel
          .findOne({
            _id: machineId,
            user: userId,
            $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
          })
          .populate('stakeToken'),
        this.cloudKService.getCurrentPrice(),
        this.cloudKService.getCurrentCloudkSettings(),
      ],
    );
    //

    if (!settings.stakeEnabled) {
      throw new HttpException(
        'Staking is currently disabled, please try again later',
        400,
      );
    }

    if (machine?.endDate < new Date())
      throw new HttpException('Machine is expired.', 400);

    if (!cloudKsettings)
      throw new HttpException('There is no nodek settings', 400);

    //check the user staking wallet is exist or not
    const stakeWallet = await this.walletService.findUserWalletByTokenSymbol(
      machine.stakeToken.symbol,
      user,
    );
    if (!stakeWallet)
      throw new HttpException(
        `${machine.stakeToken.symbol} wallet not found`,
        400,
      );

    // create global variable for Active phase
    let normalPercentages;
    let boostPercentages;
    let phaseWalletBalance;
    let reducingAmountFromPhaseWallet = 0;
    let phaseTokenId;
    let phaseWalletId;
    let totalAmountToBeStake = amount * currentPrice.price; // 100*1
    let totalTokenToBeStake = amount; // 100
    let percentageToBeApplied;

    let data;

    if (phaseEnabled) {
      data = await this.getBunCalculation(
        machineId,
        amount,
        user,
        true,
        currentPrice.price,
      );

      //  Get Active Phase settings
      const activePhaseSettings: any = await this.BurnService.fetchActiveBurn();
      if (!activePhaseSettings) {
        throw new HttpException(
          `No promotion is available right now. Please try again later.`, // change messgae
          400,
        );
      }
      //check the user is partcipant of active phase
      const isUserIsParticpant = await this.burnParticipantsModel
        .findOne({
          user: new Types.ObjectId(userId),
        })
        .select('_id');
      if (!isUserIsParticpant) {
        throw new HttpException(
          `User not joined the active Phase. Please join first.`,
          400,
        );
      }
      normalPercentages = activePhaseSettings.normalPercentage;
      boostPercentages = activePhaseSettings.boostPercentage;

      const token: any = await this.tokenModel.findOne({
        symbol: cloudKsettings.burnInToken.symbol,
      });
      if (!token) {
        throw new HttpException(
          `${cloudKsettings.burnInToken.symbol} token is currently unavailable. Please check back later or contact support for more information.`,
          400,
        );
      }

      phaseTokenId = token._id;
      // Fetch the phase wallet
      const phaseWallet = await this.walletService.findUserWalletByTokenSymbol(
        cloudKsettings.burnInToken.symbol,
        user,
      );

      phaseWalletId = phaseWallet._id;

      const phaseWalletBalanceData = await this.walletService.getBalanceByToken(
        user,
        token._id,
      );

      //Fetching the phase wallet balance
      phaseWalletBalance = phaseWalletBalanceData.balance;
    }

    //fetch the total staked Amount from the machine
    const totalStakedInMachine =
      await this.cloudKService.getMachineTotalCollatoral(
        machine._id as Types.ObjectId,
      ); // must come in dollars

    let fromPhaseWallet = 0;
    if (phaseEnabled) {
      if (totalStakedInMachine + totalAmountToBeStake >= machine.productPrice) {
        percentageToBeApplied = boostPercentages;
      } else {
        percentageToBeApplied = normalPercentages;
      }
      let percetageToken; //Token

      // fetch how much he burn
      const totalBurnedAmount =
        await this.cloudKMachineStakeTransactionModel.aggregate([
          {
            $match: {
              machine: machine._id,
            },
          },
          {
            $lookup: {
              from: 'wallettransactions', // Target collection to join
              localField: 'walletTransaction', // Field from the local collection
              foreignField: '_id', // Field from the foreign collection
              pipeline: [
                {
                  $match: {
                    wallet: phaseWalletId, // Filter by wallet ID
                    transactionFlow: 'out', // Filter by transaction flow
                  },
                },
              ],
              as: 'transaction', // The name of the array of joined results
            },
          },
          {
            $unwind: {
              path: '$transaction', // Flatten the transaction array
              preserveNullAndEmptyArrays: true, // Keep documents without matching transactions
            },
          },
          {
            $group: {
              _id: '$machine', // Group by machine ID (or any other field)
              totalAmount: { $sum: '$transaction.amount' }, // Sum the amount field
            },
          },
        ]);
      const totalBurnedToken = totalBurnedAmount[0]?.totalAmount || 0;
      const totalBurnedAmountInDoller = totalBurnedToken * currentPrice.price;
      if (totalBurnedAmountInDoller >= machine.productPrice) {
        throw new HttpException('Phase wallet Limit is already exceeded.', 400);
      }

      // if (
      //   totalBurnedAmountInDoller + totalAmountToBeStake >=
      //   machine.productPrice
      // ) {
      //   //value= inputDollarStake+(machinePrice-(inputDollarStake+alreadyBurend))

      //   percetageToken = totalTokenToBeStake ; // Token

      //   // percetageToken = value / currentPrice.price; // Token
      // } else {
      //   if (phaseWalletBalance >= totalTokenToBeStake) {
      //     percetageToken = totalTokenToBeStake; // In token
      //   } else {
      //     percetageToken = phaseWalletBalance; // In token
      //   }
      // }

      if (
        totalBurnedAmountInDoller + totalAmountToBeStake >=
        machine.productPrice
      ) {
        //value= inputDollarStake+(machinePrice-(inputDollarStake+alreadyBurend))

        const value =
          totalAmountToBeStake +
          (machine.productPrice -
            (totalAmountToBeStake + totalBurnedAmountInDoller));
        // console.log(
        //   '🚀 ~ CloudKDepositService ~ value:',
        //   value,
        //   phaseWalletBalance,
        //   totalTokenToBeStake,
        // );

        // percetageToken = value / currentPrice.price; // Token

        // if(phaseWalletBalance >= totalTokenToBeStake ){
        //
        //   percetageToken = phaseWalletBalance; // In token

        // } else {
        // percetageToken = phaseWalletBalance ; // Token

        // }

        percetageToken = totalTokenToBeStake; // Token
      } else {
        if (phaseWalletBalance >= totalTokenToBeStake) {
          percetageToken = totalTokenToBeStake; // In token
        } else {
          percetageToken = totalTokenToBeStake; // In token
          // In token
        }
      }

      // if phase wallet balance is greater than token that we need to stake. Then we took the phase wallet balance
      // for th find the percetage otherwise we use token that we need to stake

      // find the amount that we need to add extra mlyk token in doller
      // const amoutToAdd =
      //   (percentageToBeApplied / 100) * (percetageToken * currentPrice.price); // return as dollar
      let amoutToAdd =
        (percentageToBeApplied / 100) * (percetageToken * currentPrice.price); // return as dollar
      // console.log(
      //   '🚀 ~ CloudKDepositService ~ amoutToAdd:',
      //   amoutToAdd,
      //   percetageToken,
      // );

      amoutToAdd =
        amoutToAdd >= phaseWalletBalance
          ? phaseWalletBalance * currentPrice.price
          : amoutToAdd;

      // Check phase wallet have Balance to distributed
      // if (phaseWalletBalance < percetageToken) {
      //   throw new HttpException(
      //     `Insufficient tokens in the ${cloudKsettings.burnInToken.symbol} wallet`,
      //     400,
      //   );
      // }

      // //Reducing amount from phase Wallet
      fromPhaseWallet = percetageToken;

      reducingAmountFromPhaseWallet = amoutToAdd;

      // Total amount is to be stake in the machine
      totalAmountToBeStake =
        amount * currentPrice.price + reducingAmountFromPhaseWallet;

      //Token to add in the wallet
      totalTokenToBeStake = totalAmountToBeStake / currentPrice.price;
    }

    if (
      machine.stakeLimit &&
      machine.stakeLimit < totalStakedInMachine + totalAmountToBeStake
    ) {
      throw new HttpException('Stake limit exceeded', 400);
    }

    const stakeWalletBalance = await this.walletService.getBalanceByToken(
      user,
      stakeWallet.token._id,
    );

    // if (stakeWalletBalance.balance < amount) {
    //   throw new HttpException('Insufficient tokens in the wallet', 400);
    // }

    const session = await this.connection.startSession();
    await session.startTransaction();

    try {
      const walletTransactionArray =
        await this.walletService.createRawWalletTransaction(
          {
            amount: amount,
            wallet: stakeWallet._id,
            transactionFlow: TransactionFlow.OUT,
            trxType: TrxType.STAKE,
            user: machine.user,
          },
          session,
        );

      const walletTransaction =
        walletTransactionArray.length > 0 ? walletTransactionArray[0] : null;

      let message = `stake-in-dollar = ${currentPrice.price} * ${amount} | stake in token ${machine.stakeToken.symbol} = ${amount}`;

      let phaseWalletTransaction;
      if (phaseEnabled) {
        const phaseAmount = fromPhaseWallet;
        const phaseWalletTransactionArray =
          await this.walletService.createRawWalletTransaction(
            {
              amount: data.burnINToken.calculatedAmountToken,
              wallet: phaseWalletId,
              transactionFlow: TransactionFlow.OUT,
              trxType: TrxType.STAKE,
              user: machine.user,
            },
            session,
          );

        phaseWalletTransaction =
          phaseWalletTransactionArray.length > 0
            ? phaseWalletTransactionArray[0]
            : null;

        message =
          message +
          `|smLYK balnce  =  ${data.burnINToken.totalTokenBalance} | stake-in-dollar = ${currentPrice.price} * ${phaseAmount} | stake in token ${cloudKsettings.burnInToken.symbol} = ${phaseAmount}`;
      }

      // Adding the stake amount to the cloudkMachineStake
      const stake = await this.cloudKService.addStake({
        session: session,
        machineId: new mongoose.Types.ObjectId(machineId),
        userId: new Types.ObjectId(userId),
        type: CLOUDK_MACHINE_STAKE_TYPE.STAKE,
        from: phaseEnabled ? STAKE_FROM.PHASE_DEPOSIT : STAKE_FROM.MORE_STAKE,
        totalToken: totalTokenToBeStake,
        lykPrice: currentPrice.price,
        walletTransactionId: null,
        extraMessage: message,
        burnValue: reducingAmountFromPhaseWallet / currentPrice.price,
        actualValue: amount,
      });

      const bulkCreateArray = [
        {
          machine: new mongoose.Types.ObjectId(machineId),
          stake: stake._id,
          walletTransaction: walletTransaction._id,
          note: '',
        },
      ];
      if (phaseEnabled) {
        bulkCreateArray.push({
          machine: new mongoose.Types.ObjectId(machineId),
          stake: stake._id,
          walletTransaction: phaseWalletTransaction._id,
          note: '',
        });
      }
      await this.cloudKMachineStakeTransactionModel.insertMany(
        bulkCreateArray,
        { session },
      );

      const snGaskSetting = await this.snGaskSettingModel.findOne();
      const multiplier = snGaskSetting.multiplier || 3;

      await this.userGaskModel.create(
        [
          {
            user: new Types.ObjectId(userId),
            amount: stake.totalPrice * multiplier, // dollar value
            flow: TransactionFlow.IN,
            stake: stake._id,
            multiplier: multiplier,
            machine: machine._id,
          },
        ],
        { session },
      );
      await this.cacheService.deleteUserCache({
        type: CACHE_TYPE.ACTIVE_USER,
        user: userId,
      });

      machine.collatoral += currentPrice.price * totalTokenToBeStake;
      machine.stakedTokenAmount += totalTokenToBeStake;
      machine.status = CLOUDK_MACHINE_STATUS.ACTIVE;
      await machine.save({ session });

      await this.cloudKService.createCloudKTransaction(
        {
          tokenAmount: totalTokenToBeStake,
          type: phaseEnabled
            ? CloudKTransactionTypes.STAKE_AND_BURN
            : CloudKTransactionTypes.ADD_STAKE,
          user: machine.user,
          machine: machine._id as Types.ObjectId,
          totalTokenPrice: currentPrice.price * totalTokenToBeStake,
          token: stakeWallet.token,
          stake: String(stake._id),
        },
        session,
      );

      const user = await this.usermModel.findById(userId, {}, { session });
      if (user) {
        user.isBuilderGenerationActive =
          await this.supernodeService.isBuilderGenerationUserActiveNode(
            new Types.ObjectId(userId),
            session,
          );

        user.isBaseReferralActive =
          (
            await this.supernodeService.baseRefereralUserActiveMachine(
              new Types.ObjectId(userId),
              session,
            )
          )?.status ?? false;

        await user.save({ session });
      }

      await session.commitTransaction();
      return 'Tokens staked successfully';
    } catch (error) {
      await session.abortTransaction();
      throw new HttpException(error.message, 400);
    } finally {
      session.endSession();
    }
  }

  // async getBunCalculation(
  //   machineId: Types.ObjectId,
  //   amount: number,
  //   user: Types.ObjectId,
  // ) {
  //   //Fetch the current machine
  //   //Fetch the current token value
  //   const [machine, currentPrice, cloudKsettings] = await Promise.all([
  //     this.machineModel
  //       .findOne({
  //         _id: machineId,
  //         user: user,
  //       })
  //       .populate('stakeToken'),
  //     this.cloudKService.getCurrentPrice(),
  //     this.cloudKService.getCurrentCloudkSettings(),
  //   ]);

  //   if (!machine) throw new HttpException('No such machine', 400);
  //   if (!cloudKsettings)
  //     throw new HttpException('There is no nodek settings', 400);

  //   //check the user staking wallet is exist or not
  //   const stakeWallet = await this.walletService.findUserWalletByTokenSymbol(
  //     machine.stakeToken.symbol,
  //     user,
  //   );
  //   if (!stakeWallet)
  //     throw new HttpException(
  //       `${machine.stakeToken.symbol} wallet not found`,
  //       400,
  //     );
  //   // create global variable for Active phase
  //   let reducingAmountFromPhaseWallet = 0;
  //   let reducingAmountFromStakeWallet = amount;

  //   //   Get Active Phase settings
  //   const activePhaseSettings: any = await this.BurnService.fetchActiveBurn();
  //   if (!activePhaseSettings) {
  //     throw new HttpException(
  //       `No active phase is available at the moment. Please try again later.`,
  //       400,
  //     );
  //   }

  //   const normalPercentages = activePhaseSettings.normalPercentage;
  //   const boostPercentages = activePhaseSettings.boostPercentage;

  //   const token: any = await this.tokenModel.findOne({
  //     symbol: cloudKsettings.burnInToken.symbol,
  //   });
  //   if (!token) {
  //     throw new HttpException(
  //       `${cloudKsettings.burnInToken.symbol} token is currently unavailable. Please check back later or contact support for more information.`,
  //       400,
  //     );
  //   }

  //   const phaseTokenId = token._id;
  //   // Fetch the phase wallet
  //   const phaseWallet = await this.walletService.findUserWalletByTokenSymbol(
  //     cloudKsettings.burnInToken.symbol,
  //     user,
  //   );
  //   if (!phaseWallet)
  //     throw new HttpException(
  //       `${cloudKsettings.burnInToken.symbol} wallet not found`,
  //       400,
  //     );
  //   const phaseWalletId = phaseWallet._id;

  //   const phaseWalletBalanceData = await this.walletService.getBalanceByToken(
  //     user,
  //     token._id,
  //   );

  //   //Fetching the phase wallet balance
  //   const phaseWalletBalance = phaseWalletBalanceData.balance;

  //   //fetch the total staked Amount from the machine
  //   const totalStakedInMachine =
  //     await this.cloudKService.getMachineTotalCollatoral(
  //       machine._id as Types.ObjectId,
  //     ); // must come in dollars

  //   let amountToBeStake = amount * currentPrice.price; // 100*1
  //   let amountTokenToBeStake = amount; // 100

  //   let normalPhaseValue = machine.productPrice - totalStakedInMachine; // 100-50
  //   let boostPhaseValue;

  //   if (normalPhaseValue < 0) {
  //     //100-200
  //     normalPhaseValue = 0;
  //     boostPhaseValue = amount * currentPrice.price; // 100
  //   } else {
  //     normalPhaseValue = amount * currentPrice.price - normalPhaseValue; //100-50=50
  //     boostPhaseValue = amount * currentPrice.price - normalPhaseValue; //100-50=50
  //   }

  //   const normalPercentageStakeAmount =
  //     (normalPercentages / 100) * normalPhaseValue;

  //   const boostPercentageStakeAmount =
  //     (boostPercentages / 100) * boostPhaseValue;

  //   reducingAmountFromPhaseWallet =
  //     normalPercentageStakeAmount + boostPercentageStakeAmount;

  //   reducingAmountFromStakeWallet =
  //     amount * currentPrice.price - reducingAmountFromPhaseWallet;

  //   // Check phase wallet have Balance to distributed
  //   if (phaseWalletBalance < reducingAmountFromPhaseWallet) {
  //     throw new HttpException(
  //       `Insufficient tokens in the ${cloudKsettings.burnInToken.symbol} wallet`,
  //       400,
  //     );
  //   }

  //   // Total amount is to be stake in the machine
  //   amountToBeStake =
  //     amount * currentPrice.price +
  //     normalPercentageStakeAmount +
  //     boostPercentageStakeAmount;

  //   //Token to add in the wallet
  //   amountTokenToBeStake = amountToBeStake / currentPrice.price;

  //   if (
  //     machine.stakeLimit &&
  //     machine.stakeLimit < totalStakedInMachine + amountToBeStake
  //   ) {
  //     throw new HttpException('Stake limit exceeded', 400);
  //   }

  //   const stakeWalletBalance = await this.walletService.getBalanceByToken(
  //     user,
  //     stakeWallet.token._id,
  //   );

  //   if (stakeWalletBalance.balance < reducingAmountFromStakeWallet) {
  //     throw new HttpException('Insufficient tokens in the wallet', 400);
  //   }
  //   const data = {
  //     machine: machine._id,
  //     machineToken: machine.stakeToken.symbol,
  //     totalCurrentStakedInMachine: totalStakedInMachine,

  //     normalPercentage: normalPercentages,
  //     boostPercentages: boostPercentages,
  //     burnTokenId: phaseTokenId,
  //     burnWallet: phaseWallet._id,
  //     burnTokenSymbol: token.symbol,
  //     burnWalletCurrentBalance: phaseWalletBalanceData.balance,
  //     normalBurnValue: normalPhaseValue,
  //     normalPercentageStakeAmount: normalPercentageStakeAmount,
  //     boostBurnValue: boostPhaseValue,
  //     boostPercentageStakeAmount: boostPercentageStakeAmount,
  //     stakeWalletBalance: stakeWalletBalance.balance,
  //     currentPrice: currentPrice.price,
  //     stakingTotalAmount: amountToBeStake,
  //     totalTokenGet: amountTokenToBeStake,
  //   };
  //   return data;
  // }
  // async getBunWalletBalance(user: Types.ObjectId) {
  //   const cloudKsettings = await this.cloudKService.getCurrentCloudkSettings();

  //   if (!cloudKsettings)
  //     throw new HttpException('There is no nodek settings', 400);

  //   const token: any = await this.tokenModel.findOne({
  //     symbol: cloudKsettings.burnInToken.symbol,
  //   });

  //   const burnReceiveToken: any = await this.tokenModel.findOne({
  //     symbol: cloudKsettings.burnReceiveToken.symbol,
  //   });
  //   if (!token) {
  //     throw new HttpException(
  //       `${cloudKsettings.burnInToken.symbol} token is currently unavailable. Please check back later or contact support for more information.`,
  //       400,
  //     );
  //   }

  //   if (!burnReceiveToken) {
  //     throw new HttpException(
  //       `${cloudKsettings.burnReceiveToken.symbol} token is currently unavailable. Please check back later or contact support for more information.`,
  //       400,
  //     );
  //   }
  //   // Fetch the phase wallet
  //   const phaseWallet = await this.walletService.findUserWalletByTokenSymbol(
  //     cloudKsettings.burnInToken.symbol,
  //     user,
  //   );
  //   if (!phaseWallet)
  //     throw new HttpException(
  //       `${cloudKsettings.burnInToken.symbol} wallet not found`,
  //       400,
  //     );

  //   const phaseWalletBalanceData = await this.walletService.getBalanceByToken(
  //     user,
  //     token._id,
  //   );

  //   const getBurnRecvierTokenBalace = await this.walletService.getBalanceByToken(
  //     user,
  //     burnReceiveToken._id,
  //   );

  //   const data = {
  //     burnToken: token,
  //     burnReciverToken: burnReceiveToken,
  //     burnWalletId: phaseWallet._id,
  //     burnWalletBalance: phaseWalletBalanceData.balance,
  //     burnWalletReciverBalance: getBurnRecvierTokenBalace.balance,

  //   };
  //   return data;
  // }

  /**
   * @deprecated
   */
  async getBunCalculation(
    machineId: string,
    amount: number,
    userId: Types.ObjectId,
    phaseEnabled: boolean,
    price: number, // Add phaseEnabled parameter
  ) {
    const user = new Types.ObjectId(userId);

    if (!amount && amount <= 0) {
      throw new HttpException(
        'Amount is required fro calculate to smLyk ',
        400,
      );
    }

    //check the current settings of the stake in o a machine
    //Fetch the current machine
    //Fetch the current token value
    const [settings, machine, currentPrice, cloudKsettings] = await Promise.all(
      [
        this.cloudKService.getCurrentKillSettings(),
        this.machineModel
          .findOne({
            _id: machineId,
            user: userId,
            startDate: { $lt: new Date() },
            $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
          })
          .populate('stakeToken'),
        {
          price,
        },
        this.cloudKService.getCurrentCloudkSettings(),
      ],
    );
    //

    if (!settings.stakeEnabled) {
      throw new HttpException(
        'Staking is currently disabled, please try again later',
        400,
      );
    }

    if (machine.endDate < new Date())
      throw new HttpException('Machine is expired.', 400);

    if (!cloudKsettings)
      throw new HttpException('There is no nodek settings', 400);

    //check the user staking wallet is exist or not
    const stakeWallet = await this.walletService.findUserWalletByTokenSymbol(
      machine.stakeToken.symbol,
      user,
    );
    if (!stakeWallet)
      throw new HttpException(
        `${machine.stakeToken.symbol} wallet not found`,
        400,
      );

    // create global variable for Active phase
    let normalPercentages;
    let boostPercentages;
    let phaseWalletBalance;
    let reducingAmountFromPhaseWallet = 0;
    let phaseTokenId;
    let phaseWalletId;
    let totalAmountToBeStake = amount * currentPrice.price; // 100*1
    let totalTokenToBeStake = amount; // 100
    let percentageToBeApplied;

    if (phaseEnabled) {
      //  Get Active Phase settings
      const activePhaseSettings: any = await this.BurnService.fetchActiveBurn();
      if (!activePhaseSettings) {
        throw new HttpException(
          `No promotion is available right now. Please try again later.`, // change messgae
          400,
        );
      }
      //check the user is partcipant of active phase

      normalPercentages = activePhaseSettings.normalPercentage;
      boostPercentages = activePhaseSettings.boostPercentage;

      const token: any = await this.tokenModel.findOne({
        symbol: cloudKsettings.burnInToken.symbol,
      });
      if (!token) {
        throw new HttpException(
          `${cloudKsettings.burnInToken.symbol} token is currently unavailable. Please check back later or contact support for more information.`,
          400,
        );
      }

      phaseTokenId = token._id;
      // Fetch the phase wallet
      const phaseWallet = await this.walletService.findUserWalletByTokenSymbol(
        cloudKsettings.burnInToken.symbol,
        user,
      );
      phaseWalletId = phaseWallet._id;

      // const phaseWalletBalanceData = await this.walletService.getBalanceByToken(
      //   user,
      //   token._id,
      // );

      const phaseWalletBalanceData = await this.wallet.find({
        user: user,
        token: token._id,
      });

      //Fetching the phase wallet balance
      phaseWalletBalance = phaseWalletBalanceData
        ? phaseWalletBalanceData[0].totalBalanceinToken
        : 0;
    }
    let percetageToken; //Token

    //fetch the total staked Amount from the machine
    const totalStakedInMachine =
      await this.cloudKService.getMachineTotalCollatoral(
        machine._id as Types.ObjectId,
      ); // must come in dollars
    if (totalStakedInMachine + totalAmountToBeStake >= machine.productPrice) {
      percentageToBeApplied = boostPercentages;
    } else {
      percentageToBeApplied = normalPercentages;
    }
    // fetch how much he burn
    const totalBurnedAmount =
      await this.cloudKMachineStakeTransactionModel.aggregate([
        {
          $match: {
            machine: machine._id,
          },
        },
        {
          $lookup: {
            from: 'wallettransactions', // Target collection to join
            localField: 'walletTransaction', // Field from the local collection
            foreignField: '_id', // Field from the foreign collection
            pipeline: [
              {
                $match: {
                  wallet: phaseWalletId, // Filter by wallet ID
                  transactionFlow: 'out', // Filter by transaction flow
                },
              },
            ],
            as: 'transaction', // The name of the array of joined results
          },
        },
        {
          $unwind: {
            path: '$transaction', // Flatten the transaction array
            preserveNullAndEmptyArrays: true, // Keep documents without matching transactions
          },
        },
        {
          $group: {
            _id: '$machine', // Group by machine ID (or any other field)
            totalAmount: { $sum: '$transaction.amount' }, // Sum the amount field
          },
        },
      ]);
    const totalBurnedToken = totalBurnedAmount[0]?.totalAmount || 0;
    // console.log(
    //   '🚀 ~ CloudKDepositService ~ totalBurnedToken:',
    //   totalBurnedToken,
    // );
    const totalBurnedAmountInDoller = totalBurnedToken * currentPrice.price;
    // console.log(
    //   '🚀 ~ CloudKDepositService ~ totalBurnedAmountInDoller:',
    //   totalBurnedAmountInDoller,
    // );
    if (totalBurnedAmountInDoller >= machine.productPrice) {
      throw new HttpException('Phase wallet Limit is already exceeded.', 400);
    }

    if (
      totalBurnedAmountInDoller + totalAmountToBeStake >=
      machine.productPrice
    ) {
      //value= inputDollarStake+(machinePrice-(inputDollarStake+alreadyBurend))

      const value =
        totalAmountToBeStake +
        (machine.productPrice -
          (totalAmountToBeStake + totalBurnedAmountInDoller));
      // console.log(
      //   '🚀 ~ CloudKDepositService ~ value:',
      //   value,
      //   phaseWalletBalance,
      //   totalTokenToBeStake,
      // );

      // percetageToken = value / currentPrice.price; // Token

      // if(phaseWalletBalance >= totalTokenToBeStake ){
      //
      //   percetageToken = phaseWalletBalance; // In token

      // } else {
      // percetageToken = phaseWalletBalance ; // Token

      // }

      percetageToken = totalTokenToBeStake; // Token
    } else {
      if (phaseWalletBalance >= totalTokenToBeStake) {
        percetageToken = totalTokenToBeStake; // In token
      } else {
        percetageToken = totalTokenToBeStake; // In token
      }
    }

    // find the amount that we need to add extra mlyk token in doller
    // const amoutToAdd =
    //   (percentageToBeApplied / 100) * (percetageToken * currentPrice.price); // return as dollar

    // const amoutToAdd = phaseWalletBalance >= totalTokenToBeStake ?
    //   (percentageToBeApplied / 100) * (percetageToken * currentPrice.price) : (phaseWalletBalance * currentPrice.price) ; // return as dollar

    let amoutToAdd =
      (percentageToBeApplied / 100) * (percetageToken * currentPrice.price); // return as dollar
    // console.log(
    //   '🚀 ~ CloudKDepositService ~ amoutToAdd:',
    //   amoutToAdd,
    //   percetageToken,
    // );

    amoutToAdd =
      amoutToAdd >= phaseWalletBalance
        ? phaseWalletBalance * currentPrice.price
        : amoutToAdd;
    // Check phase wallet have Balance to distributed
    // if (phaseWalletBalance < percetageToken) {
    //   throw new HttpException(
    //     `Insufficient tokens in the ${cloudKsettings.burnInToken.symbol} wallet`,
    //     400,
    //   );
    // }

    //Reducing amount from phase Wallet
    reducingAmountFromPhaseWallet = amoutToAdd;

    // Total amount is to be stake in the machine
    totalAmountToBeStake =
      amount * currentPrice.price + reducingAmountFromPhaseWallet;

    //Token to add in the wallet
    totalTokenToBeStake = totalAmountToBeStake / currentPrice.price;

    // const stakeWalletBalance = await this.walletService.getBalanceByToken(
    //   user,
    //   stakeWallet.token._id,
    // );

    const stakeWalletBalance = await this.wallet.find(
      user,
      stakeWallet.token._id,
    );

    if (stakeWalletBalance[0].totalBalanceinToken < amount) {
      throw new HttpException('Insufficient tokens in the wallet', 400);
    }

    return {
      status: true,
      burnToken: {
        amount,
        dollarValue: amount * currentPrice.price,
      },
      burnINToken: {
        // totalAmountToBeStake , /
        totalTokenBalance: phaseWalletBalance,
        amount,
        dollarValue: percetageToken * currentPrice.price,
        calculatedAmount: percetageToken,
        percentageToBeApplied,
        calculatedAmountToken: amoutToAdd / currentPrice.price,
        calculatedAmountDollar: amoutToAdd,
      },
      totalAmountToBeStake: totalTokenToBeStake,
      totalDollarValueToBeStake: totalAmountToBeStake,
      totalBurnedToken: totalBurnedToken,
      totalBurnedAmountInDoller: totalBurnedAmountInDoller,
      machinePrice: machine.productPrice,

      // totalAmountToBeStake: totalAmountToBeStake
      // normalPercentages,
      // boostPercentages,
      // amount,
      // totalAmountToBeStake,
      // totalTokenToBeStake,
      // percetageToken,
      // amoutToAdd,
      // phaseWalletBalance,
      // percentageToBeApplied
    };
  }

  async getBurnWalletBalance(userId: Types.ObjectId) {
    // Retrieve the current CloudK settings
    const cloudKSettings = await this.cloudKService.getCurrentCloudkSettings();

    if (!cloudKSettings) {
      throw new HttpException('There are no CloudK settings available.', 400);
    }

    // Fetch the token to be burned
    const burnInToken: any = await this.tokenModel.findOne({
      symbol: cloudKSettings.burnInToken.symbol,
    });

    // Fetch the token that will be received
    const burnReceiveToken: any = await this.tokenModel.findOne({
      symbol: cloudKSettings.burnReceiveToken.symbol,
    });

    // Validate that the burn-in token exists
    if (!burnInToken) {
      throw new HttpException(
        `${cloudKSettings.burnInToken.symbol} is currently unavailable. Please check back later or contact support.`,
        400,
      );
    }

    // Validate that the receive token exists
    if (!burnReceiveToken) {
      throw new HttpException(
        `${cloudKSettings.burnReceiveToken.symbol} is currently unavailable. Please check back later or contact support.`,
        400,
      );
    }

    // Fetch the user's wallet for the burn-in token
    const userWallet = await this.walletService.findUserWalletByTokenSymbol(
      cloudKSettings.burnInToken.symbol,
      userId,
    );

    if (!userWallet) {
      throw new HttpException(
        `${cloudKSettings.burnInToken.symbol} wallet not found for user.`,
        400,
      );
    }

    // Get the balance of the burn-in token in the user's wallet
    // const burnInTokenBalance = await this.walletService.getBalanceByToken(
    //   userId,
    //   burnInToken._id,
    // );

    const burnInTokenBalance = await this.wallet.find({
      user: userId,
      token: burnInToken._id,
    });

    // Get the balance of the received token in the user's wallet
    const burnReceiveTokenBalance = await this.wallet.find({
      user: userId,
      token: burnInToken._id,
    });

    // Prepare the response data
    const responseData = {
      burnInToken,
      burnReceiveToken,
      userWalletId: userWallet._id,
      burnInTokenBalance: burnInTokenBalance[0].totalBalanceinToken,
      burnReceiveTokenBalance: burnReceiveTokenBalance[0].totalBalanceinToken,
    };

    return responseData;
  }

  async getBurnlimit(
    machineId: Types.ObjectId,
    userId: Types.ObjectId,
    price: number, // Add phaseEnabled parameter
  ) {
    const user = new Types.ObjectId(userId);
    const [settings, machine, currentPrice, cloudKsettings] = await Promise.all(
      [
        this.cloudKService.getCurrentKillSettings(),
        this.machineModel
          .findOne({
            _id: machineId,
            user: userId,
            startDate: { $lt: new Date() },
            $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
          })
          .populate('stakeToken'),
        {
          price,
        },
        this.cloudKService.getCurrentCloudkSettings(),
      ],
    );
    //check the user staking wallet is exist or not
    const stakeWallet = await this.walletService.findUserWalletByTokenSymbol(
      machine.stakeToken.symbol,
      user,
    );

    const token: any = await this.tokenModel.findOne({
      symbol: cloudKsettings.burnInToken.symbol,
    });
    if (!token) {
      throw new HttpException(
        `${cloudKsettings.burnInToken.symbol} token is currently unavailable. Please check back later or contact support for more information.`,
        400,
      );
    }

    // create global variable for Active phase

    // let phaseTokenId;
    // let phaseWalletId;

    const phaseTokenId = token._id;

    const phaseWallet = await this.walletService.findUserWalletByTokenSymbol(
      cloudKsettings.burnInToken.symbol,
      user,
    );

    const phaseWalletId = phaseWallet._id;

    const totalBurnedAmount =
      await this.cloudKMachineStakeTransactionModel.aggregate([
        {
          $match: {
            machine: machine._id,
          },
        },
        {
          $lookup: {
            from: 'wallettransactions', // Target collection to join
            localField: 'walletTransaction', // Field from the local collection
            foreignField: '_id', // Field from the foreign collection
            pipeline: [
              {
                $match: {
                  wallet: phaseWalletId, // Filter by wallet ID
                  transactionFlow: 'out', // Filter by transaction flow
                },
              },
            ],
            as: 'transaction', // The name of the array of joined results
          },
        },
        {
          $unwind: {
            path: '$transaction', // Flatten the transaction array
            preserveNullAndEmptyArrays: true, // Keep documents without matching transactions
          },
        },
        {
          $group: {
            _id: '$machine', // Group by machine ID (or any other field)
            totalAmount: { $sum: '$transaction.amount' }, // Sum the amount field
          },
        },
      ]);
    const totalBurnedToken = totalBurnedAmount[0]?.totalAmount || 0;

    const totalBurnedAmountInDoller = totalBurnedToken * currentPrice.price;

    return {
      status: true,
      totalBurnedToken: totalBurnedToken,
      totalBurnedAmountInDoller: totalBurnedAmountInDoller,
      // totalAmountToBeStake: totalAmountToBeStake
      // normalPercentages,
      // boostPercentages,
      // amount,
      // totalAmountToBeStake,
      // totalTokenToBeStake,
      // percetageToken,
      // amoutToAdd,
      // phaseWalletBalance,
      // percentageToBeApplied
    };
  }

  /**
   * @deprecated The requirement has been changed. so we are no longer using this bussiness logic.
   * @use stakeIntoMachineV4() instead
   */
  async stakeIntoMachineV3(
    machineId: string,
    userId: string,
    amount: number,
    phaseEnabled: boolean,
  ) {
    const user = new Types.ObjectId(userId);
    //check the current settings of the stake in o a machine
    //Fetch the current machine
    //Fetch the current token value
    const [settings, machine, currentPrice, cloudKsettings] = await Promise.all(
      [
        this.cloudKService.getCurrentKillSettings(),
        this.machineModel
          .findOne({
            _id: machineId,
            user: userId,
            $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
          })
          .populate('stakeToken'),
        this.cloudKService.getCurrentPrice(),
        this.cloudKService.getCurrentCloudkSettings(),
      ],
    );
    //

    if (!settings.stakeEnabled) {
      throw new HttpException(
        'Staking is currently disabled, please try again later',
        400,
      );
    }

    if (machine?.endDate < new Date())
      throw new HttpException('Machine is expired.', 400);

    if (!cloudKsettings)
      throw new HttpException('There is no nodek settings', 400);

    //check the user staking wallet is exist or not
    const stakeWallet = await this.walletService.findUserWalletByTokenSymbol(
      machine.stakeToken.symbol,
      user,
    );
    if (!stakeWallet)
      throw new HttpException(
        `${machine.stakeToken.symbol} wallet not found`,
        400,
      );

    // create global variable for Active phase
    let normalPercentages;
    let boostPercentages;
    let startedDate;
    let reducingInDollerFromPhaseWallet = 0;
    let phaseTokenId;
    let phaseWalletId;
    let currentPhaseWalletBalance;
    let reducingTokenAmountFromPhaseWallet = 0;
    let totalAmountToBeStakeInMachine = amount * currentPrice.price;
    let totalTokenToBeStakeInMachine = amount;
    let percentageToBeApplied;

    if (phaseEnabled) {
      //  Get Active Phase settings
      const activePhaseSettings: any = await this.BurnService.fetchActiveBurn();
      if (!activePhaseSettings) {
        throw new HttpException(
          `No promotion is available right now. Please try again later.`, // change messgae
          400,
        );
      }
      //check the user is partcipant of active phase
      const isUserIsParticpant = await this.burnParticipantsModel
        .findOne({
          user: new Types.ObjectId(userId),
        })
        .select('_id');
      if (!isUserIsParticpant) {
        throw new HttpException(
          `User not joined the active Phase. Please join first.`,
          400,
        );
      }
      normalPercentages = activePhaseSettings.normalPercentage;
      boostPercentages = activePhaseSettings.boostPercentage;
      startedDate = isUserIsParticpant.joiningDate;

      const token: any = await this.tokenModel.findOne({
        symbol: cloudKsettings.burnInToken.symbol,
      });
      if (!token) {
        throw new HttpException(
          `${cloudKsettings.burnInToken.symbol} token is currently unavailable. Please check back later or contact support for more information.`,
          400,
        );
      }

      phaseTokenId = token._id;
      // Fetch the phase wallet
      const phaseWallet = await this.walletService.findUserWalletByTokenSymbol(
        cloudKsettings.burnInToken.symbol,
        user,
      );

      phaseWalletId = phaseWallet._id;

      const phaseWalletBalanceData = await this.walletService.getBalanceByToken(
        user,
        token._id,
      );

      //Fetching the phase wallet balance
      currentPhaseWalletBalance = phaseWalletBalanceData.balance;
    }

    //fetch the total staked Amount from the machine
    const currentTotalStakedInMachine =
      await this.cloudKService.getMachineTotalCollatoral(
        machine._id as Types.ObjectId,
      ); // must come in dollars

    if (phaseEnabled) {
      // fetch how much he burn
      const mlykUsedAfterJoined =
        await this.cloudKMachineStakeTransactionModel.aggregate([
          {
            $match: {
              machine: machine._id,
              createdAt: {
                $gte: startedDate,
              },
              deletedAt: null,
            },
          },
          {
            $lookup: {
              from: 'wallettransactions', // Target collection to join
              localField: 'walletTransaction', // Field from the local collection
              foreignField: '_id', // Field from the foreign collection
              pipeline: [
                {
                  $match: {
                    wallet: stakeWallet._id, // Filter by wallet ID
                    transactionFlow: 'out', // Filter by transaction flow
                  },
                },
              ],
              as: 'transaction', // The name of the array of joined results
            },
          },
          {
            $unwind: {
              path: '$transaction', // Flatten the transaction array
              preserveNullAndEmptyArrays: true, // Keep documents without matching transactions
            },
          },
          {
            $group: {
              _id: '$machine', // Group by machine ID (or any other field)
              totalAmount: { $sum: '$transaction.amount' }, // Sum the amount field
            },
          },
        ]);
      const totalMlykUsedAfterJoined =
        mlykUsedAfterJoined.length > 0 ? mlykUsedAfterJoined[0].totalAmount : 0;

      if (
        (totalMlykUsedAfterJoined + amount) * currentPrice.price >=
        machine.productPrice
      ) {
        percentageToBeApplied = boostPercentages;
      } else {
        percentageToBeApplied = normalPercentages;
      }

      const tokenToCalculatePercentage = amount;

      // Beacuse of issue HOM-524
      // if (currentPhaseWalletBalance > amount) {
      //   tokenToCalculatePercentage = amount;
      // } else {
      //   tokenToCalculatePercentage = currentPhaseWalletBalance;
      // }

      const extraTokenToAddForBurn =
        (percentageToBeApplied / 100) * tokenToCalculatePercentage;

      // Check phase wallet have Balance to distributed
      if (currentPhaseWalletBalance < extraTokenToAddForBurn) {
        // //Reducing amount from phase Wallet
        reducingTokenAmountFromPhaseWallet = currentPhaseWalletBalance;
      } else {
        // //Reducing amount from phase Wallet
        reducingTokenAmountFromPhaseWallet = extraTokenToAddForBurn;
      }

      reducingInDollerFromPhaseWallet =
        reducingTokenAmountFromPhaseWallet * currentPrice.price;

      // Total amount is to be stake in the machine
      totalAmountToBeStakeInMachine =
        amount * currentPrice.price + reducingInDollerFromPhaseWallet;

      //Token to add in the wallet
      totalTokenToBeStakeInMachine =
        totalAmountToBeStakeInMachine / currentPrice.price;
    }

    if (
      machine.stakeLimit &&
      machine.stakeLimit <
        currentTotalStakedInMachine + totalAmountToBeStakeInMachine
    ) {
      throw new HttpException('Stake limit exceeded', 400);
    }

    const stakeWalletBalance = await this.walletService.getBalanceByToken(
      user,
      stakeWallet.token._id,
    );

    if (stakeWalletBalance.balance < amount) {
      throw new HttpException('Insufficient tokens in the wallet', 400);
    }

    const session = await this.connection.startSession();
    await session.startTransaction();

    try {
      const walletTransactionArray =
        await this.walletService.createRawWalletTransaction(
          {
            amount: amount,
            wallet: stakeWallet._id,
            transactionFlow: TransactionFlow.OUT,
            trxType: TrxType.STAKE,
            user: machine.user,
          },
          session,
        );

      const walletTransaction =
        walletTransactionArray.length > 0 ? walletTransactionArray[0] : null;

      let message = `stake-in-dollar = ${currentPrice.price} * ${amount} | stake in token ${machine.stakeToken.symbol} = ${amount}`;

      let phaseWalletTransaction;
      if (phaseEnabled) {
        const phaseWalletTransactionArray =
          await this.walletService.createRawWalletTransaction(
            {
              amount: reducingTokenAmountFromPhaseWallet,
              wallet: phaseWalletId,
              transactionFlow: TransactionFlow.OUT,
              trxType: TrxType.STAKE,
              user: machine.user,
            },
            session,
          );

        phaseWalletTransaction =
          phaseWalletTransactionArray.length > 0
            ? phaseWalletTransactionArray[0]
            : null;

        message =
          message +
          `|smLYK Token used  =  ${reducingTokenAmountFromPhaseWallet} | 
          smLYK Token converted to doller = ${currentPrice.price} * ${reducingTokenAmountFromPhaseWallet} = ${reducingInDollerFromPhaseWallet}| 
          Before stake smlyk Balance ${currentPhaseWalletBalance} smlyk`;
      }

      // Adding the stake amount to the cloudkMachineStake
      const stake = await this.cloudKService.addStake({
        session: session,
        machineId: new mongoose.Types.ObjectId(machineId),
        userId: new Types.ObjectId(userId),
        type: CLOUDK_MACHINE_STAKE_TYPE.STAKE,
        from: phaseEnabled ? STAKE_FROM.PHASE_DEPOSIT : STAKE_FROM.MORE_STAKE,
        totalToken: totalTokenToBeStakeInMachine,
        lykPrice: currentPrice.price,
        walletTransactionId: null,
        extraMessage: message,
        burnValue: reducingTokenAmountFromPhaseWallet,
        actualValue: amount,
      });

      const bulkCreateArray = [
        {
          machine: new mongoose.Types.ObjectId(machineId),
          stake: stake._id,
          walletTransaction: walletTransaction._id,
          note: '',
        },
      ];
      if (phaseEnabled) {
        bulkCreateArray.push({
          machine: new mongoose.Types.ObjectId(machineId),
          stake: stake._id,
          walletTransaction: phaseWalletTransaction._id,
          note: '',
        });
      }
      await this.cloudKMachineStakeTransactionModel.insertMany(
        bulkCreateArray,
        { session },
      );

      const snGaskSetting = await this.snGaskSettingModel.findOne();
      const multiplier = snGaskSetting.multiplier || 3;

      await this.userGaskModel.create(
        [
          {
            user: new Types.ObjectId(userId),
            amount: stake.totalPrice * multiplier, // dollar value
            flow: TransactionFlow.IN,
            stake: stake._id,
            multiplier: multiplier,
            machine: machine._id,
          },
        ],
        { session },
      );
      await this.cacheService.deleteUserCache({
        type: CACHE_TYPE.ACTIVE_USER,
        user: userId,
      });

      machine.collatoral += currentPrice.price * totalTokenToBeStakeInMachine;
      machine.stakedTokenAmount += totalTokenToBeStakeInMachine;
      machine.status = CLOUDK_MACHINE_STATUS.ACTIVE;
      await machine.save({ session });

      if (phaseEnabled) {
        await Promise.all([
          await this.cloudKService.createCloudKTransaction(
            {
              tokenAmount: reducingTokenAmountFromPhaseWallet,
              type: CloudKTransactionTypes.SWAPPED,
              user: machine.user,
              machine: machine._id as Types.ObjectId,
              token: machine.stakeToken as any,
              note: 'BURN-AND-STAKE amount is auto swapped smlyk to lyk.',
            },
            session,
          ),
          this.cloudKService.createCloudKTransaction(
            {
              tokenAmount: reducingTokenAmountFromPhaseWallet,
              type: CloudKTransactionTypes.STAKE_AND_BURN,
              user: machine.user,
              machine: machine._id as Types.ObjectId,
              totalTokenPrice:
                currentPrice.price * reducingTokenAmountFromPhaseWallet,
              token: stakeWallet.token,
              stake: String(stake._id),
            },
            session,
          ),
          this.cloudKService.createCloudKTransaction(
            {
              tokenAmount: amount,
              type: CloudKTransactionTypes.ADD_STAKE,
              user: machine.user,
              machine: machine._id as Types.ObjectId,
              totalTokenPrice: currentPrice.price * amount,
              token: stakeWallet.token,
              stake: String(stake._id),
            },
            session,
          ),

          // this.walletService.swapTransactionFunction(
          //   {
          //     userId,
          //     fromUserWalletId: phaseWalletId,
          //     toUserWalletId: stakeWallet._id,
          //     amount: reducingTokenAmountFromPhaseWallet,
          //     fromTokenId: phaseTokenId,
          //     toTokenSymbol: machine.stakeToken.symbol,
          //   },
          //   session,
          // ),
        ]);
      } else {
        await this.cloudKService.createCloudKTransaction(
          {
            tokenAmount: totalTokenToBeStakeInMachine,
            type: phaseEnabled
              ? CloudKTransactionTypes.STAKE_AND_BURN
              : CloudKTransactionTypes.ADD_STAKE,
            user: machine.user,
            machine: machine._id as Types.ObjectId,
            totalTokenPrice: currentPrice.price * totalTokenToBeStakeInMachine,
            token: stakeWallet.token,
            stake: String(stake._id),
          },
          session,
        );
      }

      const user = await this.usermModel.findById(userId, {}, { session });
      if (user) {
        user.isBuilderGenerationActive =
          await this.supernodeService.isBuilderGenerationUserActiveNode(
            new Types.ObjectId(userId),
            session,
          );

        user.isBaseReferralActive =
          (
            await this.supernodeService.baseRefereralUserActiveMachine(
              new Types.ObjectId(userId),
              session,
            )
          )?.status ?? false;

        await user.save({ session });
      }

      await session.commitTransaction();
      return 'Tokens staked successfully';
    } catch (error) {
      await session.abortTransaction();
      throw new HttpException(error.message, 400);
    } finally {
      session.endSession();
    }
  }

  async getBunCalculationV2(
    machineId: string,
    userId: string,
    amount: number,
    phaseEnabled: boolean,
    price: number, // Add phaseEnabled parameter
  ) {
    const user = new Types.ObjectId(userId);

    // if (!amount && amount <= 0) {
    //   throw new HttpException(
    //     'Amount is required fro calculate to smlyk ',
    //     400,
    //   );
    // }
    //check the current settings of the stake in o a machine
    //Fetch the current machine
    //Fetch the current token value
    const [settings, machine, currentPrice, cloudKsettings] = await Promise.all(
      [
        this.cloudKService.getCurrentKillSettings(),
        this.machineModel
          .findOne({
            _id: machineId,
            user: userId,
            $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
          })
          .populate('stakeToken'),
        this.cloudKService.getCurrentPrice(),
        this.cloudKService.getCurrentCloudkSettings(),
      ],
    );

    price = currentPrice.price;

    //

    if (!settings.stakeEnabled) {
      throw new HttpException(
        'Staking is currently disabled, please try again later',
        400,
      );
    }

    if (machine?.endDate < new Date())
      throw new HttpException('Machine is expired.', 400);

    if (!cloudKsettings)
      throw new HttpException('There is no nodek settings', 400);

    //check the user staking wallet is exist or not
    const stakeWallet = await this.walletService.findUserWalletByTokenSymbol(
      machine.stakeToken.symbol,
      user,
    );
    if (!stakeWallet)
      throw new HttpException(
        `${machine.stakeToken.symbol} wallet not found`,
        400,
      );

    // create global variable for Active phase
    let normalPercentages;
    let boostPercentages;
    let startedDate;
    let reducingInDollerFromPhaseWallet = 0;
    let phaseTokenId;
    let phaseWalletId;
    let currentPhaseWalletBalance;
    let reducingTokenAmountFromPhaseWallet = 0;
    let totalAmountToBeStakeInMachine = amount * currentPrice.price;
    let totalTokenToBeStakeInMachine = amount;
    let percentageToBeApplied;
    let totalMlykUsedAfterJoined;

    if (phaseEnabled) {
      //  Get Active Phase settings
      const activePhaseSettings: any = await this.BurnService.fetchActiveBurn();
      if (!activePhaseSettings) {
        throw new HttpException(
          `No promotion is available right now. Please try again later.`, // change messgae
          400,
        );
      }
      //check the user is partcipant of active phase
      const isUserIsParticpant = await this.burnParticipantsModel.findOne({
        user: new Types.ObjectId(userId),
      });
      if (!isUserIsParticpant) {
        throw new HttpException(
          `User not joined the active Phase. Please join first.`,
          400,
        );
      }
      normalPercentages = activePhaseSettings.normalPercentage;
      boostPercentages = activePhaseSettings.boostPercentage;
      startedDate = isUserIsParticpant.joiningDate;

      const token: any = await this.tokenModel.findOne({
        symbol: cloudKsettings.burnInToken.symbol,
      });
      if (!token) {
        throw new HttpException(
          `${cloudKsettings.burnInToken.symbol} token is currently unavailable. Please check back later or contact support for more information.`,
          400,
        );
      }

      phaseTokenId = token._id;
      // Fetch the phase wallet
      const phaseWallet = await this.walletService.findUserWalletByTokenSymbol(
        cloudKsettings.burnInToken.symbol,
        user,
      );

      phaseWalletId = phaseWallet._id;

      // const phaseWalletBalanceData = await this.walletService.getBalanceByToken(
      //   user,
      //   token._id,
      // );

      const phaseWalletBalanceData = await this.wallet.find(user, token._id);
      //Fetching the phase wallet balance
      currentPhaseWalletBalance = phaseWalletBalanceData[0].totalBalanceinToken;
    }

    //fetch the total staked Amount from the machine
    const currentTotalStakedInMachine =
      await this.cloudKService.getMachineTotalCollatoral(
        machine._id as Types.ObjectId,
      ); // must come in dollars

    if (phaseEnabled) {
      totalAmountToBeStakeInMachine;
      // fetch how much he burn
      const mlykUsedAfterJoined =
        await this.cloudKMachineStakeTransactionModel.aggregate([
          {
            $match: {
              machine: machine._id,
              createdAt: {
                $gte: startedDate,
              },
              deletedAt: null,
            },
          },
          {
            $lookup: {
              from: 'wallettransactions', // Target collection to join
              localField: 'walletTransaction', // Field from the local collection
              foreignField: '_id', // Field from the foreign collection
              pipeline: [
                {
                  $match: {
                    wallet: stakeWallet._id, // Filter by wallet ID
                    transactionFlow: 'out', // Filter by transaction flow
                  },
                },
              ],
              as: 'transaction', // The name of the array of joined results
            },
          },
          {
            $unwind: {
              path: '$transaction', // Flatten the transaction array
              preserveNullAndEmptyArrays: true, // Keep documents without matching transactions
            },
          },
          {
            $group: {
              _id: '$machine', // Group by machine ID (or any other field)
              totalAmount: { $sum: '$transaction.amount' }, // Sum the amount field
            },
          },
        ]);
      totalMlykUsedAfterJoined =
        mlykUsedAfterJoined.length > 0 ? mlykUsedAfterJoined[0].totalAmount : 0;

      // console.log({
      //   totalMlykUsedAfterJoined,
      //   amount,
      //   price,
      //   productPrice: machine.productPrice,
      // });

      if ((totalMlykUsedAfterJoined + amount) * price >= machine.productPrice) {
        percentageToBeApplied = boostPercentages;
      } else {
        percentageToBeApplied = normalPercentages;
      }

      const tokenToCalculatePercentage = amount;

      // Because HOM-524
      // if (currentPhaseWalletBalance > amount) {
      //   tokenToCalculatePercentage = amount;
      // } else {
      //   tokenToCalculatePercentage = currentPhaseWalletBalance;
      // }

      const extraTokenToAddForBurn =
        (percentageToBeApplied / 100) * tokenToCalculatePercentage;

      // Check phase wallet have Balance to distributed
      if (currentPhaseWalletBalance < extraTokenToAddForBurn) {
        // //Reducing amount from phase Wallet
        reducingTokenAmountFromPhaseWallet = currentPhaseWalletBalance;
      } else {
        // //Reducing amount from phase Wallet
        reducingTokenAmountFromPhaseWallet = extraTokenToAddForBurn;
      }

      reducingInDollerFromPhaseWallet =
        reducingTokenAmountFromPhaseWallet * currentPrice.price;

      // Total amount is to be stake in the machine
      totalAmountToBeStakeInMachine =
        amount * currentPrice.price + reducingInDollerFromPhaseWallet;

      //Token to add in the wallet
      totalTokenToBeStakeInMachine =
        totalAmountToBeStakeInMachine / currentPrice.price;
    }

    if (
      machine.stakeLimit &&
      machine.stakeLimit <
        currentTotalStakedInMachine + totalAmountToBeStakeInMachine
    ) {
      throw new HttpException('Stake limit exceeded', 400);
    }

    const stakeWalletBalance = await this.walletService.getBalanceByToken(
      user,
      stakeWallet.token._id,
    );

    // const stakeWalletBalance = await this.wallet.find({
    //   user,
    //   token: stakeWallet.token._id,
    // });

    if (stakeWalletBalance.balance < amount) {
      throw new HttpException('Insufficient tokens in the wallet', 400);
    }

    const smlykUsedAfterJoined =
      await this.cloudKMachineStakeTransactionModel.aggregate([
        {
          $match: {
            machine: machine._id,
            createdAt: {
              $gte: startedDate,
            },
            deletedAt: null,
          },
        },
        {
          $lookup: {
            from: 'wallettransactions', // Target collection to join
            localField: 'walletTransaction', // Field from the local collection
            foreignField: '_id', // Field from the foreign collection
            pipeline: [
              {
                $match: {
                  wallet: phaseWalletId, // Filter by wallet ID
                  transactionFlow: 'out', // Filter by transaction flow
                },
              },
            ],
            as: 'transaction', // The name of the array of joined results
          },
        },
        {
          $unwind: {
            path: '$transaction', // Flatten the transaction array
            preserveNullAndEmptyArrays: true, // Keep documents without matching transactions
          },
        },
        {
          $group: {
            _id: '$machine', // Group by machine ID (or any other field)
            totalAmount: { $sum: '$transaction.amount' }, // Sum the amount field
          },
        },
      ]);

    const totalMlykStaked =
      await this.cloudKMachineStakeTransactionModel.aggregate([
        {
          $match: {
            machine: machine._id,

            deletedAt: null,
          },
        },
        {
          $lookup: {
            from: 'wallettransactions', // Target collection to join
            localField: 'walletTransaction', // Field from the local collection
            foreignField: '_id', // Field from the foreign collection
            pipeline: [
              {
                $match: {
                  wallet: stakeWallet._id, // Filter by wallet ID
                  transactionFlow: 'out', // Filter by transaction flow
                },
              },
            ],
            as: 'transaction', // The name of the array of joined results
          },
        },
        {
          $unwind: {
            path: '$transaction', // Flatten the transaction array
            preserveNullAndEmptyArrays: true, // Keep documents without matching transactions
          },
        },
        {
          $group: {
            _id: '$machine', // Group by machine ID (or any other field)
            totalAmount: { $sum: '$transaction.amount' }, // Sum the amount field
          },
        },
      ]);
    let boostPercentageRequiredInMlykDoller =
      machine.productPrice - totalMlykUsedAfterJoined * currentPrice.price;
    boostPercentageRequiredInMlykDoller =
      boostPercentageRequiredInMlykDoller < 0
        ? 0
        : boostPercentageRequiredInMlykDoller;

    return {
      status: true,
      phaseWalletData: {
        amount: reducingTokenAmountFromPhaseWallet,
        dollarValue: reducingTokenAmountFromPhaseWallet * currentPrice.price,
        percentageToBeApplied,
        walletBalance: currentPhaseWalletBalance,
      },
      stakeWalletData: {
        amount: amount,
        dollarValue: amount * price,
      },
      totalToBeStakeInMachineData: {
        totalAmount: totalAmountToBeStakeInMachine,
        totalToken: totalTokenToBeStakeInMachine,
        machinePrice: machine.productPrice,
      },
      machine: {
        totalStaked: currentTotalStakedInMachine,
        totalMlykStaked: totalMlykStaked.length
          ? totalMlykStaked[0].totalAmount
          : 0,
        mlykStakedAfterJoined: totalMlykUsedAfterJoined,
        smlykStakedAfterJoined: smlykUsedAfterJoined.length
          ? smlykUsedAfterJoined[0].totalAmount
          : 0,
        maxStakeLimit: machine.stakeLimit,
        normalPercentage: normalPercentages,
        boostPercentage: boostPercentages,
        boostPercentageRequiredInMlykDoller,
        boostPercentageRequiredInMlyk:
          boostPercentageRequiredInMlykDoller > 0
            ? boostPercentageRequiredInMlykDoller / currentPrice.price
            : 0,
      },
      lykPrice: currentPrice.price,
    };
  }
  async getBunCalculationV4(
    machineId: string,
    userId: string,
    amount: number,
    phaseEnabled: boolean,
    price: number,
    HundredPercentClicked: boolean,
  ) {
    const currentPrice = {
      price,
    };
    const user = new Types.ObjectId(userId);
    const [settings, machine, cloudSettings] = await Promise.all([
      this.cloudKService.getCurrentKillSettings(),
      this.machineModel
        .findOne({
          _id: machineId,
          user: userId,
          $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
        })
        .populate('stakeToken'),
      this.cloudKService.getCurrentCloudkSettings(),
    ]);

    if (!settings || !machine || !cloudSettings) {
      throw new HttpException(
        'Unable to process the request. Please try again later or contact the support',
        422,
      );
    }

    if (!settings.stakeEnabled) {
      throw new HttpException(
        'Staking is currently disabled, please try again later',
        400,
      );
    }

    if (machine?.endDate < new Date())
      throw new HttpException('Machine is expired.', 400);

    if (!cloudSettings)
      throw new HttpException('NodeK settings not found.', 400);

    //check the user staking wallet is exist or not
    const stakeWallet = await this.walletService.findUserWalletByTokenSymbol(
      machine.stakeToken.symbol,
      user,
    );
    if (!stakeWallet)
      throw new HttpException(
        `${machine.stakeToken.symbol} wallet not found`,
        400,
      );

    // create global variable for Active phase
    let normalPercentages;
    /**
     * We need to use this to calculate the percentage if the amount >= machine price
     */
    let boostPercentages;

    let percentageToBeApplied;
    let startedDate;

    let phaseWalletId;
    let usdKPromoWalletId;
    let usdKPromoWallet;
    let currentPhaseWalletBalance;

    /**
     * Amount in USD
     */
    const totalAmountToBeStakeInMachine = amount * currentPrice.price;

    /**
     * Them amount to stake. value in local currency.
     */
    const totalTokenAmountToStake = amount;

    /**
     *  value in local currency
     */
    let burnAmount = 0;

    /**
     * value in local currency
     */
    let burnAmountTakenFromLocal = 0;

    /**
     * value in USD currency
     */
    let burnAmountFromUSD = 0;

    clog(totalTokenAmountToStake, 'Total token initial');

    const stakeWalletBalance = await this.walletService.getBalanceByToken(
      user,
      stakeWallet.token._id,
    );
    // const stakeWalletBalance = await this.wallet.find({
    //   user: user,
    //   token: stakeWallet.token._id,
    // });

    if (HundredPercentClicked) {
    } else {
      if (stakeWalletBalance.balance < amount) {
        throw new HttpException('Insufficient tokens in the wallet', 400);
      }
    }

    /**
     * Fetch the total staked Amount from the machine. value In Dollar
     */

    const currentTotalStakedInMachine =
      await this.cloudKService.getMachineTotalCollatoral(
        machine._id as Types.ObjectId,
      ); // must come in dollars

    if (
      machine.stakeLimit &&
      machine.stakeLimit <
        currentTotalStakedInMachine + totalAmountToBeStakeInMachine
    ) {
      throw new HttpException('Stake limit exceeded', 400);
    }

    if (phaseEnabled) {
      //  Get Active Phase settings
      const activePhaseSettings: any = await this.BurnService.fetchActiveBurn();
      if (!activePhaseSettings) {
        throw new HttpException(
          `No promotion is available right now. Please try again later.`, // change message
          400,
        );
      }
      //check the user is Participant of active phase
      const isUserIsParticipant = await this.burnParticipantsModel
        .findOne({
          user: new Types.ObjectId(userId),
        })
        .select('_id joiningDate');
      if (!isUserIsParticipant) {
        throw new HttpException(
          `User not joined the active Phase. Please join first.`,
          400,
        );
      }
      normalPercentages = activePhaseSettings.normalPercentage;
      boostPercentages = activePhaseSettings.boostPercentage;
      startedDate = isUserIsParticipant.joiningDate;

      /**
       * Burn local LYK value token. ie smLYK
       */
      const burnTokenLocal: any = await this.tokenModel.findOne({
        symbol: cloudSettings.burnInToken.symbol,
        deletedAt: null,
      });
      const usdKPromoToken: any = await this.tokenModel.findOne({
        symbol: PHASE_TOKEN_USD,
        deletedAt: null,
      });
      if (!burnTokenLocal) {
        throw new HttpException(
          `${cloudSettings.burnInToken.symbol} token is currently disabled. Please check back later or contact support for more information.`,
          400,
        );
      }

      //

      // Fetch the phase wallet
      const phaseWallet = await this.walletService.findUserWalletByTokenSymbol(
        cloudSettings.burnInToken.symbol,
        user,
      );

      const usdKPromoWalletData =
        await this.walletService.findUserWalletByTokenSymbol(
          PHASE_TOKEN_USD,
          user,
        );

      phaseWalletId = phaseWallet._id;
      usdKPromoWalletId = usdKPromoWalletData._id;

      /**
       * Balance of phase Wallet. Most probably balance of smLYK
       */
      // const phaseWalletBalanceData = await this.walletService.getBalanceByToken(
      //   user,
      //   burnTokenLocal._id,
      // );

      const phaseWalletBalanceData = await this.wallet.find({
        user: user,
        token: burnTokenLocal._id,
      });

      /**
       * Balance of phase Wallet USDK-promo
       */
      // usdKPromoWallet = await this.walletService.getBalanceByToken(
      //   user,
      //   usdKPromoToken._id,
      // );

      usdKPromoWallet = await this.wallet.find({
        user: user,
        token: usdKPromoToken._id,
      });

      if (
        totalAmountToBeStakeInMachine + currentTotalStakedInMachine >=
        machine.productPrice
      ) {
        percentageToBeApplied = boostPercentages;
      } else {
        percentageToBeApplied = normalPercentages;
      }

      burnAmount = (percentageToBeApplied / 100) * totalTokenAmountToStake;

      const balanceAfterMayStake =
        phaseWalletBalanceData[0].totalBalanceinToken - burnAmount;

      clog(burnAmount, 'burn percentage amount is ');
      clog(balanceAfterMayStake, 'balanceAfterMayStake ');
      clog(burnAmountTakenFromLocal, 'burnAmountTakenFromLocal smLYK');
      burnAmountTakenFromLocal = burnAmount;
      if (balanceAfterMayStake < 0) {
        /**
         * If code come here. that means user is not enough amount in the local token what admin set(it can be smLYK).
         * we will try to get the remaining amount from the USDk Promo
         */
        burnAmount += balanceAfterMayStake;
        burnAmountTakenFromLocal = burnAmount;
        clog(burnAmount, 'Total token amount after max amount taken');
        clog(
          burnAmountTakenFromLocal,
          'burnAmountTakenFromLocal - this will take from smLYK',
        );

        const balanceAfterMayStakeUSD =
          Math.abs(balanceAfterMayStake) * currentPrice.price;

        if (usdKPromoWallet[0].totalBalanceinToken >= balanceAfterMayStakeUSD) {
          //Reducing amount from phase Wallet
          burnAmountFromUSD = balanceAfterMayStakeUSD;
          clog(
            balanceAfterMayStakeUSD,
            'Total USD amount will take from the USDK-promo',
          );
        } else {
          burnAmountFromUSD = usdKPromoWallet[0].totalBalanceinToken;
          clog(
            usdKPromoWallet[0].totalBalanceinToken,
            burnAmount,
            burnAmountFromUSD,
            "user don't have enough balance in USDK to reduce token amount. current totalTokenAmountToStake: ",
          );
        }
        burnAmount += burnAmountFromUSD / currentPrice.price;
      }
    }

    /**
     * Just checking if user can stake without the promotion.
     */
    if (
      machine.stakeLimit &&
      machine.stakeLimit <
        currentTotalStakedInMachine + totalAmountToBeStakeInMachine
    ) {
      clog(
        {
          stakeLimit: machine.stakeLimit,
          currentTotalStakedInMachine,
          totalTokenAmountToStake,
          cprice: currentPrice.price,
        },
        "user don't have enough balance in USDK to reduce token amount. current totalTokenAmountToStake: ",
      );
      throw new HttpException(
        'Stake limit exceeded. You may able to stake without the promotion.',
        400,
      );
    }

    const totalMlykStaked =
      await this.cloudKMachineStakeTransactionModel.aggregate([
        {
          $match: {
            machine: machine._id,

            deletedAt: null,
          },
        },
        {
          $lookup: {
            from: 'wallettransactions', // Target collection to join
            localField: 'walletTransaction', // Field from the local collection
            foreignField: '_id', // Field from the foreign collection
            pipeline: [
              {
                $match: {
                  wallet: stakeWallet._id, // Filter by wallet ID
                  transactionFlow: 'out', // Filter by transaction flow
                },
              },
            ],
            as: 'transaction', // The name of the array of joined results
          },
        },
        {
          $unwind: {
            path: '$transaction', // Flatten the transaction array
            preserveNullAndEmptyArrays: true, // Keep documents without matching transactions
          },
        },
        {
          $group: {
            _id: '$machine', // Group by machine ID (or any other field)
            totalAmount: { $sum: '$transaction.amount' }, // Sum the amount field
          },
        },
      ]);

    const mlykUsedAfterJoined =
      await this.cloudKMachineStakeTransactionModel.aggregate([
        {
          $match: {
            machine: machine._id,
            createdAt: {
              $gte: startedDate,
            },
            deletedAt: null,
          },
        },
        {
          $lookup: {
            from: 'wallettransactions', // Target collection to join
            localField: 'walletTransaction', // Field from the local collection
            foreignField: '_id', // Field from the foreign collection
            pipeline: [
              {
                $match: {
                  wallet: stakeWallet._id, // Filter by wallet ID
                  transactionFlow: 'out', // Filter by transaction flow
                },
              },
            ],
            as: 'transaction', // The name of the array of joined results
          },
        },
        {
          $unwind: {
            path: '$transaction', // Flatten the transaction array
            preserveNullAndEmptyArrays: true, // Keep documents without matching transactions
          },
        },
        {
          $group: {
            _id: '$machine', // Group by machine ID (or any other field)
            totalAmount: { $sum: '$transaction.amount' }, // Sum the amount field
          },
        },
      ]);

    const smlykUsedAfterJoined =
      await this.cloudKMachineStakeTransactionModel.aggregate([
        {
          $match: {
            machine: machine._id,
            createdAt: {
              $gte: startedDate,
            },
            deletedAt: null,
          },
        },
        {
          $lookup: {
            from: 'wallettransactions', // Target collection to join
            localField: 'walletTransaction', // Field from the local collection
            foreignField: '_id', // Field from the foreign collection
            pipeline: [
              {
                $match: {
                  wallet: phaseWalletId, // Filter by wallet ID
                  transactionFlow: 'out', // Filter by transaction flow
                },
              },
            ],
            as: 'transaction', // The name of the array of joined results
          },
        },
        {
          $unwind: {
            path: '$transaction', // Flatten the transaction array
            preserveNullAndEmptyArrays: true, // Keep documents without matching transactions
          },
        },
        {
          $group: {
            _id: '$machine', // Group by machine ID (or any other field)
            totalAmount: { $sum: '$transaction.amount' }, // Sum the amount field
          },
        },
      ]);
    const totalMlykUsedAfterJoined =
      mlykUsedAfterJoined.length > 0 ? mlykUsedAfterJoined[0].totalAmount : 0;

    let boostPercentageRequiredInMlykDoller =
      machine.productPrice - totalMlykUsedAfterJoined * currentPrice.price;
    boostPercentageRequiredInMlykDoller =
      boostPercentageRequiredInMlykDoller < 0
        ? 0
        : boostPercentageRequiredInMlykDoller;
    return {
      status: true,
      percentageToBeApplied,
      phaseWalletData: {
        // Local smLYK valet
        amount: burnAmountTakenFromLocal,
        dollarValue: burnAmountTakenFromLocal * currentPrice.price,
        walletBalance: currentPhaseWalletBalance || 0,
      },
      usdKPromoWalletData: {
        amount: burnAmountFromUSD / currentPrice.price,
        dollarValue: burnAmountFromUSD,
        walletBalance: usdKPromoWallet.balance || 0,
      },
      stakeWalletData: {
        amount: amount,
        dollarValue: amount * price,
      },
      totalToBeStakeInMachineData: {
        totalAmount:
          totalAmountToBeStakeInMachine + burnAmount * currentPrice.price,
        totalToken:
          totalAmountToBeStakeInMachine / currentPrice.price + burnAmount,

        machinePrice: machine.productPrice,
      },
      totalBurnAmount: {
        amount: burnAmount,
        dollarValue: burnAmount * currentPrice.price,
      },
      machine: {
        totalStaked: currentTotalStakedInMachine,
        totalMlykStaked: totalMlykStaked.length
          ? totalMlykStaked[0].totalAmount
          : 0,
        mlykStakedAfterJoined: totalMlykUsedAfterJoined,
        smlykStakedAfterJoined: smlykUsedAfterJoined.length
          ? smlykUsedAfterJoined[0].totalAmount
          : 0,
        maxStakeLimit: machine.stakeLimit,
        normalPercentage: normalPercentages,
        boostPercentage: boostPercentages,
        boostPercentageRequiredInMlykDoller,
        boostPercentageRequiredInMlyk:
          boostPercentageRequiredInMlykDoller > 0
            ? boostPercentageRequiredInMlykDoller / currentPrice.price
            : 0,
      },
      lykPrice: currentPrice.price,
    };
  }

  // async connectMachineWithSerialNumber(
  //   machineConnectData: MachineConnectDto,
  //   user: Types.ObjectId,
  // ) {
  //   try {
  //     // find the machine details with machineId
  //     const machineData: any = await this.machineModel
  //       .findOne({
  //         _id: machineConnectData.machine,
  //         user,
  //         deletedAt: null,
  //       })
  //       .populate('user product');
  //     // Check the machine is exist or not
  //     if (!machineData) {
  //       throw new HttpException(`No machine with data found on homnifi.`, 400);
  //     }
  //     // check the machine already connected or not
  //     if (machineData.isMachineConnected) {
  //       throw new HttpException(
  //         `This machine is already connected with a serial number.`,
  //         400,
  //       );
  //     }
  //     // check the machine is deleverd or not
  //     if (
  //       machineData.assignedSerialNumber &&
  //       ![
  //         MAHCINE_TRACK_API_STATUS.DELIVERED,
  //         MAHCINE_TRACK_API_STATUS.PICKED_UP,
  //       ].includes(machineData.shipmentStatus)
  //     ) {
  //       throw new HttpException(
  //         `This machine is not deliverd to the user.`,
  //         400,
  //       );
  //     }

  //     if (
  //       machineData.assignedSerialNumber !== machineConnectData.serialNumber
  //     ) {
  //       throw new HttpException(`Serial number mismatched.`, 400);
  //     }
  //     // check the serial number is exist in machinedetail table
  //     const serialNumberData =
  //       await this.machineSerialNumberDetailsModel.findOne({
  //         sn: machineConnectData.serialNumber,
  //       });
  //     if (!serialNumberData) {
  //       throw new HttpException(`Serial number is not found.`, 400);
  //     }
  //     if (serialNumberData.linked) {
  //       throw new HttpException(`Serial number is already used.`, 400);
  //     }

  //     // update in the cloudk machine and update the machineserialNumberDetail table
  //     machineData.isMachineConnected = !machineData.isMachineConnected;
  //     machineData.serialNumberConnectedDate = new Date();
  //     serialNumberData.linked = !serialNumberData.linked;
  //     await Promise.all([machineData.save(), serialNumberData.save()]);

  //     // communicate with ping server
  //     const data = {
  //       userBid: machineData.user?.blockchainId,
  //       serialNumber: machineData.serialNumber,
  //       assignedSerialNumber: machineData.assignedSerialNumber,
  //       uniqueName: machineData.uniqueName,
  //       name: machineData.name,
  //       imageUrl: machineData.imageUrl,
  //       externalMachineId: machineData.externalMachineId,
  //       startDate: machineData.startDate,
  //       externalProductId: machineData.product.externalProductId,
  //       endDate: machineData.endDate,
  //       product: machineData.product._id,
  //       meta: {
  //         autoCompound: machineData.autoCompound,
  //         lockedPrice: machineData.lockedPrice,
  //         dlp: machineData.dlp,
  //         userId: machineData.user?._id,
  //         productId: machineData.product._id,
  //       },
  //     };

  //     this.rabbitMqProducerService.publish(
  //       RABBITMQ_EXCHANGES.DATA_EXCHANGE,
  //       'user.update.machine.connect',
  //       data,
  //     );

  //     // add in cloudk transaction

  //     const cloudTransaction = new this.cloudkTransactionModel({
  //       user: machineData.user._id,
  //       type: CloudKTransactionTypes.MINTER_CONNECTED,
  //       machine: machineData._id,
  //       tokenAmount: 0,
  //       note: 'User connected the minter successfully',
  //       meta: {
  //         serialNumber: machineConnectData.serialNumber,
  //       },
  //     });

  //     await cloudTransaction.save();

  //     return {
  //       message: `Sucessfully machine is connect with serial number ${machineConnectData.serialNumber} `,
  //       machineDetails: machineData,
  //     };
  //   } catch (error) {
  //     throw new Error(error);
  //   }
  // }

  // async getActiveStatus(machineActiveStatusDto, user) {
  //   // find the machine
  //   let { machine, fromDate, toDate } = machineActiveStatusDto;
  //   const machineData: any = await this.machineModel
  //     .findOne({
  //       _id: new Types.ObjectId(machine),
  //       user,
  //       deletedAt: null,
  //     })
  //     .populate('user product');

  //   // Check the machine is exist or not
  //   if (!machineData) {
  //     throw new HttpException(`No machine with data found on homnifi.`, 400);
  //   }

  //   if (!machineData.isMachineConnected) {
  //     return {
  //       serialNumberConnectedDate: machineData.serialNumberConnectedDate,
  //       gracePeriodEndDate: machineData.gracePeriodEndDate,
  //       isMachineConnected: machineData.isMachineConnected,
  //       activeStatusData: [],
  //     };
  //   }

  //   // Convert input dates to Date objects (if they exist)

  //   let startDate = fromDate
  //     ? new Date(fromDate.trim().replace(' ', 'T').replace(' 00:00', 'Z'))
  //     : null;
  //   let endDate = toDate
  //     ? new Date(toDate.trim().replace(' ', 'T').replace(' 00:00', 'Z'))
  //     : null;

  //   // Ensure serialNumberConnectedDate is a Date object
  //   const serialConnectedDate = new Date(machineData.serialNumberConnectedDate);
  //   const currentDate = new Date(); // Current system date

  //   // Validate and adjust date range
  //   if (startDate && endDate) {
  //     if (startDate < serialConnectedDate) {
  //       startDate = serialConnectedDate;
  //     }
  //     if (endDate > currentDate) {
  //       endDate = currentDate;
  //     }
  //   } else {
  //     startDate = serialConnectedDate;
  //     endDate = currentDate;
  //   }

  //   // call rabitMq for get the data from the ping server

  //   return {
  //     serialNumberConnectedDate: machineData.serialNumberConnectedDate,
  //     gracePeriodEndDate: machineData.gracePeriodEndDate,
  //     isMachineConnected: machineData.isMachineConnected,
  //     activeStatusData: [],
  //   };
  // }
}
