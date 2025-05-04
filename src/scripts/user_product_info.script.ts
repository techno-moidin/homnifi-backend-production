import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Model } from 'mongoose';
import {
  CLOUDK_MACHINE_STATUS,
  CloudKMachine,
} from '../cloud-k/schemas/cloudk-machine.schema';
import { CloudKMachineStake } from '../cloud-k/schemas/cloudk-machine-stakes.schema';
import { User } from '../users/schemas/user.schema';
async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(AppModule);
  const machineModel = appContext.get<Model<CloudKMachine>>(
    CloudKMachine.name + 'Model',
  );
  const userModel = appContext.get<Model<User>>(User.name + 'Model');

  const list_of_machine = await machineModel.aggregate([
    {
      $match: {
        deletedAt: null,
      },
    },
    {
      $group: {
        _id: '$user', // Group by "user" field
        products: { $push: '$_id' }, // Collect all document _id's for each group
      },
    },
  ]);

  

  const bulkOperations = list_of_machine.map((group) => ({
    updateOne: {
      filter: { _id: group._id }, // Match user by ID
      update: { $set: { products: group.products } }, // Set products array
    },
  }));

  if (bulkOperations.length > 0) {
    await userModel.bulkWrite(bulkOperations);
  }

  let totalUnmatch = 0;

  

  process.exit(0);
}

bootstrap().catch((err) => {
  console.error('Error during bootstrap:', err);
  process.exit(1);
});
