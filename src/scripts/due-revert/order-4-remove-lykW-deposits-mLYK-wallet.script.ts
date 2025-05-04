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
    console.error('Error reading JSON file:', error);
    throw new Error('Failed to load JSON file');
  }
}
interface TokenDepositParams {
  userBlockchainId: string;
  token: Token;
  amount: number;
  userId: Types.ObjectId;
}
interface ApiResponse {
  success: boolean;
  data?: any;
  error?: {
    id: string;
    reason: string;
  };
}
async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(AppModule);
  const newTokenSymbol = 'mlyk';
  // All
  // const jsonFilePath = path.join(
  //   __dirname,
  //   '../../uploads/json/slyktoslykw.json',
  // );

  const jsonFilePath = path.join(
    __dirname,
    '../../../uploads/json/depositTransactionQa.json',
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

    async function processTokenDeposits(
      httpService: HttpService,
      params: TokenDepositParams,
    ): Promise<[ApiResponse]> {
      const { userBlockchainId, token, amount, userId } = params;

      try {
        const user = await UserModel.findById(userId);
        if (!user) throw new Error('User not found');

        const processDeposit = async (token: Token, depositAmount: number) => {
          if (depositAmount <= 0) return null;

          const userWallet = await walletService.findUserWalletByTokenSymbol(
            token.symbol,
            userId,
          );
          const { walletBalance } = await walletService.getBalanceByWallet(
            userId,
            userWallet._id,
          );

          const walletTransaction = await wallettransactions.create({
            transactionFlow: 'in',
            note: 'Auto-generated wallet transaction during migration revert process',
            amount: depositAmount,
            trxType: TrxType.MIGRATE,
            wallet: userWallet._id,
            user: user._id,
          });

          const { requestId, serialNumber } =
            await walletService.generateUniqueRequestId(TrxType.DEPOSIT);

          const newDeposit = await deposittransactions.create({
            requestId,
            serialNumber,
            toWallet: userWallet._id,
            toWalletTrx: walletTransaction._id,
            user: user._id,
            transactionStatus: TransactionStatus.SUCCESS,
            amount: depositAmount,
            confirmation: 'By Script',
            remarks: `${depositAmount} ${token.name} is deposited successfully. This transaction was automatically generated to correct the ${token.name} balance.`,
            note: 'deposit transaction history for record consistency | LYK-W to mLYK Migration | Wallek Issue',
            previousBalance: walletBalance,
            newBalance: walletBalance + depositAmount,
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          const depositHistory = new depositTransactionHistory({
            requestId,
            serialNumber,
            fromToken: token._id,
            deposit_id: newDeposit._id,
            toWallet: userWallet._id,
            toWalletTrx: walletTransaction._id,
            user: user._id,
            amount: depositAmount,
            transactionStatus: TransactionStatus.SUCCESS,
            confirmation: 'By Script',
            remarks: `${depositAmount} ${token.name} is deposited successfully. This transaction was automatically generated to correct the ${token.name} balance.`,
            note: 'deposit transaction history for record consistency | LYK-W to mLYK Migration | Wallek Issue',
            previousBalance: walletBalance,
            newBalance: walletBalance + depositAmount,
            createdAt: new Date(),
            updatedAt: new Date(),
            token: token._id,
            blockchainId: user.blockchainId,
          });
          await depositHistory.save();
          return depositHistory;
        };

        const mainDeposit = await processDeposit(token, amount);

        return [{ success: true, data: mainDeposit }];
      } catch (error) {
        const apiError = { id: userBlockchainId, reason: error.message };
        return [{ success: false, error: apiError }];
      }
    }
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
            _id: new Types.ObjectId(element._id),
            amount: element.amount,
            deletedAt: null,
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
        const { walletBalance } = await walletService.getBalanceByWallet(
          transaction.toWalletTrx?.user,
          transaction.toWalletTrx?.wallet,
        );
        // Create wallet transaction
        const wallettransactionsNeedtoCreate: any = {};
        wallettransactionsNeedtoCreate.transactionFlow = 'out';
        wallettransactionsNeedtoCreate.note =
          'Auto-generated wallet transaction during migration revert due Process';
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

        const newDeposit = await deposittransactions.create({
          ...transaction.toObject(),
          _id: undefined,
          requestId,
          serialNumber,
          toWalletTrx: walletTranData._id,
          amount: -transaction.amount,
          confirmation: 'By Script',
          transactionStatus: TransactionStatus.SUCCESS,
          remarks: `${element.amount} LYK-W has been successfully debited and will be credited as mLYK to your wallet.`,
          note: `deposit transaction history for record consistency | LYK-W to mLYK Migration`,
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
          transactionStatus: TransactionStatus.SUCCESS,
          remarks: `${element.amount} LYK-W has been successfully debited and will be credited as mLYK to your wallet.`,
          note: `deposit transaction history for record consistency | LYK-W to mLYK Migration`,
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
    const findFromToken = await tokenModel.findOne({ symbol: newTokenSymbol });
    for (let index = 0; index < configData.length; index++) {
      const element = configData[index];
      console.log(
        `[API PROCESSING] Transaction ${index + 1}/${configData.length}`,
      );

      try {
        const params: TokenDepositParams = {
          userBlockchainId: element.blockchainId,
          token: findFromToken,
          amount: element.amount,
          userId: element.user,
        };

        const [tokenResult] = await processTokenDeposits(httpService, params);

        if (tokenResult.success) {
          console.log('Both deposits processed successfully');
        } else {
          console.error('Error processing deposits:', tokenResult.error);
        }
        apiSuccessCount++;
      } catch (apiError) {
        console.error(
          `[API ERROR] Transaction ${element.blockchainId}:`,
          apiError.message,
        );
        apiFailedCount++;
        apiFailedTransactions.push({
          id: element.blockchainId,
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
