import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Model, Types } from 'mongoose';
import { CloudKMachine } from '../cloud-k/schemas/cloudk-machine.schema';
import {
  CLOUDK_MACHINE_STAKE_TYPE,
  CloudKMachineStake,
} from '../cloud-k/schemas/cloudk-machine-stakes.schema';

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(AppModule);

  const machineModel = appContext.get<Model<CloudKMachine>>(
    CloudKMachine.name + 'Model',
  );
  const machineStakeModel = appContext.get<Model<CloudKMachineStake>>(
    CloudKMachineStake.name + 'Model',
  );

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
    console.log(`Total Machines to Process: ${totalCount}`);

    while (true) {
      const batchStartTime = Date.now();
      batchCount += 1;

      // Fetch a batch of machines
      const machines = await machineModel
        .find({ deletedAt: { $eq: null } })
        .skip(skip)
        .limit(BATCH_SIZE)
        .exec();

      if (machines.length === 0) {
        break;
      }

      console.log(
        `Fetched ${machines.length} machines in Batch #${batchCount}`,
      );

      // Process the batch
      const bulkOps = machines.map(async (machine) => {
        const machineId = machine._id as Types.ObjectId;
        const machineStakeTotalPrice = await getTotalCollateral(
          machineStakeModel,
          machineId,
        );

        const stakedTokenAmount = machineStakeTotalPrice?.tokenAmount || 0;

        return {
          updateOne: {
            filter: { _id: machineId, deletedAt: { $eq: null } },
            update: { $set: { stakedTokenAmount } },
          },
        };
      });

      // Execute bulk operations
      try {
        const bulkResult = await machineModel.bulkWrite(
          await Promise.all(bulkOps),
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
  } catch (err) {
    console.error('Error during script execution:', err);
  } finally {
    await appContext.close();
    process.exit(0);
  }
}

async function getTotalCollateral(
  machineStakeModel: Model<CloudKMachineStake>,
  machineId: Types.ObjectId,
) {
  const pipeline = [
    {
      $match: {
        machine: machineId,
        deletedAt: null,
      },
    },
    {
      $project: {
        machine: 1,
        amount: {
          $cond: {
            if: { $eq: ['$type', CLOUDK_MACHINE_STAKE_TYPE.STAKE] },
            then: '$tokenAmount',
            else: { $multiply: ['$tokenAmount', -1] },
          },
        },
      },
    },
    {
      $group: {
        _id: '$machine',
        tokenAmount: { $sum: '$amount' },
      },
    },
  ];

  const totalPriceResult = await machineStakeModel.aggregate(pipeline).exec();
  return totalPriceResult.length > 0 ? totalPriceResult[0] : { tokenAmount: 0 };
}

bootstrap().catch((err) => {
  console.error('Unexpected error during bootstrap:', err);
  process.exit(1);
});
