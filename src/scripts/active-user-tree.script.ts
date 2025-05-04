import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Model } from 'mongoose';
import { ActiveUserTree } from '../users/schemas/active-user-tree.schema';
import pLimit from 'p-limit';

function groupByUpline(data) {
  return data.reduce((acc, item) => {
    if (!acc[item.upline]) {
      acc[item.upline] = [];
    }
    acc[item.upline].push(item);
    return acc;
  }, {});
}

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(AppModule);
  const ActiveUserTreeModel = appContext.get<Model<ActiveUserTree>>(
    ActiveUserTree.name + 'Model',
  );

  try {
    // Fetch all users
    const userTree: any = await ActiveUserTreeModel.find().lean();

    const groupedByUpline = groupByUpline(userTree);
    const limit = pLimit(10); // Limit the number of concurrent operations
    const batchSize = 10000; // Set batch size, this can be adjusted
    const results = [];

    // Function to process wallets in batches

    const processBatch = async (batch: any[]) => {
      const tasks = batch.map((user: any, index) =>
        limit(async () => {
          const list = groupedByUpline[user.user];
          if (list) {
            const childrenUsers = list.map((item) => item.user);
            const childrens = list.map((item) => item._id);
            
            return ActiveUserTreeModel.updateOne(
              { user: user.user },
              { $set: { childrenUsers, childrens } },
            );
            
          }
        }),
      );

      await Promise.all(tasks);
    };

    // Process wallets in batches
    for (let i = 0; i < userTree.length; i += batchSize) {
      const batch = userTree.slice(i, i + batchSize);
      console.log(
        `Processing batch ${i / batchSize + 1} of ${Math.ceil(userTree.length / batchSize)}`,
      );
      await processBatch(batch);
    }

    // Save results to a JSON file
    // const json = JSON.stringify(results, null, 2);
    // const outputPath = path.resolve(process.cwd(), 'wallet-transactions.json');
    // fs.writeFileSync(outputPath, json);

    
  } catch (error) {
    console.error('An error occurred:', error);
  } finally {
    await appContext.close();
  }
}

// async function bootstrap() {
//   const appContext = await NestFactory.createApplicationContext(AppModule);

//   try {
//     const ActiveUserTreeModel = appContext.get<Model<ActiveUserTree>>(
//       ActiveUserTree.name + 'Model',
//     );
//     // Fetch all users
//     const userTree: any = await ActiveUserTreeModel.find().lean();

//     const groupedByUpline = groupByUpline(userTree);
//     const BATCH_SIZE = 10000; // Define the batch size for parallel updates

//     const processBatch = async (batch, batchNumber) => {
//       
//       const updatePromises = batch.map(async (user, index) => {
//         const list = groupedByUpline[user.user];
//         if (list) {
//           const childrenUsers = list.map((item) => item.user);
//           const childrens = list.map((item) => item._id);
//           await ActiveUserTreeModel.updateOne(
//             { user: user.user },
//             { $set: { childrenUsers, childrens } },
//           );
//           
//         }
//       });
//       // Wait for all updates in the current batch to complete
//       await Promise.all(updatePromises);
//       
//     };

//     // Split the userTree into batches
//     const batches = [];
//     for (let i = 0; i < userTree.length; i += BATCH_SIZE) {
//       batches.push(userTree.slice(i, i + BATCH_SIZE));
//     }

//     // Process each batch in parallel

//     for (let index = 0; index < batches.length; index++) {
//       const element = batches[index];
//       await processBatch(element, index + 1);
//       
//     }

//     // const batchPromises = batches.map((batch, index) =>
//     //   processBatch(batch, index + 1),
//     // );

//     // // Wait for all batches to complete
//     // await Promise.all(batchPromises);

//     
//     
//   } catch (err) {
//     console.error('Error updating children:', err);
//   } finally {
//     process.exit(0);
//   }
// }

bootstrap().catch((err) => {
  console.error('Bootstrap error:', err);
  process.exit(1);
});
