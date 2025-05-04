import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Model } from 'mongoose';
import {
  CLOUDK_MACHINE_STATUS,
  CloudKMachine,
} from '../cloud-k/schemas/cloudk-machine.schema';
import { CloudKMachineStake } from '../cloud-k/schemas/cloudk-machine-stakes.schema';
import { UserGask } from '../supernode/schemas/user-gask.schema';
import { TransactionFlow } from '../wallet/enums/transcation.flow.enum';
import { SuperNodeGaskSetting } from '../supernode/schemas/sn-gask-setting.schema';
import { SnSetting } from '../supernode/schemas/sn-settings.schema';
import { Token } from '../token/schemas/token.schema';
import { GlobalPool } from '../supernode/schemas/sn-global-pool.schema';
import { CloudKService } from '../cloud-k/cloud-k.service';

import { User } from '../users/schemas/user.schema';
import { SupernodeService } from '../supernode/supernode.service';

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(AppModule);
  const machineModel = appContext.get<Model<CloudKMachine>>(
    CloudKMachine.name + 'Model',
  );
  const userModel = appContext.get<Model<User>>(User.name + 'Model');
  const cloudKMachineStake = appContext.get<Model<CloudKMachineStake>>(
    CloudKMachineStake.name + 'Model',
  );
  const supernodeService = appContext.get(SupernodeService);

  const BATCH_SIZE = 1000; // Define the batch size for processing

  const list_of_machine = await machineModel.find({
    status: CLOUDK_MACHINE_STATUS.ACTIVE,
    $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
  });

  let totalUnmatch = 0;


  const processBatchMachine = async (machines, batchNumber) => {
    // console.log(
    //   `Processing Batch #${batchNumber} out of ${list_of_machine.length / BATCH_SIZE}  totalUnmatch= ${totalUnmatch}`,
    // );
    await Promise.all(
      machines.map(async (machine) => {
        const machineStake = await cloudKMachineStake.aggregate([
          {
            $match: {
              type: 'stake',
              machine: machine._id,
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
          if (machine.collatoral.toFixed(7) !== machineStake[0].totalStake.toFixed(7)) {
            ;
            totalUnmatch++
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

  ;

  // const aggregationPipeline = [
  //   {
  //     $group: {
  //       _id: '$user', // Group by the 'user' field, which will be the unique user IDs
  //     },
  //   },
  //   {
  //     $project: {
  //       _id: 1, // Include only the '_id' field, which contains the user IDs
  //     },
  //   },
  // ];

  // const result = await machineModel.aggregate(aggregationPipeline).exec();
  // const users = result.map((item) => item._id); // Return an array of user IDs

  // const batchSize = 1000; // Adjust batch size based on your needs

  // // Helper function to process users in batches
  // const processBatch = async (userBatch) => {
  //   await Promise.all(
  //     userBatch.map(async (user, index) => {
  //       const current_user = await userModel.findById(user);
  //       if (current_user) {
  //         const machines = await machineModel
  //           .find({
  //             user: current_user._id,
  //             status: CLOUDK_MACHINE_STATUS.ACTIVE,
  //             $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
  //           })
  //           .sort({ productPrice: -1 });

  //         if (!machines || machines.length === 0) {
  //           current_user.isSupernodeActive = false;
  //         }

  //         if (machines.length > 0) {
  //           const highestPricedMachine = machines[0];
  //           if (
  //             highestPricedMachine.collatoral >=
  //             highestPricedMachine.productPrice
  //           ) {
  //             current_user.isSupernodeActive = true;
  //           }
  //         }

  //         ;

  //         await current_user.save();
  //       }
  //     }),
  //   );
  // };

  // // Process users in batches
  // for (let i = 0; i < users.length; i += batchSize) {
  //   const userBatch = users.slice(i, i + batchSize);
  //   await processBatch(userBatch); // Process each batch sequentially, but inside each batch, the updates are parallel
  // }

  process.exit(0);
}

bootstrap().catch((err) => {
  console.error('Error during bootstrap:', err);
  process.exit(1);
});
