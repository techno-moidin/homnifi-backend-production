import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Model } from 'mongoose';
import {
  CLOUDK_MACHINE_STATUS,
  CloudKMachine,
} from '../cloud-k/schemas/cloudk-machine.schema';
import { CloudKMachineStake } from '../cloud-k/schemas/cloudk-machine-stakes.schema';
import { DepositTransaction } from '../wallet/schemas/deposit.transaction.schema';
import { SNBonusTransaction } from '../supernode/schemas/sn-bonus-transaction.schema';
import { WalletTransaction } from '../wallet/schemas/wallet.transaction.schema.';
async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(AppModule);
  const machineModel = appContext.get<Model<CloudKMachine>>(
    CloudKMachine.name + 'Model',
  );

  const depositTransaction = appContext.get<Model<DepositTransaction>>(
    DepositTransaction.name + 'Model',
  );

  const cloudKMachineStake = appContext.get<Model<CloudKMachineStake>>(
    CloudKMachineStake.name + 'Model',
  );

  const sNBonusTransaction = appContext.get<Model<SNBonusTransaction>>(
    SNBonusTransaction.name + 'Model',
  );

  const walletTransaction = appContext.get<Model<WalletTransaction>>(
    WalletTransaction.name + 'Model',
  );

  const BATCH_SIZE = 1000; // Define the batch size for processing

  const list_of_deposit = await depositTransaction.find({
    createdAt: { $gte: new Date('2025-03-02') },
    hash: 'supernode-reward',
    deletedAt: null,
  });

  let totalUnmatch = 0;

  const processBatchMachine = async (deposits, batchNumber) => {
    console.log(
      `Processing Batch #${batchNumber} out of ${list_of_deposit.length / BATCH_SIZE}  totalUnmatch= ${totalUnmatch}`,
    );
    await Promise.all(
      deposits.map(async (deposit) => {
        const snTrx = await sNBonusTransaction.updateMany(
          {
            _id: { $in: deposit.claimableList },
          },
          {
            $set: {
              claimed: false,
              note: 'Reveresed Due Tto Wrong Reward Gene',
            },
          },
        );
      }),
    );
  };

  let batchNumber = 0;
  for (let i = 0; i < list_of_deposit.length; i += BATCH_SIZE) {
    batchNumber++;
    const batch = list_of_deposit.slice(i, i + BATCH_SIZE);
    await processBatchMachine(batch, batchNumber); // Wait for the current batch to complete
  }
  process.exit(0);
}

bootstrap().catch((err) => {
  console.error('Error during bootstrap:', err);
  process.exit(1);
});
