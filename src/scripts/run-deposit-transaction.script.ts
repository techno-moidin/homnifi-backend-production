import { NestFactory } from '@nestjs/core';
import mongoose, { Model, Mongoose, Types } from 'mongoose';
import { AppModule } from '../app.module';
import { DepositTransaction } from '../wallet/schemas/deposit.transaction.schema';

async function bootstrap() {
  // Simplified logging function
  function log(message: string) {
    const timestamp = new Date().toISOString();
    console.log(message, 'TIMESTAMP :', timestamp);
  }

  try {
    const appContext = await NestFactory.createApplicationContext(AppModule);
    log('====SCRIPT STARTED====');

    const DepositTransactionModel: Model<DepositTransaction> = appContext.get(
      'DepositTransactionModel',
    );

    const BATCH_SIZE = 25000;
    let skip = 0;
    let totalCount = 0;
    let batchCount = 0;
    let totalUpdatedDocuments = 0;

    const totalStartTime = Date.now();

    // Array to hold _id values of transactions without token
    const transactionsWithoutToken: any[] = [];

    try {
      const matchCriteria = {
        deletedAt: null,
        $or: [
          { token: { $exists: false } },
          { token: null },
          { blockchainId: null },
          { blockchainId: { $exists: false } },
        ],
      };

      totalCount = await DepositTransactionModel.countDocuments(matchCriteria);

      log(`Total Deposit transactions to process: ${totalCount}`);
      log(`Matching Criteria: ${JSON.stringify(matchCriteria, null, 2)}`);

      if (totalCount === 0) {
        log('No transactions match the update criteria. Exiting.');
        return;
      }

      while (true) {
        const batchStartTime = Date.now();
        batchCount += 1;

        log(`Processing Batch #${batchCount}, Skipping: ${skip}`);

        const transactions = await DepositTransactionModel.aggregate([
          { $match: matchCriteria },
          {
            $lookup: {
              from: 'wallets',
              localField: 'toWallet',
              foreignField: '_id',
              as: 'wallet',
              pipeline: [{ $project: { token: 1, _id: 0 } }],
            },
          },
          {
            $lookup: {
              from: 'users',
              localField: 'user',
              foreignField: '_id',
              as: 'user',
              pipeline: [{ $project: { blockchainId: 1, _id: 0 } }],
            },
          },
          {
            $lookup: {
              from: 'onchainwallets',
              localField: 'onChainWallet',
              foreignField: '_id',
              as: 'onChainWalletDetails',
              pipeline: [{ $project: { network: 1, _id: 0 } }],
            },
          },
          {
            $unwind: { path: '$wallet', preserveNullAndEmptyArrays: true },
          },
          {
            $unwind: { path: '$user', preserveNullAndEmptyArrays: true },
          },
          {
            $unwind: {
              path: '$onChainWalletDetails',
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $project: {
              _id: 1,
              requestId: 1,
              currentToken: '$token',
              newToken: '$wallet.token',
              currentNetwork: '$network',
              newNetwork: '$onChainWalletDetails.network',
              currentBlockchainId: '$blockchainId',
              newBlockchainId: '$user.blockchainId',
            },
          },
        ])
          .skip(skip)
          .limit(BATCH_SIZE);

        if (transactions.length === 0) {
          log('No more transactions to process. Exiting batch processing.');
          break;
        }

        log(
          `Fetched ${transactions.length} transactions in Batch #${batchCount}`,
        );

        // Filter and collect _id of transactions without token
        const transactionsWithoutTokenBatch = transactions
          .filter((transaction) => !transaction.newToken)
          .map((transaction) => transaction._id);

        // Push the filtered _id values to the main array
        transactionsWithoutToken.push(...transactionsWithoutTokenBatch);

        // Proceed with the bulkWrite operation as before...
        const bulkOps = transactions.map((transaction) => {
          // Function to safely convert a value to ObjectId if valid
          const safeToObjectId = (value: string | null | undefined) => {
            if (value && mongoose.Types.ObjectId.isValid(value)) {
              return new mongoose.Types.ObjectId(value);
            }
            return null; // Return null if the value is invalid or empty
          };

          return {
            updateOne: {
              filter: { _id: transaction._id }, // Only update the document if _id exists
              update: {
                $set: {
                  token:
                    safeToObjectId(transaction.newToken) ||
                    safeToObjectId(transaction.currentToken) ||
                    null,
                  network:
                    safeToObjectId(transaction.newNetwork) ||
                    safeToObjectId(transaction.currentNetwork) ||
                    null,
                  blockchainId:
                    transaction.newBlockchainId ||
                    transaction.currentBlockchainId ||
                    null,
                },
              },
              upsert: false, // Prevent inserting new documents if not found
            },
          };
        });

        try {
          const result = await DepositTransactionModel.bulkWrite(bulkOps, {
            ordered: false,
          });

          totalUpdatedDocuments += result.modifiedCount || 0;

          log(`Batch #${batchCount} Summary: 
            Processed: ${transactions.length}, 
            Matched: ${result.matchedCount}, 
            Modified: ${result.modifiedCount}, 
            Upserted: ${result.upsertedCount || 0}`);
        } catch (bulkWriteError) {
          log(
            `Bulk Write Error in Batch #${batchCount}: ${bulkWriteError.message}`,
          );
        }

        const batchEndTime = Date.now();
        const batchDuration = (
          (batchEndTime - batchStartTime) /
          1000 /
          60
        ).toFixed(2);
        log(`Batch #${batchCount} completed in ${batchDuration} minutes.`);

        skip += BATCH_SIZE;
      }

      // Log the final array of transactions without token
      log(`Transactions without token: ${transactionsWithoutToken.length}`);
      log(
        `Transactions without token IDs: ${JSON.stringify(transactionsWithoutToken)}`,
      );

      const totalEndTime = Date.now();
      const totalDuration = (
        (totalEndTime - totalStartTime) /
        1000 /
        60
      ).toFixed(2);

      log('====SCRIPT COMPLETED====');
      log(`Total Transactions Processed: ${totalCount}`);
      log(`Total Transactions Updated: ${totalUpdatedDocuments}`);
      log(`Total Batches Processed: ${batchCount}`);
      log(`Total Duration: ${totalDuration} minutes`);
    } catch (processingError) {
      log(`Critical Processing Error: ${processingError.message}`);
    } finally {
      await appContext.close();
      process.exit(0);
    }
  } catch (bootstrapError) {
    console.error('Unexpected bootstrap error:', bootstrapError);
    process.exit(1);
  }
}

bootstrap().catch((err) => {
  console.error('Unhandled error during script execution:', err);
  process.exit(1);
});
