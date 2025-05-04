// This script processes deposit transactions in batches,
// updating their platform association based on specific criteria.
//  It first connects to two databases (homnifi-qa and homnifi-webhook) and retrieves necessary models.
//  The script identifies transactions without a platform and categorizes them based on predefined hashes (HOMNIFI_HASHES).
//  For homnifi transactions, it directly assigns the platform ID.
//  For other transactions, it cross-references webhook data from both databases to determine the platform.
//  Missing platforms default to the homnifi platform.
// Updates are performed in bulk, and logs are generated for each batch and the overall process.
// Errors are handled gracefully, and the application context is closed upon completion.

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

    // Get homnifi platform ID
    const homnifiPlatform = await PlatformModel.findOne({
      symbol: { $regex: new RegExp('^homnifi$', 'i') },
      status: 'active',
      deletedAt: null,
    });
    if (!homnifiPlatform) {
      throw new Error('Homnifi platform not found');
    }

    const BATCH_SIZE = 25000;
    let skip = 0;
    let batchCount = 0;
    let totalUpdatedDocuments = 0;

    const totalStartTime = Date.now();

    const HOMNIFI_HASHES = [
      'supernode-reward',
      'claimed-reward',
      'sngp-reward',
      'bonus',
      'migrate',
    ];

    try {
      while (true) {
        const batchStartTime = Date.now();
        batchCount += 1;

        log(`Processing Batch #${batchCount}, Skipping: ${skip}`);

        // Get transactions without platform
        const transactions = await DepositTransactionModel.find({
          $or: [{ platform: { $exists: false } }, { platform: null }],
        })
          .select('_id hash')
          .skip(skip)
          .limit(BATCH_SIZE);

        if (transactions.length === 0) {
          log('No more transactions to process. Exiting batch processing.');
          break;
        }

        // Separate transactions into homnifi and other types
        const homnifiTransactions = transactions.filter((t) =>
          HOMNIFI_HASHES.includes(Array.isArray(t.hash) ? t.hash[0] : t.hash),
        );

        const otherTransactions = transactions.filter(
          (t) =>
            !HOMNIFI_HASHES.includes(
              Array.isArray(t.hash) ? t.hash[0] : t.hash,
            ),
        );

        // Process homnifi transactions
        const homnifiBulkOps = homnifiTransactions.map((transaction) => ({
          updateOne: {
            filter: { _id: transaction._id },
            update: {
              $set: {
                platform: homnifiPlatform._id,
                note: `Platform ${homnifiPlatform.name} updated based on hash type: ${Array.isArray(transaction.hash) ? transaction.hash[0] : transaction.hash}`,
              },
            },
          },
        }));

        // Process other transactions with webhook lookup
        const otherTransactionHashes = otherTransactions
          .map((t) => (Array.isArray(t.hash) ? t.hash : [t.hash]))
          .flat();

        // Check webhooks in both databases
        const [defaultWebhooks, webhookDbWebhooks] = await Promise.all([
          DefaultWebhookModel.find({
            type: 'completed',
            'payload.hash': { $in: otherTransactionHashes },
          }).select('payload.hash platform'),
          WebhookWebhookModel.find({
            type: 'completed',
            'payload.hash': { $in: otherTransactionHashes },
          }).select('payload.hash platform'),
        ]);

        // Create map of hash to platform
        const hashToPlatform = new Map();
        [...defaultWebhooks, ...webhookDbWebhooks].forEach((webhook) => {
          if (webhook.platform && webhook.payload.hash) {
            hashToPlatform.set(webhook.payload.hash, webhook.platform);
          }
        });

        // Get all unique platform symbols
        const platformSymbols = [...new Set([...hashToPlatform.values()])];

        // Get platform IDs
        const platforms = await PlatformModel.find({
          $and: [
            {
              symbol: {
                $in: platformSymbols.map(
                  (symbol) => new RegExp(`^${symbol}$`, 'i'),
                ),
              },
            },
            { status: 'active' },
            { deletedAt: null },
          ],
        });

        const platformMap = new Map(
          platforms.map((p) => [p.symbol.toLowerCase(), p._id]),
        );

        // Create bulk ops for other transactions
        const otherBulkOps = otherTransactions
          .filter((transaction) => {
            const hash = Array.isArray(transaction.hash)
              ? transaction.hash[0]
              : transaction.hash;
            return hashToPlatform.has(hash);
          })
          .map((transaction) => {
            const hash = Array.isArray(transaction.hash)
              ? transaction.hash[0]
              : transaction.hash;
            const platformSymbol = hashToPlatform.get(hash);
            const platformId = platformMap.get(platformSymbol.toLowerCase());

            // If no matching platform found, use homnifi platform
            if (!platformId) {
              return {
                updateOne: {
                  filter: { _id: transaction._id },
                  update: {
                    $set: {
                      platform: homnifiPlatform._id,
                      note: `Wallet - No matching platform found for symbol: ${platformSymbol}`,
                    },
                  },
                },
              };
            }

            return {
              updateOne: {
                filter: { _id: transaction._id },
                update: {
                  $set: {
                    platform: platformId,
                    note: `Platform updated from webhook platform: ${platformSymbol}`,
                  },
                },
              },
            };
          });

        // Combine all bulk operations
        const allBulkOps = [...homnifiBulkOps, ...otherBulkOps];

        if (allBulkOps.length > 0) {
          try {
            const result = await DepositTransactionModel.bulkWrite(allBulkOps, {
              ordered: false,
            });

            totalUpdatedDocuments += result.modifiedCount || 0;

            log(`Batch #${batchCount} Summary: 
              Total Processed: ${transactions.length},
              Homnifi Updates: ${homnifiBulkOps.length},
              Webhook Updates: ${otherBulkOps.length},
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
