import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Model } from 'mongoose';
import { CloudKMachineStake } from '../cloud-k/schemas/cloudk-machine-stakes.schema';
import { CloudKMachineStakeTransaction } from '../cloud-k/schemas/stake-history.schema';
import * as fs from 'fs';

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(AppModule);
  const machineStakeModel = appContext.get<Model<CloudKMachineStake>>(
    CloudKMachineStake.name + 'Model',
  );
  const cloudKMachineStakeTransaction = appContext.get<
    Model<CloudKMachineStakeTransaction>
  >(CloudKMachineStakeTransaction.name + 'Model');

  const machineStake = await machineStakeModel.find({});

  const newDataSet = [];
  for (let index = 0; index < machineStake.length; index++) {
    const element = machineStake[index];
    ;
    if (element.walletTransaction) {
      ;
      newDataSet.push({
        machine: element.machine,
        stake: element._id,
        walletTransaction: element.walletTransaction,
        note: 'Updated data when implementing stake using bun',
      });
    }
  }
  const filePath = './newDataSet.json'; // Define the file path

  //   await fs.writeFile(filePath, JSON.stringify(newDataSet, null, 2), (err) => {
  //     if (err) {
  //       console.error('Error writing to file:', err);
  //     } else {
  //       ;
  //       process.exit(0);
  //     }
  //   });

  // Insert the new data set into the CloudKMachineStakeTransaction collection
  if (newDataSet.length > 0) {
    try {
      await cloudKMachineStakeTransaction.insertMany(newDataSet);
      ;
    } catch (error) {
      console.error('Error inserting new records:', error);
    }
  } else {
    ;
  }

  // Exit the process once the script completes
  process.exit(0);
}

bootstrap().catch((err) => {
  console.error('Error populating database:', err);
  process.exit(1);
});
