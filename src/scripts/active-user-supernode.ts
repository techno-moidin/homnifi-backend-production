import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Model, Types } from 'mongoose';

import { User } from '../users/schemas/user.schema';
import moment from 'moment';
import { CloudKReward } from '../cloud-k/schemas/cloudk-reward.schema';
import { ActiveUserTree } from '../users/schemas/active-user-tree.schema';
import { UserRewards } from '../users/schemas/user-rewards';
import { SNBonusTransaction } from '../supernode/schemas/sn-bonus-transaction.schema';
import { SN_BONUS_TYPE } from '../supernode/enums/sn-bonus-type.enum';

const BATCH_SIZE = 2000; // Set batch size to process 100 users at a time

async function processUserRewards(
  userId: string,
  date: moment.Moment,
  RewardModel: Model<CloudKReward>,
  activeUserTree: Model<ActiveUserTree>,
  UserRewardModel: Model<UserRewards>,
  SuperNodeBonusModel: Model<SNBonusTransaction>, // Add SuperNodeBonusModel
  dateParam: string,
  // superNodeRewardData,
  superNodeRewardDataGroupByUser,
  groupedByUpline,
) {
  const endOfDay = date.clone().endOf('day');

  const userRewardData = superNodeRewardDataGroupByUser[userId] || [];

  // Pre-filter rewards by date and common conditions
  const startDate = date.clone().toDate();
  const endDate = date.clone().endOf('day').toDate();
  const filteredRewards = userRewardData.filter(
    (reward) =>
      reward.createdAt >= startDate &&
      reward.createdAt <= endDate &&
      reward.deletedAt === null &&
      reward.receivable === true,
  );

  const baseRefrewards = [];
  const builderGenrewards = [];
  let totaLRewards = 0;
  let totalBaseReferalRewards = 0;
  let totalBuilderGenrRewards = 0;

  // Categorize and calculate totals in a single loop
  filteredRewards.forEach((reward) => {
    totaLRewards += reward.tokenAmount;

    if (reward.type === SN_BONUS_TYPE.BASE_REFERRAL) {
      baseRefrewards.push(reward);
      totalBaseReferalRewards += reward.tokenAmount;
    }

    if (reward.type === SN_BONUS_TYPE.BUILDER_GENERATIONAl) {
      builderGenrewards.push(reward);
      totalBuilderGenrRewards += reward.tokenAmount;
    }
  });

  // Additional calculations (if needed)
  let totalFirstLineBuilderGenrRewards = 0; // Add logic if applicable
  let totalFirstLibeBaseReferralRewards = 0; // Add logic if applicable
  const totalFirstLibeBaseReferralUsers = 0; // Add logic if applicable
  const totalFirstLibeBuilderGenrUsers = 0;

  const firstLineUsers = groupedByUpline[userId] || [];

  // const firstLineUsers =   await activeUserTree
  //   .find({ upline: new Types.ObjectId(userId) })
  //   .select('_id user')
  //   .lean();

  // Calculate first-line rewards in a single loop
  const firstLineRewardsPromises = firstLineUsers.map(async (firstLineUser) => {
    const firstLineUserReward =
      superNodeRewardDataGroupByUser[firstLineUser.user.toString()] || [];

    // Initialize reward variables
    let firstLineBRRewards = 0;
    let firstLineBGRewards = 0;

    // Filter rewards based on date, deletedAt, receivable, and type
    const filteredRewards = firstLineUserReward.filter(
      (reward) =>
        reward.createdAt >= date.clone().toDate() &&
        reward.createdAt <= date.clone().endOf('day').toDate() &&
        reward.deletedAt == null &&
        reward.receivable == true,
    );

    // Calculate total rewards for both BASE_REFERRAL and BUILDER_GENERATIONAl types
    filteredRewards.forEach((reward) => {
      if (reward.type === SN_BONUS_TYPE.BASE_REFERRAL) {
        firstLineBRRewards += reward.tokenAmount;
      } else if (reward.type === SN_BONUS_TYPE.BUILDER_GENERATIONAl) {
        firstLineBGRewards += reward.tokenAmount;
      }
    });

    return { firstLineBRRewards, firstLineBGRewards };
  });

  // Execute all promises and aggregate results
  const firstLineRewards = await Promise.all(firstLineRewardsPromises);

  // Calculate total first-line rewards
  totalFirstLibeBaseReferralRewards = firstLineRewards.reduce(
    (acc, { firstLineBRRewards }) => acc + firstLineBRRewards,
    0,
  );
  totalFirstLineBuilderGenrRewards = firstLineRewards.reduce(
    (acc, { firstLineBGRewards }) => acc + firstLineBGRewards,
    0,
  );

  // Fetch rewards for the specific date from the `dep` collection
  // const rewards = await SuperNodeBonusModel.find({
  //   user: new Types.ObjectId(userId),
  //   deletedAt: null,
  //   receivable: true,
  //   createdAt: {
  //     $gte: date.clone().toDate(),
  //     $lte: date.clone().endOf('day').toDate(),
  //   },
  // }).lean();

  // filter all the data with created date and the user

  // const userObjectId = new Types.ObjectId(userId);
  // console.log(superNodeRewardDataGroupByUser);
  // const userRewardData = superNodeRewardDataGroupByUser[userId] || [];
  // let rewards = [];
  // if (userRewardData.length) {
  //   rewards = userRewardData.filter(
  //     (reward) =>
  //       reward.createdAt >= date.clone().toDate() &&
  //       reward.createdAt <= date.clone().endOf('day').toDate() &&
  //       reward.deletedAt == null &&
  //       reward.receivable == true,
  //     // reward.user.equals(userObjectId),
  //   );
  // }

  // const baseRefrewards = await SuperNodeBonusModel.find({
  //   user: new Types.ObjectId(userId),
  //   deletedAt: null,
  //   receivable: true,

  //   type: SN_BONUS_TYPE.BASE_REFERRAL,
  //   createdAt: { $gte: date.toDate(), $lte: endOfDay.toDate() },
  // }).lean();
  // let baseRefrewards = [];
  // if (userRewardData.length) {
  //   baseRefrewards = userRewardData.filter(
  //     (reward) =>
  //       reward.createdAt >= date.clone().toDate() &&
  //       reward.createdAt <= date.clone().endOf('day').toDate() &&
  //       reward.deletedAt == null &&
  //       reward.receivable == true &&
  //       reward.type == SN_BONUS_TYPE.BASE_REFERRAL,
  //     // reward.user.equals(userObjectId),
  //   );
  // }

  // const builderGenrewards = await SuperNodeBonusModel.find({
  //   user: new Types.ObjectId(userId),
  //   deletedAt: null,
  //   receivable: true,
  //   type: SN_BONUS_TYPE.BUILDER_GENERATIONAl,
  //   createdAt: { $gte: date.toDate(), $lte: endOfDay.toDate() },
  // }).lean();

  // let builderGenrewards = [];
  // if (userRewardData.length) {
  //   builderGenrewards = userRewardData.filter(
  //     (reward) =>
  //       reward.createdAt >= date.clone().toDate() &&
  //       reward.createdAt <= date.clone().endOf('day').toDate() &&
  //       reward.deletedAt == null &&
  //       reward.receivable == true &&
  //       reward.type == SN_BONUS_TYPE.BUILDER_GENERATIONAl,
  //     // reward.user.equals(userObjectId),
  //   );
  // }

  // let totaLRewards = 0;
  // let totalBaseReferalRewards = 0;
  // let totalBuilderGenrRewards = 0;
  // let totalFirstLineBuilderGenrRewards = 0;
  // let totalFirstLibeBaseReferralRewards = 0;
  // let totalFirstLibeBaseReferralUsers = 0;
  // let totalFirstLibeBuilderGenrUsers = 0;

  // // Calculate the total personal rewards for the user
  // rewards.forEach((reward) => {
  //   console.log(reward._id);
  //   totaLRewards += reward.tokenAmount;
  // });

  // baseRefrewards.forEach((reward) => {
  //   totalBaseReferalRewards += reward.tokenAmount;
  // });

  // builderGenrewards.forEach((reward) => {
  //   totalBuilderGenrRewards += reward.tokenAmount;
  // });

  // Get first-line users (direct referrals)
  // ----------------------------------------------
  // const firstLineUsers = await activeUserTree
  //   .find({ upline: new Types.ObjectId(userId) })
  //   .select('_id , user')
  //   .lean();

  // // Calculate first-line rewards
  // const firstLineBRRewardsPromises = firstLineUsers.map(
  //   async (firstLineUser) => {
  //     const firstLineUserReward =
  //       superNodeRewardDataGroupByUser[firstLineUser.user.toString()] || [];
  //     let firsstUserRewards = 0;
  //     const firslineBaseReferelReward = firstLineUserReward.filter(
  //       (reward) =>
  //         reward.createdAt >= date.clone().toDate() &&
  //         reward.createdAt <= date.clone().endOf('day').toDate() &&
  //         reward.deletedAt == null &&
  //         reward.receivable == true &&
  //         reward.type == SN_BONUS_TYPE.BASE_REFERRAL,
  //     );

  //     if (firslineBaseReferelReward.length) {
  //       firslineBaseReferelReward.forEach((rewardd) => {
  //         firsstUserRewards += rewardd.tokenAmount;
  //       });
  //     }

  //     return firsstUserRewards;
  //   },
  // );

  // const firstLineBRRewards = await Promise.all(firstLineBRRewardsPromises);
  // totalFirstLibeBaseReferralRewards = firstLineBRRewards.reduce(
  //   (acc, reward) => acc + reward,
  //   0,
  // );

  // const firstLineBGRewardsPromises = firstLineUsers.map(
  //   async (firstLineUser) => {
  //     const firstLineUserReward =
  //       superNodeRewardDataGroupByUser[firstLineUser.user.toString()] || [];
  //     let firsstUserRewards = 0;
  //     const firslineBaseReferelReward = firstLineUserReward.filter(
  //       (reward) =>
  //         reward.createdAt >= date.clone().toDate() &&
  //         reward.createdAt <= date.clone().endOf('day').toDate() &&
  //         reward.deletedAt == null &&
  //         reward.receivable == true &&
  //         reward.type == SN_BONUS_TYPE.BASE_REFERRAL,
  //     );

  //     if (firslineBaseReferelReward.length) {
  //       firslineBaseReferelReward.forEach((rewardd) => {
  //         firsstUserRewards += rewardd.tokenAmount;
  //       });
  //     }

  //     return firsstUserRewards;
  //   },
  // );

  // const firstLineBGRewards = await Promise.all(firstLineBGRewardsPromises);
  // totalFirstLineBuilderGenrRewards = firstLineBGRewards.reduce(
  //   (acc, reward) => acc + reward,
  //   0,
  // );

  // const firstLineBGRewardsPromises = firstLineUsers.map(
  //   async (firstLineUser) => {
  //     const firstLineUserId = firstLineUser.user.toString();
  //     const firstLineUserRewards = await SuperNodeBonusModel.aggregate([
  //       {
  //         $match: {
  //           user: new Types.ObjectId(userId),
  //           fromUser: new Types.ObjectId(firstLineUserId),
  //           type: SN_BONUS_TYPE.BUILDER_GENERATIONAl,
  //           receivable: true,

  //           createdAt: { $gte: date.toDate(), $lte: endOfDay.toDate() },
  //           deletedAt: null,
  //         },
  //       },
  //       {
  //         $group: {
  //           _id: '$fromUser',
  //           totalReward: { $sum: '$tokenAmount' },
  //         },
  //       },
  //     ]);
  //     return firstLineUserRewards[0] ? firstLineUserRewards[0].totalReward : 0;
  //   },
  // );

  // const firstLineBGRewards = await Promise.all(firstLineBGRewardsPromises);
  // totalFirstLineBuilderGenrRewards = firstLineBGRewards.reduce(
  //   (acc, reward) => acc + reward,
  //   0,
  // );

  // Calculate team rewards recursively for all downline users
  // async function calculateTeamRewards(userId: string) {
  //   const directChildren = await activeUserTree
  //     .find({ upline: new Types.ObjectId(userId) })
  //     .select('_id , user')
  //     .lean();
  //   const teamRewardsPromises = directChildren.map(async (child) => {
  //     const childId = child.user.toString();
  //     const childRewards = await SuperNodeBonusModel.aggregate([
  //       {
  //         $match: {
  //           user: new Types.ObjectId(childId),
  //           createdAt: { $gte: date.toDate(), $lte: endOfDay.toDate() },
  //         },
  //       },
  //       {
  //         $group: {
  //           _id: '$user',
  //           totalReward: { $sum: '$tokenAmount' },
  //         },
  //       },
  //     ]);

  //     let totalTeamRewards = 0;
  //     if (childRewards[0]) {
  //       totalTeamRewards += childRewards[0].totalReward;
  //     }

  //     // Recursively check for grandchildren (team rewards can go deeper)
  //     const childTeamRewards = await calculateTeamRewards(childId);
  //     totalTeamRewards += childTeamRewards;

  //     return totalTeamRewards;
  //   });

  //   // Wait for all team rewards to be processed
  //   const teamRewardsArray = await Promise.all(teamRewardsPromises);
  //   return teamRewardsArray.reduce((acc, reward) => acc + reward, 0);
  // }

  // Get the full team rewards (first line + deeper levels)
  // totalTeamRewards = await calculateTeamRewards(userId);

  // Check if user is a SuperNode and fetch SNBonus

  // Log the result for the current user
  console.log({
    user: new Types.ObjectId(userId),
    totaLRewards: totaLRewards,
    totalBaseReferralReward: totalBaseReferalRewards,
    totalBuilderGenReward: totalBuilderGenrRewards,
    firstLineBaseReferralRewards: totalFirstLibeBaseReferralRewards,
    firstLineBuilderGenRewards: totalFirstLineBuilderGenrRewards,
  });

  const isUser = await UserRewardModel.findOne({
    user: userId,
    createdAt: {
      $gte: date.clone().toDate(),
      $lt: date.clone().endOf('day').toDate(),
    },
    deletedAt: null,
  });
  console.log(isUser?._id || null);

  if (!isUser) {
    await UserRewardModel.create({
      totalRewards: totaLRewards,
      user: new Types.ObjectId(userId),
      totalBaseReferralReward: totalBaseReferalRewards,
      totalBuilderGenReward: totalBuilderGenrRewards,
      firstLineBaseReferralRewards: totalFirstLibeBaseReferralRewards,
      firstLineBuilderGenRewards: totalFirstLineBuilderGenrRewards,
      createdAt: new Date(
        date.startOf('day').toDate().getTime() + 4 * 60 * 60 * 1000,
      ), // because our timezone is gulf timezone
      note: 'Create through the script',
    });
  } else {
    // Optionally save or update rewards to UserRewards model
    await UserRewardModel.updateOne(
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
          totalBaseReferralReward: totalBaseReferalRewards,
          totalBuilderGenReward: totalBuilderGenrRewards,
          firstLineBaseReferralRewards: totalFirstLibeBaseReferralRewards,
          firstLineBuilderGenRewards: totalFirstLineBuilderGenrRewards,
          totalRewards: totaLRewards,
          note: 'update through the script -2',
        },
      },
      { upsert: true },
    );
  }
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

function groupByUpline(data) {
  return data.reduce((acc, item) => {
    if (!acc[item.upline]) {
      acc[item.upline] = [];
    }
    acc[item.upline].push(item);
    return acc;
  }, {});
}

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(AppModule);
  const RewardModel = appContext.get<Model<CloudKReward>>(
    CloudKReward.name + 'Model',
  );
  const UserRewardModel = appContext.get<Model<UserRewards>>(
    UserRewards.name + 'Model',
  );
  const SuperNodeBonusModel = appContext.get<Model<SNBonusTransaction>>(
    SNBonusTransaction.name + 'Model', // Assuming SuperNodeBonus schema exists
  );

  const activeUserTree = appContext.get<Model<ActiveUserTree>>(
    ActiveUserTree.name + 'Model',
  );

  const UserModel = appContext.get<Model<User>>('UserModel');

  const allUserTree = await activeUserTree.find();
  const groupedByUpline = groupByUpline(allUserTree);

  // fetch the all the supenode reward
  const superNodeRewardData = await SuperNodeBonusModel.find({
    deletedAt: null,
    receivable: true,
    createdAt: {
      $gte: new Date('2025-03-02T00:00:00.000Z'),
      $lt: new Date('2025-03-03T00:00:00.000Z'),
    },
  });

  const superNodeRewardDataGroupByUser = groupByUser(superNodeRewardData);

  const allDates = [
    {
      // count: 1139,
      rewardDate: '2025-03-02',
    },
  ];

  // const date = moment(dateParam).startOf('day');

  try {
    for (let index = 0; index < allDates.length; index++) {
      const eachDailyRewards = allDates[index];
      const dateParam = eachDailyRewards.rewardDate;
      const date = moment(dateParam).startOf('day');

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
            SuperNodeBonusModel, // Pass SuperNodeBonusModel
            dateParam,
            // superNodeRewardData,
            superNodeRewardDataGroupByUser,
            groupedByUpline,
          ),
        );
        await Promise.all(batchPromises); // Process all users in the batch concurrently
      }
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
