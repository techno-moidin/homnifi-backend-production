import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Model } from 'mongoose';
import { User } from '../users/schemas/user.schema';

async function bootstrap() {
  const startTime = Date.now();
  const appContext = await NestFactory.createApplicationContext(AppModule);

  const userModel = appContext.get<Model<User>>(`${User.name}Model`);

  // User-defined configuration
  const batchSize = 1000; // Number of users per batch
  const parallelism = 10; // Number of batches to process concurrently

  console.log('Starting parallel user depth update migration...');

  // Helper function to process a single batch
  async function processSingleBatch(users: Array<{ userId: string; depth: number }>) {
    const bulkOps = [];
    const nextBatch = [];

    for (const { userId, depth } of users) {
    
      console.log('Processing user:', userId, 'at depth:', depth);

      // Add update operation for current user
      bulkOps.push({
        updateOne: {
          filter: { _id: userId },
          update: { $set: { depth } },
        },
      });

      // Fetch children of the current user
      const childUsers = await userModel
        .find({ uplineId: userId })
        .select('_id')
        .lean();

      // Add children to the next batch with incremented depth
      for (const child of childUsers) {
        nextBatch.push({ userId: child._id.toString(), depth: depth + 1 });
      }
    }

    // Execute bulk updates for the current batch
    if (bulkOps.length > 0) {
      await userModel.bulkWrite(bulkOps);
    }

    return nextBatch; // Return the next batch of users to process
  }

  // Helper function to process batches in parallel
  async function processInParallel(
    currentBatch: Array<{ userId: string; depth: number }>,
  ): Promise<Array<{ userId: string; depth: number }>> {
    const nextBatch = [];
    const chunks = chunkArray(currentBatch, batchSize);

    // Process batches with a limit on parallelism
    for (let i = 0; i < chunks.length; i += parallelism) {
      const parallelChunks = chunks.slice(i, i + parallelism); // Get the current set of parallel chunks

      // Run the parallel chunks and collect the results
      const results = await Promise.all(parallelChunks.map(processSingleBatch));

      // Flatten and collect the next batch of users from all parallel results
      results.forEach((result) => nextBatch.push(...result));
    }

    return nextBatch; // Return the combined next batch
  }

  function chunkArray<T>(array: T[], size: number): T[][] {
    const result = [];
    for (let i = 0; i < array.length; i += size) {
      result.push(array.slice(i, i + size));
    }
    return result;
  }

  try {
    // Initialize the process by getting root users
    let currentBatch = (
      await userModel.find({ uplineId: null }).select('_id').lean()
    ).map((user) => ({ userId: user._id.toString(), depth: 1 }));

    while (currentBatch.length > 0) {
      console.log('Processing batch with size:', currentBatch.length);

      // Process the current batch in parallel and get the next batch
      currentBatch = await processInParallel(currentBatch);
    }

    console.log('User depth update migration completed.');
      // Record the end time
  const endTime = Date.now();

  // Calculate the total time taken
  const totalTime = (endTime - startTime) / 1000; // Total time in seconds
  console.log(`All batches processed successfully! Total time: ${totalTime} seconds`);
  } catch (err) {
    console.error('An error occurred during the migration:', err);
  } finally {
    await appContext.close();
  }
}

// Start the script
bootstrap().catch((err) => {
  console.error('Error bootstrapping application:', err);
  process.exit(1);
});
