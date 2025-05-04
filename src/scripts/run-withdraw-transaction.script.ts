import { NestFactory } from '@nestjs/core';
import { Model, Types } from 'mongoose';
import { AppModule } from '../app.module';
import { WithdrawTransaction } from '../wallet/schemas/withdraw.transaction.schema';

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(AppModule);

  const WithdrawTransactionModel: Model<WithdrawTransaction> = appContext.get(
    'WithdrawTransactionModel',
  );

  const BATCH_SIZE = 10000; // Number of documents to process in each batch
  let skip = 0;
  let totalCount = 0;
  let batchCount = 0;

  const totalStartTime = Date.now(); // Capture the total start time

  try {
    // Get the total count of documents to process
    totalCount = await WithdrawTransactionModel.countDocuments({
      deletedAt: null,
    });
    console.log(`Total Withdraw transactions to process: ${totalCount}`);

    while (true) {
      const batchStartTime = Date.now(); // Capture the batch start time

      batchCount += 1;

      // Fetch a batch of transactions
      const transactions = await WithdrawTransactionModel.aggregate([
        {
          $match: {
            deletedAt: null,
          },
        },
        {
          $lookup: {
            from: 'wallets',
            localField: 'fromWallet',
            foreignField: '_id',
            as: 'wallet',
          },
        },
        {
          $unwind: {
            path: '$wallet',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'user',
            foreignField: '_id',
            as: 'user',
          },
        },
        {
          $unwind: {
            path: '$user',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            _id: 1,
            requestId: 1,
            token: '$wallet.token',
            search: {
              blockchainId: '$user.blockchainId',
              // email: '$user.email',
              // firstName: '$user.firstName',
              // lastName: '$user.lastName',
            },
          },
        },
      ])
        .skip(skip)
        .limit(BATCH_SIZE);

      if (transactions.length === 0) {
        break;
      }

      console.log(
        `Fetched ${transactions.length} transactions in Batch #${batchCount}`,
      );

      // Prepare bulk operations
      const bulkOps = transactions.map((transaction) => {
        const updateData: any = {
          token: transaction?.token || null,
          // Search Keys
          blockchainId: transaction?.search?.blockchainId || null,
          // email: transaction?.search?.email || null,
          // firstName: transaction?.search?.firstName || null,
          // lastName: transaction?.search?.lastName || null,
        };
        return {
          updateOne: {
            filter: { _id: transaction._id },
            update: { $set: updateData },
          },
        };
      });

      // Execute bulk update
      try {
        const result = await WithdrawTransactionModel.bulkWrite(bulkOps);
        console.log(
          `Batch #${batchCount} Summary: Processed: ${transactions.length}, Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}`,
        );
      } catch (err) {
        console.error(`Error processing Batch #${batchCount}:`, err);
      }

      // Log the time taken for the current batch
      const batchEndTime = Date.now();
      const batchDurationInMinutes = (
        (batchEndTime - batchStartTime) /
        1000 /
        60
      ).toFixed(2);
      console.log(
        `Batch #${batchCount} completed in ${batchDurationInMinutes} minutes.`,
      );

      // Increment skip to process the next batch
      skip += BATCH_SIZE;
    }

    // Log the total time for the entire process
    const totalEndTime = Date.now();
    const totalDurationInMinutes = (
      (totalEndTime - totalStartTime) /
      1000 /
      60
    ).toFixed(2);
    console.info('\n====SCRIPT COMPLETED====');
    console.info(`Total Transactions: ${totalCount}`);
    console.info(`Total Batches Processed: ${batchCount}`);
    console.info(`Total Duration: ${totalDurationInMinutes} minutes`);
  } catch (err) {
    console.error('Error during script execution:', err);
  } finally {
    await appContext.close();
    process.exit(0);
  }
}

bootstrap().catch((err) => {
  console.error('Unexpected error during bootstrap:', err);
  process.exit(1);
});
