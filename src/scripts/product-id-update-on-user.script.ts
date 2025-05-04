import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Model } from 'mongoose';
import { CloudKMachine } from '../cloud-k/schemas/cloudk-machine.schema';
import { User } from 'src/users/schemas/user.schema';

async function bootstrap() {
  const startTime = Date.now();
  const appContext = await NestFactory.createApplicationContext(AppModule);

  const machineModel = appContext.get<Model<CloudKMachine>>(
    `${CloudKMachine.name}Model`,
  );
  const userModel = appContext.get<Model<User>>(`${User.name}Model`);

  const list_of_machine = await machineModel.aggregate([
    { $match: { deletedAt: null } },
    {
      $group: {
        _id: '$user',
        products: { $push: '$_id' },
      },
    },
  ]);

  console.log(list_of_machine.length, 'users found');

  const BATCH_SIZE = 1000; // Define batch size

  // Process in batches
  for (let i = 0; i < list_of_machine.length; i += BATCH_SIZE) {
    const batch = list_of_machine.slice(i, i + BATCH_SIZE);
    const bulkOperations = batch.map((group) => ({
      updateOne: {
        filter: { _id: group._id },
        update: { $set: { products: group.products } },
      },
    }));

    if (bulkOperations.length > 0) {
      await userModel.bulkWrite(bulkOperations);
    }

    console.log(
      `Processed batch ${i / BATCH_SIZE + 1}/${Math.ceil(list_of_machine.length / BATCH_SIZE)}`,
    );
  }

  console.log('Finished in', Date.now() - startTime, 'ms');
  console.info('Good Job, All done!');
  process.exit(0);
}

bootstrap()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error during bootstrap:', err);
    process.exit(1);
  });
