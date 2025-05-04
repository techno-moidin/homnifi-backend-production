import { NestFactory } from '@nestjs/core';
import { AppModule } from '@/src/app.module';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DepositTransaction } from '../wallet/schemas/deposit.transaction.schema';
import { DepositAndStakeTransaction } from '../wallet/schemas/depositAndStakeTransaction';
import { DepositTransactionHistory } from '../wallet/schemas/deposit.history.transaction.schema';
import {
  Deposit_Transaction_Type,
  TrxType,
} from '../global/enums/trx.type.enum';

const BATCH_SIZE = 20000; // Number of records to process in each batch

async function processTransactionBatch(
  transactions: any[],
  DepositTransactionHistoryModel: Model<DepositTransactionHistory>,
  startIndex: number,
  batchSize: number,
  totalLength: number,
) {
  const endIndex = Math.min(startIndex + batchSize, totalLength);
  const batchTransactions = transactions.slice(startIndex, endIndex);

  const transactionHistoryEntries = batchTransactions.map(
    (transaction: any) => ({
      deposit_id: transaction._id,
      serialNumber: transaction.serialNumber ?? null,
      requestId: transaction.requestId ?? null,
      user: transaction.user ?? null,
      from: transaction.from,
      fromToken: transaction.fromToken ?? null,
      fromUser: transaction.fromUser ?? null,
      toWallet: transaction.toWallet ?? null,
      toToken: transaction.toToken ?? null,
      totalAmount: transaction.totalAmount ?? null,
      status: transaction?.transactionStatus || transaction?.status || null,
      depositAddress: transaction?.depositAddress || null,
      depositAndStakeSettings: transaction.depositAndStakeSettings ?? null,
      meta: transaction.meta ?? null,
      expiredAt: transaction.expiredAt ?? null,
      onChainWallet: transaction.onChainWallet ?? null,
      toWalletTrx: transaction.toWalletTrx ?? null,
      token: transaction.token ?? null,
      network: transaction.network ?? null,
      blockchainId: transaction.blockchainId ?? null,
      amount: transaction.amount ?? null,
      transactionStatus: transaction.transactionStatus ?? null,
      confirmation: transaction.confirmation ?? null,
      hash: transaction.hash ?? null,
      remarks: transaction.remarks ?? null,
      note: transaction.note ?? null,
      settingsUsed: transaction.settingsUsed ?? null,
      type:
        transaction?.toWalletTrxDetails?.trxType ||
        (transaction?.from === Deposit_Transaction_Type.Deposit_Stack
          ? TrxType?.DEPOSIT_AND_STAKE_REQUEST
          : 'deposit'),
      newBalance: transaction.newBalance ?? null,
      platform: transaction.platform ?? null,
      previousBalance: transaction.previousBalance ?? null,
      createdAt: transaction?.createdAt || null,
      updatedAt: transaction?.updatedAt || null,
      deletedAt: transaction?.deletedAt || null,
    }),
  );

  await DepositTransactionHistoryModel.insertMany(transactionHistoryEntries);

  const progress = Math.round((endIndex / totalLength) * 100);
  console.log(
    `Progress: ${progress}% (${endIndex}/${totalLength} records processed)`,
  );
}

async function bootstrap() {
  console.log('\n====================================');
  console.log('🚀 TRANSACTION MIGRATION SCRIPT STARTED');
  console.log('====================================\n');

  const startTime = Date.now();
  const appContext = await NestFactory.createApplicationContext(AppModule);

  try {
    // Injecting the models
    console.log('📚 Initializing database models...');
    const DepositTransactionModel: Model<DepositTransaction> = appContext.get(
      'DepositTransactionModel',
    );
    const DepositAndStakeTransactionModel: Model<DepositAndStakeTransaction> =
      appContext.get('DepositAndStakeTransactionModel');
    const DepositTransactionHistoryModel: Model<DepositTransactionHistory> =
      appContext.get('DepositTransactionHistoryModel');

    console.log('🔍 Fetching deposit transactions...');
    const depositTransactions = await DepositTransactionModel.aggregate([
      {
        $addFields: {
          from: Deposit_Transaction_Type.Deposit,
        },
      },
      {
        $lookup: {
          from: 'wallettransactions',
          localField: 'toWalletTrx',
          foreignField: '_id',
          as: 'toWalletTrxDetails',
        },
      },
      {
        $unwind: {
          path: '$toWalletTrxDetails',
          preserveNullAndEmptyArrays: true,
        },
      },
    ]);
    console.log(`✅ Found ${depositTransactions.length} deposit transactions`);

    console.log('🔍 Fetching deposit and stake transactions...');
    const depositAndStakeTransactions =
      await DepositAndStakeTransactionModel.aggregate([
        {
          $addFields: {
            from: Deposit_Transaction_Type.Deposit_Stack,
          },
        },
      ]);
    console.log(
      `✅ Found ${depositAndStakeTransactions.length} deposit and stake transactions`,
    );

    const allTransactions = [
      ...depositTransactions,
      ...depositAndStakeTransactions,
    ].sort((a, b) => b.createdAt - a.createdAt);

    const totalTransactions = allTransactions.length;
    console.log(`\n📊 Total transactions to process: ${totalTransactions}`);
    console.log(`📦 Batch size: ${BATCH_SIZE}`);
    console.log('\n🔄 Starting batch processing...\n');

    // Process in batches
    for (let i = 0; i < totalTransactions; i += BATCH_SIZE) {
      await processTransactionBatch(
        allTransactions,
        DepositTransactionHistoryModel,
        i,
        BATCH_SIZE,
        totalTransactions,
      );
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('\n====================================');
    console.log('✨ DATA MIGRATION COMPLETED SUCCESSFULLY');
    console.log(`⏱️  Total execution time: ${duration} seconds`);
    console.log('====================================\n');
  } catch (err) {
    console.error('\n❌ Error during script execution:', err);
    throw err;
  } finally {
    await appContext.close();
    process.exit(0);
  }
}

bootstrap().catch((err) => {
  console.error('\n❌ Unexpected error during bootstrap:', err);
  process.exit(1);
});
