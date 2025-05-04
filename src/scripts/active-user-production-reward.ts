import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Model, Types } from 'mongoose';

import { User } from '../users/schemas/user.schema';
import moment from 'moment';
import { UserRewards } from '../users/schemas/user-rewards';
import { CloudKReward } from '../cloud-k/schemas/cloudk-reward.schema';
import { ActiveUserTree } from '../users/schemas/active-user-tree.schema';

const BATCH_SIZE = 200; // Set batch size to process 100 users at a time

async function processUserRewards(
  userId: string,
  date: moment.Moment,
  RewardModel: Model<CloudKReward>,
  activeUserTree: Model<ActiveUserTree>,
  UserRewardModel: Model<UserRewards>,
  dateParam: string,
) {
  const endOfDay = date.clone().endOf('day');

  // Fetch rewards for the specific date from the `cloudkRewards` collection
  const rewards = await RewardModel.find({
    user: new Types.ObjectId(userId),
    createdAt: { $gte: date.toDate(), $lte: endOfDay.toDate() },
  }).lean();

  let totalPersonalRewards = 0;
  let totalFirstLineRewards = 0;
  let totalTeamRewards = 0;

  // Calculate the total personal rewards for the user
  rewards.forEach((reward) => {
    totalPersonalRewards += reward.tokenAmount;
  });

  // Get first-line users (direct referrals)
  const firstLineUsers = await activeUserTree
    .find({ upline: new Types.ObjectId(userId) })
    .select('_id , user')
    .lean();

  // Calculate first-line rewards
  const firstLineRewardsPromises = firstLineUsers.map(async (firstLineUser) => {
    const firstLineUserId = firstLineUser.user.toString();
    const firstLineUserRewards = await RewardModel.aggregate([
      {
        $match: {
          user: new Types.ObjectId(firstLineUserId),
          createdAt: { $gte: date.toDate(), $lte: endOfDay.toDate() },
        },
      },
      {
        $group: {
          _id: '$user',
          totalReward: { $sum: '$tokenAmount' },
        },
      },
    ]);
    return firstLineUserRewards[0] ? firstLineUserRewards[0].totalReward : 0;
  });

  const firstLineRewards = await Promise.all(firstLineRewardsPromises);
  totalFirstLineRewards = firstLineRewards.reduce(
    (acc, reward) => acc + reward,
    0,
  );

  // Calculate team rewards recursively for all downline users
  async function calculateTeamRewards(userId: string) {
    const directChildren = await activeUserTree
      .find({ upline: new Types.ObjectId(userId) })
      .select('_id , user')
      .lean();
    const teamRewardsPromises = directChildren.map(async (child) => {
      const childId = child.user.toString();
      const childRewards = await RewardModel.aggregate([
        {
          $match: {
            user: new Types.ObjectId(childId),
            createdAt: { $gte: date.toDate(), $lte: endOfDay.toDate() },
          },
        },
        {
          $group: {
            _id: '$user',
            totalReward: { $sum: '$tokenAmount' },
          },
        },
      ]);

      let totalTeamRewards = 0;
      if (childRewards[0]) {
        totalTeamRewards += childRewards[0].totalReward;
      }

      // Recursively check for grandchildren (team rewards can go deeper)
      const childTeamRewards = await calculateTeamRewards(childId);
      totalTeamRewards += childTeamRewards;

      return totalTeamRewards;
    });

    // Wait for all team rewards to be processed
    const teamRewardsArray = await Promise.all(teamRewardsPromises);
    return teamRewardsArray.reduce((acc, reward) => acc + reward, 0);
  }

  // Get the full team rewards (first line + deeper levels)
  totalTeamRewards = await calculateTeamRewards(userId);

  // Log the result for the current user
  console.log({
    userId,
    myRewards: totalPersonalRewards,
    myFirstLineRewards: totalFirstLineRewards,
    myTeamRewards: totalTeamRewards,
    createdAt: date.toDate(),
  });

  const isUser = await UserRewardModel.findOne({ user: userId });

  if (isUser) {
    await UserRewardModel.create({
      myProduction: totalPersonalRewards,
      firstLineProduction: totalFirstLineRewards,
      teamProduction: totalTeamRewards,
      createdAt: date.toDate(),
    });
  } else {
    // Optionally save or update rewards to UserRewards model
    await UserRewardModel.updateOne(
      { user: new Types.ObjectId(userId), createdAt: date.toDate() },
      {
        $set: {
          myProduction: totalPersonalRewards,
          firstLineProduction: totalFirstLineRewards,
          teamProduction: totalTeamRewards,
        },
      },
      { upsert: true },
    );
  }
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

  const UserModel = appContext.get<Model<User>>('UserModel');

  const dateParam = '2024-12-02'; // Replace with desired date
  const date = moment(dateParam).startOf('day');

  try {
    // Fetch users who have rewards on the specified date range
    const rewardedUsers = await RewardModel.distinct('user', {
      createdAt: {
        $gte: date.toDate(),
        $lte: date.clone().endOf('day').toDate(),
      },
    });

    const totalRewardedUsers = rewardedUsers.length;
    console.log(`Total rewarded users: ${totalRewardedUsers}`);

    // Process rewards in batches
    const userBatches = [];
    for (let i = 0; i < totalRewardedUsers; i += BATCH_SIZE) {
      userBatches.push(rewardedUsers.slice(i, i + BATCH_SIZE));
    }

    const totalBatches = userBatches.length;
    console.log(`Total batches: ${totalBatches}`);

    // Process each batch in parallel
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const batch = userBatches[batchIndex];
      console.log(
        `Processing batch ${batchIndex + 1} of ${totalBatches} with ${batch.length} users...`,
      );

      const batchPromises = batch.map((userId) =>
        processUserRewards(
          userId,
          date,
          RewardModel,
          activeUserTree,
          UserRewardModel,
          dateParam,
        ),
      );
      await Promise.all(batchPromises); // Process all users in the batch concurrently
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
