import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Model } from 'mongoose';
import {
  CLOUDK_MACHINE_STATUS,
  CloudKMachine,
} from '../cloud-k/schemas/cloudk-machine.schema';
import { CloudKMachineStake } from '../cloud-k/schemas/cloudk-machine-stakes.schema';
import { CloudKReward } from '../cloud-k/schemas/cloudk-reward.schema';
async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(AppModule);
  const machineModel = appContext.get<Model<CloudKMachine>>(
    CloudKMachine.name + 'Model',
  );
  const cloudKMachineStake = appContext.get<Model<CloudKMachineStake>>(
    CloudKMachineStake.name + 'Model',
  );
  const cloudKReward = appContext.get<Model<CloudKReward>>(
    CloudKReward.name + 'Model',
  );

  const BATCH_SIZE = 1000; // Define the batch size for processing

  const list_of_machine = await machineModel.find({
    $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
  });

  let totalUnmatch = 0;

  const processBatchMachine = async (machines, batchNumber) => {
    console.log(
      `Processing Batch #${batchNumber} out of ${list_of_machine.length / BATCH_SIZE}  totalUnmatch= ${totalUnmatch}`,
    );
    await Promise.all(
      machines.map(async (machine) => {
        const machineRewards = await cloudKReward
          .findOne({
            machine: machine._id,
            deletedAt: null,
          })
          .sort({ createdAt: -1 });
        console.log({ machineRewards });
        if (machineRewards && machineRewards?.dlp > 0) {
          await machineModel.updateOne(
            { _id: machine._id },
            {
              $set: {
                dlp: machineRewards.dlp,
              },
            },
          );
        }
      }),
    );
  };

  let batchNumber = 0;
  for (let i = 0; i < list_of_machine.length; i += BATCH_SIZE) {
    batchNumber++;
    const batch = list_of_machine.slice(i, i + BATCH_SIZE);
    await processBatchMachine(batch, batchNumber); // Wait for the current batch to complete
  }
  process.exit(0);
}

bootstrap().catch((err) => {
  console.error('Error during bootstrap:', err);
  process.exit(1);
});
