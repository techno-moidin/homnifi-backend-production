import { NestFactory } from '@nestjs/core';
import mongoose, { Model } from 'mongoose';
import { AppModule } from '../app.module';
import { DepositTransaction } from '../wallet/schemas/deposit.transaction.schema';
import { Platform } from '../platform/schemas/platform.schema';

async function bootstrap() {
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

    const BATCH_SIZE = 25000; // Reduced batch size due to population
    let skip = 0;
    let batchCount = 0;
    let totalUpdatedDocuments = 0;

    const totalStartTime = Date.now();

    try {
      while (true) {
        const batchStartTime = Date.now();
        batchCount += 1;

        log(`Processing Batch #${batchCount}, Skipping: ${skip}`);

        // Get transactions with settingsUsed, platform null, and deletedAt null
        const transactions = await DepositTransactionModel.find({
          settingsUsed: { $ne: null },
          platform: null,
          deletedAt: null,
        })
          .populate('settingsUsed')
          .select('_id platform settingsUsed')
          .skip(skip)
          .limit(BATCH_SIZE)
          .lean(); // Using lean() for better performance

        if (transactions.length === 0) {
          log('No more transactions to process. Exiting batch processing.');
          break;
        }

        // Filter transactions that need updates
        const transactionsToUpdate = transactions.filter((transaction) => {
          // Skip if settingsUsed doesn't have a platform
          if (!transaction.settingsUsed?.platform) {
            return false;
          }

          return true; // Update all valid transactions with settingsUsed.platform
        });

        const bulkOps = transactionsToUpdate.map((transaction) => ({
          updateOne: {
            filter: { _id: transaction._id },
            update: {
              $set: {
                platform: transaction.settingsUsed.platform,
                note: `Platform updated from settingsUsed.platform ID: ${transaction.settingsUsed.platform}`,
              },
            },
          },
        }));

        if (bulkOps.length > 0) {
          try {
            const result = await DepositTransactionModel.bulkWrite(bulkOps, {
              ordered: false,
            });

            totalUpdatedDocuments += result.modifiedCount || 0;

            log(`Batch #${batchCount} Summary: 
              Total Processed: ${transactions.length},
              Needed Updates: ${bulkOps.length},
              Successfully Modified: ${result.modifiedCount}`);
          } catch (bulkWriteError) {
            log(
              `Bulk Write Error in Batch #${batchCount}: ${bulkWriteError.message}`,
            );
            if (bulkWriteError.writeErrors) {
              bulkWriteError.writeErrors.forEach((error) => {
                log(`Write Error: ${error.errmsg}`);
              });
            }
          }
        } else {
          log(
            `Batch #${batchCount}: No updates needed for any transactions in this batch`,
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

      const totalEndTime = Date.now();
      const totalDuration = (
        (totalEndTime - totalStartTime) /
        1000 /
        60
      ).toFixed(2);

      log('====SCRIPT COMPLETED====');
      log(`Total Transactions Updated: ${totalUpdatedDocuments}`);
      log(`Total Batches Processed: ${batchCount}`);
      log(`Total Duration: ${totalDuration} minutes`);
    } catch (processingError) {
      log(`Critical Processing Error: ${processingError.message}`);
      log(`Error Stack: ${processingError.stack}`);
    } finally {
      await appContext.close();
      process.exit(0);
    }
  } catch (bootstrapError) {
    console.error('Unexpected bootstrap error:', bootstrapError);
    console.error('Error Stack:', bootstrapError.stack);
    process.exit(1);
  }
}

bootstrap().catch((err) => {
  console.error('Unhandled error during script execution:', err);
  console.error('Error Stack:', err.stack);
  process.exit(1);
});
