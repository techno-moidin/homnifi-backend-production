import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UsersService } from '../users/users.service';
import { Model, Types } from 'mongoose';
import { UserTwoAccess } from '../users/schemas/user-twoAccess.schema';
import {
  getDateOrNull,
  getMembershipDetails,
  isMembershipValid,
} from '../utils/common/common.functions';

async function run() {
  const startTime = Date.now();
  const BATCH_SIZE = 2500; // Adjust batch size as needed
  let totalProcessed = 0;
  let totalErrors = 0;

  try {
    console.log(`[${new Date().toISOString()}] Starting processing`);

    const appContext = await NestFactory.createApplicationContext(AppModule);
    const userService = appContext.get(UsersService);
    const UserTwoAccessModel: Model<UserTwoAccess> =
      appContext.get('UserTwoAccessModel');

    // Count total users
    const totalUsers = await UserTwoAccessModel.countDocuments({
      document_country: { $ne: null },
    });
    console.log(`[${new Date().toISOString()}] Total users: ${totalUsers}`);

    for (let skip = 0; skip < totalUsers; skip += BATCH_SIZE) {
      const userTwoAccessData: any = await UserTwoAccessModel.find({
        document_country: { $ne: null },
      })
        .skip(skip)
        .limit(BATCH_SIZE);

      console.log(
        `[${new Date().toISOString()}] Processing ${userTwoAccessData.length} users (batch starting at skip: ${skip})`,
      );

      const bulkUpdates = [];
      // const bulkInsertActiveUsers = [];

      for (const item of userTwoAccessData) {
        try {
          const user = await userService.getOrCreateUserByBIDForScript(
            item.bid,
            item.email,
            item.username,
            item?.first_name,
            item?.last_name,
            null,
          );

          let parent = null;
          if (item.upline_id) {
            parent = await userService.getOrCreateUserByBIDForScript(
              item.upline_id,
            );
          }
          // bulkInsertActiveUsers.push({
          //   user:
          //     typeof user._id === 'string'
          //       ? new Types.ObjectId(user._id)
          //       : user._id,
          //   upline: parent
          //     ? typeof parent._id === 'string'
          //       ? new Types.ObjectId(parent._id)
          //       : parent._id
          //     : null,
          // });
          // const membershipExpiry = await getDateOrNull(item.membership_expiry); // Await the function result
          // const isMembership = await isMembershipValid(item.membership_expiry); // Await the function result
          const { membership_Date, IsMembership } = await getMembershipDetails(
            item.membership_expiry,
          );
          bulkUpdates.push({
            updateOne: {
              filter: { _id: user._id },
              update: {
                email: item?.email || user.email,
                username: item?.username || user.username,
                firstName: item?.first_name || user.firstName,
                lastName: item?.last_name || user.lastName,
                uplineBID: item?.upline_id || null,
                referralCode: item.referral_code || null,
                uplineId: parent && parent._id ? parent._id : null,
                membership_expiry: membership_Date,
                isMembership: IsMembership,
                subscription_type: item?.subscription_type || null,
                document_country: item?.document_country || null,
              },
            },
          });

          totalProcessed++;
        } catch (error) {
          console.error(
            `[${new Date().toISOString()}] Error processing user ${item.id}:`,
            error.message,
          );
          totalErrors++;
        }
      }
      // if (bulkInsertActiveUsers.length > 0) {
      //   await userService.createBulkActiveTreeUser(bulkInsertActiveUsers);
      // }
      // Bulk update the entire batch of 25,000 users
      if (bulkUpdates.length > 0) {
        await userService.bulkUpdateUsers(bulkUpdates);
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
