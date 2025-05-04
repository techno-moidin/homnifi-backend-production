import { CloudKRewardService } from '../cloud-k/cloudk-reward.service';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Model } from 'mongoose';
import { CloudKMachine } from '../cloud-k/schemas/cloudk-machine.schema';
import { UserSngp } from '../supernode/schemas/user-sngp.schema';
import * as fs from 'fs'; // Import the fs module
import { CloudKMachineStake } from '../cloud-k/schemas/cloudk-machine-stakes.schema';
import { CloudKMachineStakeTransaction } from '../cloud-k/schemas/stake-history.schema';
import { SwapTransaction } from '../wallet/schemas/swap.transaction.schema';
import { WalletTransaction } from '../wallet/schemas/wallet.transaction.schema.';
import { getModelToken } from '@nestjs/mongoose';

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(AppModule);
  const swapTransaction = appContext.get<Model<SwapTransaction>>(
    SwapTransaction.name + 'Model',
  );
  const data = [
    '6713a1d6067def252e438815',
    '6713a30f067def252e43a20c',
    '6713a359067def252e43a930',
    '6713a35c067def252e43a9ca',
    '6713a398067def252e43b073',
    '6713a47f067def252e43d0cf',
    '6713a50d067def252e43ea99',
    '6713a5aa067def252e44014c',
    '6713a8e4067def252e44968a',
    '6713a979067def252e44a51a',
  ];

  for (let index = 0; index < data.length; index++) {
    const element = data[index];

    const swapTransactiondata = await swapTransaction
      .findById(element)
      .populate('fromWalletTrx toWalletTrx');
    if (!swapTransactiondata) {
      ;
      continue;
    }
    const swapAmount =
      swapTransactiondata.amount / swapTransactiondata.tokenPrice;
    swapTransactiondata.amount = swapAmount;
    const toWalletTrx =
      swapTransactiondata.toWalletTrx as unknown as WalletTransaction;
    toWalletTrx.amount = swapAmount;
    await toWalletTrx.save();
    await swapTransactiondata.save();
  }

  process.exit(0);
}

bootstrap().catch((err) => {
  console.error('Error populating database:', err);
  process.exit(1);
});
