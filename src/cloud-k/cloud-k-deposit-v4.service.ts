import { forwardRef, HttpException, Inject, Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import mongoose, { Connection, Model, Types } from 'mongoose';
import {
  CloudKMachine,
  STAKING_PERIOD_ENUM,
} from './schemas/cloudk-machine.schema';

import { SuperNodeGaskSetting } from '../supernode/schemas/sn-gask-setting.schema';
import { UserGask } from '../supernode/schemas/user-gask.schema';
import { SupernodeService } from '../supernode/supernode.service';

import { CacheService } from '../cache/cache.service';
import { User } from '../users/schemas/user.schema';

import { BurnService } from '../burn/burn.service';
import { BurnParticipants } from '../burn/schema/burn.participant.schema';
import { Token } from '../token/schemas/token.schema';
import { WalletService } from '../wallet/wallet.service';
import { CloudKService } from './cloud-k.service';
import { CloudKMachineStakeTransaction } from './schemas/stake-history.schema';
import { CloudKTransactionTypes } from './schemas/cloudk-transactions.schema';
import {
  CLOUDK_MACHINE_STAKE_TYPE,
  STAKE_FROM,
} from './schemas/cloudk-machine-stakes.schema';
import { TransactionFlow } from '../wallet/enums/transcation.flow.enum';
import { TrxType } from '../global/enums/trx.type.enum';
import { CLOUDK_MACHINE_STATUS } from './schemas/cloudk-simulation-machine.schema';
import { CACHE_TYPE } from '../cache/Enums/cache.enum';
import { clog } from '../utils/helpers';
import { PHASE_TOKEN_USD } from '../utils/constants';
import { NewUserStake } from './schemas/new-user-stake.schema';
import { UsdkStakeSettings } from '../usdk-stake/schemas/usdkStakeSettings.schema';
import { UsdkStakeService } from '../usdk-stake/usdk-stake.service';

@Injectable()
export class CloudKDepositV4Service {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(UserGask.name)
    private userGaskModel: Model<UserGask>,
    @InjectModel(SuperNodeGaskSetting.name)
    private snGaskSettingModel: Model<SuperNodeGaskSetting>,
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
    @InjectModel(UsdkStakeSettings.name)
    private readonly usdkStakeSettings: Model<UsdkStakeSettings>,

    @Inject(forwardRef(() => SupernodeService))
    private supernodeService: SupernodeService,
    private cacheService: CacheService,
    private cloudKService: CloudKService,
    @Inject(forwardRef(() => BurnService))
    private BurnService: BurnService,
    private walletService: WalletService,
    @InjectModel(NewUserStake.name)
    private newUserStakeModel: Model<NewUserStake>,
    private usdkStakeService: UsdkStakeService,
  ) {}

  async stakeIntoMachineV4(
    machineId: string,
    userId: string,
    amount: number,
    phaseEnabled: boolean,
  ) {
    const user = new Types.ObjectId(userId);
    //check the current settings of the stake in o a machine
    //Fetch the current machine
    //Fetch the current token value
    const [settings, machine, currentPrice, cloudSettings] = await Promise.all([
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
    ]);

    if (!settings || !machine || !currentPrice || !cloudSettings) {
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
    const bonusAmount = (totalTokenAmountToStake / 100) * 10;

    clog(totalTokenAmountToStake, 'Total token initial');

    const stakeWalletBalance = await this.walletService.getBalanceByToken(
      user,
      stakeWallet.token._id,
    );

    if (
      parseFloat(stakeWalletBalance.balance.toFixed(5)) <
      parseFloat(amount.toFixed(5))
    ) {
      throw new HttpException('Insufficient tokens in the wallet', 400);
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
        currentTotalStakedInMachine + totalAmountToBeStakeInMachine + burnAmount
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
        .select('_id');
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
      const phaseWalletBalanceData = await this.walletService.getBalanceByToken(
        user,
        burnTokenLocal._id,
      );

      /**
       * Balance of phase Wallet USDK-promo
       */
      const usdKPromoWallet = await this.walletService.getBalanceByToken(
        user,
        usdKPromoToken._id,
      );

      if (
        totalAmountToBeStakeInMachine + currentTotalStakedInMachine >=
        machine.productPrice
      ) {
        percentageToBeApplied = boostPercentages;
      } else {
        percentageToBeApplied = normalPercentages;
      }

      burnAmount = (percentageToBeApplied / 100) * totalTokenAmountToStake;

      const balanceAfterMayStake = phaseWalletBalanceData.balance - burnAmount;

      clog(burnAmount, 'burn percentage amount is ');
      clog(balanceAfterMayStake, 'balanceAfterMayStake ');
      burnAmountTakenFromLocal = burnAmount;
      clog(burnAmountTakenFromLocal, 'burnAmountTakenFromLocal smLYK');
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

        if (usdKPromoWallet.balance >= balanceAfterMayStakeUSD) {
          //Reducing amount from phase Wallet
          burnAmountFromUSD = balanceAfterMayStakeUSD;
          clog(
            balanceAfterMayStakeUSD,
            'Total USD amount will take from the USDK-promo',
          );
        } else {
          burnAmountFromUSD = usdKPromoWallet.balance;
          clog(
            usdKPromoWallet.balance,
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
        currentTotalStakedInMachine +
          burnAmountFromUSD +
          (totalTokenAmountToStake + burnAmountTakenFromLocal) *
            currentPrice.price
    ) {
      throw new HttpException(
        'Stake limit exceeded. You may able to stake without the promotion.',
        400,
      );
    }

    const session = await this.connection.startSession();
    await session.startTransaction();

    try {
      // taking the stake amount
      const walletTransactionArray =
        await this.walletService.createRawWalletTransaction(
          {
            amount: totalTokenAmountToStake,
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

      let phaseWalletTransactionLocal;
      let phaseWalletTransactionUSD;
      if (phaseEnabled) {
        // taking the amount of local. i.e smLYK.
        const phaseWalletTransactionLocalArray =
          await this.walletService.createRawWalletTransaction(
            {
              amount: burnAmountTakenFromLocal,
              wallet: phaseWalletId,
              transactionFlow: TransactionFlow.OUT,
              trxType: TrxType.STAKE,
              user: machine.user,
              note: `Taking this amount ${burnAmountTakenFromLocal} because, he doesn't have enough value in  ${stakeWallet.token?.symbol || 'Stake Token'} `,
            },
            session,
          );

        phaseWalletTransactionLocal =
          phaseWalletTransactionLocalArray.length > 0
            ? phaseWalletTransactionLocalArray[0]
            : null;

        if (burnAmountFromUSD && usdKPromoWalletId) {
          // taking the amount of local. i.e smLYK.
          const phaseWalletTransactionUSDArray =
            await this.walletService.createRawWalletTransaction(
              {
                amount: burnAmountFromUSD,
                wallet: usdKPromoWalletId,
                transactionFlow: TransactionFlow.OUT,
                trxType: TrxType.STAKE,
                user: machine.user,
                note: `Taking this amount ${burnAmountFromUSD} because, he doesn't have enough value in  ${stakeWallet.token?.symbol || 'Stake Token'} `,
              },
              session,
            );

          phaseWalletTransactionUSD =
            phaseWalletTransactionUSDArray.length > 0
              ? phaseWalletTransactionUSDArray[0]
              : null;
        }

        message =
          message +
          `| smLYK Token used  =  ${totalTokenAmountToStake} | 
          smLYK Token converted to doller = ${currentPrice.price} * ${totalTokenAmountToStake} = ${totalTokenAmountToStake * currentPrice.price}| 
          Before stake USDK PROMO Balance ${currentPhaseWalletBalance} USD`;
      } // phaseEnabled 'if' closed here
      // Adding the stake amount to the cloudkMachineStake
      message = message + `| `;
      const stake = await this.cloudKService.addStake({
        session: session,
        machineId: new mongoose.Types.ObjectId(machineId),
        userId: new Types.ObjectId(userId),
        type: CLOUDK_MACHINE_STAKE_TYPE.STAKE,
        from: phaseEnabled ? STAKE_FROM.PHASE_DEPOSIT : STAKE_FROM.MORE_STAKE,
        totalToken: totalTokenAmountToStake + burnAmount,
        lykPrice: currentPrice.price,
        walletTransactionId: null,
        extraMessage: message,
        burnValue: burnAmount,
        actualValue: amount,
        // bonusAmount: bonusAmount,
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
          walletTransaction: phaseWalletTransactionLocal._id,
          note: '',
        });

        if (burnAmountFromUSD && usdKPromoWalletId) {
          bulkCreateArray.push({
            machine: new mongoose.Types.ObjectId(machineId),
            stake: stake._id,
            walletTransaction: phaseWalletTransactionUSD._id,
            note: '',
          });
        }
      }
      await this.cloudKMachineStakeTransactionModel.insertMany(
        bulkCreateArray,
        { session },
      );

      /**
       * Lets work on GAS-K
       */
      const snGaskSetting = await this.snGaskSettingModel.findOne();
      const multiplier = snGaskSetting.multiplier || 3;
      await this.userGaskModel.create(
        [
          {
            user: new Types.ObjectId(userId),
            amount: totalAmountToBeStakeInMachine * multiplier, // dollar value
            flow: TransactionFlow.IN,
            stake: stake._id,
            multiplier: multiplier,
            machine: machine._id,
          },
        ],
        { session },
      );
      // await this.userGaskModel.create(
      //   [
      //     {
      //       user: new Types.ObjectId(userId),
      //       amount: bonusAmountGask * multiplier, // dollar value
      //       flow: TransactionFlow.IN,
      //       stake: stake._id,
      //       multiplier: multiplier,
      //       machine: machine._id,
      //       from: 'Bonus in Nodek 10 percent',
      //     },
      //   ],
      //   { session },
      // );

      // :thinking_face:
      await this.cacheService.deleteUserCache({
        type: CACHE_TYPE.ACTIVE_USER,
        user: userId,
      });

      const totalStakeCollatoral = totalTokenAmountToStake + burnAmount;

      machine.collatoral += currentPrice.price * totalStakeCollatoral;
      machine.stakedTokenAmount += totalStakeCollatoral;
      machine.status = CLOUDK_MACHINE_STATUS.ACTIVE;
      await machine.save({ session });

      if (phaseEnabled) {
        await Promise.all([
          await this.cloudKService.createCloudKTransaction(
            {
              tokenAmount: burnAmount,
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
              tokenAmount: burnAmount,
              type: CloudKTransactionTypes.STAKE_AND_BURN,
              user: machine.user,
              machine: machine._id as Types.ObjectId,
              totalTokenPrice: currentPrice.price * burnAmount,
              token: stakeWallet.token,
              stake: String(stake._id),
            },
            session,
          ),
        ]);
      }
      // Adding Normal stake no matter it has the phase enabled
      await this.cloudKService.createCloudKTransaction(
        {
          tokenAmount: totalTokenAmountToStake,
          type: CloudKTransactionTypes.ADD_STAKE,
          user: machine.user,
          machine: machine._id as Types.ObjectId,
          totalTokenPrice: currentPrice.price * totalTokenAmountToStake,
          token: stakeWallet.token,
          stake: String(stake._id),
        },
        session,
      );

      // await this.cloudKService.createCloudKTransaction(
      //   {
      //     tokenAmount: bonusAmount,
      //     type: CloudKTransactionTypes.ADD_STAKE,
      //     user: machine.user,
      //     machine: machine._id as Types.ObjectId,
      //     totalTokenPrice: currentPrice.price * bonusAmount,
      //     token: stakeWallet.token,
      //     stake: String(stake._id),
      //     stakeType: 'Promo 10%',
      //     note: 'We are giving bounus amount',
      //   },
      //   session,
      // );

      const user = await this.usermModel.findById(new Types.ObjectId(userId));

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

      await this.cacheService.deleteUserCache({
        type: CACHE_TYPE.REWARD_CLAIMABLE_RESULT,
        user: userId,
      });

      if (machine.allTimeHigh < currentPrice.price) {
        machine.allTimeHigh = currentPrice.price;
        await machine.save();
      }
      // if (machine.allTimeHigh < currentPrice.price) {
      //   machine.allTimeHigh = currentPrice.price;
      //   await machine.save();
      // }

      await session.commitTransaction();
      return 'Tokens staked successfully';
    } catch (error) {
      await session.abortTransaction();
      throw new HttpException(error.message, 400);
    } finally {
      session.endSession();
    }
  }

  async stakeIntoMachineService(
    machineId: string,
    userId: string,
    amount: number,
    phaseEnabled: boolean,
    HundredPercentClicked: boolean,
    token?: Types.ObjectId,
    stakePeriod?: STAKING_PERIOD_ENUM,
  ) {
    const usdkStakeSetting = await this.usdkStakeSettings.findOne({
      deletedAt: null,
      status: true,
      isVisible: true,
    });

    // need to remove
    if (!token) {
      return await this.stakeIntoMachineV5(
        machineId,
        userId,
        amount,
        phaseEnabled,
        HundredPercentClicked,
      );
    }

    const tokenInclude = usdkStakeSetting.tokens.includes(
      new Types.ObjectId(token),
    );
    if (tokenInclude) {
      return await this.usdkStakeService.usdkStake(new Types.ObjectId(userId), {
        machine: new Types.ObjectId(machineId),
        stakePeriod,
        token: new Types.ObjectId(token),
        amount,
      });
    }

    return await this.stakeIntoMachineV5(
      machineId,
      userId,
      amount,
      phaseEnabled,
      HundredPercentClicked,
    );
  }

  async stakeIntoMachineV5(
    machineId: string,
    userId: string,
    amount: number,
    phaseEnabled: boolean,
    HundredPercentClicked: boolean,
  ) {
    const user = new Types.ObjectId(userId);
    //check the current settings of the stake in o a machine
    //Fetch the current machine
    //Fetch the current token value
    const [settings, machine, currentPrice, cloudSettings] = await Promise.all([
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
    ]);

    if (!settings || !machine || !currentPrice || !cloudSettings) {
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
    let currentPhaseWalletBalance;

    /**
     * Amount in USD
     */
    const totalAmountToBeStakeInMachine = amount * currentPrice.price;

    /**
     * Them amount to stake. value in local currency.
     */
    let totalTokenAmountToStake = amount;

    const stakeWalletBalance = await this.walletService.getBalanceByToken(
      user,
      stakeWallet.token._id,
    );
    if (HundredPercentClicked) {
      totalTokenAmountToStake = stakeWalletBalance.balance;
    }
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
    const bonusAmount = (totalTokenAmountToStake / 100) * 10;

    if (
      parseFloat(stakeWalletBalance.balance.toFixed(5)) <
      parseFloat(totalTokenAmountToStake.toFixed(5))
    ) {
      throw new HttpException('Insufficient tokens in the wallet', 400);
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
        currentTotalStakedInMachine + totalAmountToBeStakeInMachine + burnAmount
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
        .select('_id');
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
      const phaseWalletBalanceData = await this.walletService.getBalanceByToken(
        user,
        burnTokenLocal._id,
      );

      /**
       * Balance of phase Wallet USDK-promo
       */
      const usdKPromoWallet = await this.walletService.getBalanceByToken(
        user,
        usdKPromoToken._id,
      );

      if (
        totalAmountToBeStakeInMachine + currentTotalStakedInMachine >=
        machine.productPrice
      ) {
        percentageToBeApplied = boostPercentages;
      } else {
        percentageToBeApplied = normalPercentages;
      }

      burnAmount = (percentageToBeApplied / 100) * totalTokenAmountToStake;

      const balanceAfterMayStake = phaseWalletBalanceData.balance - burnAmount;

      clog(burnAmount, 'burn percentage amount is ');
      clog(balanceAfterMayStake, 'balanceAfterMayStake ');
      burnAmountTakenFromLocal = burnAmount;
      clog(burnAmountTakenFromLocal, 'burnAmountTakenFromLocal smLYK');
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

        if (usdKPromoWallet.balance >= balanceAfterMayStakeUSD) {
          //Reducing amount from phase Wallet
          burnAmountFromUSD = balanceAfterMayStakeUSD;
          clog(
            balanceAfterMayStakeUSD,
            'Total USD amount will take from the USDK-promo',
          );
        } else {
          burnAmountFromUSD = usdKPromoWallet.balance;
          clog(
            usdKPromoWallet.balance,
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
        currentTotalStakedInMachine +
          burnAmountFromUSD +
          (totalTokenAmountToStake + burnAmountTakenFromLocal) *
            currentPrice.price
    ) {
      throw new HttpException(
        'Stake limit exceeded. You may able to stake without the promotion.',
        400,
      );
    }

    const session = await this.connection.startSession();
    await session.startTransaction();

    try {
      // taking the stake amount
      const walletTransactionArray =
        await this.walletService.createRawWalletTransaction(
          {
            amount: totalTokenAmountToStake,
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

      let phaseWalletTransactionLocal;
      let phaseWalletTransactionUSD;
      if (phaseEnabled) {
        // taking the amount of local. i.e smLYK.
        const phaseWalletTransactionLocalArray =
          await this.walletService.createRawWalletTransaction(
            {
              amount: burnAmountTakenFromLocal,
              wallet: phaseWalletId,
              transactionFlow: TransactionFlow.OUT,
              trxType: TrxType.STAKE,
              user: machine.user,
              note: `Taking this amount ${burnAmountTakenFromLocal} because, he doesn't have enough value in  ${stakeWallet.token?.symbol || 'Stake Token'} `,
            },
            session,
          );

        phaseWalletTransactionLocal =
          phaseWalletTransactionLocalArray.length > 0
            ? phaseWalletTransactionLocalArray[0]
            : null;

        if (burnAmountFromUSD && usdKPromoWalletId) {
          // taking the amount of local. i.e smLYK.
          const phaseWalletTransactionUSDArray =
            await this.walletService.createRawWalletTransaction(
              {
                amount: burnAmountFromUSD,
                wallet: usdKPromoWalletId,
                transactionFlow: TransactionFlow.OUT,
                trxType: TrxType.STAKE,
                user: machine.user,
                note: `Taking this amount ${burnAmountFromUSD} because, he doesn't have enough value in  ${stakeWallet.token?.symbol || 'Stake Token'} `,
              },
              session,
            );

          phaseWalletTransactionUSD =
            phaseWalletTransactionUSDArray.length > 0
              ? phaseWalletTransactionUSDArray[0]
              : null;
        }

        message =
          message +
          `| smLYK Token used  =  ${totalTokenAmountToStake} | 
          smLYK Token converted to doller = ${currentPrice.price} * ${totalTokenAmountToStake} = ${totalTokenAmountToStake * currentPrice.price}| 
          Before stake USDK PROMO Balance ${currentPhaseWalletBalance} USD`;
      } // phaseEnabled 'if' closed here
      // Adding the stake amount to the cloudkMachineStake
      message = message + `| `;
      const stake = await this.cloudKService.addStake({
        session: session,
        machineId: new mongoose.Types.ObjectId(machineId),
        userId: new Types.ObjectId(userId),
        type: CLOUDK_MACHINE_STAKE_TYPE.STAKE,
        from: phaseEnabled ? STAKE_FROM.PHASE_DEPOSIT : STAKE_FROM.MORE_STAKE,
        totalToken: totalTokenAmountToStake + burnAmount,
        lykPrice: currentPrice.price,
        walletTransactionId: null,
        extraMessage: message,
        burnValue: burnAmount,
        actualValue: amount,
        // bonusAmount: bonusAmount,
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
          walletTransaction: phaseWalletTransactionLocal._id,
          note: '',
        });

        if (burnAmountFromUSD && usdKPromoWalletId) {
          bulkCreateArray.push({
            machine: new mongoose.Types.ObjectId(machineId),
            stake: stake._id,
            walletTransaction: phaseWalletTransactionUSD._id,
            note: '',
          });
        }
      }
      await this.cloudKMachineStakeTransactionModel.insertMany(
        bulkCreateArray,
        { session },
      );

      /**
       * Lets work on GAS-K
       */
      const snGaskSetting = await this.snGaskSettingModel.findOne();
      const multiplier = snGaskSetting.multiplier || 3;
      const bonusAmountGask = (totalAmountToBeStakeInMachine / 100) * 10;
      await this.userGaskModel.create(
        [
          {
            user: new Types.ObjectId(userId),
            amount: totalAmountToBeStakeInMachine * multiplier, // dollar value
            flow: TransactionFlow.IN,
            stake: stake._id,
            multiplier: multiplier,
            machine: machine._id,
          },
        ],
        { session },
      );
      // await this.userGaskModel.create(
      //   [
      //     {
      //       user: new Types.ObjectId(userId),
      //       amount: bonusAmountGask * multiplier, // dollar value
      //       flow: TransactionFlow.IN,
      //       stake: stake._id,
      //       multiplier: multiplier,
      //       machine: machine._id,
      //       from: 'Bonus in Nodek 10 percent',
      //     },
      //   ],
      //   { session },
      // );

      // :thinking_face:
      await this.cacheService.deleteUserCache({
        type: CACHE_TYPE.ACTIVE_USER,
        user: userId,
      });

      const totalStakeCollatoral = totalTokenAmountToStake + burnAmount;

      machine.collatoral += currentPrice.price * totalStakeCollatoral;
      machine.stakedTokenAmount += totalStakeCollatoral;
      machine.status = CLOUDK_MACHINE_STATUS.ACTIVE;
      // await machine.save({ session });

      if (phaseEnabled && burnAmount > 0) {
        await Promise.all([
          await this.cloudKService.createCloudKTransaction(
            {
              tokenAmount: burnAmount,
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
              tokenAmount: burnAmount,
              type: CloudKTransactionTypes.STAKE_AND_BURN,
              user: machine.user,
              machine: machine._id as Types.ObjectId,
              totalTokenPrice: currentPrice.price * burnAmount,
              token: stakeWallet.token,
              stake: String(stake._id),
            },
            session,
          ),
        ]);
      }
      // Adding Normal stake no matter it has the phase enabled
      await this.cloudKService.createCloudKTransaction(
        {
          tokenAmount: totalTokenAmountToStake,
          type: CloudKTransactionTypes.ADD_STAKE,
          user: machine.user,
          machine: machine._id as Types.ObjectId,
          totalTokenPrice: currentPrice.price * totalTokenAmountToStake,
          token: stakeWallet.token,
          stake: String(stake._id),
        },
        session,
      );

      // await this.cloudKService.createCloudKTransaction(
      //   {
      //     tokenAmount: bonusAmount,
      //     type: CloudKTransactionTypes.ADD_STAKE,
      //     user: machine.user,
      //     machine: machine._id as Types.ObjectId,
      //     totalTokenPrice: currentPrice.price * bonusAmount,
      //     token: stakeWallet.token,
      //     stake: String(stake._id),
      //     stakeType: 'Promo 10%',
      //     note: 'We are giving bounus amount',
      //   },
      //   session,
      // );

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

      await this.cacheService.deleteUserCache({
        type: CACHE_TYPE.REWARD_CLAIMABLE_RESULT,
        user: userId,
      });

      // Implement the formula for the All-Time High (ATH)
      if (machine.allTimeHigh >= currentPrice.price) {
        const stakedTokenData =
          await this.cloudKMachineStakeTransactionModel.aggregate([
            {
              $match: {
                machine: new mongoose.Types.ObjectId(machineId),
                user: new mongoose.Types.ObjectId(userId),
                deletedAt: null,
              },
            },
            {
              $group: {
                _id: null,
                totalStakedTokens: { $sum: '$tokenAmount' },
              },
            },
          ]);

        const totalStakedTokens =
          stakedTokenData.length > 0 ? stakedTokenData[0].totalStakedTokens : 0;

        const previouslyStakedTokens =
          totalStakedTokens - totalTokenAmountToStake;

        const currentStakingTokens = totalTokenAmountToStake;
        const currentATH = machine.allTimeHigh || 0;
        const currentLYKPrice = currentPrice.price;

        const currentStakingValue = currentLYKPrice * currentStakingTokens;
        const previouslyStakedValue = currentATH * previouslyStakedTokens;
        const newATH =
          (currentStakingValue + previouslyStakedValue) /
          (currentStakingTokens + previouslyStakedTokens);

        machine.allTimeHigh = isNaN(newATH) ? machine.allTimeHigh : newATH;

        await machine.save({ session });

        const safeCurrentATH = isNaN(currentATH) ? 0 : currentATH;
        const safeNewATH = isNaN(newATH) ? 0 : newATH;
        const safeCurrentStakingTokens = isNaN(currentStakingTokens)
          ? 0
          : currentStakingTokens;
        const safePreviouslyStakedTokens = isNaN(previouslyStakedTokens)
          ? 0
          : previouslyStakedTokens;

        await this.newUserStakeModel.create(
          [
            {
              user: machine.user,
              machine: machine._id,
              oldATH: safeCurrentATH,
              newATH: safeNewATH,
              newStake: safeCurrentStakingTokens,
              oldStake: safePreviouslyStakedTokens,
            },
          ],
          { session },
        );

        await session.commitTransaction();
        return 'Tokens staked successfully';
      }
    } catch (error) {
      await session.abortTransaction();
      throw new HttpException(error.message, 400);
    } finally {
      session.endSession();
    }
  }
}
