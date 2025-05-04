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
  tokenPrice: number;
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
  const newTokenSymbol = 'lyk-w';

  const jsonFilePath = path.join(
    __dirname,
    '../../../uploads/json/dueRevert/missing-deposit-transactioQa.json',
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
      const { userBlockchainId, token, amount, tokenPrice } = params;

      try {
        const user = await UserModel.findOne({
          blockchainId: userBlockchainId,
        });
        if (!user) throw new Error('User not found');

        const processDeposit = async (
          token: Token,
          depositAmount: number,
          userId: Types.ObjectId,
        ) => {
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
            note: 'Auto-generated wallet missing transaction during migration revert process',
            amount: depositAmount,
            trxType: TrxType.MIGRATE,
            wallet: userWallet._id,
            user: userId,
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
            type: 'claimed-reward',
            hash: 'claimed-reward',
            confirmation: 'By Script',
            remarks: `${depositAmount} ${token.name} is deposited successfully. This transaction was automatically generated to correct the ${token.name} balance.`,
            note: 'deposit transaction history for record consistency | LYK-W to mLYK Migration | Wallek Issue | missing transaction history',
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
            type: 'claimed-reward',
            hash: 'claimed-reward',
            amount: depositAmount,
            transactionStatus: TransactionStatus.SUCCESS,
            confirmation: 'By Script',
            remarks: `${depositAmount} ${token.name} is deposited successfully. This transaction was automatically generated to correct the ${token.name} balance.`,
            note: 'deposit transaction history for record consistency | LYK-W to mLYK Migration | Wallek Issue | missing transaction history',
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
        let fromamount: number = amount;

        const conversionRate = tokenPrice;
        fromamount = amount / conversionRate;
        const mainDeposit = await processDeposit(
          token,
          fromamount,
          user._id as Types.ObjectId,
        );

        return [{ success: true, data: mainDeposit }];
      } catch (error) {
        const apiError = { id: userBlockchainId, reason: error.message };
        return [{ success: false, error: apiError }];
      }
    }
    console.log(`[INFO] Total Transactions to Process: ${configData.length}`);

    console.log(`[START] Transaction API Webhook Process`);

    // Second processing stage (API calls)
    let apiSuccessCount = 0;
    let apiFailedCount = 0;
    const apiFailedTransactions = [];
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
          tokenPrice: element.tokenPrice,
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
