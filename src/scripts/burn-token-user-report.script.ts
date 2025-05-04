import { CloudKRewardService } from '../cloud-k/cloudk-reward.service';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Model } from 'mongoose';
import { CloudKMachine } from '../cloud-k/schemas/cloudk-machine.schema';
import { UserSngp } from '../supernode/schemas/user-sngp.schema';
import * as fs from 'fs'; // Import the fs module
import { CloudKMachineStake } from '../cloud-k/schemas/cloudk-machine-stakes.schema';
import { CloudKMachineStakeTransaction } from '../cloud-k/schemas/stake-history.schema';

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(AppModule);
  const cloudKMachineStake = appContext.get<Model<CloudKMachineStake>>(
    CloudKMachineStake.name + 'Model',
  );
  const cloudKMachineStakeTransaction = appContext.get<
    Model<CloudKMachineStakeTransaction>
  >(CloudKMachineStakeTransaction.name + 'Model');
  const stakeList = await cloudKMachineStake.aggregate([
    {
      $match: {
        from: 'PHASE_DEPOSIT',
      },
    },
    {
      $lookup: {
        from: 'cloudkmachines',
        localField: 'machine',
        foreignField: '_id',
        as: 'machine',
      },
    },
    {
      $unwind: {
        path: '$machine',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'user',
        foreignField: '_id',
        as: 'user',
      },
    },
    {
      $unwind: {
        path: '$user',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        userBid: '$user.blockchainId',
        machine: '$machine._id',
        machineUniqueId: '$machine.uniqueName',
        machineExternalId: '$machine.externalMachineId',
        totalTokenAmount: '$tokenAmount',
        totalTokenPrice: '$totalPrice',
        perTokenPrice: '$perTokenPrice',
        createdAt: '$createdAt',
      },
    },
  ]);
  if (!stakeList.length) {
    ;
    process.exit(0);
  }
  const result = [];
  for (let index = 0; index < stakeList.length; index++) {
    const element = stakeList[index];

    const transaction = await cloudKMachineStakeTransaction.aggregate([
      {
        $match: {
          stake: element._id,
        },
      },
      {
        $lookup: {
          from: 'wallettransactions',
          localField: 'walletTransaction',
          foreignField: '_id',
          as: 'walletTransaction',
        },
      },
      {
        $unwind: {
          path: '$walletTransaction',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'wallets',
          localField: 'walletTransaction.wallet',
          foreignField: '_id',
          as: 'walletTransaction.wallet',
        },
      },
      {
        $unwind: {
          path: '$walletTransaction.wallet',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'tokens',
          localField: 'walletTransaction.wallet.token',
          foreignField: '_id',
          as: 'walletTransaction.wallet.token',
        },
      },
      {
        $unwind: {
          path: '$walletTransaction.wallet.token',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          transactionId: '$_id',
          walletTransactionId: '$walletTransaction._id',
          wallet: '$walletTransaction.wallet._id',
          transactionFlow: '$walletTransaction.transactionFlow',
          amount: '$walletTransaction.amount',
          walletSymbol: '$walletTransaction.wallet.token.symbol',
        },
      },
    ]);
    const resultData = {
      stakeId: element._id,
      userBid: element.userBid,
      machineUniqueId: element.machineUniqueId,
      machineExternalId: element.machineExternalId,
      createdAt: element.createdAt,
      totalTokenAmount: element.totalTokenAmount,
      sm_lyk: 0,
      mlyk: 0,
      returnSmlyk: 0,
      deductedSmlyk: 0,
    };
    transaction.map((data) => {
      if (
        data.walletSymbol &&
        data.walletSymbol.toString().toLowerCase() === 'sm-lyk'
      ) {
        resultData.sm_lyk = data.amount;
      }
      if (
        data.walletSymbol &&
        data.walletSymbol.toString().toLowerCase() === 'mlyk'
      ) {
        resultData.mlyk = data.amount;
      }
    });
    const deductValue =
      resultData.sm_lyk != 0
        ? resultData.totalTokenAmount - resultData.mlyk
        : 0;
    const returnSmlyk =
      resultData.sm_lyk != 0
        ? resultData.sm_lyk - (resultData.totalTokenAmount - resultData.mlyk)
        : 0;
    resultData.returnSmlyk = returnSmlyk;
    resultData.deductedSmlyk = deductValue;
    result.push(resultData);
  }

  // Write the result to a JSON file
  fs.writeFileSync(
    'burn_report_data.json',
    JSON.stringify(result, null, 2),
    'utf8',
  );
  ;

  process.exit(0);
}

bootstrap().catch((err) => {
  console.error('Error populating database:', err);
  process.exit(1);
});
