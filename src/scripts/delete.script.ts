import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Model, Types } from 'mongoose';
import { CloudKReward } from '../cloud-k/schemas/cloudk-reward.schema';
import { CloudKTransactions } from '../cloud-k/schemas/cloudk-transactions.schema';
import { WalletTransaction } from '../wallet/schemas/wallet.transaction.schema.';
import { CloudKMachineStake } from '../cloud-k/schemas/cloudk-machine-stakes.schema';
import { UserGask } from '../supernode/schemas/user-gask.schema';
import { CloudKMachine } from '../cloud-k/schemas/cloudk-machine.schema';

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(AppModule);
  const ColudkRewards = appContext.get<Model<CloudKReward>>(
    CloudKReward.name + 'Model',
  );
  const ColudkTransactions = appContext.get<Model<CloudKTransactions>>(
    CloudKTransactions.name + 'Model',
  );

  const cloudKMachine = appContext.get<Model<CloudKMachine>>(
    CloudKMachine.name + 'Model',
  );

  const WalletTransactions = appContext.get<Model<WalletTransaction>>(
    WalletTransaction.name + 'Model',
  );

  const cloudKMachineStake = appContext.get<Model<CloudKMachineStake>>(
    CloudKMachineStake.name + 'Model',
  );

  const userGask = appContext.get<Model<UserGask>>(UserGask.name + 'Model');



  const JobId = "673a83836da88bcfca982deb---test";
  const BATCH_SIZE = 500; // Set the batch size
  
  // Fetch all rewards
  const allRewards = await ColudkRewards.find({
    job: new Types.ObjectId(JobId),
  });
  
  ;
  
  // Helper to chunk the array
  const chunkArray = (array: any[], size: number) => {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  };
  
  // Split the rewards into chunks
  const rewardChunks = chunkArray(allRewards, BATCH_SIZE);
  
  // Process each chunk sequentially
  for (let chunkIndex = 0; chunkIndex < rewardChunks.length; chunkIndex++) {
    ;
  
    await Promise.all(
      rewardChunks[chunkIndex].map(async (rewardItem: any, index: number) => {
        if (rewardItem.autoCompounded) {
          // Handle auto-compounded rewards
          const item = await cloudKMachineStake.findOne({
            rewardTransection: rewardItem._id,
          });
  
          if (item) {
            item.deletedAt = new Date();
            await item.save();
          }
          ;
  
          await cloudKMachine.findOneAndUpdate(
            {
              _id: rewardItem.machine,
            },
            { $inc: { collatoral: -rewardItem.totalPrice } },
          );
        } else {
          if (rewardItem.claimed) {
            // Handle claimed rewards
            const walletTransation: any = await WalletTransactions.findById(
              rewardItem.claimedTrx,
            );
  
            if (walletTransation.amount > rewardItem.tokenAmount) {
              walletTransation.amount -= rewardItem.tokenAmount; // Deduct the amount
              await walletTransation.save();
            } else {
              walletTransation.deletedAt = new Date();
              await walletTransation.save();
            }
  
            if (rewardItem.cloudKTransaction) {
              await ColudkTransactions.updateOne(
                { _id: rewardItem.cloudKTransaction },
                { $set: { deletedAt: new Date() } },
              );
            }
          }
        }
  
        await ColudkTransactions.updateMany(
          {
            reward: rewardItem._id,
          },
          { $set: { deletedAt: new Date() } },
        );
        // Mark the reward as deleted
        rewardItem.deletedAt = new Date();
        await rewardItem.save();
        ;
      }),
    );
  }
  
  ;











  // const JobId = '673a83836da88bcfca982deb';

  // const allRewards = await ColudkRewards.find({
  //   job: new Types.ObjectId(JobId),
  // });

  // ;

  // // Use Promise.all to execute tasks in parallel
  // await Promise.all(
  //   allRewards.map(async (rewardItem: any,index:any) => {
  //     if (rewardItem.autoCompounded) {
  //       // Handle auto-compounded rewards
  //       const item = await cloudKMachineStake.findOne({
  //         rewardTransection: rewardItem._id,
  //       });

  //       if (item) {
  //         item.deletedAt = new Date();
  //         await item.save();
  //       }
  //       ;
        
       
  //       await cloudKMachine.findOneAndUpdate(
  //         {
  //           _id: rewardItem.machine,
  //         },
  //         { $inc: { collatoral: -rewardItem.totalPrice } },
  //       );
  //     } else {
  //       if (rewardItem.claimed) {
  //         // Handle claimed rewards
  //         const walletTransation: any = await WalletTransactions.findById(
  //           rewardItem.claimedTrx,
  //         );

  //         if (walletTransation.amount > rewardItem.tokenAmount) {
  //           walletTransation.amount -= rewardItem.tokenAmount; // Deduct the amount
  //           await walletTransation.save();
  //         } else {
  //           walletTransation.deletedAt = new Date();
  //           await walletTransation.save();
  //         }

  //         if (rewardItem.cloudKTransaction) {
  //           await ColudkTransactions.updateOne(
  //             { _id: rewardItem.cloudKTransaction },
  //             { $set: { deletedAt: new Date() } },
  //           );
  //         }
  //       }
  //     }

  //     await ColudkTransactions.updateMany(
  //       {
  //         reward: rewardItem._id,
  //       },
  //       { $set: { deletedAt: new Date() } },
  //     );
  //     // Mark the reward as deleted
  //     rewardItem.deletedAt = new Date();
  //     await rewardItem.save();
  //     ;
      
  //   }),
  // );

  ;

  // const JobId = '673a83836da88bcfca982deb';

  // const allRewards = await ColudkRewards.find({
  //   job: new Types.ObjectId(JobId),
  // });
  // ;

  // for (let index = 0; index < allRewards.length; index++) {
  //   const rewardItem: any = allRewards[index];

  //   if (rewardItem.autoCompounded) {
  //     // check stakeing auto compound
  //     const item: any = await cloudKMachineStake.findOne({
  //       rewardTransection: rewardItem._id,
  //     });

  //     if (item) {
  //       item.deletedAt = new Date();
  //       await item.save();
  //     }

  //     await ColudkTransactions.updateMany(
  //       {
  //         reward: rewardItem._id,
  //       },
  //       { $set: { deletedAt: new Date() } },
  //     );
  //   } else {
  //     if (rewardItem.claimed) {
  //       // reduct claimed amount
  //       const walletTransation: any = await WalletTransactions.findById(
  //         rewardItem.claimedTrx,
  //       );

  //       if (walletTransation.amount > rewardItem.tokenAmount) {
  //         walletTransation.amount -= rewardItem.tokenAmount; // Deduct the amount
  //         await walletTransation.save();
  //       } else {
  //         walletTransation.deletedAt = new Date();
  //         await walletTransation.save();
  //       }
  //       if (rewardItem.cloudKTransaction) {
  //         const result = await ColudkTransactions.updateOne(
  //           { _id: rewardItem.cloudKTransaction },
  //           { $set: { deletedAt: new Date() } },
  //         );
  //       }
  //     } else {
  //     }
  //   }

  //   rewardItem.deletedAt = new Date();
  //   await rewardItem.save();
  // }

  ;
  await userGask.updateMany(
    { job: new Types.ObjectId(JobId) },
    { $set: { deletedAt: new Date() } }, // Update operation
  );
  ;

  ;
  console.info('Good Job, All done!');
  process.exit(0);
}

bootstrap().catch((err) => {
  console.error('Error populating database:', err);
  process.exit(1);
});
