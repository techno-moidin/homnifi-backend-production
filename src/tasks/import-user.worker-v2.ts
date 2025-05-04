import { parentPort, workerData } from 'worker_threads';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UsersService } from '../users/users.service';
import { Types } from 'mongoose';
// import { CacheService } from '../cache/cache.service';
// import { CACHE_TYPE } from '../cache/Enums/cache.enum';

const run = async () => {
  const appContext = await NestFactory.createApplicationContext(AppModule);
  const userService = appContext.get(UsersService);
  // const cacheService = appContext.get(CacheService);

  try {
    console.log('Processing chunk started =======>');
    const bulkInsertActiveUsers = [];
    const bulkUpdateActiveTreeUser = [];
    // const bulkUpdates = [];
    const results = [];

    // Loop through each user in the workerData (chunk) and log all information
    for (const hierarchyUser of workerData) {
      console.log('User ID:', hierarchyUser.id);
      console.log('User ID:', hierarchyUser.upline_id);

      console.log('Username:', hierarchyUser.username);
      console.log('-------------------------');
      let user = null;
      let parent = null;
      let membershipParent = null;

      // const userCache = await cacheService.getCacheUser({
      //   type: CACHE_TYPE.IMPORT_USER,
      //   user: hierarchyUser.id,
      // });

      // if (!userCache) {
      user = await userService.getOrCreateUserByBidWithoutUpdate(
        hierarchyUser.id,
      );

      console.log('user:', user);

      //   await cacheService.setCacheUser({
      //     type: CACHE_TYPE.IMPORT_USER,
      //     user: hierarchyUser.id,
      //     data: user,
      //   });
      // } else {
      //   console.log(Cache hit for user ID: ${hierarchyUser.id});
      //   user = userCache;
      // }

      if (hierarchyUser.upline_id) {
        // const uplineCache = await cacheService.getCacheUser({
        //   type: CACHE_TYPE.IMPORT_USER,
        //   user: hierarchyUser.upline_id,
        // });

        // if (!uplineCache) {
        // console.log(Cache miss for upline ID: ${hierarchyUser.upline_id});
      console.log('user:', user);

        parent = await userService.getOrCreateUserByBidWithoutUpdate(
          hierarchyUser.upline_id,
        );
        //   await cacheService.setCacheUser({
        //     type: CACHE_TYPE.IMPORT_USER,
        //     user: hierarchyUser.upline_id,
        //     data: parent,
        //   });
        // } else {
        //   console.log(Cache hit for upline ID: ${hierarchyUser.upline_id});
        //   parent = uplineCache;
        // }
      }

      if (hierarchyUser.membership_upline_id) {
        // const membershipUplineCache = await cacheService.getCacheUser({
        //   type: CACHE_TYPE.IMPORT_USER,
        //   user: hierarchyUser.membership_upline_id,
        // });

        // if (!membershipUplineCache) {
        //   console.log(
        //     Cache miss for membership upline ID: ${hierarchyUser.membership_upline_id},
        //   );
        membershipParent = await userService.getOrCreateUserByBidWithoutUpdate(
          hierarchyUser.membership_upline_id,
        );
        //   await cacheService.setCacheUser({
        //     type: CACHE_TYPE.IMPORT_USER,
        //     user: hierarchyUser.membership_upline_id,
        //     data: membershipParent,
        //   });
        // } else {
        //   console.log(
        //     Cache hit for membership upline ID: ${hierarchyUser.membership_upline_id},
        //   );
        //   membershipParent = membershipUplineCache;
        // }
      }

      if (user) {
        const existingRecord = await userService.findActiveUserTreeByUserId(
          user._id,
        );
        if (existingRecord) {
          bulkUpdateActiveTreeUser.push({
            updateOne: {
              filter: { _id: existingRecord._id },
              update: {
                upline: parent ? new Types.ObjectId(parent._id) : null,
                membershipUpline: membershipParent
                  ? new Types.ObjectId(membershipParent._id)
                  : null,
                path: hierarchyUser.path,
                membershipPath: hierarchyUser.membership_path,
                membershipExpiry: hierarchyUser.membership_expiry || null,
                isMembership: hierarchyUser.is_membership ?? false,
                uplineMembershipExpiry:
                  hierarchyUser.membership_expiry_upline || null,
                isUplineMembership: hierarchyUser.is_membership_upline ?? false,
                depthLevel: hierarchyUser.depth_level,
              },
            },
          });
        } else {
          bulkInsertActiveUsers.push({
            user: new Types.ObjectId(user._id),
            upline: parent ? new Types.ObjectId(parent._id) : null,
            membershipUpline: membershipParent
              ? new Types.ObjectId(membershipParent._id)
              : null,
            path: hierarchyUser.path,
            membershipPath: hierarchyUser.membership_path,
            membershipExpiry: hierarchyUser.membership_expiry || null,
            isMembership: hierarchyUser.is_membership ?? false,
            uplineMembershipExpiry:
              hierarchyUser.membership_expiry_upline || null,
            isUplineMembership: hierarchyUser.is_membership_upline ?? false,
            depthLevel: hierarchyUser.depth_level,
          });
        }
        results.push(user._id);
      } else {
        // console.error(User not found for ID: ${hierarchyUser.id});
      }

      // bulkUpdates.push({
      //   updateOne: {
      //     filter: { _id: user._id },
      //     update: {
      //       uplineBID: hierarchyUser.upline_id || null,
      //       uplineId: parent ? parent._id : null,
      //     },
      //   },
      // });
    }

    // if (bulkUpdates.length > 0) {
    //   await userService.bulkUpdateUsers(bulkUpdates);
    // }
    if (bulkUpdateActiveTreeUser.length > 0) {
      await userService.bulkUpdateActiveTreeUser(bulkUpdateActiveTreeUser);
    }
    if (bulkInsertActiveUsers.length > 0) {
      await userService.createBulkActiveTreeUser(bulkInsertActiveUsers);
    }

    console.log('Chunk processing done');
    parentPort.postMessage({ status: 'done', result: results });
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

run();