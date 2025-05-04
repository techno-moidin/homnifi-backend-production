import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Model, Types } from 'mongoose';
import { News } from '../news/schemas/news.schema';
import { CloudKReward } from '../cloud-k/schemas/cloudk-reward.schema';
import { BaseReferralRewardService } from '../supernode/base-referral-generate.service';
import { BuilderGenerationalRewardService } from '../supernode/builder-generation.service';
import { CloudKTransactions } from '../cloud-k/schemas/cloudk-transactions.schema';

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(AppModule);
  const ColudkRewards = appContext.get<Model<CloudKReward>>(
    CloudKReward.name + 'Model',
  );
  const ColudkTransactions = appContext.get<Model<CloudKTransactions>>(
    CloudKTransactions.name + 'Model',
  );

  const chunkArray = (array: any[], size: number): any[][] => {
    const result = [];
    for (let i = 0; i < array.length; i += size) {
      result.push(array.slice(i, i + size));
    }
    return result;
  };

  const allRewards_list = await ColudkRewards.find({
    job: new Types.ObjectId('673932036b9c71444e1c8e9e'),
    cloudKTransaction: null,
  });

  // Define the chunk size
  const chunkSize = 100;

  // Split the list into chunks
  const rewardChunks = chunkArray(allRewards_list, chunkSize);

  for (const chunk of rewardChunks) {
    // Process each chunk in parallel
    await Promise.all(
      chunk.map(async (reward: any) => {
        try {
          const transaction = await ColudkTransactions.findOne({
            type: 'daily-reward',
            machine: reward.machine,
            user: reward.user,
            createdAt: {
              $gte: new Date('2024-11-17T00:00:00.000Z'),
              $lt: new Date('2024-11-18T00:00:00.000Z'),
            },
            deletedAt: null,
          });

          if (!transaction) {
            return;
          }

          if (!reward.cloudKTransaction && !transaction.reward) {
            // Update references only if they are not already updated
            reward.cloudKTransaction = transaction._id;
            transaction.reward = reward._id;

            // Save updates in parallel
            await Promise.all([reward.save(), transaction.save()]);
          } else {
          }
        } catch (error) {
          console.error(`Error processing reward ID: ${reward._id}`, error);
        }
      }),
    );
  }

  return;

  // const allRewars = await ColudkRewards.find({
  //   job: new Types.ObjectId('6737e083ec9fc149bca22153'),
  // });
  // ;

  // const baseReferralRewardService = appContext.get(BaseReferralRewardService);

  // const errorIds = [];

  // const promise = [];
  // for (let index = 0; index < allRewars.length; index++) {
  //   const rewardItem: any = allRewars[index];
  //   ;

  //   const transection = await ColudkTransactions.findOne({
  //     type: 'daily-reward',
  //     machine: rewardItem.machine,
  //     user: rewardItem.user,
  //     createdAt: {
  //       $gte: new Date('2024-11-17T00:00:00.000Z'),
  //       $lt: new Date('2024-11-18T00:00:00.000Z'),
  //     },
  //     deletedAt: null,
  //   });
  //   if (!transection) {
  //     errorIds.push(rewardItem._id);
  //     continue;
  //   }

  //   promise.push(
  //     // Promise.allSettled([
  //     baseReferralRewardService.generateCommission(
  //       rewardItem.user,
  //       rewardItem.totalPrice,
  //       transection._id as Types.ObjectId,
  //       rewardItem.tokenPrice,
  //       rewardItem.machine as Types.ObjectId,
  //       rewardItem.job as Types.ObjectId,
  //     ),
  //     // builderGenerationalRewardService.generateBuilderGenerationReward(
  //     //   rewardItem.user.toString(),
  //     //   rewardItem.totalPrice,
  //     //   transection._id as Types.ObjectId,
  //     //   rewardItem.tokenPrice,
  //     //   rewardItem.machine as Types.ObjectId,
  //     // ),
  //     // ]),
  //   );
  // }
  // await Promise.all(promise);

  // const allRewards = await ColudkRewards.find({
  //   job: new Types.ObjectId('6737e083ec9fc149bca22153'),
  // });
  // ;

  // const baseReferralRewardService = appContext.get(BaseReferralRewardService);

  // const errorIds = [];

  // const promises = allRewards.map(async (rewardItem: any, index: number) => {
  //   ;

  //   const transaction = await ColudkTransactions.findOne({
  //     type: 'daily-reward',
  //     machine: rewardItem.machine,
  //     user: rewardItem.user,
  //     createdAt: {
  //       $gte: new Date('2024-11-16T00:00:00.000Z'),
  //       $lt: new Date('2024-11-17T00:00:00.000Z'),
  //     },
  //     deletedAt: null,
  //   });

  //   if (!transaction) {
  //     errorIds.push(rewardItem._id);
  //     return;
  //   }

  //   await baseReferralRewardService.generateCommission(
  //     rewardItem.user,
  //     rewardItem.totalPrice,
  //     transaction._id as Types.ObjectId,
  //     rewardItem.tokenPrice,
  //     rewardItem.machine as Types.ObjectId,
  //     rewardItem.job as Types.ObjectId,
  //   );
  // });

  // await Promise.all(promises);

  // const allRewards_list = await ColudkRewards.find({
  //   job: new Types.ObjectId('6737e083ec9fc149bca22153'),
  // });

  // for (let index = 0; index < allRewards_list.length; index++) {
  //   const reward: any = allRewards_list[index];
  //   const transaction = await ColudkTransactions.findOne({
  //     type: 'daily-reward',
  //     machine: reward.machine,
  //     user: reward.user,
  //     createdAt: {
  //       $gte: new Date('2024-11-16T00:00:00.000Z'),
  //       $lt: new Date('2024-11-17T00:00:00.000Z'),
  //     },
  //     deletedAt: null,
  //   });

  //   if(transaction){
  //     reward.cloudKTransaction = transaction._id;
  //     transaction.reward = reward._id;
  //     await reward.save();
  //     await transaction.save();
  //   }

  // }

  const allRewards = await ColudkRewards.find({
    job: new Types.ObjectId('6737e083ec9fc149bca22153'),
  });
  const baseReferralRewardService = appContext.get(BaseReferralRewardService);

  const errorIds = [];

  const BATCH_SIZE = 1000; // Define the batch size
  const batches = Math.ceil(allRewards.length / BATCH_SIZE);

  for (let batchIndex = 0; batchIndex < batches; batchIndex++) {
    const batch = allRewards.slice(
      batchIndex * BATCH_SIZE,
      (batchIndex + 1) * BATCH_SIZE,
    );

    const promises = batch.map(async (rewardItem: any, index: number) => {
      // console.log(
      //   `Processing reward item ${index + 1} in batch ${batchIndex + 1}`,
      // );

      const transaction = await ColudkTransactions.findOne({
        type: 'daily-reward',
        machine: rewardItem.machine,
        user: rewardItem.user,
        createdAt: {
          $gte: new Date('2024-11-16T00:00:00.000Z'),
          $lt: new Date('2024-11-17T00:00:00.000Z'),
        },
        deletedAt: null,
      });

      if (!transaction) {
        errorIds.push(rewardItem._id);
        return;
      }

      // await baseReferralRewardService.generateCommission(rewardItem);
    });

    // Wait for all promises in the current batch to finish
    await Promise.all(promises);
  }

  console.info('Good Job, All done!');
  process.exit(0);
}

bootstrap().catch((err) => {
  console.error('Error populating database:', err);
  process.exit(1);
});
