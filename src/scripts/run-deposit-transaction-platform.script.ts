import { NestFactory } from '@nestjs/core';
import mongoose, { Model, Connection } from 'mongoose';
import { AppModule } from '../app.module';
import { DepositTransaction } from '../wallet/schemas/deposit.transaction.schema';
import { Platform } from '../platform/schemas/platform.schema';
import {
  WebhookModel,
  WebhookModelSchema,
} from '../webhook/schemas/webhookModel.schema';

async function bootstrap() {
  function log(message: string) {
    const timestamp = new Date().toISOString();
    console.log(message, 'TIMESTAMP :', timestamp);
  }

  try {
    const appContext = await NestFactory.createApplicationContext(AppModule);
    log('====SCRIPT STARTED====');
    console.log(
      'Active Mongoose Connections:',
      mongoose.connections.map((conn) => ({
        name: conn.name,
        readyState: conn.readyState, // 1 means connected
        host: conn.host,
        port: conn.port,
        dbName: conn.name,
      })),
    );
    const DepositTransactionModel: Model<DepositTransaction> = appContext.get(
      'DepositTransactionModel',
    );
    const PlatformModel: Model<Platform> = appContext.get('PlatformModel');

    // Get both database connections
    const defaultConnection: Connection = mongoose.connections.find(
      (conn) => conn.name === 'homnifi',
    );
    const webhookConnection: Connection = mongoose.connections.find(
      (conn) => conn.name === 'homnifi-webhook',
    );

    if (!webhookConnection) {
      throw new Error('Webhook database connection not found');
    }

    // Create WebhookModel for both connections
    const DefaultWebhookModel = defaultConnection.model<WebhookModel>(
      'WebhookModel',
      WebhookModelSchema,
    );
    const WebhookWebhookModel = webhookConnection.model<WebhookModel>(
      'WebhookModel',
      WebhookModelSchema,
    );

    const BATCH_SIZE = 25000;
    let skip = 0;
    let batchCount = 0;
    let totalUpdatedDocuments = 0;

    const totalStartTime = Date.now();

    // Find platform with proper case-insensitive regex
    const platformSymbol = await PlatformModel.findOne({
      symbol: { $regex: new RegExp('^XPRO$', 'i') },
      status: 'active',
      deletedAt: null,
    });

    if (!platformSymbol) {
      log('Platform "Xpro" not found. Exiting.');
      return;
    }
    log(`Platform "Xpro" : ${JSON.stringify(platformSymbol)}`);

    try {
      const matchCriteria = {
        $or: [
          { deletedAt: null },
          { fromToken: { $exists: true } },
          { fromToken: { $ne: null } },
        ],
      };

      while (true) {
        const batchStartTime = Date.now();
        batchCount += 1;

        log(`Processing Batch #${batchCount}, Skipping: ${skip}`);

        // First, get the transactions with token criteria
        const transactions = await DepositTransactionModel.aggregate([
          { $match: matchCriteria },
          {
            $lookup: {
              from: 'tokens',
              localField: 'fromToken',
              foreignField: '_id',
              as: 'tokenInfo',
            },
          },
          {
            $match: {
              'tokenInfo.symbol': {
                $in: ['usdk-w', 'usdk-c'],
              },
            },
          },
          {
            $project: {
              _id: 1,
              hash: 1,
            },
          },
        ])
          .skip(skip)
          .limit(BATCH_SIZE);

        if (transactions.length === 0) {
          log('No more transactions to process. Exiting batch processing.');
          break;
        }

        // Extract all transaction hashes
        const transactionHashes = transactions
          .map((t) => (Array.isArray(t.hash) ? t.hash : [t.hash]))
          .flat();

        // Check for completed webhooks in both databases
        const [defaultWebhooks, webhookDbWebhooks] = await Promise.all([
          DefaultWebhookModel.find({
            type: 'completed',
            'payload.hash': { $in: transactionHashes },
          }).select('payload.hash'),
          WebhookWebhookModel.find({
            type: 'completed',
            'payload.hash': { $in: transactionHashes },
          }).select('payload.hash'),
        ]);

        // Combine webhook hashes from both DBs
        const completedHashes = new Set([
          ...defaultWebhooks.map((w) => w.payload.hash),
          ...webhookDbWebhooks.map((w) => w.payload.hash),
        ]);

        // Filter transactions that have matching webhooks
        const transactionsToUpdate = transactions.filter((transaction) => {
          if (Array.isArray(transaction.hash)) {
            return transaction.hash.some((hash) => completedHashes.has(hash));
          }
          return completedHashes.has(transaction.hash);
        });

        log(
          `Fetched ${transactions.length} transactions, ${transactionsToUpdate.length} have matching webhooks in Batch #${batchCount}`,
        );

        if (transactionsToUpdate.length > 0) {
          const bulkOps = transactionsToUpdate.map((transaction) => {
            return {
              updateOne: {
                filter: { _id: transaction._id },
                update: {
                  $set: {
                    platform: platformSymbol._id || null,
                  },
                },
                upsert: false,
              },
            };
          });

          try {
            const result = await DepositTransactionModel.bulkWrite(bulkOps, {
              ordered: false,
            });

            totalUpdatedDocuments += result.modifiedCount || 0;

            log(`Batch #${batchCount} Summary: 
              Processed: ${transactionsToUpdate.length}, 
              Matched: ${result.matchedCount}, 
              Modified: ${result.modifiedCount}, 
              Upserted: ${result.upsertedCount || 0}`);
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
