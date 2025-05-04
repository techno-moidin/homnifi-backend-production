import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Model } from 'mongoose';
import {
  CLOUDK_MACHINE_STATUS,
  CloudKMachine,
} from '../cloud-k/schemas/cloudk-machine.schema';
import { CloudKMachineStake } from '../cloud-k/schemas/cloudk-machine-stakes.schema';
async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(AppModule);
  const machineModel = appContext.get<Model<CloudKMachine>>(
    CloudKMachine.name + 'Model',
  );
  const cloudKMachineStake = appContext.get<Model<CloudKMachineStake>>(
    CloudKMachineStake.name + 'Model',
  );

  const BATCH_SIZE = 1000; // Define the batch size for processing

  const list_of_machine = await machineModel.find({
    status: CLOUDK_MACHINE_STATUS.ACTIVE,
    $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
  });

  let totalUnmatch = 0;

  const processBatchMachine = async (machines, batchNumber) => {
    console.log(
      `Processing Batch #${batchNumber} out of ${list_of_machine.length / BATCH_SIZE}  totalUnmatch= ${totalUnmatch}`,
    );
    await Promise.all(
      machines.map(async (machine) => {
        const machineStake = await cloudKMachineStake.aggregate([
          {
            $match: {
              type: 'stake',
              machine: machine._id,
              deletedAt: null,
            },
          },
          {
            $group: {
              _id: null,
              totalStake: {
                $sum: '$totalPrice',
              },
            },
          },
        ]);

        if (machineStake[0]?.totalStake > 0) {
          if (
            machine.collatoral.toFixed(7) !==
            machineStake[0].totalStake.toFixed(7)
          ) {
            totalUnmatch++;
            await machineModel.updateOne(
              { _id: machine._id },
              {
                $set: {
                  collatoral: machineStake[0].totalStake,
                },
              },
            );
          }
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
