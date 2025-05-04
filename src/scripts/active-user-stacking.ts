import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import mongoose, { Model, Types } from 'mongoose';

import { User } from '../users/schemas/user.schema';
import moment from 'moment';
// import { CloudKReward } from '../cloud-k/schemas/cloudk-reward.schema';
// import { ActiveUserTree } from '../users/schemas/active-user-tree.schema';
import { UserRewards } from '../users/schemas/user-rewards';
import { CloudKMachineStake } from '../cloud-k/schemas/cloudk-machine-stakes.schema';
import { ObjectId } from 'typeorm';
import { UserTeamMachineStakes } from '../supernode/schemas/user-team-machine-stacks.schema';
import { UsersModule } from '../users/users.module';
import { Type } from 'class-transformer';

const BATCH_SIZE = 50000; // Number of users processed per batch
const CONCURRENT_BATCHES = 10000; // Number of batches processed concurrentls

function groupByUpline(data) {
  return data.reduce((acc, item) => {
    if (!acc[item.uplineId]) {
      acc[item.uplineId] = [];
    }
    acc[item.uplineId].push(item);
    return acc;
  }, {});
}
// Groups machine staking records by userId.
function groupByUser(data) {
  return data.reduce((acc, item) => {
    if (!acc[item.user]) {
      acc[item.user] = [];
    }
    acc[item.user].push(item);
    return acc;
  }, {});
}

// Retrieves machine staking records for a specific user on a given date.
const getMachineStackForUserAndDate = async (rewardsList, userId, date) => {
  const alltheRewards = (await rewardsList[userId]) || [];

  // Filter rewards for the specific date range
  const filteredFirstLineUsers = alltheRewards.filter(
    (reward) =>
      reward.createdAt >= date.clone().toDate() &&
      reward.createdAt <= date.clone().endOf('day').toDate(),
  );
  return filteredFirstLineUsers;
};

async function processUserRewards(
  userId: string,
  date: moment.Moment,
  RewardModel: Model<CloudKMachineStake>,
  userTree: Model<User>,
  UserRewardModel: Model<UserRewards>,
  UserTeamMachineModel: Model<UserTeamMachineStakes>,
  dateParam: string,
  groupedByUpline: any,
  allRewards,
  rewardListByID,
) {
  const endOfDay = date.clone().endOf('day');

  const machineStack = await getMachineStackForUserAndDate(
    rewardListByID,
    userId,
    date,
  );

  console.log('machineStack length', machineStack.length, userId);

  // Additional variables for MachineStack
  let totalPersonalMachineStack = 0;
  let totalFirstLineMachineStack = 0;
  let totalTeamMachineStack = 0;

  // console.log('machineStack Total Records', machineStack.length);

  machineStack.forEach((stack) => {
    totalPersonalMachineStack += stack.tokenAmount;
  });

  try {
    const firstLineUsers = groupedByUpline[userId] || [];
    console.log('firstLineUsers >>', firstLineUsers);

    totalFirstLineMachineStack = (
      await Promise.all(
        firstLineUsers.map(async (firstLineUser) => {
          try {
            if (!firstLineUser?._id) {
              console.warn(`Skipping invalid first-line user:`, firstLineUser);
              return 0;
            }
            const userRewards = rewardListByID[firstLineUser._id] || [];
            console.log('userRewards >>', userRewards.length);
            const firstLineUserRewards = userRewards.filter((reward) => {
              if (!reward.createdAt) {
                console.warn(`Skipping reward with invalid createdAt`, reward);
                return false;
              }

              return (
                new Date(reward.createdAt) >= date.clone().toDate() &&
                new Date(reward.createdAt) <= date.clone().endOf('day').toDate()
              );
            });

            const totalReward = firstLineUserRewards.reduce(
              (sum, reward) => sum + (reward.tokenAmount || 0),
              0,
            );

            console.log('totalReward for user', firstLineUser._id, totalReward);

            return totalReward;
          } catch (err) {
            console.error(
              `Error processing firstLineUser ${firstLineUser?._id}:`,
              err,
            );
            return 0;
          }
        }),
      )
    ).reduce((sum, reward) => sum + reward, 0);

    console.log('totalFirstLineMachineStack ###', totalFirstLineMachineStack);
  } catch (error) {
    console.error(`Error in processing first-line machine stack:`, error);
  }

  async function calculateTeamRewards(userId: string) {
    const directChildren = groupedByUpline[userId] || [];

    let totalTeamRewards = 0;

    if (directChildren.length === 0) {
      console.log(`User ${userId} has no children, returning 0.`);
    }

    for (const child of directChildren) {
      try {
        const childId = child._id.toString();
        const childrenRewards = rewardListByID[childId] || [];

        // Filter rewards for the given date range
        const filteredRewards = childrenRewards.filter((reward) => {
          return (
            reward.createdAt >= date.clone().toDate() &&
            reward.createdAt <= date.clone().endOf('day').toDate()
          );
        });

        // Sum the rewards for the direct child
        const totalReward = filteredRewards.reduce(
          (sum, reward) => sum + reward.tokenAmount,
          0,
        );

        console.log(`Total direct rewards for ${childId}:`, totalReward);
        totalTeamRewards += totalReward;

        // Recursively calculate team rewards
        const childTeamRewards = await calculateTeamRewards(childId);
        totalTeamRewards += childTeamRewards;
      } catch (error) {
        console.error(
          `Error while processing child ${child?.user?.toString() || 'Unknown'}:`,
          error,
        );
      }
    }

    return totalTeamRewards;
  }

  totalTeamMachineStack = await calculateTeamRewards(userId);

  const isUser = await UserTeamMachineModel.findOne({
    user: userId,
    createdAt: {
      $gte: date.clone().toDate(),
      $lt: date.clone().endOf('day').toDate(),
    },
    deletedAt: null,
  });
  console.log(isUser?._id || null);
  // console.log(isUser?. || null);
  const vUserData = await userTree.findById(userId);
  const vBlockChainId = vUserData?.blockchainId;

  console.log('*** vUserData ***', vUserData);
  console.log('userId', userId);
  console.log('vBlockChainId', vBlockChainId);

  const vgteDate = date.clone().toDate();
  const vltDate = date.clone().endOf('day').toDate();
  console.log(`vgteDate: ${vgteDate}, vltDate: ${vltDate}`);

  if (!isUser) {
    console.log('create record');
    await UserTeamMachineModel.create({
      user: new Types.ObjectId(userId),
      bid: vBlockChainId,
      totalTeamMachineStack: totalTeamMachineStack,
      totalFirstLineMachineStack: totalFirstLineMachineStack,
      totalPersonalMachineStack: totalPersonalMachineStack,

      createdAt: new Date(
        date.startOf('day').toDate().getTime() + 4 * 60 * 60 * 1000,
      ), // because our timezone is gulf timezone
      note: 'Created through the script',
    });
  } else {
    // Optionally save or update rewards to UserRewards model
    console.log('update record');
    console.log('userId', userId);
    console.log('vBlockChainId', vBlockChainId);
    await UserTeamMachineModel.updateOne(
      {
        user: new Types.ObjectId(userId),
        createdAt: {
          $gte: date.clone().toDate(),
          $lt: date.clone().endOf('day').toDate(),
        },
        deletedAt: null,
      },
      {
        $set: {
          user: new Types.ObjectId(userId),
          bid: vBlockChainId,
          totalTeamMachineStack: totalTeamMachineStack,
          totalFirstLineMachineStack: totalFirstLineMachineStack,
          totalPersonalMachineStack: totalPersonalMachineStack,
          note: 'updated through the script ',
        },
      },
      { upsert: true },
    );
  }
}

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(AppModule);

  mongoose.set('debug', true);

  const MachineStackModel = appContext.get<Model<CloudKMachineStake>>(
    CloudKMachineStake.name + 'Model',
  );
  const UserRewardModel = appContext.get<Model<UserRewards>>(
    UserRewards.name + 'Model',
  );
  const UserTeamMachineModel = appContext.get<Model<UserTeamMachineStakes>>(
    UserTeamMachineStakes.name + 'Model',
  );
  const userTree = appContext.get<Model<User>>(User.name + 'Model');

  console.log('fetching machine stack ');
  const allMachineStack = await MachineStackModel.find({
    deletedAt: null,
    createdAt: {
      $gte: new Date('2024-07-21T00:00:00.000Z'),
      $lt: new Date('2025-02-01T00:00:00.000Z'),
    },
  });

  const rewardListByID = await groupByUser(allMachineStack);
  console.log('end reward ');

  console.log('fetching active user list');

  const list_of_active_tree = await userTree.find({});

  console.log('active user tree done', list_of_active_tree.length);

  const groupedByUpline = await groupByUpline(list_of_active_tree);
  console.log('groupedByUpline done', groupedByUpline.length);

  const allDates = [
    { rewardDate: '2024-07-21' },
    { rewardDate: '2024-07-22' },
    { rewardDate: '2024-07-23' },
    { rewardDate: '2024-07-24' },
    { rewardDate: '2024-07-25' },
    { rewardDate: '2024-07-26' },
    { rewardDate: '2024-07-27' },
    { rewardDate: '2024-07-28' },
    { rewardDate: '2024-07-29' },
    { rewardDate: '2024-07-30' },
    { rewardDate: '2024-07-31' },
    { rewardDate: '2024-08-01' },
    { rewardDate: '2024-08-02' },
    { rewardDate: '2024-08-03' },
    { rewardDate: '2024-08-04' },
    { rewardDate: '2024-08-05' },
    { rewardDate: '2024-08-06' },
    { rewardDate: '2024-08-07' },
    { rewardDate: '2024-08-08' },
    { rewardDate: '2024-08-09' },
    { rewardDate: '2024-08-10' },
    { rewardDate: '2024-08-11' },
    { rewardDate: '2024-08-12' },
    { rewardDate: '2024-08-13' },
    { rewardDate: '2024-08-14' },
    { rewardDate: '2024-08-15' },
    { rewardDate: '2024-08-16' },
    { rewardDate: '2024-08-17' },
    { rewardDate: '2024-08-18' },
    { rewardDate: '2024-08-19' },
    { rewardDate: '2024-08-20' },
    { rewardDate: '2024-08-21' },
    { rewardDate: '2024-08-22' },
    { rewardDate: '2024-08-23' },
    { rewardDate: '2024-08-24' },
    { rewardDate: '2024-08-25' },
    { rewardDate: '2024-08-26' },
    { rewardDate: '2024-08-27' },
    { rewardDate: '2024-08-28' },
    { rewardDate: '2024-08-29' },
    { rewardDate: '2024-08-30' },
    { rewardDate: '2024-08-31' },
    { rewardDate: '2024-09-01' },
    { rewardDate: '2024-09-02' },
    { rewardDate: '2024-09-03' },
    { rewardDate: '2024-09-04' },
    { rewardDate: '2024-09-05' },
    { rewardDate: '2024-09-06' },
    { rewardDate: '2024-09-07' },
    { rewardDate: '2024-09-08' },
    { rewardDate: '2024-09-09' },
    { rewardDate: '2024-09-10' },
    { rewardDate: '2024-09-11' },
    { rewardDate: '2024-09-12' },
    { rewardDate: '2024-09-13' },
    { rewardDate: '2024-09-14' },
    { rewardDate: '2024-09-15' },
    { rewardDate: '2024-09-16' },
    { rewardDate: '2024-09-17' },
    { rewardDate: '2024-09-18' },
    { rewardDate: '2024-09-19' },
    { rewardDate: '2024-09-20' },
    { rewardDate: '2024-09-21' },
    { rewardDate: '2024-09-22' },
    { rewardDate: '2024-09-23' },
    { rewardDate: '2024-09-24' },
    { rewardDate: '2024-09-25' },
    { rewardDate: '2024-09-26' },
    { rewardDate: '2024-09-27' },
    { rewardDate: '2024-09-28' },
    { rewardDate: '2024-09-29' },
    { rewardDate: '2024-09-30' },
    { rewardDate: '2024-10-01' },
    { rewardDate: '2024-10-02' },
    { rewardDate: '2024-10-03' },
    { rewardDate: '2024-10-04' },
    { rewardDate: '2024-10-05' },
    { rewardDate: '2024-10-06' },
    { rewardDate: '2024-10-07' },
    { rewardDate: '2024-10-08' },
    { rewardDate: '2024-10-09' },
    { rewardDate: '2024-10-10' },
    { rewardDate: '2024-10-11' },
    { rewardDate: '2024-10-12' },
    { rewardDate: '2024-10-13' },
    { rewardDate: '2024-10-14' },
    { rewardDate: '2024-10-15' },
    { rewardDate: '2024-10-16' },
    { rewardDate: '2024-10-17' },
    { rewardDate: '2024-10-18' },
    { rewardDate: '2024-10-19' },
    { rewardDate: '2024-10-20' },
    { rewardDate: '2024-10-21' },
    { rewardDate: '2024-10-22' },
    { rewardDate: '2024-10-23' },
    { rewardDate: '2024-10-24' },
    { rewardDate: '2024-10-25' },
    { rewardDate: '2024-10-26' },
    { rewardDate: '2024-10-27' },
    { rewardDate: '2024-10-28' },
    { rewardDate: '2024-10-29' },
    { rewardDate: '2024-10-30' },
    { rewardDate: '2024-10-31' },
    { rewardDate: '2024-11-01' },
    { rewardDate: '2024-11-02' },
    { rewardDate: '2024-11-03' },
    { rewardDate: '2024-11-04' },
    { rewardDate: '2024-11-05' },
    { rewardDate: '2024-11-06' },
    { rewardDate: '2024-11-07' },
    { rewardDate: '2024-11-08' },
    { rewardDate: '2024-11-09' },
    { rewardDate: '2024-11-10' },
    { rewardDate: '2024-11-11' },
    { rewardDate: '2024-11-12' },
    { rewardDate: '2024-11-13' },
    { rewardDate: '2024-11-14' },
    { rewardDate: '2024-11-15' },
    { rewardDate: '2024-11-16' },
    { rewardDate: '2024-11-17' },
    { rewardDate: '2024-11-18' },
    { rewardDate: '2024-11-19' },
    { rewardDate: '2024-11-20' },
    { rewardDate: '2024-11-21' },
    { rewardDate: '2024-11-22' },
    { rewardDate: '2024-11-23' },
    { rewardDate: '2024-11-24' },
    { rewardDate: '2024-11-25' },
    { rewardDate: '2024-11-26' },
    { rewardDate: '2024-11-27' },
    { rewardDate: '2024-11-28' },
    { rewardDate: '2024-11-29' },
    { rewardDate: '2024-11-30' },
    { rewardDate: '2024-12-01' },
    { rewardDate: '2024-12-02' },
    { rewardDate: '2024-12-03' },
    { rewardDate: '2024-12-04' },
    { rewardDate: '2024-12-05' },
    { rewardDate: '2024-12-06' },
    { rewardDate: '2024-12-07' },
    { rewardDate: '2024-12-08' },
    { rewardDate: '2024-12-09' },
    { rewardDate: '2024-12-10' },
    { rewardDate: '2024-12-11' },
    { rewardDate: '2024-12-12' },
    { rewardDate: '2024-12-13' },
    { rewardDate: '2024-12-14' },
    { rewardDate: '2024-12-15' },
    { rewardDate: '2024-12-16' },
    { rewardDate: '2024-12-17' },
    { rewardDate: '2024-12-18' },
    { rewardDate: '2024-12-19' },
    { rewardDate: '2024-12-20' },
    { rewardDate: '2024-12-21' },
    { rewardDate: '2024-12-22' },
    { rewardDate: '2024-12-23' },
    { rewardDate: '2024-12-24' },
    { rewardDate: '2024-12-25' },
    { rewardDate: '2024-12-26' },
    { rewardDate: '2024-12-27' },
    { rewardDate: '2024-12-28' },
    { rewardDate: '2024-12-29' },
    { rewardDate: '2024-12-30' },
    { rewardDate: '2024-12-31' },
    { rewardDate: '2025-01-01' },
    { rewardDate: '2025-01-02' },
    { rewardDate: '2025-01-03' },
    { rewardDate: '2025-01-04' },
    { rewardDate: '2025-01-05' },
    { rewardDate: '2025-01-06' },
    { rewardDate: '2025-01-07' },
    { rewardDate: '2025-01-08' },
    { rewardDate: '2025-01-09' },
    { rewardDate: '2025-01-10' },
    { rewardDate: '2025-01-11' },
    { rewardDate: '2025-01-12' },
    { rewardDate: '2025-01-13' },
    { rewardDate: '2025-01-14' },
    { rewardDate: '2025-01-15' },
    { rewardDate: '2025-01-16' },
    { rewardDate: '2025-01-17' },
    { rewardDate: '2025-01-18' },
    { rewardDate: '2025-01-19' },
    { rewardDate: '2025-01-20' },
    { rewardDate: '2025-01-21' },
    { rewardDate: '2025-01-22' },
    { rewardDate: '2025-01-23' },
    { rewardDate: '2025-01-24' },
    { rewardDate: '2025-01-25' },
    { rewardDate: '2025-01-26' },
    { rewardDate: '2025-01-27' },
    { rewardDate: '2025-01-28' },
    { rewardDate: '2025-01-29' },
    { rewardDate: '2025-01-30' },
    { rewardDate: '2025-01-31' },
    { rewardDate: '2025-02-01' },
    { rewardDate: '2025-02-02' },
    { rewardDate: '2025-02-03' },
    { rewardDate: '2025-02-04' },
    { rewardDate: '2025-02-05' },
    { rewardDate: '2025-02-06' },
    { rewardDate: '2025-02-07' },
    { rewardDate: '2025-02-08' },
    { rewardDate: '2025-02-09' },
    { rewardDate: '2025-02-10' },
    { rewardDate: '2025-02-11' },
    { rewardDate: '2025-02-12' },
    { rewardDate: '2025-02-13' },
    { rewardDate: '2025-02-14' },
    { rewardDate: '2025-02-15' },
    { rewardDate: '2025-02-16' },
    { rewardDate: '2025-02-17' },
    { rewardDate: '2025-02-18' },
    { rewardDate: '2025-02-19' },
    { rewardDate: '2025-02-20' },
    { rewardDate: '2025-02-21' },
    { rewardDate: '2025-02-22' },
    { rewardDate: '2025-02-23' },
    { rewardDate: '2025-02-24' },
  ];
  try {
    for (let index = 0; index < allDates.length; index++) {
      const eachDailyMachineStack = allDates[index];
      const dateParam = eachDailyMachineStack.rewardDate;
      const date = moment(dateParam).startOf('day');
      console.log(dateParam, date);

      console.log('distinct start');
      const rewardedUsers = await MachineStackModel.distinct('user', {
        createdAt: {
          $gte: date.clone().toDate(),
          $lte: date.clone().endOf('day').toDate(),
        },
      });
      console.log('distinct start');
      // break;
      const totalRewardedUsers = rewardedUsers.length;
      console.log(`Total stacked by user: ${totalRewardedUsers}`);

      const userBatches = [];
      for (let i = 0; i < totalRewardedUsers; i += BATCH_SIZE) {
        userBatches.push(rewardedUsers.slice(i, i + BATCH_SIZE));
      }

      console.log(`Total batches: ${userBatches.length}`);

      const processBatch = async (batch, batchIndex) => {
        console.log(`Processing batch ${batchIndex + 1}...`);
        const batchPromises = batch.map((userId) =>
          processUserRewards(
            userId,
            date,
            MachineStackModel,
            userTree,
            UserRewardModel,
            UserTeamMachineModel,
            dateParam,
            groupedByUpline,
            allMachineStack,
            rewardListByID,
          ),
        );
        await Promise.allSettled(batchPromises);
      };

      // break;
      const batchExecutionPromises = userBatches.map((batch, index) =>
        processBatch(batch, index),
      );

      // Process batches in parallel with limited concurrency
      const runBatches = async () => {
        for (let i = 0; i < userBatches.length; i += CONCURRENT_BATCHES) {
          const concurrentBatches = batchExecutionPromises.slice(
            i,
            i + CONCURRENT_BATCHES,
          );
          await Promise.all(concurrentBatches);
        }
      };

      await runBatches();
      console.log(`${date} rewards processed successfully`);
    }

    console.log('All rewards processed successfully');
  } catch (error) {
    console.error('An error occurred:', error);
  } finally {
    await appContext.close();
  }
}

bootstrap().catch((err) => {
  console.error('Bootstrap error:', err);
  process.exit(1);
});
