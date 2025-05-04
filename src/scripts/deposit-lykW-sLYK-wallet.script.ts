import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Model, Types } from 'mongoose';
import { WithdrawTransaction } from '../wallet/schemas/withdraw.transaction.schema';
import { WalletTransaction } from '../wallet/schemas/wallet.transaction.schema.';
import { DepositTransaction } from '../wallet/schemas/deposit.transaction.schema';
import { User } from '../users/schemas/user.schema';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Token } from '../token/schemas/token.schema';
import { WalletService } from '../wallet/wallet.service';
import { CloudKService } from '../cloud-k/cloud-k.service';
import { TrxType } from '../global/enums/trx.type.enum';
import { DepositTransactionHistory } from '../wallet/schemas/deposit.history.transaction.schema';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosResponse } from 'axios';
import { v4 as uuidv4 } from 'uuid';

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
  const newTokenSymbol = 'slyk-w';
  // All
  // const jsonFilePath = path.join(
  //   __dirname,
  //   '../../uploads/json/slyktoslykw.json',
  // );

  const jsonFilePath = path.join(
    __dirname,
    '../../uploads/json/slyktoslykw.json',
  );
  console.log(`[START] Transaction Migration Process`);
  console.log(`[CONFIG] Input File: ${jsonFilePath}`);
  console.log(`[CONFIG] New Token Symbol: ${newTokenSymbol}`);
  const WS_HOMNIFI_SECRET_KEY = process.env.WS_HOMNIFI_SECRET_KEY;

  try {
    const configData = await readJsonFile(jsonFilePath);

    if (!configData || configData.length === 0) {
      console.warn('[WARN] No transactions found in the configuration file');
      process.exit(0);
    }

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

    console.log(`[INFO] Total Transactions to Process: ${configData.length}`);

    let successCount = 0;
    let failedCount = 0;
    const failedTransactions = [];

    // First processing stage (existing logic)
    for (let index = 0; index < configData.length; index++) {
      const element = configData[index];
      console.log(`[PROCESSING] Transaction ${index + 1}/${configData.length}`);

      try {
        const transaction: any = await deposittransactions
          .findOne({
            hash: element._id,
            amount: element.amount,
          })
          .populate('toWallet toWalletTrx');

        if (!transaction) {
          console.warn(`[WARN] Transaction not found: ${element._id}`);
          failedCount++;
          failedTransactions.push({
            id: element._id,
            reason: 'Transaction not found',
          });
          continue;
        }

        // Create wallet transaction
        const wallettransactionsNeedtoCreate: any = {};
        wallettransactionsNeedtoCreate.transactionFlow = 'out';
        wallettransactionsNeedtoCreate.note =
          'Auto-generated wallet transaction during migration Process';
        wallettransactionsNeedtoCreate.amount = transaction.toWalletTrx?.amount;
        wallettransactionsNeedtoCreate.machine =
          transaction.toWalletTrx?.machine;
        wallettransactionsNeedtoCreate.trxType =
          transaction.toWalletTrx?.trxType;
        wallettransactionsNeedtoCreate.wallet = transaction.toWalletTrx?.wallet;
        wallettransactionsNeedtoCreate.user = transaction.toWalletTrx?.user;

        const walletTranData = await wallettransactions.create(
          wallettransactionsNeedtoCreate,
        );

        // Add deposit transaction
        const { requestId, serialNumber } =
          await walletService.generateUniqueRequestId(TrxType.DEPOSIT);

        const { walletBalance } = await walletService.getBalanceByWallet(
          transaction.user,
          transaction.toWallet,
        );

        const newDeposit = await deposittransactions.create({
          ...transaction.toObject(),
          _id: undefined,
          requestId,
          serialNumber,
          toWalletTrx: walletTranData._id,
          amount: -transaction.amount,
          confirmation: 'By Script',
          remarks: `${element.amount} LYK-W has been successfully debited and will be credited as sLYK-W to your wallet.`,
          note: `Cloned deposit transaction history for record consistency | LYK-W to sLYK-W Migration`,
          previousBalance: walletBalance,
          newBalance: walletBalance - transaction.amount,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        const depositTranHistoryData = await depositTransactionHistory.findOne({
          deposit_id: transaction._id,
        });

        if (!depositTranHistoryData) {
          console.warn(
            `[WARN] Deposit transaction history not found for transaction: ${element._id}`,
          );
          failedCount++;
          failedTransactions.push({
            id: element._id,
            reason: 'Deposit transaction history not found',
          });
          continue;
        }

        const newDepositHistory = new depositTransactionHistory({
          ...depositTranHistoryData.toObject(),
          _id: undefined,
          requestId,
          serialNumber,
          toWalletTrx: walletTranData._id,
          amount: -transaction.amount,
          confirmation: 'By Script',
          remarks: `${element.amount} LYK-W has been successfully debited and will be credited as sLYK-W to your wallet.`,
          note: `Cloned deposit transaction history for record consistency | LYK-W to sLYK-W Migration`,
          previousBalance: walletBalance,
          newBalance: walletBalance - transaction.amount,
          deposit_id: newDeposit._id,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        await newDepositHistory.save();

        successCount++;
        console.log(
          `[SUCCESS] Transaction ${element._id} processed successfully`,
        );
      } catch (transactionError) {
        console.error(`[ERROR] Failed to process transaction ${element._id}:`, {
          errorMessage: transactionError.message,
          errorStack: transactionError.stack,
        });
        failedCount++;
        failedTransactions.push({
          id: element._id,
          reason: transactionError.message,
        });
      }
    }

    console.log(`[SUMMARY] 
      Total Transactions: ${configData.length}
      Successful Transactions: ${successCount}
      Failed Transactions: ${failedCount}`);

    if (failedTransactions.length > 0) {
      console.log('[FAILED TRANSACTIONS]');
      console.table(failedTransactions);
      process.exit(1);
    }

    console.log(`[START] Transaction API Webhook Process`);

    // Second processing stage (API calls)
    let apiSuccessCount = 0;
    let apiFailedCount = 0;
    const apiFailedTransactions = [];
    const EndpointLocal = 'localhost:5004/webhooks/deposit/v2';
    const EndpointQA = 'https://uat-api.homnifi.com/webhooks/deposit/v2';
    const EndpointProduction = 'https://api.homnifi.com/webhooks/deposit/v2';

    for (let index = 0; index < configData.length; index++) {
      const element = configData[index];
      console.log(
        `[API PROCESSING] Transaction ${index + 1}/${configData.length}`,
      );

      try {
        const apiResponse = await firstValueFrom(
          httpService.post(
            EndpointProduction,
            {
              address: element.bid, // Assuming this is the correct property
              hash: `${uuidv4()}-${newTokenSymbol}`,
              token: newTokenSymbol,
              amount: element.amount, // Use element.amount instead of configData.amount
              platform: 'homnifi',
              note: `Your ${element.amount} sLYK-W is deposited successfully`,
              isBid: true,
            },
            {
              headers: {
                'x-api-key': WS_HOMNIFI_SECRET_KEY,
              },
              timeout: 10000,
            },
          ),
        );

        console.log(
          `[API SUCCESS] Transaction ${element.bid}:`,
          apiResponse.data,
        );
        apiSuccessCount++;
      } catch (apiError) {
        console.error(
          `[API ERROR] Transaction ${element.bid}:`,
          apiError.message,
        );
        apiFailedCount++;
        apiFailedTransactions.push({
          id: element.bid,
          reason: apiError.message,
        });
      }
    }

    console.log(`[API SUMMARY] 
      Total API Transactions: ${configData.length}
      Successful API Transactions: ${apiSuccessCount}
      Failed API Transactions: ${apiFailedCount}`);

    if (apiFailedTransactions.length > 0) {
      console.log('[FAILED API TRANSACTIONS]');
      console.table(apiFailedTransactions);
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
