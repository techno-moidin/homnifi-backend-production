import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Model, PipelineStage, Types } from 'mongoose';
import { CloudKMachine } from '../cloud-k/schemas/cloudk-machine.schema';
import { CloudKReward } from '../cloud-k/schemas/cloudk-reward.schema';
import { CloudKService } from '../cloud-k/cloud-k.service';

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(AppModule);

  const machineModel = appContext.get<Model<CloudKMachine>>(
    CloudKMachine.name + 'Model',
  );
  const rewardModel = appContext.get<Model<CloudKReward>>(
    CloudKReward.name + 'Model',
  );
  const cloudkService = appContext.get(CloudKService);

  const BATCH_SIZE = 500;
  let skip = 0;
  let totalCount = 0;
  let batchCount = 0;

  const totalStartTime = Date.now();

  try {
    // Get the total count of machines to process
    totalCount = await machineModel.countDocuments({
      deletedAt: { $eq: null },
    });

    // const tokenPrice = await cloudkService.getCurrentPrice();
    //

    while (true) {
      const batchStartTime = Date.now();
      batchCount += 1;

      // Fetch a batch of machines
      const machines = await machineModel
        .find({ deletedAt: { $eq: null } })
        .skip(skip)
        .limit(BATCH_SIZE);

      if (machines.length === 0) {
        break;
      }

      console.log(
        `Fetched ${machines.length} machines in Batch #${batchCount}`,
      );

      // Process the batch
      const bulkOps = machines.map(async (machine) => {
        if (!machine) return null;
        const machineId = machine._id as Types.ObjectId;

        const rewardValues = await getAllUserMachineTotalRewards(
          rewardModel,
          machineId,
        );

        const lifetimeReward = rewardValues.lifetimeReward || 0;
        const claimableRewards = rewardValues.claimableRewards || 0;

        return {
          updateOne: {
            filter: { _id: machine._id, deletedAt: { $eq: null } },
            update: {
              $set: {
                lifetimeReward,
                claimableRewards,
              },
            },
          },
        };
      });

      try {
        const bulkResult = await machineModel.bulkWrite(
          (await Promise.all(bulkOps)).filter((op) => op !== null),
        );
        console.log(
          `Batch #${batchCount} Summary: Processed: ${machines.length}, Matched: ${bulkResult.matchedCount}, Modified: ${bulkResult.modifiedCount}`,
        );
      } catch (err) {
        console.error(`Error processing Batch #${batchCount}:`, err);
      }

      const batchEndTime = Date.now();
      const batchDuration = (
        (batchEndTime - batchStartTime) /
        1000 /
        60
      ).toFixed(2);
      console.log(
        `Batch #${batchCount} completed in ${batchDuration} minutes.`,
      );

      // Increment skip for the next batch
      skip += BATCH_SIZE;
    }

    const totalEndTime = Date.now();
    const totalDuration = ((totalEndTime - totalStartTime) / 1000 / 60).toFixed(
      2,
    );
    console.log('\n====SCRIPT COMPLETED====');
    console.log(`Total Machines: ${totalCount}`);
    console.log(`Total Batches Processed: ${batchCount}`);
    console.log(`Total Duration: ${totalDuration} minutes`);
  } catch (err) {
    console.error('Error during script execution:', err);
  } finally {
    await appContext.close();
    process.exit(0);
  }
}

async function getAllUserMachineTotalRewards(
  rewardModel: Model<CloudKReward>,
  machineId: Types.ObjectId,
) {
  const pipeline: PipelineStage[] = [
    {
      $match: {
        deletedAt: null,
        machine: machineId,
      },
    },
    {
      $project: {
        machine: 1,
        tokenAmount: 1,
        claimed: 1,
      },
    },
    {
      $group: {
        _id: '$machine',
        lifetimeReward: { $sum: '$tokenAmount' },
        claimableRewards: {
          $sum: {
            $cond: {
              if: { $eq: ['$claimed', false] },
              then: '$tokenAmount',
              else: 0,
            },
          },
        },
      },
    },
  ];

  const totalRewardsResult = await rewardModel.aggregate(pipeline).exec();

  return {
    lifetimeReward:
      totalRewardsResult && totalRewardsResult.length > 0
        ? totalRewardsResult[0].lifetimeReward
        : 0,
    claimableRewards:
      totalRewardsResult && totalRewardsResult.length > 0
        ? totalRewardsResult[0].claimableRewards
        : 0,
  };
}

bootstrap().catch((err) => {
  console.error('Unexpected error during bootstrap:', err);
  process.exit(1);
});
