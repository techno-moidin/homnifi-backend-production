import { AppModule } from '@/src/app.module';
import { DepositTransactionHistory } from '@/src/wallet/schemas/deposit.history.transaction.schema';
import { DepositTransaction } from '@/src/wallet/schemas/deposit.transaction.schema';
import { WalletTransaction } from '@/src/wallet/schemas/wallet.transaction.schema.';
import { NestFactory } from '@nestjs/core';
import { Model } from 'mongoose';

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(AppModule);
  const depositTransactionHistoryModel = appContext.get<
    Model<DepositTransactionHistory>
  >(DepositTransactionHistory.name + 'Model');

  const DepositTransactionModel = appContext.get<Model<DepositTransaction>>(
    DepositTransaction.name + 'Model',
  );

  const transactionHistory = await depositTransactionHistoryModel
    .find({ remarks: RegExp('object Promise', 'i') })
    .populate('token')
    .exec();
  if (transactionHistory.length < 0) {
    process.exit(0);
  }

  const BATCH_SIZE = 10;
  console.log(`Found ${transactionHistory.length} transactions to update.`);

  const batches = Math.ceil(transactionHistory.length / BATCH_SIZE);

  for (let i = 0; i < batches; i++) {
    const start = i * BATCH_SIZE;
    const end = Math.min((i + 1) * BATCH_SIZE, transactionHistory.length);
    const batch = transactionHistory.slice(start, end) as any;

    console.log(
      `Processing batch ${i + 1}/${batches} (${start + 1}-${end} of ${transactionHistory.length})`,
    );

    for (const deposit of batch) {
      const newRemark = `${deposit.amount} ${deposit.token.name} deposited successfully`;

      await depositTransactionHistoryModel.updateOne(
        { _id: deposit._id },
        { $set: { remarks: newRemark } },
      );
      if (deposit.deposit_id) {
        await DepositTransactionModel.updateOne(
          { _id: deposit.deposit_id },
          { $set: { remarks: newRemark } },
        );
      }

      console.log(`Updated transaction ${deposit._id}: "${newRemark}"`);
    }
  }
  console.log('Processing complete.');
  process.exit(0);
}

bootstrap().catch((err) => {
  console.error('Error populating database:', err);
  process.exit(1);
});
