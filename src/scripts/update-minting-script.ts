import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Model, Types } from 'mongoose';
import { WithdrawTransaction } from '../wallet/schemas/withdraw.transaction.schema';
import { WalletTransaction } from '../wallet/schemas/wallet.transaction.schema.';
import { CloudKMachine } from '../cloud-k/schemas/cloudk-machine.schema';
import { CloudKReward } from '../cloud-k/schemas/cloudk-reward.schema';
import { writeFile } from 'fs/promises';
async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(AppModule);
  const cloudkMachine = appContext.get<Model<CloudKMachine>>(
    CloudKMachine.name + 'Model',
  );
  const cloudkReward = appContext.get<Model<CloudKReward>>(
    CloudKReward.name + 'Model',
  );
  const listOfMachine = await cloudkMachine.aggregate([
    // {
    //   $match: {
    //     createdAt: {
    //       $gte: new Date('2024-09-26'),
    //     },
    //   },
    // },
    {
      $lookup: {
        from: 'cloudkproducts',
        localField: 'product',
        foreignField: '_id',
        as: 'product',
      },
    },
    {
      $unwind: {
        path: '$product',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $match: {
        $expr: {
          $ne: [
            {
              $divide: ['$product.mintingPowerPerc', 100],
            },
            // product.mintingPowerPerc / 100
            '$mintingPower', // mintingPower field in the main collection
          ],
        },
      },
    },
  ]);

  for (let index = 0; index < listOfMachine.length; index++) {
    const element = listOfMachine[index];
    const mintingPower = (element.mintingPower - element.boost).toFixed(4);
    ;
    await cloudkMachine.findByIdAndUpdate(element._id, {
      $set: { mintingPower: mintingPower },
    });
  }
  ;
  // await Promise.all(promise);
  // const data = JSON.stringify(newList);
  // await writeFile('extra.json', data);
  process.exit(0);
}
bootstrap().catch((err) => {
  console.error('Error populating database:', err);
  process.exit(1);
});
