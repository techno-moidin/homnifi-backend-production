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
  const userModel = appContext.get<Model<User>>(
    `${User.name}Model`,
  );

  const machines = await machineModel.find().exec();
  const batchSize = 1000;
  const totalBatches = Math.ceil(machines.length / batchSize);
  const batchPromises = [];

  console.log("Total Machines", machines.length);
  console.log("Total Batches", totalBatches);

  // Function to process each batch
  const processBatch = async (batchIndex: number, machineBatch: CloudKMachine[]) => {
    const userUpdates = [];

    for (const machine of machineBatch) {
      const { user, _id: machineId } = machine;

      if (!user || !machineId) {
        console.warn(`Skipping machine ${machineId} due to missing user or machineId.`);
        continue;
      }

      try {
        // Find the user
        const isUser = await userModel.findOne({ _id: user }).exec();
        if (!isUser) {
          console.warn(`User with ID ${user} not found. Skipping.`);
          continue;
        }

        // Check if the machineId is already in the user's products array
        if (!isUser.products.includes(Object(machineId))) {
          userUpdates.push({
            updateOne: {
              filter: { _id: user },
              update: { $addToSet: { products: machineId } },
            },
          });
        }
      } catch (error) {
        console.error(`Error processing machine ${machineId} for user ${user}:`, error);
      }
    }

    if (userUpdates.length > 0) {
      try {
        await userModel.bulkWrite(userUpdates);
      } catch (error) {
        console.error(`Error performing bulk write for batch ${batchIndex + 1}:`, error);
      }
    }
  };

  // Record the start time
  

  // Divide the machines into batches and process them
  for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
    const start = batchIndex * batchSize;
    const end = start + batchSize;
    const machineBatch = machines.slice(start, end);

    batchPromises.push(processBatch(batchIndex, machineBatch));
  }

  // Wait for all batch promises to complete in parallel
  await Promise.all(batchPromises);

  // Record the end time
  const endTime = Date.now();

  // Calculate the total time taken
  const totalTime = (endTime - startTime) / 1000; // Total time in seconds
  console.log(`All batches processed successfully! Total time: ${totalTime} seconds`);

  await appContext.close();
}

bootstrap()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error during bootstrap:', err);
    process.exit(1);
  });
