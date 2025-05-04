import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Model, Types } from 'mongoose';

import { User } from '../users/schemas/user.schema';
import moment from 'moment';
import { CloudKReward } from '../cloud-k/schemas/cloudk-reward.schema';
import { ActiveUserTree } from '../users/schemas/active-user-tree.schema';
import { UserRewards } from '../users/schemas/user-rewards';

const BATCH_SIZE = 50000; // Number of users processed per batch
const CONCURRENT_BATCHES = 10000; // Number of batches processed concurrently

function groupByUpline(data) {
  return data.reduce((acc, item) => {
    if (!acc[item.upline]) {
      acc[item.upline] = [];
    }
    acc[item.upline].push(item);
    return acc;
  }, {});
}

function groupByUser(data) {
  return data.reduce((acc, item) => {
    if (!acc[item.user]) {
      acc[item.user] = [];
    }
    acc[item.user].push(item);
    return acc;
  }, {});
}

// Function to filter rewards for a specific user and date range
const getRewardsForUserAndDate = (rewardsList, userId, date) => {
  const alltheRewards = rewardsList[userId] || [];

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
  RewardModel: Model<CloudKReward>,
  activeUserTree: Model<ActiveUserTree>,
  UserRewardModel: Model<UserRewards>,
  dateParam: string,
  groupedByUpline: any,
  allRewards,
  rewardListByID,
) {
  const endOfDay = date.clone().endOf('day');

  const rewards = getRewardsForUserAndDate(rewardListByID, userId, date);

  let totalPersonalRewards = 0;
  let totalFirstLineRewards = 0;
  let totalTeamRewards = 0;

  rewards.forEach((reward) => {
    totalPersonalRewards += reward.tokenAmount;
  });

  const firstLineUsers = groupedByUpline[userId] || [];

  totalFirstLineRewards = (
    await Promise.all(
      firstLineUsers.map(async (firstLineUser) => {
        const userRewards = rewardListByID[firstLineUser.user] || [];
        // Example filter and sum calculation for a specific childId and date range
        const firstLineUserRewards =
          userRewards.filter(
            (reward) =>
              reward.createdAt >= date.clone().toDate() &&
              reward.createdAt <= date.clone().endOf('day').toDate(),
          ) || [];

        // Calculate total reward for this user
        const totalReward = firstLineUserRewards.reduce(
          (sum, reward) => sum + reward.tokenAmount,
          0,
        );
        return totalReward; // Return the total reward for this user
      }),
    )
  ).reduce((sum, reward) => sum + reward, 0); // Sum all rewards to get the total

  console.log(totalFirstLineRewards);

  async function calculateTeamRewards(userId: string) {
    const directChildren = groupedByUpline[userId] || [];

    const teamRewardsPromises = directChildren.map(async (child) => {
      const childId = child.user.toString();

      const children = rewardListByID[String(childId)] || [];

      // Example filter and sum calculation for a specific childId and date range
      const filteredRewards = children.filter(
        (reward) =>
          reward.createdAt >= date.clone().toDate() &&
          reward.createdAt <= date.clone().endOf('day').toDate(),
      );

      // const filteredRewards = allRewards.filter(
      //   (reward) =>
      //     reward.user.equals(new Types.ObjectId(childId)) &&
      //     reward.createdAt >= date.clone().toDate() &&
      //     reward.createdAt <= date.clone().endOf('day').toDate()
      // );

      // Calculate the total reward for the filtered data
      const totalReward = filteredRewards.reduce(
        (sum, reward) => sum + reward.tokenAmount,
        0,
      );

      // Prepare the result to match the aggregation pipeline output format
      const childRewards = [
        {
          _id: childId,
          totalReward,
        },
      ];

      let totalTeamRewards = 0;
      if (childRewards[0]) {
        totalTeamRewards += childRewards[0].totalReward || 0;
      }

      const childTeamRewards = await calculateTeamRewards(childId);
      totalTeamRewards += childTeamRewards;

      return totalTeamRewards;
    });

    const teamRewardsArray = await Promise.all(teamRewardsPromises);
    return teamRewardsArray.reduce((acc, reward) => acc + reward, 0);
  }

  totalTeamRewards = await calculateTeamRewards(userId);

  const userRewardModel = await UserRewardModel.create({
    myProduction: totalPersonalRewards,
    firstLineProduction: totalFirstLineRewards,
    teamProduction: totalTeamRewards,
    createdAt: new Date(
      date.startOf('day').toDate().getTime() + 4 * 60 * 60 * 1000,
    ),
    user: new Types.ObjectId(userId),
  });

  // console.log(`reward created ${userId}`);
}

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(AppModule);
  const RewardModel = appContext.get<Model<CloudKReward>>(
    CloudKReward.name + 'Model',
  );
  const UserRewardModel = appContext.get<Model<UserRewards>>(
    UserRewards.name + 'Model',
  );
  const activeUserTree = appContext.get<Model<ActiveUserTree>>(
    ActiveUserTree.name + 'Model',
  );

  console.log('fetcing reward ');
  const allRewards = await RewardModel.find({
    deletedAt: null,
    createdAt: {
      $gte: new Date('2025-03-02T00:00:00.000Z'),
      $lt: new Date('2025-03-03T00:00:00.000Z'),
    },
  });

  const rewardListByID = groupByUser(allRewards);
  console.log('end reward ');

  console.log('fetcing active user list');

  const list_of_active_tree = await activeUserTree.find();

  console.log('active user tree done', list_of_active_tree.length);

  const groupedByUpline = groupByUpline(list_of_active_tree);
  console.log('groupedByUpline done');

  const allDates = [
    {
      // count: 1139,
      rewardDate: '2025-03-02',
    },
  ];
  try {
    for (let index = 0; index < allDates.length; index++) {
      const eachDailyRewards = allDates[index];
      const dateParam = eachDailyRewards.rewardDate;
      const date = moment(dateParam).startOf('day');
      console.log(dateParam, date);

      console.log('distinct start');
      const rewardedUsers = await RewardModel.distinct('user', {
        createdAt: {
          $gte: date.clone().toDate(),
          $lte: date.clone().endOf('day').toDate(),
        },
      });
      console.log('distinct start');

      const totalRewardedUsers = rewardedUsers.length;
      console.log(`Total rewarded users: ${totalRewardedUsers}`);

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
            RewardModel,
            activeUserTree,
            UserRewardModel,
            dateParam,
            groupedByUpline,
            allRewards,
            rewardListByID,
          ),
        );
        await Promise.allSettled(batchPromises);
      };

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
