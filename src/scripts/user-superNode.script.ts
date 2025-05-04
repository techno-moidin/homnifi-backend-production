import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Model, Types } from 'mongoose';
import { CloudKReward } from '../cloud-k/schemas/cloudk-reward.schema';
import { CloudKRewardService } from '../cloud-k/cloudk-reward.service';
import { SNBonusTransaction } from '../supernode/schemas/sn-bonus-transaction.schema';
import { SupernodeService } from '../supernode/supernode.service';

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(AppModule);

  interface DateRewardData {
    tokenAmount: number;
  }

  // Retrieve models and services
  const CloudKRewards = appContext.get<Model<CloudKReward>>(
    CloudKReward.name + 'Model',
  );

  const sNBonusTransaction = appContext.get<Model<SNBonusTransaction>>(
    SNBonusTransaction.name + 'Model',
  );

  const cloudKRewardService = appContext.get(CloudKRewardService);
  const superNoderService = appContext.get(SupernodeService);

  /**
   * Helper function to split an array into chunks of a specified size
   */
  function chunkArray<T>(array: T[], size: number): T[][] {
    const result = [];
    for (let i = 0; i < array.length; i += size) {
      result.push(array.slice(i, i + size));
    }
    return result;
  }

  /**
   * Aggregates rewards data by user and date
   */
  const aggregateRewards = (rewards: SNBonusTransaction[]): any => {
    return rewards.reduce((acc, reward: any) => {
      console.log('object :>> ', reward);
      const dateKey = new Date(reward.createdAt).toISOString().split('T')[0]; // Group by date (YYYY-MM-DD)
      const userKey = reward.user.toString();

      if (!acc[userKey]) {
        acc[userKey] = {};
      }

      if (!acc[userKey][dateKey]) {
        acc[userKey][dateKey] = {
          tokenAmount: 0,
          level: reward.rewardData.currentLevel,
        };
      }

      return acc;
    }, {} as any);
  };

  /**
   * Migration logic with parallel processing
   */
  console.log('Starting migration...');
  const batchSize = 10000;
  let skip = 0;
  let hasMoreData = true;

  while (hasMoreData) {
    // Fetch a batch of rewards
    const rewards = await sNBonusTransaction
      .find({ receivable: true, deletedAt: null })
      .skip(skip)
      .limit(batchSize);

    if (rewards.length === 0) {
      hasMoreData = false;
      break;
    }

    // Aggregate rewards by user and date
    const aggregatedRewards = aggregateRewards(rewards);

    // Process the aggregated data in chunks and update via createOrUpdateRewards
    const userEntries = Object.entries(aggregatedRewards);
    const chunks = chunkArray(userEntries, 10); // Process 10 users at a time

    for (const chunk of chunks) {
      const promises = chunk.map(async ([user, dates]) => {
        // Parallel processing of users in each chunk
        const datePromises = Object.entries(dates).map(async ([date, data]) => {
          const targetDate = new Date(date);
          console.log('data :>> ', data);

          try {
            // Access `myProduction` directly
            const tokenAmount: number = (data as DateRewardData).tokenAmount;

            // Create or update rewards for the user
            await superNoderService.createOrUpdateBRRewards(
              {
                user: new Types.ObjectId(user),
                rewardValue: tokenAmount,
                level: data.rewardData.currentLevel,
                date,
              }, // Ensure the exact target date is passed
            );

            console.log(
              `Created transaction for user ${user} on  ${targetDate} , ${date}`,
            );
          } catch (err) {
            console.error(
              `Failed to process reward for user ${user} on ${date}:`,
              err,
            );
          }
        });

        // Wait for all date-related promises to resolve before continuing to the next user
        await Promise.all(datePromises);
      });

      // Wait for all user-related promises to resolve in parallel
      await Promise.all(promises);
    }

    console.log(`Processed batch starting at skip ${skip}`);
    skip += batchSize; // Increment for the next batch
  }

  console.log('Migration completed.');

  await appContext.close(); // Close the application context
}

// Bootstrap the application
bootstrap().catch((err) => {
  console.error('Error bootstrapping application:', err);
  process.exit(1);
});
