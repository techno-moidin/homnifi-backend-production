import { NestFactory } from '@nestjs/core';
import mongoose, { Model, Connection } from 'mongoose';
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
    const PlatformModel: Model<Platform> = appContext.get('PlatformModel');

    // Get platforms for specific confirmations
    const [homnifiPlatform, horysmallPlatform, jbPlatform] = await Promise.all([
      PlatformModel.findOne({
        symbol: { $regex: new RegExp('^homnifi$', 'i') },
        status: 'active',
        deletedAt: null,
      }),
      PlatformModel.findOne({
        symbol: { $regex: new RegExp('^horysmall$', 'i') },
        status: 'active',
        deletedAt: null,
      }),
      PlatformModel.findOne({
        symbol: { $regex: new RegExp('^jb$', 'i') },
        status: 'active',
        deletedAt: null,
      }),
    ]);

    if (!homnifiPlatform) {
      throw new Error('Homnifi platform not found');
    }

    // Create a map for confirmation to platform matching
    const confirmationToPlatform = new Map([
      ['horysmall', horysmallPlatform],
      ['hory', horysmallPlatform],
      ['hory-small', horysmallPlatform],
      ['jb', jbPlatform],
      ['journey', jbPlatform],
      ['jb-homnifi', jbPlatform],
      ['JB Deposit', jbPlatform],
    ]);

    const BATCH_SIZE = 25000;
    let skip = 0;
    let batchCount = 0;
    let totalUpdatedDocuments = 0;

    const totalStartTime = Date.now();

    try {
      while (true) {
        const batchStartTime = Date.now();
        batchCount += 1;

        log(`Processing Batch #${batchCount}, Skipping: ${skip}`);

        // Get transactions without platform
        const transactions = await DepositTransactionModel.find({
          $or: [{ platform: { $exists: false } }, { platform: null }],
        })
          .select('_id confirmation')
          .skip(skip)
          .limit(BATCH_SIZE);

        if (transactions.length === 0) {
          log('No more transactions to process. Exiting batch processing.');
          break;
        }

        // Process transactions based on confirmation field
        const bulkOps = transactions.map((transaction) => {
          const confirmation = transaction.confirmation?.toLowerCase();
          const matchedPlatform = confirmation
            ? confirmationToPlatform.get(confirmation)
            : null;

          if (matchedPlatform) {
            return {
              updateOne: {
                filter: { _id: transaction._id },
                update: {
                  $set: {
                    platform: matchedPlatform._id,
                    note: `Platform updated based on confirmation: ${confirmation}`,
                  },
                },
              },
            };
          } else {
            // Default to homnifi platform if no match found
            return {
              updateOne: {
                filter: { _id: transaction._id },
                update: {
                  $set: {
                    platform: homnifiPlatform._id,
                    note: `Default platform set ${confirmation ? `: ${confirmation}` : ''}`,
                  },
                },
              },
            };
          }
        });

        if (bulkOps.length > 0) {
          try {
            const result = await DepositTransactionModel.bulkWrite(bulkOps, {
              ordered: false,
            });

            totalUpdatedDocuments += result.modifiedCount || 0;

            log(`Batch #${batchCount} Summary: 
              Total Processed: ${transactions.length},
              Modified: ${result.modifiedCount}`);
          } catch (bulkWriteError) {
            log(
              `Bulk Write Error in Batch #${batchCount}: ${bulkWriteError.message}`,
            );
          }
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
