import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import {
  WalletGatewayTransaction,
  FreezeTypes,
} from './schemas/wallet-gateway.transaction.schema';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { WalletI } from '../wallet/interfaces/wallet.interface';
import { Wallet } from '../wallet/schemas/wallet.schema';
import {
  FreezeWalletAmountDto,
  GetUserWalletDetailsDto,
  UnfreezeWalletAmountDto,
} from './dto/freeze-wallet-amount.dto';
import { UsersService } from '../users/users.service';
import { WalletService } from '../wallet/wallet.service';
import { TrxType } from '../global/enums/trx.type.enum';
import { TransactionFlow } from '../wallet/enums/transcation.flow.enum';
import { WalletTransactionI } from '../wallet/interfaces/wallet-transaction.interface';
import { WalletTransaction } from '../wallet/schemas/wallet.transaction.schema.';
import { WithdrawTransaction } from '../wallet/schemas/withdraw.transaction.schema';
import { ChargesType } from '../global/enums/charges.type.enum';
import { WITHDRAW_TYPES } from '../token/enums/withdraw-types.enum';
import { RequestStatus } from '../wallet/enums/request.status.enum';
import { WithdrawSetting } from '../token/schemas/withdraw.settings.schema';
import { User } from '../users/schemas/user.schema';
import { PLATFORMS } from '../global/enums/wallet.enum';
import { v4 as uuidv4 } from 'uuid';
import { TokenService } from '../token/token.service';
import { Platform } from '../platform/schemas/platform.schema';

@Injectable()
export class WalletGatewayService {
  constructor(
    @InjectModel(WalletGatewayTransaction.name)
    private readonly walletGatewayTransactionModel: Model<WalletGatewayTransaction>,
    @InjectModel(Wallet.name)
    private readonly walletModel: Model<WalletI>,
    private readonly userService: UsersService,
    private readonly walletService: WalletService,
    private readonly tokenService: TokenService,
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(WalletTransaction.name)
    readonly walletTransactionModel: Model<WalletTransactionI>,
    @InjectModel(WithdrawTransaction.name)
    private readonly withdrawTransactionModel: Model<WithdrawTransaction>,
    @InjectModel(Platform.name)
    private readonly platformModel: Model<Platform>,
    @InjectModel(WithdrawSetting.name)
    private readonly withdrawSettingModel: Model<WithdrawSetting>,
  ) {}

  async freeze(freezeWalletAmountDto: FreezeWalletAmountDto) {
    const { freezeData, meta, requestId, platform } = freezeWalletAmountDto;
    const session = await this.connection.startSession();
    const errorMessages: string[] = [];

    // Check if a record with the same requestId already exists
    const existingTransaction =
      await this.walletGatewayTransactionModel.findOne({ requestId });

    if (existingTransaction) {
      throw new UnprocessableEntityException(
        `A transaction with requestId ${requestId} already exists. Please provide a unique requestId.`,
      );
    }

    let freezeTransactionId = uuidv4();
    let totalFreezeAmount = 0;

    let freezeTransactionExists =
      await this.walletGatewayTransactionModel.exists({
        freezeTransactionId: freezeTransactionId,
      });

    // Check if the freezeTransactionId already exists and regenerate if necessary
    while (freezeTransactionExists) {
      freezeTransactionId = uuidv4();
      freezeTransactionExists = await this.walletGatewayTransactionModel.exists(
        { freezeTransactionId: freezeTransactionId },
      );
    }
    try {
      session.startTransaction();
      for (const freezeRecord of freezeData) {
        const wallet = await this.walletModel
          .findById(freezeRecord.walletId)
          .populate('user')
          .populate('token');

        if (!wallet?._id) {
          errorMessages.push(
            `No wallet found with ID: ${freezeRecord.walletId}.`,
          );
          continue;
        }

        const user = wallet.user;
        if (!user?._id) {
          errorMessages.push(
            `No user associated with wallet ID: ${freezeRecord.walletId}.`,
          );
          continue;
        }

        const token = new Types.ObjectId(
          wallet.token as unknown as Types.ObjectId,
        );

        const platformTrx = await this.platformModel.findOne({
          symbol: platform,
        });

        const withdrawSetting = await this.withdrawSettingModel.findOne({
          type: WITHDRAW_TYPES.EXTERNAL,
          fromToken: wallet.token,
          isEnable: true,
          platform: platformTrx._id,
        });

        if (!withdrawSetting || !withdrawSetting.platform) {
          errorMessages.push(
            `No withdrawal setting is configured for the token ${wallet.token.symbol}.`,
          );
          continue;
        }
        if (freezeRecord.amount <= 0) {
          throw new UnprocessableEntityException(
            `The requested withdrawal amount must be greater than zero.`,
          );
        }
        if (withdrawSetting.minDisplayAmount > freezeRecord.amount) {
          errorMessages.push(
            `The requested amount ${freezeRecord.amount} ${wallet.token.symbol} is below the minimum withdrawal limit of ${withdrawSetting.minDisplayAmount} ${wallet.token.symbol}.`,
          );
          continue;
        }

        const userWallet: {
          _id: any;
          name: any;
          symbol: any;
          balance: any;
          walletId?: Types.ObjectId;
        } = await this.walletService.getBalanceByToken(
          user._id as Types.ObjectId,
          token,
        );

        if (userWallet.balance < freezeRecord.amount) {
          errorMessages.push(
            `Insufficient balance in ${wallet.token.symbol} wallet. You have ${userWallet.balance} ${wallet.token.symbol}, but you tried to freeze ${freezeRecord.amount} ${wallet.token.symbol}.`,
          );
          continue;
        }

        //* STEP 1/2

        const createdWalletTrx =
          await this.walletService.createRawWalletTransaction({
            user: user._id,
            wallet: userWallet.walletId,
            trxType: TrxType.FREEZE,
            amount: freezeRecord.amount,
            transactionFlow: TransactionFlow.OUT,
          });

        //* STEP 2/2
        const freezeTransaction =
          await this.walletGatewayTransactionModel.create(
            [
              {
                user: user._id,
                token: token,
                amount: freezeRecord.amount,
                type: FreezeTypes.FREEZE,
                wallet: userWallet.walletId,
                walletTrxId: createdWalletTrx[0]._id,
                meta,
                previousBalance: userWallet.balance,
                newBalance: userWallet.balance - freezeRecord.amount,
                requestId,
                freezeTransactionId: freezeTransactionId,
              },
            ],
            { session },
          );

        totalFreezeAmount += freezeRecord.amount;
      }
      if (errorMessages.length > 0) {
        throw new UnprocessableEntityException(errorMessages.join(' '));
      }
      await session.commitTransaction();
      return {
        transactionRefId: freezeTransactionId,
        totalFreezeAmount,
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async unfreeze(unfreezeWalletAmountDto: UnfreezeWalletAmountDto) {
    const { transactionRefId } = unfreezeWalletAmountDto;

    const freezedTransactions = await this.walletGatewayTransactionModel.find({
      freezeTransactionId: transactionRefId,
      type: FreezeTypes.FREEZE,
    });

    if (freezedTransactions.length === 0) {
      throw new UnprocessableEntityException(
        `No valid transactions found with transactionRefId: ${transactionRefId}. Please check the provided ID and try again.`,
      );
    }

    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      let totalUnfreezeAmount = 0;

      for (const freezed of freezedTransactions) {
        const createdWalletTrx =
          await this.walletService.createRawWalletTransaction({
            user: freezed.user,
            wallet: freezed.wallet,
            trxType: TrxType.UNFREEZE,
            amount: freezed.amount,
            transactionFlow: TransactionFlow.IN,
          });
        // const createdWalletTrx = await this.walletTransactionModel.create(
        //   [
        //     {
        //       user: freezed.user,
        //       wallet: freezed.wallet,
        //       trxType: TrxType.UNFREEZE,
        //       amount: freezed.amount,
        //       transactionFlow: TransactionFlow.IN,
        //     },
        //   ],
        //   { session },
        // );

        await this.walletGatewayTransactionModel.findByIdAndUpdate(
          freezed._id,
          {
            type: FreezeTypes.UNFREEZE,
          },
          { session },
        );
        totalUnfreezeAmount += freezed.amount;
      }

      await session.commitTransaction();

      return {
        totalUnfreezeAmount,
        requestId: freezedTransactions[0].requestId,
        transactionRefId,
      };
    } catch (err) {
      await session.abortTransaction();
      if (err instanceof UnprocessableEntityException) {
        throw err;
      } else {
        throw new UnprocessableEntityException(
          'Error processing unfreeze request.',
        );
      }
    } finally {
      session.endSession();
    }
  }

  async withdraw(unfreezeWalletAmountDto: UnfreezeWalletAmountDto) {
    const { transactionRefId } = unfreezeWalletAmountDto;

    const freezedRecords = await this.walletGatewayTransactionModel
      .find({
        freezeTransactionId: transactionRefId,
        type: FreezeTypes.FREEZE,
      })
      .populate<Wallet>('wallet');

    if (!freezedRecords.length) {
      throw new UnprocessableEntityException(
        `No valid transactions found for transactionRefId: ${transactionRefId}.`,
      );
    }

    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      for (const freezed of freezedRecords) {
        const { requestId, serialNumber } =
          await this.walletService.generateUniqueRequestId(TrxType.WITHDRAW);
        const withdrawSetting = await this.withdrawSettingModel.findOne({
          type: WITHDRAW_TYPES.EXTERNAL,
          fromToken: (freezed.wallet as unknown as Wallet).token,
          isEnable: true,
        });

        if (!withdrawSetting) {
          throw new UnprocessableEntityException(
            `Withdrawal is not permitted for the transactionRefId. Please verify the transactionRefId details and try again.`,
          );
        }
        let userData: any;
        const userId = new Types.ObjectId(freezed.user.toString());
        if (userId) {
          userData = await this.userService.findUserById(userId);
        }

        const withdrawTrx = await this.withdrawTransactionModel.create(
          [
            {
              user: userData?._id || null,
              fromWallet: freezed.wallet,
              fromWalletTrx: freezed.walletTrxId,
              network: freezed.vendorName || null,
              receiverAddress: 'Horysmall',
              amount: freezed.amount,
              total: freezed.amount,
              fee: withdrawSetting.fee,
              commission: withdrawSetting.commission,
              feeType: ChargesType.FIXED,
              commissionType: ChargesType.FIXED,
              userRemarks: TrxType.HORYSMALL_WITHDRAW,
              requestStatus: RequestStatus.COMPLETED,
              withdrawType: WITHDRAW_TYPES.EXTERNAL,
              token: (freezed.wallet as unknown as Wallet).token || null,
              serialNumber,
              requestId,
              receiveToken: '',
              tokenPrice: '',
              settingsUsed: withdrawSetting._id,
              previousBalance: freezed.previousBalance,
              newBalance: freezed.newBalance,
              hash: transactionRefId,
              blockchainId: userData?.blockchainId || null,
            },
          ],
          { session },
        );
        // Update each corresponding freeze transaction to reflect the withdrawal
        await this.walletGatewayTransactionModel.findByIdAndUpdate(
          freezed._id,
          {
            type: FreezeTypes.WITHDRAW,
          },
          { session },
        );
      }

      await session.commitTransaction();

      return {
        requestId: freezedRecords[0].requestId,
        transactionRefId,
        totalWithdrawnAmount: freezedRecords.reduce(
          (sum, record) => sum + record.amount,
          0,
        ),
      };
    } catch (error) {
      session.abortTransaction();
      if (error instanceof UnprocessableEntityException) {
        throw error;
      } else {
        throw new UnprocessableEntityException(
          'An error occurred during the withdrawal process.',
        );
      }
    }
  }

  async getUserWalletDetails(userWalletDetailsDto: GetUserWalletDetailsDto) {
    const { bid, tokenSymbols, platform } = userWalletDetailsDto;

    const list = await this.tokenService.findAllHorysmallTokens(platform);

    const acctualToken = tokenSymbols.filter((item) =>
      list.find((token) => token.symbol.toLowerCase() === item.toLowerCase()),
    );

    const userData = await this.userService.getOrCreateUserByBID(bid);
    const userId = new Types.ObjectId(userData?.id);
    await this.createUserWallets(userId, acctualToken);
    const tokenBalances = await this.getBalanceOfEachToken(
      userId,
      acctualToken,
    );
    return tokenBalances;
  }

  async getUserExistWalletDetails(bid: string) {
    const userData = await this.userService.getOrCreateUserByBID(bid);
    const userId = new Types.ObjectId(userData?.id);

    const wallets = await this.walletModel.aggregate([
      {
        $match: {
          user: userId,
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
      {
        $lookup: {
          from: 'withdrawsettings',
          let: { tokenId: '$token._id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$fromToken', '$$tokenId'] },
                    { $eq: ['$toToken', '$$tokenId'] },
                  ],
                },
              },
            },
          ],
          as: 'withdrawsettings',
        },
      },
      {
        $lookup: {
          from: 'platforms',
          localField: 'withdrawsettings.platform',
          foreignField: '_id',
          as: 'platforms',
        },
      },
      {
        $unwind: '$platforms',
      },
      {
        $match: {
          'platforms.symbol': PLATFORMS.HORYSMALL,
          'withdrawsettings.isEnable': true,
          'withdrawsettings.type': WITHDRAW_TYPES.EXTERNAL,
        },
      },
    ]);
    const walletsBalance = await Promise.all(
      wallets.map(async (wallet) => {
        const { walletBalance } = await this.getBalanceByWallet(
          userId,
          wallet._id,
        );
        const balance = walletBalance;
        const freezingBalance = await this.getFreezingBalance(
          userId,
          wallet._id,
        );

        const tokenObj = {
          walletId: wallet._id,
          tokenName: wallet.token.name,
          symbol: wallet.token.symbol,
          balance: balance,
          freezingBalance: freezingBalance,
        };
        return tokenObj;
      }),
    );

    return walletsBalance;
  }

  async createUserWallets(userId: Types.ObjectId, tokenSymbols: string[]) {
    for (const tokenSymbol of tokenSymbols) {
      const createdWallet = await this.walletService.createWalletByTokenSymbol(
        userId,
        tokenSymbol,
      );
    }
  }

  async getWalletDetailsByTokens(userId: Types.ObjectId, tokens: string[]) {
    const wallets = await this.walletModel.aggregate([
      {
        $match: {
          user: userId,
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
      {
        $match: {
          'token.symbol': {
            $in: tokens.map((symbol) => new RegExp(`^${symbol}$`, 'i')),
          },
          'token.platforms': PLATFORMS.HORYSMALL,
        },
      },
    ]);
    return wallets;
  }

  async getBalanceOfEachToken(userId: Types.ObjectId, tokenSymbols: string[]) {
    const wallets = await this.walletModel.aggregate([
      {
        $match: {
          user: userId,
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
      {
        $lookup: {
          from: 'withdrawsettings',
          let: { tokenId: '$token._id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$fromToken', '$$tokenId'] },
                    // { $eq: ['$toToken', '$$tokenId'] },
                  ],
                },
              },
            },
          ],
          as: 'withdrawsettings',
        },
      },
      {
        $lookup: {
          from: 'platforms',
          localField: 'withdrawsettings.platform',
          foreignField: '_id',
          as: 'platforms',
        },
      },
      {
        $unwind: '$platforms',
      },
      {
        $match: {
          'token.symbol': {
            $in: tokenSymbols.map((symbol) => new RegExp(`^${symbol}$`, 'i')),
          },
          'platforms.symbol': PLATFORMS.HORYSMALL,
          'withdrawsettings.isEnable': true,
          'withdrawsettings.type': WITHDRAW_TYPES.EXTERNAL,
        },
      },
    ]);

    const walletsBalance = await Promise.all(
      wallets.map(async (wallet) => {
        const { walletBalance } = await this.getBalanceByWallet(
          userId,
          wallet._id,
        );
        const balance = walletBalance;
        const freezingBalance = await this.getFreezingBalance(
          userId,
          wallet._id,
        );

        const tokenObj = {
          walletId: wallet._id,
          tokenName: wallet.token.name,
          symbol: wallet.token.symbol,
          balance: balance,
          freezingBalance: freezingBalance,
        };
        return tokenObj;
      }),
    );
    const orderedBalances = tokenSymbols
      .map((symbol) =>
        walletsBalance.find(
          (wallet) => wallet.symbol.toLowerCase() === symbol.toLowerCase(),
        ),
      )
      .filter((balance) => balance !== undefined && balance !== null);
    return orderedBalances;
  }

  async getBalanceByWallet(userId: Types.ObjectId, walletId: Types.ObjectId) {
    try {
      const balanceAggregation = await this.walletTransactionModel.aggregate([
        {
          $match: {
            wallet: walletId,
            user: new Types.ObjectId(userId),
            deletedAt: null,
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
            balance: { $subtract: ['$incomingBalance', '$outgoingBalance'] },
            totalStaked: 1,
          },
        },
      ]);
      const walletBalance = balanceAggregation[0]?.balance || 0;
      const totalStaked = balanceAggregation[0]?.totalStaked || 0;
      return { walletBalance, totalStaked };
    } catch (error) {
      throw new Error('Error calculating wallet balance.');
    }
  }

  async getFreezingBalance(
    userId: Types.ObjectId,
    walletId: Types.ObjectId,
  ): Promise<number> {
    const result = await this.walletGatewayTransactionModel.aggregate([
      {
        $match: {
          user: userId,
          wallet: walletId,
          type: FreezeTypes.FREEZE,
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
        },
      },
    ]);
    return result.length > 0 ? result[0].total : 0;
  }
}
