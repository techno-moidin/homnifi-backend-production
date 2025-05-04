import { NestFactory } from '@nestjs/core';
import { Model, Types } from 'mongoose';

import * as fs from 'fs/promises';
import * as path from 'path';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosResponse } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { DepositTransaction } from '@/src/wallet/schemas/deposit.transaction.schema';
import { WalletTransaction } from '@/src/wallet/schemas/wallet.transaction.schema.';
import { User } from '@/src/users/schemas/user.schema';
import { AppModule } from '@/src/app.module';
import { DepositTransactionHistory } from '@/src/wallet/schemas/deposit.history.transaction.schema';
import { WalletService } from '@/src/wallet/wallet.service';
import { Token } from '@/src/token/schemas/token.schema';
import { CloudKService } from '@/src/cloud-k/cloud-k.service';
import { TrxType } from '@/src/global/enums/trx.type.enum';
import { TransactionStatus } from '@/src/global/enums/transaction.status.enum';

async function readJsonFile(filePath: string) {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('[ERROR] Failed to read JSON file:', {
      filePath,
      errorMessage: error.message,
      errorStack: error.stack,
    });
    throw error;
  }
}

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(AppModule);

  const WS_HOMNIFI_SECRET_KEY = process.env.WS_HOMNIFI_SECRET_KEY;

  try {
    const httpService = appContext.get(HttpService);
    const deposittransactions = appContext.get<Model<DepositTransaction>>(
      DepositTransaction.name + 'Model',
    );

    const depositTransactionHistory = appContext.get<
      Model<DepositTransactionHistory>
    >(DepositTransactionHistory.name + 'Model');

    const UserModel = appContext.get<Model<User>>(User.name + 'Model');
    const wallettransactions = appContext.get<Model<WalletTransaction>>(
      WalletTransaction.name + 'Model',
    );

    const tokenModel = appContext.get<Model<Token>>(Token.name + 'Model');

    const walletService = appContext.get(WalletService);
    const cloudKService = appContext.get(CloudKService);

    // Find the DUE token
    const dueToken = await tokenModel.findOne({
      symbol: 'due',
      deletedAt: null,
    });

    if (!dueToken) {
      console.error('DUE token not found');
      return;
    }
    console.log(
      `Analyzing transactions for DUE token (ID: ${dueToken._id} ${dueToken} )`,
    );
    const findUserListByDebitOut = await wallettransactions.aggregate([
      {
        $match: {
          user: new Types.ObjectId('670917cf1d934fb967b78f51'),
          deletedAt: null,
        },
      },
      {
        $lookup: {
          from: 'wallets',
          localField: 'wallet',
          foreignField: '_id',
          as: 'walletDetails',
        },
      },
      {
        $unwind: '$walletDetails',
      },
      {
        $lookup: {
          from: 'tokens',
          localField: 'walletDetails.token',
          foreignField: '_id',
          as: 'tokenDetails',
        },
      },
      {
        $unwind: '$tokenDetails',
      },
      {
        $match: {
          'tokenDetails._id': dueToken._id,
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userDetails',
        },
      },
      {
        $unwind: '$userDetails',
      },
      {
        $group: {
          _id: '$user',
          transactionFlows: {
            $addToSet: '$transactionFlow',
          },
          username: {
            $first: '$userDetails.username',
          },
        },
      },
      {
        $group: {
          _id: null,
          in: {
            $push: {
              $cond: [
                {
                  $eq: ['$transactionFlows', ['in']],
                },
                {
                  user: '$_id',
                  username: '$username',
                },
                '$$REMOVE',
              ],
            },
          },
          mixed: {
            $push: {
              $cond: [
                {
                  $and: [
                    {
                      $in: ['in', '$transactionFlows'],
                    },
                    {
                      $in: ['out', '$transactionFlows'],
                    },
                  ],
                },
                {
                  user: '$_id',
                  username: '$username',
                },
                '$$REMOVE',
              ],
            },
          },
          allUsers: {
            $push: {
              user: '$_id',
              username: '$username',
            },
          },
        },
      },
    ]);

    console.log(`[START] Transaction API Webhook Process`);

    for (
      let index = 0;
      index < findUserListByDebitOut[0].allUsers.length;
      index++
    ) {
      const element = findUserListByDebitOut[0].allUsers[index];
      const findUserDetails = await UserModel.findById(element.user);
      const findUserWallet = await walletService.findUserWalletByTokenSymbol(
        dueToken.symbol,
        element.user,
      );

      const { walletBalance } = await walletService.getBalanceByWallet(
        element.user,
        findUserWallet._id,
      );

      console.log(walletBalance, '---------findBalanceByUser');

      if (walletBalance > 0) {
        // Create wallet transaction
        const wallettransactionsNeedtoCreate: any = {};
        wallettransactionsNeedtoCreate.transactionFlow = 'out';
        wallettransactionsNeedtoCreate.note =
          'HOM-2148 | Auto-generated wallet transaction during migration revert due Process';
        wallettransactionsNeedtoCreate.amount = walletBalance;
        wallettransactionsNeedtoCreate.trxType = TrxType.MIGRATE;
        wallettransactionsNeedtoCreate.wallet = findUserWallet._id;
        wallettransactionsNeedtoCreate.user = findUserDetails._id;

        const walletTranData = await wallettransactions.create(
          wallettransactionsNeedtoCreate,
        );

        // Add deposit transaction
        const { requestId, serialNumber } =
          await walletService.generateUniqueRequestId(TrxType.DEPOSIT);

        const newDeposit = await deposittransactions.create({
          requestId,
          serialNumber,
          toWallet: findUserWallet._id,
          toWalletTrx: walletTranData._id,
          user: findUserDetails._id,
          amount: -walletBalance,
          transactionStatus: TransactionStatus.SUCCESS,

          confirmation: 'By Script',
          remarks: `This transaction was automatically generated to correct the ${dueToken.name} balance.`,
          note: `HOM-2148 |  deposit transaction history for record consistency | LYK-W to mLYK Migration | Wallek Issue | $ ${walletBalance} ${dueToken.name} has been successfully cleared from the wallet. this transaction is auto-generated by the system for recorrecting wallet amount `,
          previousBalance: walletBalance,
          newBalance: walletBalance - walletBalance,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        const newDepositHistory = new depositTransactionHistory({
          requestId,
          serialNumber,
          fromToken: dueToken._id,
          deposit_id: newDeposit._id,
          toWallet: findUserWallet._id,
          toWalletTrx: walletTranData._id,
          user: findUserDetails._id,
          amount: -walletBalance,
          transactionStatus: TransactionStatus.SUCCESS,
          confirmation: 'By Script',
          remarks: `This transaction was automatically generated to correct the ${dueToken.name} balance.`,
          note: `HOM-2148 |  deposit transaction history for record consistency | LYK-W to mLYK Migration | Wallek Issue | $ ${walletBalance} ${dueToken.name} has been successfully cleared from the wallet. this transaction is auto-generated by the system for recorrecting wallet amount `,
          previousBalance: walletBalance,
          newBalance: walletBalance - walletBalance,
          createdAt: new Date(),
          updatedAt: new Date(),
          token: dueToken._id,
          blockchainId: findUserDetails.blockchainId,
        });

        await newDepositHistory.save();

        console.log(
          `[API PROCESSING] Transaction ${index + 1}/${findUserListByDebitOut[0].allUsers.length}`,
        );
      }
      console.log(
        `[API PROCESSING] Transaction ${index + 1}/${findUserListByDebitOut[0].allUsers.length}`,
      );
    }
  } catch (error) {
    console.error('[FATAL] Failed to read or process transactions:', {
      errorMessage: error.message,
      errorStack: error.stack,
    });
    process.exit(1);
  }

  console.log(`[END] Transaction Migration Process`);
  process.exit(0);
}

bootstrap().catch((err) => {
  console.error('[FATAL] Unhandled error in bootstrap:', {
    errorMessage: err.message,
    errorStack: err.stack,
  });
  process.exit(1);
});
