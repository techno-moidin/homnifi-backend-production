import { program } from 'commander';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '@/src/app.module';
import { Model } from 'mongoose';
import { CloudKTransactions } from '../cloud-k/schemas/cloudk-transactions.schema';
import pLimit from 'p-limit';

program
  .name('Update Nodek Price')
  .description(
    'Update the price of Nodek in the transactions based on the current price',
  )
  .option('-f, --file <item>', 'Update nodek price', '')
  .option(
    '-c, --chunkSize <number>',
    'Number of records to process in parallel',
    '100', // Increase chunk size for higher concurrency
  )
  .parse(process.argv);

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(AppModule);
  const cloudKTransactionModel = appContext.get<Model<CloudKTransactions>>(
    CloudKTransactions.name + 'Model',
  );

  try {
    console.log('Retrieving rewards-claimed transactions from the database...');
    const rewardsClaimedTransactions = await cloudKTransactionModel
      .find({
        type: 'rewards-claimed',
      })
      .lean();
    const limit = pLimit(parseInt(program.opts().chunkSize, 10));
    let matchingCount = 0;
    let nonMatchingCount = 0;
    const bulkOps = [];
    await Promise.all(
      rewardsClaimedTransactions.map((transaction: any) =>
        limit(async () => {
          const { token, createdAt } = transaction;
          const startOfDay = new Date(createdAt);
          startOfDay.setUTCHours(0, 0, 0, 0);
          const endOfDay = new Date(createdAt);
          endOfDay.setUTCHours(23, 59, 59, 999);

          const matchingDailyReward = await cloudKTransactionModel
            .findOne({
              type: 'daily-reward',
              token: token,
              createdAt: {
                $gte: startOfDay,
                $lte: endOfDay,
              },
            })
            .lean();

          if (matchingDailyReward) {
            const lykPrice = matchingDailyReward.lykPrice;
            if (lykPrice !== undefined && !isNaN(lykPrice)) {
              const TotalTokenAmount = transaction.tokenAmount * lykPrice;
              if (TotalTokenAmount !== undefined && !isNaN(TotalTokenAmount)) {
                console.log(
                  `Updating transaction ${transaction._id} with lykPrice ${lykPrice} and TotalTokenAmount ${TotalTokenAmount}`,
                );

                // Add to bulk operations
                bulkOps.push({
                  updateOne: {
                    filter: { _id: transaction._id },
                    update: {
                      $set: {
                        totalTokenPrice: TotalTokenAmount,
                        lykPrice: lykPrice,
                      },
                    },
                  },
                });
                matchingCount++;
              } else {
                console.log(
                  `Skipping transaction ${transaction._id} due to invalid TotalTokenAmount ${TotalTokenAmount}`,
                );
                nonMatchingCount++;
              }
            } else {
              console.log(
                `Skipping transaction ${transaction._id} due to invalid lykPrice ${lykPrice}`,
              );
              nonMatchingCount++;
            }
          } else {
            console.log(
              `No matching daily-reward transaction found for transaction ${transaction._id} with token ${token} and createdAt ${createdAt}`,
            );
            nonMatchingCount++;
          }
        }),
      ),
    );

    // Perform bulk write operation
    if (bulkOps.length > 0) {
      await cloudKTransactionModel.bulkWrite(bulkOps);
    }

    console.log('Transactions updated in the database successfully');
    console.log(`Matching transactions: ${matchingCount}`);
    console.log(`Non-matching transactions: ${nonMatchingCount}`);
  } catch (error) {
    console.error('An error occurred during processing:', error);
  } finally {
    await appContext.close();
  }
}

bootstrap();
