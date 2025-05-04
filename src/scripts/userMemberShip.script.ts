import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Model, Types } from 'mongoose';
import { UserTwoAccess } from '../users/schemas/user-twoAccess.schema';
import { User } from '../users/schemas/user.schema';
import {
  getDateOrNull,
  getMembershipDetails,
  isMembershipValid,
} from '../utils/common/common.functions';

async function run() {
  const startTime = Date.now();
  const BATCH_SIZE = 25000;
  let totalProcessed = 0;
  let totalErrors = 0;

  try {
    console.log(`[${new Date().toISOString()}] Starting processing`);

    const appContext = await NestFactory.createApplicationContext(AppModule);
    const UserTwoAccessModel: Model<UserTwoAccess> =
      appContext.get('UserTwoAccessModel');
    const UserModel: Model<User> = appContext.get('UserModel');

    const totalUsers = await UserTwoAccessModel.countDocuments();
    console.log(`[${new Date().toISOString()}] Total users: ${totalUsers}`);

    for (let skip = 0; skip < totalUsers; skip += BATCH_SIZE) {
      const userTwoAccessData: any = await UserTwoAccessModel.find()
        .skip(skip)
        .limit(BATCH_SIZE);

      console.log(
        `[${new Date().toISOString()}] Processing ${userTwoAccessData.length} users (batch starting at skip: ${skip})`,
      );

      const bulkUpdates = [];

      for (const item of userTwoAccessData) {
        try {
          // Find user directly by BID
          const user = await UserModel.findOne({
            blockchainId: item.bid.toString(),
          });

          if (!user) {
            console.log(
              `[${new Date().toISOString()}] User not found for BID: ${item.bid}`,
            );
            continue;
          }

          let parent = null;
          if (item.upline_id) {
            parent = await UserModel.findOne({ bid: item.upline_id });
          }

          // const membership_Date = await getDateOrNull(item.membership_expiry);
          const { membership_Date, IsMembership } = await getMembershipDetails(
            item.membership_expiry,
          );
          bulkUpdates.push({
            updateOne: {
              filter: { _id: user._id },
              update: {
                membership_expiry: membership_Date || null,
                isMembership: IsMembership,
                referralCode: item?.referral_code || null,
              },
            },
          });

          totalProcessed++;
        } catch (error) {
          console.error(
            `[${new Date().toISOString()}] Error processing user ${item.bid}:`,
            error.message,
          );
          totalErrors++;
        }
      }

      if (bulkUpdates.length > 0) {
        await UserModel.bulkWrite(bulkUpdates);
        console.log(
          `[${new Date().toISOString()}] Batch starting at skip ${skip} updated successfully`,
        );
      }

      console.log(
        `[${new Date().toISOString()}] Progress: ${totalProcessed}/${totalUsers} users (${((totalProcessed / totalUsers) * 100).toFixed(2)}%)`,
      );
    }

    const processingTime = Date.now() - startTime;
    console.log(`[${new Date().toISOString()}] Processing completed`, {
      totalProcessed,
      totalErrors,
      processingTimeMs: processingTime,
      averageTimePerUser: (processingTime / totalProcessed).toFixed(2) + 'ms',
      averageTimePerBatch:
        (processingTime / Math.ceil(totalUsers / BATCH_SIZE)).toFixed(2) + 'ms',
    });

    await appContext.close();
    process.exit(0);
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Critical error:`,
      error.message,
    );
    process.exit(1);
  }
}

process.on('uncaughtException', (error) => {
  console.error(
    `[${new Date().toISOString()}] Uncaught exception:`,
    error.message,
  );
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error(`[${new Date().toISOString()}] Unhandled rejection:`, reason);
  process.exit(1);
});

run();
