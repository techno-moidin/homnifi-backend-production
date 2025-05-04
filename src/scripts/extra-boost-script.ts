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
    {
      $match:
        /**
         * query: The query in MQL.
         */
        {
          boost: {
            $ne: 0,
          },
          status: 'active',
          createdAt: {
            $gte: new Date('2024-09-26'),
          },
        },
    },
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
            '$mintingPower',
            {
              $divide: ['$product.mintingPowerPerc', 100],
            },
          ],
        },
      },
    },
    {
      $lookup:
        /**
         * from: The target collection.
         * localField: The local join field.
         * foreignField: The target join field.
         * as: The name for the results.
         * pipeline: Optional pipeline to run on the foreign collection.
         * let: Optional variables to use in the pipeline field stages.
         */
        {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'user',
        },
    },
    {
      $unwind:
        /**
         * path: Path to the array field.
         * includeArrayIndex: Optional name for index.
         * preserveNullAndEmptyArrays: Optional
         *   toggle to unwind null and empty values.
         */
        {
          path: '$user',
          preserveNullAndEmptyArrays: true,
        },
    },
    {
      $addFields:
        /**
         * newField: The new field name.
         * expression: The new field expression.
         */
        {
          bid: '$user.blockchainId',
        },
    },
  ]);
  const newList = [];
  const promise = [];
  const dumF = async (element) => {
    // const element = listOfMachine[index];
    const reward: any = await cloudkReward.aggregate([
      {
        $match: {
          machine: element._id,
          // machine: new Types.ObjectId(
          //   "66db3b013a7cb0da1ec88b16"
          // )
        },
      },
      {
        $group: {
          _id: null,
          totalReward: {
            $sum: '$totalPrice',
          },
        },
      },
    ]);
    const totalReward = reward[0]?.totalReward || 0;
    const actualReward =
      (totalReward * element.mintingPower) /
      (element.mintingPower + element.boost);
    newList.push({
      bid: element.bid,
      machineId: element._id,
      machineUniqueName: element.uniqueName,
      machineName: element.name,
      totalGeneratedReward: totalReward,
      totalActualReward: actualReward,
      extraReward: totalReward - actualReward,
      boost: element.boost,
      mintingPower: element.mintingPower,
      actualMintingPower: element.mintingPower - element.boost,
    });
  };
  for (let index = 0; index < listOfMachine.length; index++) {
    promise.push(dumF(listOfMachine[index]));
  }
  await Promise.all(promise);
  const data = JSON.stringify(newList);
  await writeFile('extra.json', data);
  process.exit(0);
}
bootstrap().catch((err) => {
  console.error('Error populating database:', err);
  process.exit(1);
});
