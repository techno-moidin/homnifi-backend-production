import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { TwoAccessService } from '../two-access/two-access.service';
import { User } from '../users/schemas/user.schema';
import { Model } from 'mongoose';
import { UsersService } from '../users/users.service';
import { ActiveUserTree } from '../users/schemas/active-user-tree.schema';

// Function to process items in batches
const processInBatches = async (
  items: any[],
  batchSize: number,
  processItem: (item: any) => Promise<void>,
) => {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await Promise.all(batch.map(processItem)); // Process the current batch
  }
};

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(AppModule);
  const twoAccessService = appContext.get(TwoAccessService);
  const UserModel = appContext.get<Model<User>>(User.name + 'Model');
  const ActiveUserTreeModel = appContext.get<Model<ActiveUserTree>>(
    ActiveUserTree.name + 'Model',
  );
  const userService = appContext.get(UsersService);

  console.info('Fetching existing users...');
  const startTime = Date.now();
  const allHomnifiUsers = await UserModel.find().lean();

  console.log('Total users in Homnifi: ', allHomnifiUsers.length);

  // Use a Map for better performance
  const groupedUsers = new Map<string, any>();
  for (const user of allHomnifiUsers) {
    groupedUsers.set(user.blockchainId, user);
  }
  const startTimeTotalUserCount = Date.now();
  const totalUserCount = await twoAccessService.getTotalTwoAccessUser();
  const endTimeTotalUserCount = Date.now();
  console.info(
    `Time taken to fetch total user count: ${(endTimeTotalUserCount - startTimeTotalUserCount) / 1000} seconds`,
  );

  const startTimeUserHierarchy = Date.now();
  const [userHierarchyAll, removeAllTreeUsersResult] = await Promise.all([
    twoAccessService.getUserHierarchy(totalUserCount, 0),
    userService.removeAllTreeUsers(),
  ]);
  const endTimeUserHierarchy = Date.now();

  console.info(
    `Time taken to fetch user hierarchy: ${(endTimeUserHierarchy - startTimeUserHierarchy) / 1000} seconds`,
  );

  // grop by user id
  const gropUserHierarchy = new Map<string, any>();
  for (const user of userHierarchyAll) {
    gropUserHierarchy.set(user.id, user);
  }

  console.log('Total users in TwoAccess: ', totalUserCount);

  // Memoization to avoid redundant calls
  const userCache = new Map<string, any>();

  const findOrCreateUser = async (twoAccessUser: any) => {
    if (groupedUsers.has(twoAccessUser.id))
      return groupedUsers.get(twoAccessUser.id);
    if (userCache.has(twoAccessUser.id)) return userCache.get(twoAccessUser.id);

    const userData = {
      email: twoAccessUser?.email,
      blockchainId: twoAccessUser?.id,
      uplineBID: twoAccessUser?.upline_id,
      uplineId: groupedUsers.get(twoAccessUser?.upline_id)?._id || null,
      username: twoAccessUser?.username,
      firstName: twoAccessUser?.first_name || null,
      lastName: twoAccessUser?.last_name || null,
      profilePicture: twoAccessUser?.profile_picture || null,
      dateJoined: twoAccessUser?.date_joined || null,
    };

    const problemUser = await UserModel.findOne({
      blockchainId: twoAccessUser.id,
    });

    if (problemUser) {
      const user = problemUser;
      groupedUsers.set(twoAccessUser.id, problemUser);
      userCache.set(twoAccessUser.id, problemUser);
      return user;
    } else {
      const user = await UserModel.create(userData);
      groupedUsers.set(twoAccessUser.id, user);
      userCache.set(twoAccessUser.id, user);
      return user;
    }
  };

  // const startTime = Date.now();
  const activeUserTreeList = [];

  // Adjust the batch size as needed

  const processUser = async (twoAccessUser: any) => {
    const [baseUser, uplineData, uplineMembershipData] = await Promise.all([
      findOrCreateUser(twoAccessUser),
      twoAccessUser.upline_id
        ? groupedUsers.has(twoAccessUser.id)
          ? groupedUsers.get(twoAccessUser.id)
          : gropUserHierarchy.get(twoAccessUser.upline_id)
        : null,
      twoAccessUser.membership_upline_id
        ? groupedUsers.has(twoAccessUser.id)
          ? groupedUsers.get(twoAccessUser.id)
          : gropUserHierarchy.get(twoAccessUser.membership_upline_id)
        : null,
    ]);

    if (!baseUser) {
      console.error(`Base user not found for BID: ${twoAccessUser.id}`);
    }

    // console.log('Processing user BID:', twoAccessUser?.id);
    // console.log('Base user Mongo ID:', baseUser?._id);
    // console.log('Upline:', uplineData?._id || null);
    // console.log('Membership Upline:', uplineMembershipData?._id || null);
    // console.log('-------------------------------------');

    activeUserTreeList.push({
      user: baseUser._id,
      upline: uplineData ? uplineData._id : null,
      meta: twoAccessUser,
      membershipUpline: uplineMembershipData ? uplineMembershipData._id : null,
      path: String(twoAccessUser?.path) || null,
      membershipPath: String(twoAccessUser?.membership_path) || null,
      membershipExpiry: twoAccessUser?.membership_expiry
        ? new Date(twoAccessUser?.membership_expiry)
        : null,
      isMembership: twoAccessUser?.is_membership ?? false,
      uplineMembershipExpiry: twoAccessUser?.membership_expiry_upline
        ? new Date(twoAccessUser?.membership_expiry_upline)
        : null,
      isUplineMembership: twoAccessUser?.is_membership_upline ?? false,
      depthLevel: twoAccessUser?.depth_level || 0,
    });
  };

  const BATCH_SIZE = 100000;
  console.log('userHierarchyAll count:', userHierarchyAll.length);
  for (let i = 0; i < userHierarchyAll.length; i += BATCH_SIZE) {
    const batchStartTime = Date.now();

    const batch = userHierarchyAll.slice(i, i + BATCH_SIZE);
    console.info(
      `Processing batch ${i / BATCH_SIZE + 1} (${batch.length} users)...`,
    );
    const batchSize = 20000;
    await processInBatches(batch, batchSize, processUser);

    if (activeUserTreeList.length) {
      const bulkWriteStartTime = Date.now();
      await ActiveUserTreeModel.insertMany(activeUserTreeList);
      const bulkWriteEndTime = Date.now();
      console.info(
        `Time taken for bulk write: ${(bulkWriteEndTime - bulkWriteStartTime) / 1000} seconds`,
      );
      console.info(`-----------------------------------------`);
      // Clear the list after inserting
      activeUserTreeList.length = 0;
    }

    const batchEndTime = Date.now();
    const batchDurationSec = (batchEndTime - batchStartTime) / 1000;
    const batchDurationMin = batchDurationSec / 60;
    console.info(
      `Batch processed in ${batchDurationSec.toFixed(2)} seconds (${batchDurationMin.toFixed(2)} minutes)`,
    );

    const totalDurationSec = (batchEndTime - startTime) / 1000;
    const totalDurationMin = totalDurationSec / 60;
    console.info(
      `Total time elapsed: ${totalDurationSec.toFixed(2)} seconds (${totalDurationMin.toFixed(2)} minutes)`,
    );
  }

  const endTime = Date.now();
  const totalDurationSec = (endTime - startTime) / 1000;
  const totalDurationMin = totalDurationSec / 60;

  console.info(
    `Full batch processed in ${totalDurationSec.toFixed(2)} seconds (${totalDurationMin.toFixed(2)} minutes)`,
  );
  console.info(
    `Total time elapsed: ${totalDurationSec.toFixed(2)} seconds (${totalDurationMin.toFixed(2)} minutes)`,
  );
  console.info('All users processed successfully!');
  process.exit(0);
}

bootstrap().catch((err) => {
  console.error('Error populating database:', err);
  process.exit(1);
});
