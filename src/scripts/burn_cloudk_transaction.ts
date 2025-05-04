import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Model, Types } from 'mongoose';
import {
  CLOUDK_MACHINE_STAKE_TYPE,
  CloudKMachineStake,
  STAKE_FROM,
} from '../cloud-k/schemas/cloudk-machine-stakes.schema';
import { CloudKMachineStakeTransaction } from '../cloud-k/schemas/stake-history.schema';
import { WalletService } from '../wallet/wallet.service';
import { CloudKService } from '../cloud-k/cloud-k.service';
import { SuperNodeGaskSetting } from '../supernode/schemas/sn-gask-setting.schema';
import { UserGask } from '../supernode/schemas/user-gask.schema';
import { CloudKMachine } from '../cloud-k/schemas/cloudk-machine.schema';
import { CloudKTransactionTypes } from '../cloud-k/schemas/cloudk-transactions.schema';

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(AppModule);
  const cloudKService = appContext.get(CloudKService);
  const cloudKMachineStake = appContext.get<Model<CloudKMachineStake>>(
    CloudKMachineStake.name + 'Model',
  );
  const cloudKMachineStakeTransaction = appContext.get<
    Model<CloudKMachineStakeTransaction>
  >(CloudKMachineStakeTransaction.name + 'Model');
  const snGaskSettingModel = appContext.get<Model<SuperNodeGaskSetting>>(
    SuperNodeGaskSetting.name + 'Model',
  );
  const userGaskModel = appContext.get<Model<UserGask>>(
    UserGask.name + 'Model',
  );
  const cloudKMachineModel = appContext.get<Model<CloudKMachine>>(
    CloudKMachine.name + 'Model',
  );
  let doubleData=0;
  let singleData=0;

  const stakeToMachine = async function (
    machineId,
    userId,
    tokenToReduce,
    stakeId,
  ) {
    const machine = await cloudKMachineModel.findOne({
      _id: machineId,
      user: userId,
      $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
    });

    if (!machine) {
      ;
      return null;
    }
    ;

    const datas = await cloudKMachineStake.find({
      machine: machineId,
      user: userId,
      type: CLOUDK_MACHINE_STAKE_TYPE.STAKE,
      from: STAKE_FROM.MORE_STAKE,
      note: 'Extra smlyk given for ' + stakeId,
      deletedAt: { $eq: null },
    });
    ;
    if (datas.length == 1) {
      const currentData = datas[0];
      
      singleData++;
      await cloudKService.createCloudKTransaction({
        tokenAmount: currentData.tokenAmount,
        type: CloudKTransactionTypes.REMOVE_STAKE,
        user: currentData.user as any,
        machine: currentData.machine,
        totalTokenPrice: currentData.totalPrice,
        token: machine.stakeToken as any,
        stake: currentData._id as any,
        note: currentData.note,
      });
      return null;
    } else {
      return null;
    }
  };

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
        burnValue: '$burnValue',
        actualValue: '$actualValue',
      },
    },
  ]);
  if (!stakeList.length) {
    ;
    process.exit(0);
  }
  const result = [];
  const stakeIdArray = [];
  for (let index = 0; index < stakeList.length; index++) {
    const element = stakeList[index];
    stakeIdArray.push(element._id);
  }

  const transaction = await cloudKMachineStakeTransaction.aggregate([
    {
      $match: {
        stake: {
          $in: stakeIdArray,
        },
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
        from: 'cloudkmachinestakes',
        localField: 'stake',
        foreignField: '_id',
        as: 'stake',
      },
    },
    {
      $unwind: {
        path: '$stake',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: 'users', // Second collection to join
        localField: 'stake.user', // Assuming stake has a userId field
        foreignField: '_id', // Field from the "users" collection
        as: 'user', // Output array field for users
      },
    },
    {
      $unwind: {
        path: '$user',
        preserveNullAndEmptyArrays: true, // Retain documents that have no matching user
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
      $group: {
        _id: '$stake._id', // Group by 'stake'
        transactions: {
          $push: {
            transactionId: '$_id',
            walletTransactionId: '$walletTransaction._id',
            wallet: '$walletTransaction.wallet._id',
            transactionFlow: '$walletTransaction.transactionFlow',
            amount: '$walletTransaction.amount',
            walletSymbol: '$walletTransaction.wallet.token.symbol',
          },
        },

        sumFromTransaction: {
          $sum: {
            $cond: {
              if: { $eq: ['$walletTransaction.transactionFlow', 'out'] },
              then: '$walletTransaction.amount',
              else: { $multiply: ['$walletTransaction.amount', -1] },
            },
          },
        },
        stakeData: { $first: '$stake' },
        user: { $first: '$user' },
      },
    },
    {
      $sort: {
        'stakeData.createdAt': -1, // Now sorting based on stakeData.createdAt
      },
    },
    {
      $project: {
        _id: 0, // Exclude the default _id field
        stake: '$_id', // Include the 'stake' in the result
        transactions: 1, // Include the grouped transactions array
        sumFromTransaction: 1,
        machine: '$stakeData.machine',
        user: '$stakeData.user',
        userBid: '$user.blockchainId',
        stakeTotal: '$stakeData.tokenAmount',
        stakeDate: '$stakeData.createdAt',
        differentFromStakeAndTransaction: {
          $subtract: ['$stakeData.tokenAmount', '$sumFromTransaction'],
        },
      },
    },
  ]);

  if (transaction.length == 0) {
    ;
    process.exit(0);
  }
  const depositPromises = [];
  const stakePromise = [];

  for (let index = 0; index < transaction.length; index++) {
    const element = transaction[index];
    let sm_lyk;
    let mlyk;
    let smlykWallet;
    let smlykWalletSymbol;
    element.transactions.map((data) => {
      if (data.walletSymbol === 'smlyk' || data.walletSymbol === 'sm-lyk') {
        sm_lyk = data.amount;
        smlykWallet = data.wallet;
        smlykWalletSymbol = data.walletSymbol;
      }
      if (data.walletSymbol === 'mlyk' || data.walletSymbol === 'mLYK') {
        mlyk = data.amount;
      }
    });

    if (element.differentFromStakeAndTransaction == 0) {
      continue;
    } else if (element.differentFromStakeAndTransaction > 0) {
      const positiveValue = 0 - element.differentFromStakeAndTransaction;

      stakePromise.push(
        stakeToMachine(
          element.machine,
          element.user,
          positiveValue,
          element.stake,
        ),
      );
    } else if (element.differentFromStakeAndTransaction < 0) {
      continue;
    }
  }

  await Promise.all(stakePromise);

  ;
  ;

  process.exit(0);
}

bootstrap().catch((err) => {
  console.error('Error populating database:', err);
  process.exit(1);
});
