import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Model } from 'mongoose';
import { WithdrawTransaction } from '../wallet/schemas/withdraw.transaction.schema';
import { WalletTransaction } from '../wallet/schemas/wallet.transaction.schema.';
import { DepositTransaction } from '../wallet/schemas/deposit.transaction.schema';

async function bootstrap() {
  console.log('Starting transaction processing...');

  const appContext = await NestFactory.createApplicationContext(AppModule);
  const depositTransactions = appContext.get<Model<DepositTransaction>>(
    DepositTransaction.name + 'Model',
  );
  const walletTransactions = appContext.get<Model<WalletTransaction>>(
    WalletTransaction.name + 'Model',
  );

  // Fetch transactions in batches to prevent memory issues
  const FETCH_BATCH_SIZE = 1000;
  const UPDATE_BATCH_SIZE = 500;
  let processedCount = 0;
  let totalCount = 0;

  // Get total count for progress tracking
  totalCount = await depositTransactions.countDocuments({});
  console.log(`Total transactions to process: ${totalCount}`);

  // Process in batches
  for (let skip = 0; skip < totalCount; skip += FETCH_BATCH_SIZE) {
    try {
      // Fetch batch of transactions
      const transactions = await depositTransactions
        .find({})
        .skip(skip)
        .limit(FETCH_BATCH_SIZE)
        .populate({
          path: 'toWalletTrx',
          select: 'amount wallet transactionFlow createdAt',
        })
        .lean() // Use lean() for better performance
        .exec();

      const bulkOps = [];
      const updateBatches = [];

      // Prepare updates
      for (const transaction of transactions as any) {
        if (!transaction.toWalletTrx) continue;

        const [newBalanceResult, oldBalanceResult] = await Promise.all([
          walletTransactions.aggregate([
            {
              $match: {
                wallet: transaction.toWallet,
                createdAt: { $lte: transaction.toWalletTrx.createdAt },
              },
            },
            {
              $group: {
                _id: null,
                balance: {
                  $sum: {
                    $cond: [
                      { $eq: ['$transactionFlow', 'in'] },
                      '$amount',
                      { $multiply: [-1, '$amount'] },
                    ],
                  },
                },
              },
            },
          ]),
          walletTransactions.aggregate([
            {
              $match: {
                wallet: transaction.toWallet,
                createdAt: { $lt: transaction.toWalletTrx.createdAt },
              },
            },
            {
              $group: {
                _id: null,
                balance: {
                  $sum: {
                    $cond: [
                      { $eq: ['$transactionFlow', 'in'] },
                      '$amount',
                      { $multiply: [-1, '$amount'] },
                    ],
                  },
                },
              },
            },
          ]),
        ]);

        bulkOps.push({
          updateOne: {
            filter: { _id: transaction._id },
            update: {
              $set: {
                newBalance: newBalanceResult[0]?.balance || 0,
                previousBalance: oldBalanceResult[0]?.balance || 0,
              },
            },
          },
        });

        // Execute bulk operations in smaller batches
        if (bulkOps.length >= UPDATE_BATCH_SIZE) {
          updateBatches.push([...bulkOps]);
          bulkOps.length = 0;
        }
      }

      // Add remaining operations to batches
      if (bulkOps.length > 0) {
        updateBatches.push([...bulkOps]);
      }

      // Execute all update batches
      for (const batch of updateBatches) {
        await depositTransactions.bulkWrite(batch, { ordered: false });
        processedCount += batch.length;

        // Log progress
        const progress = ((processedCount / totalCount) * 100).toFixed(2);
        console.log(
          `Progress: ${progress}% (${processedCount}/${totalCount} transactions)`,
        );
      }
    } catch (error) {
      console.error(`Error processing batch starting at ${skip}:`, error);
      // Continue with next batch instead of failing completely
    }
  }

  console.log(
    'Processing complete. Total transactions processed:',
    processedCount,
  );
  await appContext.close();
  process.exit(0);
}

bootstrap().catch((err) => {
  console.error('Fatal error during processing:', err);
  process.exit(1);
});
